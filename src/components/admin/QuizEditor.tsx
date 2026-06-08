'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  HelpCircle,
  Circle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

// ============================================================================
// Types
// ============================================================================

type QuestionType = 'multiple_choice' | 'short_answer' | 'true_false';

interface LessonData {
  id: string;
  title: string;
  lesson_type: string;
  [key: string]: unknown;
}

interface QuizEditorProps {
  lessonId: string;
  lesson: LessonData;
  onSave: () => void;
  onDirtyChange: (dirty: boolean) => void;
  registerSave?: (fn: (() => Promise<void>) | null) => void;
  registerUndo?: (fn: (() => void) | null) => void;
}

interface QuizData {
  id: string | null;
  title: string;
  description: string;
  passingScore: number;
  timeLimitMinutes: number | null;
}

interface OptionData {
  id: string | null; // null = new, not yet persisted
  text: string;
  isCorrect: boolean;
  position: number;
  _deleted?: boolean;
}

interface QuestionData {
  id: string | null; // null = new, not yet persisted
  _key: string; // stable key for React rendering
  content: string;
  type: QuestionType;
  points: number;
  position: number;
  options: OptionData[];
  collapsed: boolean;
  _deleted?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const QUESTION_TYPE_COLORS: Record<QuestionType, string> = {
  multiple_choice: 'bg-blue-100 text-blue-700 border-blue-200',
  true_false: 'bg-amber-100 text-amber-700 border-amber-200',
  short_answer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createDefaultQuestion(position: number, type: QuestionType = 'multiple_choice'): QuestionData {
  const options: OptionData[] =
    type === 'true_false'
      ? [
          { id: null, text: 'True', isCorrect: true, position: 0 },
          { id: null, text: 'False', isCorrect: false, position: 1 },
        ]
      : type === 'multiple_choice'
        ? [
            { id: null, text: '', isCorrect: true, position: 0 },
            { id: null, text: '', isCorrect: false, position: 1 },
          ]
        : [];

  return {
    id: null,
    _key: generateTempId(),
    content: '',
    type,
    points: 1,
    position,
    options,
    collapsed: false,
  };
}

function deepCloneQuestions(questions: QuestionData[]): QuestionData[] {
  return questions.map((q) => ({
    ...q,
    options: q.options.map((o) => ({ ...o })),
  }));
}

function questionsAreEqual(a: QuestionData[], b: QuestionData[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].content !== b[i].content) return false;
    if (a[i].type !== b[i].type) return false;
    if (a[i].points !== b[i].points) return false;
    if (a[i].options.length !== b[i].options.length) return false;
    for (let j = 0; j < a[i].options.length; j++) {
      if (a[i].options[j].text !== b[i].options[j].text) return false;
      if (a[i].options[j].isCorrect !== b[i].options[j].isCorrect) return false;
    }
  }
  return true;
}

// ============================================================================
// Main Component
// ============================================================================

