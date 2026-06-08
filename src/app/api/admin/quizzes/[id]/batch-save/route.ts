import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/adminHelpers';

/**
 * PUT /api/admin/quizzes/[id]/batch-save
 *
 * Single-request batch save for an entire quiz (settings + questions + options).
 * Replaces 16+ individual API calls with 1 auth check + batch DB operations.
 */
export async function PUT(
  request: NextRequest,
  { params }: any
) {
  const { id } = await params;

  try {
    // ── Single auth + role check ──────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!['admin', 'instructor'].includes(profile?.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const admin = createAdminClient();
    const body = await request.json();
    const {
      quiz: quizData,
      questions: questionsData = [],
      deletedQuestionIds = [],
      deletedOptionIds = [],
    } = body;

    // ── 1. Update quiz settings ───────────────────────────────────────────
    if (quizData) {
      const { error: quizError } = await admin
        .from('quizzes')
        .update({
          title: quizData.title,
          description: quizData.description,
          time_limit_minutes: quizData.timeLimitMinutes,
          passing_score: quizData.passingScore,
        })
        .eq('id', id);

      if (quizError) {
        return NextResponse.json(
          { error: `Quiz update failed: ${quizError.message}` },
          { status: 500 }
        );
      }
    }

    // ── 2. Delete removed items FIRST (before anything that might fail) ───
    if (deletedOptionIds.length > 0) {
      await admin.from('question_options').delete().in('id', deletedOptionIds);
    }
    if (deletedQuestionIds.length > 0) {
      await admin.from('questions').delete().in('id', deletedQuestionIds);
    }

    // ── 3. Separate new vs existing questions ─────────────────────────────
    const existingUpdates: any[] = [];
    const newInserts: any[] = [];
    const questionIdMap: Record<number, string> = {}; // position → persisted ID

    for (let i = 0; i < questionsData.length; i++) {
      const q = questionsData[i];
      if (q.id) {
        questionIdMap[i] = q.id;
        existingUpdates.push({
          id: q.id,
          quiz_id: id,
          content: q.content,
          type: q.type,
          points: q.points,
          position: i,
        });
      } else {
        newInserts.push({
          quiz_id: id,
          content: q.content,
          type: q.type,
          points: q.points,
          position: i,
        });
      }
    }

    // ── 4. Batch upsert existing questions ────────────────────────────────
    if (existingUpdates.length > 0) {
      const { error } = await admin.from('questions').upsert(existingUpdates);
      if (error) {
        return NextResponse.json(
          { error: `Questions update failed: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // ── 5. Batch insert new questions ─────────────────────────────────────
    if (newInserts.length > 0) {
      const { data: inserted, error } = await admin
        .from('questions')
        .insert(newInserts)
        .select('id, position');

      if (error) {
        return NextResponse.json(
          { error: `Questions create failed: ${error.message}` },
          { status: 500 }
        );
      }

      // Map positions to new IDs
      for (const row of inserted) {
        questionIdMap[row.position] = row.id;
      }
    }

    // ── 6. Separate new vs existing options ───────────────────────────────
    const existingOptions: any[] = [];
    const newOptions: { questionIndex: number; optionIndex: number; data: any }[] = [];

    for (let i = 0; i < questionsData.length; i++) {
      const q = questionsData[i];
      const questionId = questionIdMap[i];
      if (!questionId || !q.options) continue;

      for (let j = 0; j < q.options.length; j++) {
        const opt = q.options[j];
        const optData = {
          question_id: questionId,
          content: opt.text,
          is_correct: opt.isCorrect,
          position: opt.position,
        };

        if (opt.id) {
          existingOptions.push({ id: opt.id, ...optData });
        } else {
          newOptions.push({ questionIndex: i, optionIndex: j, data: optData });
        }
      }
    }

    // ── 7. Batch upsert existing options ──────────────────────────────────
    if (existingOptions.length > 0) {
      const { error } = await admin.from('question_options').upsert(existingOptions);
      if (error) {
        return NextResponse.json(
          { error: `Options update failed: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // ── 8. Batch insert new options (plain insert — DB generates UUID) ────
    const optionIdMap: Record<string, string> = {}; // "questionIdx-optionIdx" → new id

    if (newOptions.length > 0) {
      const { data: insertedOpts, error } = await admin
        .from('question_options')
        .insert(newOptions.map((o) => o.data))
        .select('id');

      if (error) {
        return NextResponse.json(
          { error: `Options create failed: ${error.message}` },
          { status: 500 }
        );
      }

      // Map inserted option IDs back to their question/option positions
      for (let k = 0; k < newOptions.length; k++) {
        if (insertedOpts?.[k]) {
          const key = `${newOptions[k].questionIndex}-${newOptions[k].optionIndex}`;
          optionIdMap[key] = insertedOpts[k].id;
        }
      }
    }

    return NextResponse.json({ success: true, questionIdMap, optionIdMap });
  } catch (error) {
    console.error('Batch quiz save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
