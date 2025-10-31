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

    // Use upsert with onConflict to update existing answers
    const { data: upserted, error: upsertError } = await supabase
      .from('user_answers')
      .upsert(upsertRows, { onConflict: 'attempt_id,question_id' })
      .select();

    if (upsertError) {
      // Log full error for debugging
      console.error(`[BATCH-ANSWERS] ${new Date().toISOString()} - Error upserting batch answers:`, upsertError);

      // Try per-row upsert to identify problematic rows (helps surface DB constraint/fk issues)
      const failedRows: Array<{ row: any; error: any }> = [];
      let perRowSaved = 0;

      for (const row of upsertRows) {
        try {
          const { data: singleData, error: singleErr } = await supabase
            .from('user_answers')
            .upsert(row, { onConflict: 'attempt_id,question_id' })
            .select();

          if (singleErr) {
            console.error(`[BATCH-ANSWERS] ${new Date().toISOString()} - Per-row upsert failed:`, singleErr, 'row:', row);
            failedRows.push({ row, error: singleErr });
          } else {
            perRowSaved += (singleData?.length || 0);
          }
        } catch (e) {
          console.error(`[BATCH-ANSWERS] ${new Date().toISOString()} - Exception during per-row upsert:`, e, 'row:', row);
          failedRows.push({ row, error: e });
        }
      }

      // If nothing could be saved, return the original error with more context
      if (perRowSaved === 0) {
        // Return some details to help debugging (non-sensitive). The full DB error is logged server-side.
        return NextResponse.json({ error: 'Failed to save answers', details: upsertError?.message || String(upsertError) }, { status: 500 });
      }

      // Some rows saved, but some failed - return partial success with counts
      console.warn(`[BATCH-ANSWERS] ${new Date().toISOString()} - Partial upsert: saved=${perRowSaved}, failed=${failedRows.length}`);
      return NextResponse.json({ success: true, saved: perRowSaved, failed: failedRows.length, note: 'Partial save - see server logs for details' }, { status: 207 });
    }

    console.log(`[BATCH-ANSWERS] ${new Date().toISOString()} - Saved ${upserted?.length || 0} answers for attempt=${attemptId} user=${user.id}`);
    return NextResponse.json({ success: true, saved: upserted?.length || 0 });
  } catch (error) {
    console.error('Unexpected error in batch answers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
