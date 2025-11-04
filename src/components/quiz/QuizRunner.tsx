"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  onPhaseChange?: (phase: 'idle' | 'active' | 'completed') => void;
};

export default function QuizRunner({ quizId, lessonId: _lessonId, onCompleted, onPhaseChange }: Props) {
  const supabase = React.useMemo(() => createClient(), []);
  const [loading, setLoading] = React.useState(true);
  const [attemptId, setAttemptId] = React.useState<string | null>(null);
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [quizMeta, setQuizMeta] = React.useState<{ title?: string | null; description?: string | null; passing_score?: number | null; time_limit_minutes?: number | null; questionCount?: number } | null>(null);
  const [phase, setPhase] = React.useState<'idle' | 'active' | 'completed'>('idle');
  const [answers, setAnswers] = React.useState<Record<string, { selected_option_id?: string | null; text_answer?: string | null; is_correct?: boolean | null }>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<null | { score: number; passed: boolean; earned_points?: number; total_points?: number }>(null);
  const [lastAttempt, setLastAttempt] = React.useState<null | { id: string; score: number; passed: boolean; completed_at: string | null }>(null);
  const [startError, setStartError] = React.useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = React.useState<number>(0); // show one question at a time
  const [direction, setDirection] = React.useState<number>(0); // -1 left, 1 right
  const startTimeRef = React.useRef<number>(Date.now());
  const [remainingSeconds, setRemainingSeconds] = React.useState<number | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const timedOutRef = React.useRef<boolean>(false);
  const startingRef = React.useRef<boolean>(false); // prevent double-attempt creation
  const forceRestartRef = React.useRef<boolean>(false); // retake should reuse/reset prior attempt

  // Note: To avoid extra server load, we do not auto-save per answer.

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
          // Auto-submit when time expires (treat unanswered as incorrect)
          timedOutRef.current = true;
          onSubmit({ timedOut: true });
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
      setCurrentIndex(0);
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

  // Notify parent when phase changes
  React.useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  const onSelectOption = (questionId: string, optionId: string) => {
    setAnswers(prev => {
      const next = { ...prev, [questionId]: { selected_option_id: optionId, text_answer: null } };
      return next;
    });
  };

  const onTextAnswer = (questionId: string, text: string) => {
    setAnswers(prev => {
      const next = { ...prev, [questionId]: { selected_option_id: null, text_answer: text } };
      return next;
    });
  };

  const onSubmit = async (opts?: { timedOut?: boolean }) => {
    if (!attemptId) return;
    // Guard: require all questions answered before manual submit
    const total = questions.length;
    const answered = Object.values(answers).filter(a => (a.selected_option_id || (a.text_answer && a.text_answer.trim().length > 0))).length;
    if (phase === 'active' && total > 0 && answered < total && !opts?.timedOut) {
      // Jump to first unanswered for convenience
      const firstUnansweredIdx = questions.findIndex(q => !answers[q.id] || (!answers[q.id]?.selected_option_id && !(answers[q.id]?.text_answer && answers[q.id]!.text_answer!.trim().length > 0)));
      if (firstUnansweredIdx >= 0) setCurrentIndex(firstUnansweredIdx);
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
      // No per-answer debounced upserts; we only batch once here.

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
  const earned_points = Number(row?.earned_points ?? 0);
  const total_points = Number(row?.total_points ?? questions.reduce((acc, q) => acc + (q.points ?? 0), 0));
  setResult({ passed, score, earned_points, total_points } as any);
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
        // Fill missing as incorrect when timed out or unanswered
        questions.forEach(q => {
          if (!merged[q.id]) {
            merged[q.id] = { selected_option_id: null, text_answer: null, is_correct: false };
          }
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
      timedOutRef.current = false;
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
  const qs = (payload ?? []) as any;
  setQuestions(qs as any);
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
  const totalPts = (qs || []).reduce((acc: number, q: any) => acc + (q.points ?? 0), 0);
  const earnedPts = (qs || []).reduce((acc: number, q: any) => acc + ((merged[q.id]?.is_correct ? (q.points ?? 0) : 0)), 0);
  setResult({ score: lastAttempt.score, passed: lastAttempt.passed, earned_points: earnedPts, total_points: totalPts });
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
            <h3 className="text-2xl font-bold text-gray-900">
              {quizMeta?.title || 'Quiz'}
            </h3>
            {/* Quiz details under the title */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {typeof quizMeta?.passing_score === 'number' && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50 border-blue-200">
                  <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4" />
                  </svg>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-blue-800/80">Passing score</div>
                    <div className="text-lg font-semibold text-blue-800">{quizMeta.passing_score}%</div>
                  </div>
                </div>
              )}
              {typeof quizMeta?.time_limit_minutes === 'number' && quizMeta.time_limit_minutes! > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 border-gray-200">
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-600">Time limit</div>
                    <div className="text-lg font-semibold text-gray-800">{quizMeta.time_limit_minutes} min</div>
                  </div>
                </div>
              )}
            </div>
            {quizMeta?.description && (
              <p className="text-gray-600 mt-3 whitespace-pre-line">{quizMeta.description}</p>
            )}
          </div>
          {!lastAttempt && (
            <p className="text-sm text-gray-500">Start the quiz when you’re ready. You can retake it later.</p>
          )}
          {lastAttempt && (
            <div className="mt-4 p-4 rounded-lg border bg-gray-50 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Last result</div>
                <div className="mt-1 flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold ${lastAttempt.passed ? 'bg-white text-green-700 border border-green-200' : 'bg-white text-red-700 border border-red-200'}`}>{Math.round(lastAttempt.score)}%</div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{lastAttempt.passed ? 'Passed' : 'Completed'}</div>
                    <div className="text-gray-600">{lastAttempt.completed_at ? new Date(lastAttempt.completed_at).toLocaleString() : ''}</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reviewLastAttempt}>View Results</Button>
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
          <>
            <div className={`p-5 rounded-xl border ${result.passed ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
              <div className="flex items-center gap-6">
                {/* Large percent with no circle */}
                <div className={`text-4xl font-extrabold ${result.passed ? 'text-green-700' : 'text-red-700'}`}>{Math.round(result.score)}%</div>
                <div className="space-y-1">
                  <div className="font-semibold text-xl">{result.passed ? 'Passed' : 'Completed'}</div>
                  {!!questions.length && (
                    <div className="text-sm opacity-90 flex flex-wrap gap-3">
                      <span>Answered: {Object.values(answers).filter(a => (a.selected_option_id || (a.text_answer && a.text_answer.trim().length > 0))).length}/{questions.length}</span>
                      <span>Correct: {correctCount}/{questions.length}</span>
                      {typeof quizMeta?.passing_score === 'number' && Math.round(result.score) !== quizMeta.passing_score && (
                        <span>Required: {quizMeta.passing_score}%</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Review agenda to jump to any question */}
            {!!questions.length && (
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                {questions.map((q, i) => {
                  const ans = answers[q.id];
                  const ok = ans?.is_correct === true;
                  const bad = ans?.is_correct === false;
                  return (
                    <a
                      key={q.id}
                      href={`#quiz-q-${q.id}`}
                      className={`w-8 h-8 rounded-full text-sm border flex items-center justify-center ${ok ? 'bg-green-50 text-green-800 border-green-200' : bad ? 'bg-red-50 text-red-800 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                      title={`Question ${i + 1}`}
                    >
                      {i + 1}
                    </a>
                  );
                })}
              </div>
            )}
          </>
      )}

      {/* Active phase: single-question view with agenda and nav */}
      {phase === 'active' && (
        <>
          {!questions.length && (
            <div className="p-6 text-center text-gray-500">No questions available for this quiz.</div>
          )}

          {!!questions.length && (
            <>
              {/* Question agenda */}
              <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 py-1">
                {questions.map((q, i) => {
                  const a = answers[q.id];
                  const answered = !!(a?.selected_option_id || (a?.text_answer && a.text_answer.trim().length > 0));
                  const isCurrent = i === currentIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); }}
                      className={`flex-shrink-0 w-8 h-8 rounded-full text-sm border transition ${isCurrent ? 'bg-blue-600 text-white border-blue-600' : answered ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                      title={`Question ${i + 1}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              {/* Current question */}
              {(() => {
                const q = questions[currentIndex];
                if (!q) return null;
                return (
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={q.id}
                      id={`quiz-q-${q.id}`}
                      className="mt-4 border border-gray-200 rounded-lg p-4 sm:p-5 bg-white shadow-sm pb-24 sm:pb-0"
                      initial={{ x: direction * 40, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -direction * 40, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-medium text-gray-800 text-base sm:text-lg">Q{currentIndex + 1}. {q.content}</div>
                      {typeof q.points === 'number' && <div className="text-sm text-gray-500">{q.points} pts</div>}
                    </div>

                    {q.type === 'multiple_choice' && (
                      <div className="mt-3 space-y-2">
                        {(q.question_options || []).sort((a,b) => (a.position ?? 0) - (b.position ?? 0)).map(opt => (
                          <label key={opt.id} className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-3 border border-gray-200 hover:bg-gray-50">
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              className="h-5 w-5"
                              checked={answers[q.id]?.selected_option_id === opt.id}
                              onChange={() => onSelectOption(q.id, opt.id)}
                            />
                            <span className="text-gray-800 text-sm sm:text-base">{opt.content}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === 'true_false' && (
                      <div className="mt-3 space-y-2">
                        {['True','False'].map((label, i) => (
                          <label key={label} className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-3 border border-gray-200 hover:bg-gray-50">
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              className="h-5 w-5"
                              checked={answers[q.id]?.selected_option_id === (q.question_options?.[i]?.id || '')}
                              onChange={() => {
                                const optId = q.question_options?.[i]?.id;
                                if (optId) onSelectOption(q.id, optId);
                              }}
                            />
                            <span className="text-sm sm:text-base">{label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === 'short_answer' && (
                      <div className="mt-3">
                        <textarea
                          className="w-full border border-gray-300 rounded-md p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-200"
                          rows={3}
                          value={answers[q.id]?.text_answer || ''}
                          onChange={(e) => onTextAnswer(q.id, e.target.value)}
                          placeholder="Type your answer"
                        />
                      </div>
                    )}

                    {/* Navigation (hidden on mobile, shown on sm+) */}
                    <div className="hidden sm:flex mt-4 items-center justify-between gap-3">
                      <Button variant="outline" disabled={currentIndex === 0} onClick={() => { setDirection(-1); setCurrentIndex(i => Math.max(0, i - 1)); }}>Previous</Button>
                      <div className="flex items-center gap-3">
                        {questions.length > 0 && answeredCount < questions.length && (
                          <div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                            {questions.length - answeredCount} remaining
                          </div>
                        )}
                        {currentIndex < questions.length - 1 ? (
                          <Button variant="outline" onClick={() => { setDirection(1); setCurrentIndex(i => Math.min(questions.length - 1, i + 1)); }}>Next</Button>
                        ) : null}
                        <Button onClick={() => onSubmit()} disabled={submitting || answeredCount < questions.length} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-60">
                          {submitting ? 'Submitting…' : 'Submit'}
                        </Button>
                      </div>
                    </div>
                    </motion.div>
                  </AnimatePresence>
                );
              })()}
            </>
          )}
        </>
      )}

      {/* Review phase: show correct/incorrect after completion */}
      {phase === 'completed' && (
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const ans = answers[q.id];
            const isCorrect = ans?.is_correct ?? null;
            const totalPts = Number(q.points ?? 0);
            return (
              <div key={q.id} className={`border rounded-md p-4 ${isCorrect === true ? 'border-green-200 bg-green-50' : isCorrect === false ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                {/* Header with optional required points (no gained points) */}
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-gray-800">Q{idx + 1}. {q.content}</div>
                  {typeof q.points === 'number' && <div className="text-sm text-gray-600">Required: {totalPts} pts</div>}
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

      {/* Mobile fixed bottom bar for active quiz */}
      {phase === 'active' && (
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 bg-white border-t shadow-lg p-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={currentIndex === 0}
              onClick={() => { setDirection(-1); setCurrentIndex(i => Math.max(0, i - 1)); }}
              className="flex-1"
            >
              Previous
            </Button>
            {currentIndex < questions.length - 1 ? (
              <Button
                variant="outline"
                onClick={() => { setDirection(1); setCurrentIndex(i => Math.min(questions.length - 1, i + 1)); }}
                className="flex-1"
              >
                Next
              </Button>
            ) : (
              <div className="flex-1" />
            )}
            <Button
              onClick={() => onSubmit()}
              disabled={submitting || answeredCount < questions.length}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
          </div>
          {questions.length > 0 && answeredCount < questions.length && (
            <div className="mt-2 text-center text-xs text-orange-700">
              {questions.length - answeredCount} remaining
            </div>
          )}
        </div>
      )}
    </div>
  );
}