export function QuizEditor({ lessonId, lesson, onSave, onDirtyChange, registerSave, registerUndo }: QuizEditorProps) {
  const supabase = createClient();

  // Loading state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  // Quiz-level state
  const [quiz, setQuiz] = useState<QuizData>({
    id: null,
    title: '',
    description: '',
    passingScore: 0,
    timeLimitMinutes: null,
  });

  // Questions state
  const [questions, setQuestions] = useState<QuestionData[]>([]);

  // Track original state for dirty detection
  const [originalQuiz, setOriginalQuiz] = useState<QuizData>(quiz);
  const [originalQuestions, setOriginalQuestions] = useState<QuestionData[]>([]);

  // Dirty state
  const [isDirty, setIsDirty] = useState(false);

  // Add question dropdown
  const [showAddMenu, setShowAddMenu] = useState(false);

  // ---------------------------------------------------------------------------
  // Load existing quiz data on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function loadQuiz() {
      setLoading(true);
      setError(null);
      try {
        // Check if a quiz already exists for this lesson
        const { data: quizData, error: quizErr } = await supabase
          .from('quizzes')
          .select('id, lesson_id, title, description, passing_score, time_limit_minutes')
          .eq('lesson_id', lessonId)
          .maybeSingle();

        if (quizErr) throw quizErr;

        if (quizData) {
          const loadedQuiz: QuizData = {
            id: quizData.id,
            title: quizData.title || '',
            description: quizData.description || '',
            passingScore: quizData.passing_score ?? 0,
            timeLimitMinutes: quizData.time_limit_minutes ?? null,
          };
          setQuiz(loadedQuiz);
          setOriginalQuiz(loadedQuiz);

          // Load questions
          const { data: questionsData, error: qErr } = await supabase
            .from('questions')
            .select('id, quiz_id, content, type, points, position')
            .eq('quiz_id', quizData.id)
            .order('position', { ascending: true });

          if (qErr) throw qErr;

          const loadedQuestions: QuestionData[] = await Promise.all(
            (questionsData || []).map(async (q: Record<string, unknown>) => {
              const { data: optionsData } = await supabase
                .from('question_options')
                .select('id, question_id, content, is_correct, position')
                .eq('question_id', q.id as string)
                .order('position', { ascending: true });

              return {
                id: q.id as string,
                _key: q.id as string,
                content: (q.content as string) || '',
                type: q.type as QuestionType,
                points: (q.points as number) ?? 1,
                position: (q.position as number) ?? 0,
                options: (optionsData || []).map((o: Record<string, unknown>) => ({
                  id: o.id as string,
                  text: o.content as string,
                  isCorrect: o.is_correct as boolean,
                  position: (o.position as number) ?? 0,
                })),
                collapsed: false,
              };
            })
          );

          setQuestions(loadedQuestions);
          setOriginalQuestions(deepCloneQuestions(loadedQuestions));
        }
      } catch (err) {
        console.error('Failed to load quiz:', err);
        setError('Failed to load quiz data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [lessonId, supabase]);

  // ---------------------------------------------------------------------------
  // Dirty tracking
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const quizChanged =
      quiz.title !== originalQuiz.title ||
      quiz.description !== originalQuiz.description ||
      quiz.passingScore !== originalQuiz.passingScore ||
      quiz.timeLimitMinutes !== originalQuiz.timeLimitMinutes;

    const questionsChanged = !questionsAreEqual(questions, originalQuestions);

    const newDirty = quizChanged || questionsChanged;
    if (newDirty !== isDirty) {
      setIsDirty(newDirty);
      onDirtyChange(newDirty);
    }
  }, [quiz, questions, originalQuiz, originalQuestions, isDirty, onDirtyChange]);

  // ---------------------------------------------------------------------------
  // Quiz field change
  // ---------------------------------------------------------------------------
  const updateQuizField = useCallback(
    (field: keyof QuizData, value: string | number | null) => {
      setQuiz((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Question operations
  // ---------------------------------------------------------------------------
  const addQuestion = useCallback(
    (type: QuestionType) => {
      setQuestions((prev) => {
        const newPosition = prev.length;
        return [...prev, createDefaultQuestion(newPosition, type)];
      });
      setShowAddMenu(false);
    },
    []
  );

  const removeQuestion = useCallback((index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveQuestion = useCallback((index: number, direction: 'up' | 'down') => {
    setQuestions((prev) => {
      if (
        (direction === 'up' && index === 0) ||
        (direction === 'down' && index === prev.length - 1)
      )
        return prev;
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      const updated = [...prev];
      [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
      // Update positions
      return updated.map((q, i) => ({ ...q, position: i }));
    });
  }, []);

  const updateQuestion = useCallback(
    (index: number, updates: Partial<QuestionData>) => {
      setQuestions((prev) =>
        prev.map((q, i) => {
          if (i !== index) return q;
          const updated = { ...q, ...updates };

          // If type changed, reset options appropriately
          if (updates.type && updates.type !== q.type) {
            if (updates.type === 'true_false') {
              updated.options = [
                { id: null, text: 'True', isCorrect: true, position: 0 },
                { id: null, text: 'False', isCorrect: false, position: 1 },
              ];
            } else if (updates.type === 'short_answer') {
              updated.options = [];
            } else if (updates.type === 'multiple_choice') {
              updated.options = [
                { id: null, text: '', isCorrect: true, position: 0 },
                { id: null, text: '', isCorrect: false, position: 1 },
              ];
            }
          }

          return updated;
        })
      );
    },
    []
  );

  const toggleCollapse = useCallback((index: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index ? { ...q, collapsed: !q.collapsed } : q
      )
    );
  }, []);

  // ---------------------------------------------------------------------------
  // Option operations
  // ---------------------------------------------------------------------------
  const addOption = useCallback((questionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;
        return {
          ...q,
          options: [
            ...q.options,
            { id: null, text: '', isCorrect: false, position: q.options.length },
          ],
        };
      })
    );
  }, []);

  const removeOption = useCallback((questionIndex: number, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;
        const newOptions = q.options
          .filter((_, oi) => oi !== optionIndex)
          .map((o, oi) => ({ ...o, position: oi }));
        return { ...q, options: newOptions };
      })
    );
  }, []);

  const updateOption = useCallback(
    (questionIndex: number, optionIndex: number, updates: Partial<OptionData>) => {
      setQuestions((prev) =>
        prev.map((q, i) => {
          if (i !== questionIndex) return q;
          const newOptions = q.options.map((o, oi) => {
            if (oi !== optionIndex) return o;
            return { ...o, ...updates };
          });

          // If setting isCorrect = true, ensure others are false
          if (updates.isCorrect) {
            newOptions.forEach((o, oi) => {
              if (oi !== optionIndex) {
                o.isCorrect = false;
              }
            });
          }

          return { ...q, options: newOptions };
        })
      );
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Validate before save
  // ---------------------------------------------------------------------------
  const validate = useCallback((): string | null => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.content.trim()) {
        return `Question ${i + 1} is missing question text.`;
      }
      if (q.type === 'multiple_choice') {
        if (q.options.length < 2) {
          return `Question ${i + 1} must have at least 2 options.`;
        }
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].text.trim()) {
            return `Question ${i + 1}, Option ${j + 1} is missing text.`;
          }
        }
        if (!q.options.some((o) => o.isCorrect)) {
          return `Question ${i + 1} must have a correct answer selected.`;
        }
      }
      if (q.type === 'true_false') {
        if (!q.options.some((o) => o.isCorrect)) {
          return `Question ${i + 1} must have a correct answer selected.`;
        }
      }
    }
    return null;
  }, [questions]);

  // ---------------------------------------------------------------------------
  // Save handler
  // ---------------------------------------------------------------------------
  const handleSave = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let quizId = quiz.id;

      // Create quiz if it doesn't exist yet (only happens once)
      if (!quizId) {
        const res = await fetch('/api/admin/quizzes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId,
            title: quiz.title || lesson.title,
            description: quiz.description || null,
            timeLimitMinutes: quiz.timeLimitMinutes,
            passingScore: quiz.passingScore,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create quiz');
        }
        const created = await res.json();
        quizId = created.id;
        setQuiz((prev) => ({ ...prev, id: quizId }));
      }

      // Build questions payload
      const questionsPayload = questions.map((q, i) => ({
        id: q.id,
        content: q.content,
        type: q.type,
        points: q.points,
        position: i,
        options: q.options.map((opt, j) => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
          position: j,
        })),
      }));

      // Compute deleted question IDs
      const originalQIds = originalQuestions.filter((q) => q.id).map((q) => q.id!);
      const currentQIds = new Set(questions.filter((q) => q.id).map((q) => q.id));
      const deletedQuestionIds = originalQIds.filter((qid) => !currentQIds.has(qid));

      // Compute deleted option IDs
      const deletedOptionIds: string[] = [];
      for (const origQ of originalQuestions) {
        if (!origQ.id) continue;
        const currentQ = questions.find((q) => q.id === origQ.id);
        if (!currentQ) continue;
        const currentOptIds = new Set(currentQ.options.filter((o) => o.id).map((o) => o.id));
        for (const origOpt of origQ.options) {
          if (origOpt.id && !currentOptIds.has(origOpt.id)) {
            deletedOptionIds.push(origOpt.id);
          }
        }
      }

      // ── Single batch save request ──────────────────────────────────────
      const res = await fetch(`/api/admin/quizzes/${quizId}/batch-save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz: {
            title: quiz.title || lesson.title,
            description: quiz.description || null,
            timeLimitMinutes: quiz.timeLimitMinutes,
            passingScore: quiz.passingScore,
          },
          questions: questionsPayload,
          deletedQuestionIds,
          deletedOptionIds,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save quiz');
      }

      const result = await res.json();

      // Compute updated questions with new IDs from server (single source of truth)
      const updatedQuestions = questions.map((q, i) => {
        let updated = q;

        // Apply new question ID
        if (!q.id && result.questionIdMap?.[i]) {
          updated = { ...updated, id: result.questionIdMap[i] };
        }

        // Apply new option IDs
        if (result.optionIdMap && updated.options) {
          const newOptions = updated.options.map((opt, j) => {
            if (!opt.id) {
              const key = `${i}-${j}`;
              const newId = result.optionIdMap[key];
              if (newId) {
                return { ...opt, id: newId };
              }
            }
            return opt;
          });
          updated = { ...updated, options: newOptions };
        }

        return updated;
      });

      // Apply the SAME updated array to both state and original tracking
      setQuestions(updatedQuestions);
      setOriginalQuestions(deepCloneQuestions(updatedQuestions));

      // Update original quiz state to match current
      const savedQuiz = { ...quiz, id: quizId };
      setOriginalQuiz(savedQuiz);

      toast.success('Quiz saved successfully');
      onSave();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save quiz';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [quiz, questions, originalQuestions, lessonId, lesson.title, onSave, validate]);

  // Register save function for parent (CourseBuilder floating bar)
  const saveFnRef = useRef(handleSave);
  saveFnRef.current = handleSave;
  useEffect(() => {
    registerSave?.(() => saveFnRef.current());
    return () => registerSave?.(null);
  }, [registerSave]);

  // ---- Undo: revert quiz and questions back to last saved snapshot ----
  const handleUndo = useCallback(() => {
    setQuiz({ ...originalQuiz });
    setQuestions(deepCloneQuestions(originalQuestions));
  }, [originalQuiz, originalQuestions]);

  // Register undo function for parent (CourseBuilder floating bar)
  const undoFnRef = useRef(handleUndo);
  undoFnRef.current = handleUndo;
  useEffect(() => {
    registerUndo?.(() => undoFnRef.current());
    return () => registerUndo?.(null);
  }, [registerUndo]);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-500">Loading quiz...</span>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ================================================================== */}
      {/* QUIZ SETTINGS CARD */}
      {/* ================================================================== */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-gray-900">Quiz Settings</h2>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="quiz-title">Title</Label>
          <Input
            id="quiz-title"
            value={quiz.title}
            onChange={(e) => updateQuizField('title', e.target.value)}
            placeholder={lesson.title || 'Quiz title (optional)'}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="quiz-description">Description</Label>
          <textarea
            id="quiz-description"
            value={quiz.description}
            onChange={(e) => updateQuizField('description', e.target.value)}
            placeholder="Optional description of this quiz..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 resize-none"
          />
        </div>

        {/* Passing Score + Time Limit row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="quiz-passing-score">Passing Score (%)</Label>
            <Input
              id="quiz-passing-score"
              type="number"
              min={0}
              max={100}
              value={quiz.passingScore}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                updateQuizField(
                  'passingScore',
                  isNaN(val) ? 0 : Math.min(100, Math.max(0, val))
                );
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quiz-time-limit">Time Limit (minutes)</Label>
            <Input
              id="quiz-time-limit"
              type="number"
              min={1}
              placeholder="No limit"
              value={quiz.timeLimitMinutes ?? ''}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                updateQuizField('timeLimitMinutes', isNaN(val) || val <= 0 ? null : val);
              }}
            />
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* ERROR DISPLAY */}
      {/* ================================================================== */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* QUESTIONS */}
      {/* ================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Questions ({questions.length})
          </h3>
        </div>

        <AnimatePresence mode="popLayout">
          {questions.map((question, qIndex) => (
            <QuestionCard
              key={question._key || question.id}
              question={question}
              index={qIndex}
              total={questions.length}
              onUpdate={(updates) => updateQuestion(qIndex, updates)}
              onRemove={() => removeQuestion(qIndex)}
              onMoveUp={() => moveQuestion(qIndex, 'up')}
              onMoveDown={() => moveQuestion(qIndex, 'down')}
              onToggleCollapse={() => toggleCollapse(qIndex)}
              onAddOption={() => addOption(qIndex)}
              onRemoveOption={(optIndex) => removeOption(qIndex, optIndex)}
              onUpdateOption={(optIndex, updates) =>
                updateOption(qIndex, optIndex, updates)
              }
            />
          ))}
        </AnimatePresence>

        {/* Add Question */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="text-gray-600 border-dashed"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Question
            </Button>
          </div>

          <AnimatePresence>
            {showAddMenu && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.12 }}
                className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-2"
              >
                {(
                  [
                    ['multiple_choice', 'Multiple Choice'],
                    ['true_false', 'True / False'],
                    ['short_answer', 'Short Answer'],
                  ] as [QuestionType, string][]
                ).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => addQuestion(type)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${QUESTION_TYPE_COLORS[type]} hover:opacity-80`}
                  >
                    {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SAVE BUTTON */}
      {/* ================================================================== */}
      {!registerSave && questions.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-6 px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {questions.length} question{questions.length !== 1 ? 's' : ''} &middot;{' '}
            {questions.reduce((sum, q) => sum + (q.points || 1), 0)} total points
          </span>
          <Button onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Quiz'
            )}
          </Button>
        </div>
      )}

      {/* ================================================================== */}
      {/* EMPTY STATE */}
      {/* ================================================================== */}
      {questions.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <HelpCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-600 font-medium mb-1">No questions yet</h3>
          <p className="text-gray-400 text-sm mb-4">
            Add your first question to get started.
          </p>
          <div className="flex justify-center gap-2">
            {(
              [
                ['multiple_choice', 'Multiple Choice'],
                ['true_false', 'True / False'],
                ['short_answer', 'Short Answer'],
              ] as [QuestionType, string][]
            ).map(([type, label]) => (
              <button
                key={type}
                onClick={() => addQuestion(type)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${QUESTION_TYPE_COLORS[type]} hover:opacity-80`}
              >
                <Plus className="h-3.5 w-3.5 inline mr-1" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// QuestionCard Sub-component
// ============================================================================

interface QuestionCardProps {
  question: QuestionData;
  index: number;
  total: number;
  onUpdate: (updates: Partial<QuestionData>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleCollapse: () => void;
  onAddOption: () => void;
  onRemoveOption: (optionIndex: number) => void;
  onUpdateOption: (optionIndex: number, updates: Partial<OptionData>) => void;
}

function QuestionCard({
  question,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onToggleCollapse,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
}: QuestionCardProps) {
  const qNum = index + 1;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const isCollapsed = question.collapsed;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border border-gray-200 overflow-hidden">
        {/* ---- HEADER ROW ---- */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
          {/* Q# Badge */}
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-200 font-mono"
          >
            Q{qNum}
          </Badge>

          {/* Type selector */}
          <Select
            value={question.type}
            onValueChange={(val) => onUpdate({ type: val as QuestionType })}
          >
            <SelectTrigger size="sm" className="w-[160px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
              <SelectItem value="true_false">True / False</SelectItem>
              <SelectItem value="short_answer">Short Answer</SelectItem>
            </SelectContent>
          </Select>

          {/* Points */}
          <div className="flex items-center gap-1 ml-auto">
            <Label className="text-xs text-gray-400">Pts</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={question.points}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1) onUpdate({ points: val });
              }}
              className="w-14 h-7 text-xs text-center px-1"
            />
          </div>

          {/* Collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            />
          </button>

          {/* Reorder */}
          <div className="flex flex-col">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="p-0 leading-none text-gray-400 hover:text-gray-600 disabled:opacity-30"
              title="Move up"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="p-0 leading-none text-gray-400 hover:text-gray-600 disabled:opacity-30"
              title="Move down"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Delete */}
          <button
            onClick={() => {
              if (confirm(`Delete Question ${qNum}?`)) onRemove();
            }}
            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete question"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* ---- BODY (collapsible) ---- */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {/* Question text */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500 uppercase tracking-wider">
                    Question Text
                  </Label>
                  <textarea
                    value={question.content}
                    onChange={(e) => onUpdate({ content: e.target.value })}
                    placeholder="Enter your question..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 resize-none"
                  />
                </div>

                {/* Options (for multiple_choice and true_false) */}
                {question.type !== 'short_answer' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500 uppercase tracking-wider">
                      Options
                    </Label>

                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => (
                        <div
                          key={option.id || `opt-${optIndex}`}
                          className="flex items-center gap-2"
                        >
                          {/* Correct answer radio */}
                          <button
                            onClick={() =>
                              onUpdateOption(optIndex, { isCorrect: true })
                            }
                            className="shrink-0 focus:outline-none"
                            title="Mark as correct answer"
                          >
                            {option.isCorrect ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-300 hover:text-gray-400" />
                            )}
                          </button>

                          {/* Option text */}
                          <Input
                            value={option.text}
                            onChange={(e) =>
                              onUpdateOption(optIndex, { text: e.target.value })
                            }
                            placeholder={`Option ${optIndex + 1}`}
                            disabled={question.type === 'true_false'}
                            className={`flex-1 text-sm ${
                              option.isCorrect
                                ? 'border-green-300 bg-green-50'
                                : ''
                            }`}
                          />

                          {/* Delete option (not for true/false) */}
                          {question.type !== 'true_false' &&
                            question.options.length > 2 && (
                              <button
                                onClick={() => onRemoveOption(optIndex)}
                                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                                title="Remove option"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                          {/* Correct badge */}
                          {option.isCorrect && (
                            <span className="text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 shrink-0">
                              Correct
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add option link (only for multiple_choice) */}
                    {question.type === 'multiple_choice' && (
                      <button
                        onClick={onAddOption}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Option
                      </button>
                    )}
                  </div>
                )}

                {/* Short answer hint */}
                {question.type === 'short_answer' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-700">
                    Short answer questions are graded manually by the instructor.
                    Students will see a text input field.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
