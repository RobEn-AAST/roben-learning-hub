import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/quiz-attempts/[attemptId]/answers/batch
 * Body: { answers: [{ questionId, selectedOptionId?, textAnswer? }, ...] }
 * Upserts multiple answers in a single request to reduce DB churn.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const startedAt = new Date().toISOString();
    console.log(`[BATCH-ANSWERS] ${startedAt} - POST /api/quiz-attempts/[attemptId]/answers/batch - Starting`);

    const supabase = await createClient();
    const { attemptId } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log(`[BATCH-ANSWERS] ${new Date().toISOString()} - Unauthorized request`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const answers = Array.isArray(body?.answers) ? body.answers : [];

    if (!attemptId) {
      console.log(`[BATCH-ANSWERS] ${new Date().toISOString()} - Missing attemptId param`);
      return NextResponse.json({ error: 'Missing attempt id' }, { status: 400 });
    }

    if (!answers.length) {
      console.log(`[BATCH-ANSWERS] ${new Date().toISOString()} - No answers to save for attempt=${attemptId}`);
      return NextResponse.json({ success: true, saved: 0 });
    }

    // Verify ownership and that attempt is not completed
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select('id, user_id, completed_at')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      console.error(`[BATCH-ANSWERS] ${new Date().toISOString()} - Attempt fetch error:`, attemptError);
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (attempt.user_id !== user.id) {
      console.log(`[BATCH-ANSWERS] ${new Date().toISOString()} - Unauthorized - attempt belongs to different user`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (attempt.completed_at) {
      console.log(`[BATCH-ANSWERS] ${new Date().toISOString()} - Attempt is already completed, rejecting updates`);
      return NextResponse.json({ error: 'Cannot modify completed attempt' }, { status: 400 });
    }

    // Prepare upsert rows
    // Fetch question details and options for the provided question IDs
    const questionIds = Array.from(new Set(answers.map((a: any) => a.questionId)));

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, type, points')
      .in('id', questionIds);

    if (questionsError) {
      console.error(`[BATCH-ANSWERS] ${new Date().toISOString()} - Error fetching questions:`, questionsError);
      return NextResponse.json({ error: 'Failed to fetch questions for evaluation' }, { status: 500 });
    }

    const { data: options, error: optionsError } = await supabase
      .from('question_options')
      .select('id, question_id, is_correct')
      .in('question_id', questionIds);

    if (optionsError) {
      console.error(`[BATCH-ANSWERS] ${new Date().toISOString()} - Error fetching options:`, optionsError);
      return NextResponse.json({ error: 'Failed to fetch question options for evaluation' }, { status: 500 });
    }

    const questionMap: Record<string, any> = {};
    (questions || []).forEach((q: any) => (questionMap[q.id] = q));

    const optionsMap: Record<string, any[]> = {};
    (options || []).forEach((opt: any) => {
      optionsMap[opt.question_id] = optionsMap[opt.question_id] || [];
      optionsMap[opt.question_id].push(opt);
    });

    // Prepare upsert rows with correctness and points calculated
    const upsertRows = answers.map((a: any) => {
      const q = questionMap[a.questionId];
      let isCorrect = false;
      let pointsEarned = 0;

      if (q) {
        if ((q.type === 'multiple_choice' || q.type === 'true_false') && a.selectedOptionId) {
          const selected = (optionsMap[a.questionId] || []).find((o: any) => o.id === a.selectedOptionId);
          isCorrect = !!selected?.is_correct;
          pointsEarned = isCorrect ? (q.points || 0) : 0;
        } else if (q.type === 'short_answer') {
          // short answers require manual grading
          isCorrect = false;
          pointsEarned = 0;
        }
      }

      return {
        attempt_id: attemptId,
        question_id: a.questionId,
        selected_option_id: a.selectedOptionId || null,
        text_answer: a.textAnswer || null,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        answered_at: new Date().toISOString(),
      };
    });

    // Use chunked upserts to avoid extremely large single operations which can
    // time out or overload the DB. Also add a small retry for transient errors.
    const CHUNK_SIZE = 50;
    const MAX_RETRIES = 2;
    let totalSaved = 0;
    const failedRows: Array<{ row: any; error: any }> = [];

    // Prefer using a DB-side upsert+aggregate function when available. This
    // pushes the heavy work into Postgres and avoids multiple round-trips.
    const chunks: any[] = [];
    for (let i = 0; i < upsertRows.length; i += CHUNK_SIZE) {
      chunks.push(upsertRows.slice(i, i + CHUNK_SIZE));
    }

    for (const chunk of chunks) {
      let attemptNum = 0;
      let success = false;

      while (attemptNum <= MAX_RETRIES && !success) {
        try {
          // Attempt to call the DB-side upsert function
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('upsert_user_answers_and_update_attempt', {
            p_attempt_id: attemptId,
            p_answers: JSON.stringify(chunk),
          });

          if (rpcErr) {
            console.warn(`[BATCH-ANSWERS] RPC chunk error (attempt ${attemptNum + 1}):`, rpcErr?.message || rpcErr);
            attemptNum += 1;
            if (attemptNum > MAX_RETRIES) {
              // Fall back to client-side per-row upserts for this chunk
              for (const row of chunk) {
                try {
                  const { data: singleData, error: singleErr } = await supabase
                    .from('user_answers')
                    .upsert(row, { onConflict: 'attempt_id,question_id' })
                    .select();
                  if (singleErr) {
                    failedRows.push({ row, error: singleErr });
                  } else {
                    totalSaved += (singleData?.length || 0);
                  }
                } catch (e) {
                  failedRows.push({ row, error: e });
                }
              }
              break;
            }
            await new Promise(r => setTimeout(r, Math.pow(2, attemptNum) * 250));
            continue;
          }

          // rpcRes is expected to be the number of processed rows
          totalSaved += (rpcRes || 0);
          success = true;
        } catch (e) {
          console.error('[BATCH-ANSWERS] Exception calling RPC for chunk:', e);
          attemptNum += 1;
          if (attemptNum > MAX_RETRIES) {
            // last-resort per-row fallback
            for (const row of chunk) {
              try {
                const { data: singleData, error: singleErr } = await supabase
                  .from('user_answers')
                  .upsert(row, { onConflict: 'attempt_id,question_id' })
                  .select();
                if (singleErr) {
                  failedRows.push({ row, error: singleErr });
                } else {
                  totalSaved += (singleData?.length || 0);
                }
              } catch (err) {
                failedRows.push({ row, error: err });
              }
            }
            break;
          }
          await new Promise(r => setTimeout(r, Math.pow(2, attemptNum) * 250));
        }
      }
    }

    if (failedRows.length > 0 && totalSaved === 0) {
      console.error(`[BATCH-ANSWERS] Failed to save any rows for attempt=${attemptId}. Failed rows:`, failedRows.length);
      return NextResponse.json({ error: 'Failed to save answers', details: 'Database error while saving answers' }, { status: 500 });
    }

    if (failedRows.length > 0) {
      console.warn(`[BATCH-ANSWERS] Partial save: saved=${totalSaved}, failed=${failedRows.length}`);
      return NextResponse.json({ success: true, saved: totalSaved, failed: failedRows.length, note: 'Partial save - see server logs for details' }, { status: 207 });
    }

    console.log(`[BATCH-ANSWERS] ${new Date().toISOString()} - Saved ${totalSaved} answers for attempt=${attemptId} user=${user.id}`);
    return NextResponse.json({ success: true, saved: totalSaved });
  } catch (error) {
    console.error('Unexpected error in batch answers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
