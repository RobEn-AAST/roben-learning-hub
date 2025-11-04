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
  const [lastAttempt, setLastAttempt] = React.useState<null | { id: string; score: number; passed: boolean; completed_at: string | null }>(null);
  const [startError, setStartError] = React.useState<string | null>(null);
  const startTimeRef = React.useRef<number>(Date.now());
  const [remainingSeconds, setRemainingSeconds] = React.useState<number | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const startingRef = React.useRef<boolean>(false); // prevent double-attempt creation
  const forceRestartRef = React.useRef<boolean>(false); // retake should reuse/reset prior attempt

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

        // Also fetch the latest completed attempt (lightweight, 1 row)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: la } = await supabase
            .from('quiz_attempts')
            .select('id, score, passed, completed_at')
            .eq('quiz_id', quizId)
            .eq('user_id', user.id)
            .not('completed_at','is', null)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (la && mounted) {
            setLastAttempt({ id: la.id, score: Number(la.score ?? 0), passed: !!la.passed, completed_at: la.completed_at });
          }
        }
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
      if (!user) {
        setStartError('Please sign in to start the quiz.');
        return;
      }

      // Attempt reuse via localStorage key to reduce multi-tab races
      const storageKey = `quiz_attempt:${user.id}:${quizId}`;
      let id: string | undefined = undefined;
      try {
        const stored = (typeof window !== 'undefined') ? window.localStorage.getItem(storageKey) : null;
        if (stored) {
          const { data: open } = await supabase
            .from('quiz_attempts')
            .select('id')
            .eq('id', stored)
            .is('completed_at', null)
            .maybeSingle();
          if (open?.id) {
            id = open.id;
          } else {
            // stale id; clear it
            if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey);
          }
        }
      } catch {}

      // Ensure there's exactly one open attempt for this (user, quiz); optionally force a restart to reuse/reset prior attempt
      if (!id) {
        try {
          let ensured: any = null;
          if (forceRestartRef.current) {
            const { data, error } = await supabase.rpc('restart_quiz_attempt', { p_quiz_id: quizId });
            if (error) throw error;
            ensured = data;
          } else {
            const { data, error } = await supabase.rpc('ensure_quiz_attempt', { p_quiz_id: quizId });
            if (error) throw error;
            ensured = data;
          }
          const row: any = Array.isArray(ensured) ? ensured[0] : ensured;
          id = row?.id as string | undefined;
          forceRestartRef.current = false;
          // On start, clear lastAttempt for fresh run (user can still review after submit)
          setLastAttempt(null);
        } catch (eEnsure) {
          console.error('Failed to ensure/open quiz attempt:', eEnsure);
          setStartError('Could not start quiz. Please refresh the page and try again.');
          return;
        }
      }

      if (!id) {
        setStartError('Could not get an attempt. Please try again.');
        return;
      }

      setAttemptId(id);
      try { if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, id); } catch {}

      // Fetch questions via RPC that bundles payload and checks attempt authorization server-side
      const { data: payload, error: qErr } = await supabase.rpc('get_quiz_payload', { p_quiz_id: quizId });
      if (qErr) {
        console.warn('get_quiz_payload RPC failed, falling back to direct select:', qErr);
        // Fallback: direct PostgREST select (minimal fields, no is_correct)
        const { data: qs2, error: qErr2 } = await supabase
          .from('questions')
          .select('id, content, type, points, position, question_options(id, content, position)')
          .eq('quiz_id', quizId)
          .order('position', { ascending: true });
        if (qErr2) throw qErr2;
        setQuestions((qs2 || []) as any);
      } else {
        const qs = (payload ?? []) as any[];
        setQuestions(qs as any);
      }

      // Reset answers and result state
      setAnswers({});
      setResult(null);
      setStartError(null);
      startTimeRef.current = Date.now();
      setPhase('active');
      startTimer(quizMeta?.time_limit_minutes ?? null);
    } catch (e) {
      const anyErr: any = e;
      const msg = anyErr?.message || anyErr?.hint || anyErr?.details || (typeof anyErr === 'string' ? anyErr : 'Unknown error');
      console.error('Failed to start quiz:', anyErr);
      setStartError(`Could not start quiz: ${msg}`);
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
    // Guard: require all questions answered before manual submit
    const total = questions.length;
    const answered = Object.values(answers).filter(a => (a.selected_option_id || (a.text_answer && a.text_answer.trim().length > 0))).length;
    if (phase === 'active' && total > 0 && answered < total) {
      // Scroll to first unanswered for convenience
      const unansweredId = questions.find(q => !answers[q.id] || (!answers[q.id]?.selected_option_id && !(answers[q.id]?.text_answer && answers[q.id]!.text_answer!.trim().length > 0)))?.id;
      if (unansweredId) {
        try {
          const el = document.getElementById(`quiz-q-${unansweredId}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {}
      }
      alert('Please answer all questions before submitting the quiz.');
      return;
    }
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
  // Save as lastAttempt to show in idle upon revisit
  setLastAttempt({ id: attemptId, score, passed, completed_at: new Date().toISOString() });
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

      // Clear attempt cache so a retake can open a new attempt
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const storageKey = `quiz_attempt:${user.id}:${quizId}`;
          if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey);
        }
      } catch {}
    } catch (e) {
      console.error('Submit quiz failed:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const reviewLastAttempt = React.useCallback(async () => {
    try {
      if (!lastAttempt) return;
      setLoading(true);
      const id = lastAttempt.id;
      setAttemptId(id);
      // Load questions (no is_correct in options)
      const { data: payload, error: qErr } = await supabase.rpc('get_quiz_payload', { p_quiz_id: quizId });
      if (qErr) throw qErr;
      setQuestions((payload ?? []) as any);
      // Load answers for that attempt
      const { data: ua, error: uaErr } = await supabase
        .from('user_answers')
        .select('question_id, selected_option_id, text_answer, is_correct')
        .eq('attempt_id', id);
      if (uaErr) throw uaErr;
      const merged: Record<string, { selected_option_id?: string | null; text_answer?: string | null; is_correct?: boolean | null }> = {};
      (ua || []).forEach(a => {
        merged[a.question_id] = { selected_option_id: a.selected_option_id || null, text_answer: a.text_answer || null, is_correct: a.is_correct ?? null };
      });
      setAnswers(merged);
      setResult({ score: lastAttempt.score, passed: lastAttempt.passed });
      setPhase('completed');
    } catch (e) {
      console.error('Failed to review last attempt:', e);
      setStartError('Could not load last attempt for review.');
    } finally {
      setLoading(false);
    }
  }, [lastAttempt, quizId, supabase]);

  React.useEffect(() => {
    return () => {
      // cleanup timer on unmount
      if (timerRef.current) clearInterval(timerRef.current);
      if (upsertTimeout.current) clearTimeout(upsertTimeout.current);
    };
  }, []);

  // Derived counts must be declared before any early return to preserve hook order
  const answeredCount = React.useMemo(() => {
    return Object.values(answers).filter(a => (a.selected_option_id || (a.text_answer && a.text_answer.trim().length > 0))).length;
  }, [answers]);

  const correctCount = React.useMemo(() => {
    return Object.values(answers).filter(a => a.is_correct === true).length;
  }, [answers]);

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
        <div className="max-w-3xl mx-auto border rounded-lg p-6 bg-white shadow-sm">
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {quizMeta?.title || 'Quiz'}
              {typeof quizMeta?.passing_score === 'number' && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Pass {quizMeta.passing_score}%</span>
              )}
              {typeof quizMeta?.time_limit_minutes === 'number' && quizMeta.time_limit_minutes! > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200">{quizMeta.time_limit_minutes} min</span>
              )}
            </h3>
            {quizMeta?.description && (
              <p className="text-gray-600 mt-1 whitespace-pre-line">{quizMeta.description}</p>
            )}
          </div>
          {!lastAttempt && (
            <p className="text-sm text-gray-500">Start the quiz when you’re ready. You can retake it later.</p>
          )}
          {lastAttempt && (
            <div className="mt-4 p-3 rounded-md border flex items-center justify-between bg-gray-50">
              <div className="text-sm">
                <div className="font-semibold text-gray-900">Last result: {lastAttempt.score}%</div>
                <div className={`text-sm ${lastAttempt.passed ? 'text-green-700' : 'text-red-700'}`}>
                  {lastAttempt.passed ? 'Passed' : 'Completed'} {lastAttempt.completed_at ? `• ${new Date(lastAttempt.completed_at).toLocaleString()}` : ''}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reviewLastAttempt}>Review</Button>
                <Button onClick={() => { forceRestartRef.current = true; startQuiz(); }} className="bg-blue-600 hover:bg-blue-700 text-white">Start New Attempt</Button>
              </div>
            </div>
          )}
          {startError && (
            <div className="mt-4 text-sm text-red-600">{startError}</div>
          )}
          {!lastAttempt && (
            <div className="mt-6 flex justify-end">
              <Button onClick={startQuiz} className="bg-blue-600 hover:bg-blue-700 text-white">Start Quiz</Button>
            </div>
          )}
        </div>
      )}

      {/* Header with timer during active phase */}
      {phase === 'active' && (
        <div className="p-3 rounded-lg bg-blue-50 text-blue-800 border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="font-medium flex items-center gap-3">
              <span>Quiz in progress</span>
              {!!questions.length && <span className="text-blue-700/80 text-sm">{answeredCount}/{questions.length} answered</span>}
            </div>
            {typeof remainingSeconds === 'number' && remainingSeconds >= 0 && (
              <div className="font-mono text-lg">{formatTime(remainingSeconds)}</div>
            )}
          </div>
          {!!questions.length && (
            <div className="mt-2 w-full h-1.5 bg-white/70 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, Math.round((answeredCount / questions.length) * 100))}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Completed banner */}
      {phase === 'completed' && result && (
        <div className={`p-4 rounded-lg border ${result.passed ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${result.passed ? 'bg-white text-green-700 border border-green-200' : 'bg-white text-red-700 border border-red-200'}`}>{Math.round(result.score)}%</div>
            <div>
              <div className="font-semibold text-lg">{result.passed ? 'Passed' : 'Completed'}</div>
              {!!questions.length && (
                <div className="text-sm opacity-90">{correctCount}/{questions.length} correct</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active phase: questions rendering */}
      {phase === 'active' && (
        <>
          {!questions.length && (
            <div className="p-6 text-center text-gray-500">No questions available for this quiz.</div>
          )}
          {questions.map((q, idx) => (
            <div key={q.id} id={`quiz-q-${q.id}`} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-start justify-between">
                <div className="font-medium text-gray-800">Q{idx + 1}. {q.content}</div>
                {typeof q.points === 'number' && <div className="text-sm text-gray-500">{q.points} pts</div>}
              </div>

              {/* Options */}
              {q.type === 'multiple_choice' && (
                <div className="mt-3 space-y-2">
                  {(q.question_options || []).sort((a,b) => (a.position ?? 0) - (b.position ?? 0)).map(opt => (
                    <label key={opt.id} className="flex items-center gap-3 cursor-pointer rounded-md px-3 py-2 border border-gray-200 hover:bg-gray-50">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        className="h-4 w-4"
                        checked={answers[q.id]?.selected_option_id === opt.id}
                        onChange={() => onSelectOption(q.id, opt.id)}
                      />
                      <span className="text-gray-800">{opt.content}</span>
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
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    rows={3}
                    value={answers[q.id]?.text_answer || ''}
                    onChange={(e) => onTextAnswer(q.id, e.target.value)}
                    placeholder="Type your answer"
                  />
                </div>
              )}
            </div>
          ))}

          <div className="flex items-center justify-end gap-3 pt-2">
            {questions.length > 0 && answeredCount < questions.length && (
              <div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                {questions.length - answeredCount} question{questions.length - answeredCount === 1 ? '' : 's'} remaining
              </div>
            )}
            <Button onClick={onSubmit} disabled={submitting || answeredCount < questions.length} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-60">
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
            <Button onClick={() => { forceRestartRef.current = true; setPhase('idle'); setQuestions([]); setAnswers({}); setResult(null); }} variant="outline">Retake Quiz</Button>
          </div>
        </div>
      )}
    </div>
  );
}
