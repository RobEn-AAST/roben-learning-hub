"use client";

import React from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

type Question = {
  id: string;
  content: string;
  type: 'multiple_choice' | 'short_answer' | 'true_false' | string;
  points?: number | null;
  position?: number | null;
  question_options?: Array<{
    id: string;
    content: string;
    is_correct?: boolean | null; // ignored in UI
    position?: number | null;
  }>;
};

type Props = {
  quizId: string;
  lessonId: string;
  onCompleted?: () => void; // called when attempt completed and lesson should be marked complete
};

export default function QuizRunner({ quizId, lessonId, onCompleted }: Props) {
  const supabase = React.useMemo(() => createClient(), []);
  const [loading, setLoading] = React.useState(true);
  const [attemptId, setAttemptId] = React.useState<string | null>(null);
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [quizMeta, setQuizMeta] = React.useState<{ title?: string | null; description?: string | null; passing_score?: number | null; time_limit_minutes?: number | null; questionCount?: number } | null>(null);
  const [phase, setPhase] = React.useState<'idle' | 'active' | 'completed'>('idle');
  const [answers, setAnswers] = React.useState<Record<string, { selected_option_id?: string | null; text_answer?: string | null; is_correct?: boolean | null }>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<null | { score: number; passed: boolean }>(null);
  const startTimeRef = React.useRef<number>(Date.now());
  const [remainingSeconds, setRemainingSeconds] = React.useState<number | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const startingRef = React.useRef<boolean>(false); // prevent double-attempt creation

  // Debounce upsert of answers to reduce writes
  const upsertTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedUpsert = React.useCallback((payload: Array<any>) => {
    if (!attemptId || payload.length === 0) return;
    if (upsertTimeout.current) clearTimeout(upsertTimeout.current);
    upsertTimeout.current = setTimeout(async () => {
      try {
        await supabase.rpc('upsert_user_answers_and_update_attempt', {
          p_attempt_id: attemptId,
          p_answers: payload,
        });
      } catch (e) {
        console.warn('Quiz upsert answers failed:', e);
      }
    }, 400);
  }, [attemptId, supabase]);

  // Initial light fetch of quiz metadata and question count only
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: meta, error: mErr } = await supabase
          .from('quizzes')
          .select('title, description, passing_score, time_limit_minutes')
          .eq('id', quizId)
          .single();
        if (mErr) throw mErr;
        if (!mounted) return;
        setQuizMeta({
          title: meta?.title ?? null,
          description: meta?.description ?? null,
          passing_score: meta?.passing_score ?? null,
          time_limit_minutes: meta?.time_limit_minutes ?? null,
        });
      } catch (e) {
        console.error('Failed to load quiz meta:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [quizId, supabase]);

  const startTimer = React.useCallback((minutes?: number | null) => {
    if (!minutes || minutes <= 0) return;
    const total = Math.max(1, Math.round(minutes * 60));
    setRemainingSeconds(total);
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        const next = (prev ?? total) - 1;
        if (next <= 0) {
          timerRef.current && clearInterval(timerRef.current);
          // Auto-submit when time expires
          onSubmit();
          return 0;
        }
        return next;
      });
    }, 1000);
  }, []);

  const startQuiz = React.useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Reuse latest in-progress attempt, else create one
      const { data: existing, error: e1 } = await supabase
        .from('quiz_attempts')
        .select('id')
        .eq('quiz_id', quizId)
        .eq('user_id', user.id)
        .is('completed_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (e1 && e1.code !== 'PGRST116') console.warn('Fetch attempt error:', e1);

      let id = existing?.id as string | undefined;
      if (!id) {
        const { data: inserted, error: e2 } = await supabase
          .from('quiz_attempts')
          .insert({ quiz_id: quizId, user_id: user.id })
          .select('id')
          .single();
        if (e2) throw e2;
        id = inserted!.id;
      }
      setAttemptId(id!);

      // Fetch questions now that attempt exists (RLS-friendly)
      const { data: qs, error: qErr } = await supabase
        .from('questions')
        // Do NOT fetch is_correct during the active attempt to avoid leaking answers
        .select('id, content, type, points, position, question_options(id, content, position)')
        .eq('quiz_id', quizId)
        .order('position', { ascending: true });
      if (qErr) throw qErr;
      setQuestions((qs || []) as any);

      // Reset answers and result state
      setAnswers({});
      setResult(null);
      startTimeRef.current = Date.now();
      setPhase('active');
      startTimer(quizMeta?.time_limit_minutes ?? null);
    } catch (e) {
      console.error('Failed to start quiz:', e);
    } finally {
      startingRef.current = false;
    }
  }, [quizId, supabase, quizMeta?.time_limit_minutes, startTimer]);

  const onSelectOption = (questionId: string, optionId: string) => {
    setAnswers(prev => {
      const next = { ...prev, [questionId]: { selected_option_id: optionId, text_answer: null } };
      return next;
    });
    // Upsert just this one change
    debouncedUpsert([{ questionId: questionId, selectedOptionId: optionId, answeredAt: new Date().toISOString() }]);
  };

  const onTextAnswer = (questionId: string, text: string) => {
    setAnswers(prev => {
      const next = { ...prev, [questionId]: { selected_option_id: null, text_answer: text } };
      return next;
    });
    // Upsert just this one change
    debouncedUpsert([{ questionId: questionId, textAnswer: text, answeredAt: new Date().toISOString() }]);
  };

  const onSubmit = async () => {
    if (!attemptId) return;
    setSubmitting(true);
    try {
      // Stop timer if running
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Ensure any pending debounced upserts flush first
      if (upsertTimeout.current) {
        clearTimeout(upsertTimeout.current);
        upsertTimeout.current = null;
      }

      // Optionally batch up any answers in state that may not have been persisted
      const pending: Array<any> = [];
      Object.entries(answers).forEach(([qid, val]) => {
        pending.push({ questionId: qid, selectedOptionId: val.selected_option_id || null, textAnswer: val.text_answer || null, answeredAt: new Date().toISOString() });
      });
      if (pending.length) {
        await supabase.rpc('upsert_user_answers_and_update_attempt', {
          p_attempt_id: attemptId,
          p_answers: pending,
        });
      }

      const seconds = Math.max(0, Math.round((Date.now() - startTimeRef.current) / 1000));
      const { data, error } = await supabase.rpc('calculate_quiz_score_and_complete', {
        p_attempt_id: attemptId,
        p_time_taken_seconds: seconds,
      });
      if (error) throw error;

      // data is a table return: { earned_points, total_points, score, passed, attempt }
      const row = Array.isArray(data) ? data[0] : data;
      const passed = !!row?.passed;
      const score = Number(row?.score ?? 0);
      setResult({ passed, score });
      setPhase('completed');

      // Build review data: mark answers correctness using user_answers
      try {
        const { data: ua } = await supabase
          .from('user_answers')
          .select('question_id, selected_option_id, text_answer, is_correct')
          .eq('attempt_id', attemptId);
        // Merge into answers state for highlighting after completion
        const merged: Record<string, { selected_option_id?: string | null; text_answer?: string | null; is_correct?: boolean | null }> = {};
        (ua || []).forEach(a => {
          merged[a.question_id] = { selected_option_id: a.selected_option_id || null, text_answer: a.text_answer || null, is_correct: a.is_correct ?? null };
        });
        setAnswers(prev => ({ ...prev, ...merged }));
      } catch (e) {
        console.warn('Could not load review answers:', e);
      }

      if (passed && onCompleted) {
        onCompleted();
      }
    } catch (e) {
      console.error('Submit quiz failed:', e);
    } finally {
      setSubmitting(false);
    }
  };

  React.useEffect(() => {
    return () => {
      // cleanup timer on unmount
      if (timerRef.current) clearInterval(timerRef.current);
      if (upsertTimeout.current) clearTimeout(upsertTimeout.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">Loading quiz…</div>
    );
  }

  const formatTime = (s: number) => {
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <div className="space-y-6">
      {/* Idle: Start screen with metadata */}
      {phase === 'idle' && (
        <div className="max-w-3xl mx-auto border rounded-md p-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-800">{quizMeta?.title || 'Quiz'}</h3>
            {quizMeta?.description && (
              <p className="text-gray-600 mt-1 whitespace-pre-line">{quizMeta.description}</p>
            )}
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            {typeof quizMeta?.passing_score === 'number' && <li>Passing score: {quizMeta.passing_score}%</li>}
            {typeof quizMeta?.time_limit_minutes === 'number' && quizMeta.time_limit_minutes! > 0 && (
              <li>Time limit: {quizMeta.time_limit_minutes} min</li>
            )}
          </ul>
          <div className="mt-6 flex justify-end">
            <Button onClick={startQuiz} className="bg-blue-600 hover:bg-blue-700 text-white">Start Quiz</Button>
          </div>
        </div>
      )}

      {/* Header with timer during active phase */}
      {phase === 'active' && (
        <div className="flex items-center justify-between p-3 rounded-md bg-blue-50 text-blue-800">
          <div className="font-medium flex items-center gap-3">
            <span>Quiz in progress</span>
            {!!questions.length && <span className="text-blue-700/80 text-sm">Questions: {questions.length}</span>}
          </div>
          {typeof remainingSeconds === 'number' && remainingSeconds >= 0 && (
            <div className="font-mono text-lg">{formatTime(remainingSeconds)}</div>
          )}
        </div>
      )}

      {/* Completed banner */}
      {phase === 'completed' && result && (
        <div className={`p-4 rounded-md ${result.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <div className="font-semibold">Quiz {result.passed ? 'Passed' : 'Completed'}</div>
          <div>Score: {result.score}%</div>
        </div>
      )}

      {/* Active phase: questions rendering */}
      {phase === 'active' && (
        <>
          {!questions.length && (
            <div className="p-6 text-center text-gray-500">No questions available for this quiz.</div>
          )}
          {questions.map((q, idx) => (
            <div key={q.id} className="border border-gray-200 rounded-md p-4">
              <div className="flex items-start justify-between">
                <div className="font-medium text-gray-800">Q{idx + 1}. {q.content}</div>
                {typeof q.points === 'number' && <div className="text-sm text-gray-500">{q.points} pts</div>}
              </div>

              {/* Options */}
              {q.type === 'multiple_choice' && (
                <div className="mt-3 space-y-2">
                  {(q.question_options || []).sort((a,b) => (a.position ?? 0) - (b.position ?? 0)).map(opt => (
                    <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        className="h-4 w-4"
                        checked={answers[q.id]?.selected_option_id === opt.id}
                        onChange={() => onSelectOption(q.id, opt.id)}
                      />
                      <span>{opt.content}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'true_false' && (
                <div className="mt-3 space-y-2">
                  {['True','False'].map((label, i) => (
                    <label key={label} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        className="h-4 w-4"
                        checked={answers[q.id]?.selected_option_id === (q.question_options?.[i]?.id || '')}
                        onChange={() => {
                          const optId = q.question_options?.[i]?.id;
                          if (optId) onSelectOption(q.id, optId);
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'short_answer' && (
                <div className="mt-3">
                  <textarea
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    rows={3}
                    value={answers[q.id]?.text_answer || ''}
                    onChange={(e) => onTextAnswer(q.id, e.target.value)}
                    placeholder="Type your answer"
                  />
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <Button onClick={onSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? 'Submitting…' : 'Submit Quiz'}
            </Button>
          </div>
        </>
      )}

      {/* Review phase: show correct/incorrect after completion */}
      {phase === 'completed' && (
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const ans = answers[q.id];
            const isCorrect = ans?.is_correct ?? null;
            return (
              <div key={q.id} className={`border rounded-md p-4 ${isCorrect === true ? 'border-green-200 bg-green-50' : isCorrect === false ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="font-medium text-gray-800">Q{idx + 1}. {q.content}</div>
                  {typeof q.points === 'number' && <div className="text-sm text-gray-500">{q.points} pts</div>}
                </div>
                {q.type !== 'short_answer' ? (
                  <div className="mt-3 space-y-2">
                    {(q.question_options || []).sort((a,b) => (a.position ?? 0) - (b.position ?? 0)).map(opt => {
                      const selected = ans?.selected_option_id === opt.id;
                      const showGreen = selected && isCorrect === true;
                      const showRed = selected && isCorrect === false;
                      return (
                        <div key={opt.id} className={`flex items-center gap-2 px-2 py-1 rounded ${selected ? 'ring-1 ring-blue-300' : ''}`}>
                          <div className={`w-2 h-2 rounded-full ${showGreen ? 'bg-green-500' : showRed ? 'bg-red-500' : 'bg-gray-300'}`} />
                          <span className={showGreen ? 'font-medium' : ''}>{opt.content}</span>
                          {selected && (
                            <span className={`ml-auto text-xs ${showGreen ? 'text-green-700' : showRed ? 'text-red-700' : 'text-gray-500'}`}>
                              Your choice
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="text-sm">Your answer:</div>
                    <div className={`p-2 rounded border ${isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>{ans?.text_answer || '—'}</div>
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex justify-end">
            <Button onClick={() => { setPhase('idle'); setAttemptId(null); setQuestions([]); setAnswers({}); setResult(null); }} variant="outline">Retake Quiz</Button>
          </div>
        </div>
      )}
    </div>
  );
}
