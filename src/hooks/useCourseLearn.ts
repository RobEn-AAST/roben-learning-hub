'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys
export const courseLearnKeys = {
  course: (courseId: string) => ['course', 'learn', courseId] as const,
  lessonProgress: (lessonId: string) => ['lesson', 'progress', lessonId] as const,
  quiz: (quizId: string) => ['quiz', quizId] as const,
  quizAttempts: (quizId: string) => ['quiz', 'attempts', quizId] as const,
};

/**
 * PERFORMANCE OPTIMIZATION: Fetch course data with caching
 */
export function useCourseLearn(courseId: string) {
  return useQuery({
    queryKey: courseLearnKeys.course(courseId),
    queryFn: async () => {
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!courseId,
  });
}

/**
 * PERFORMANCE OPTIMIZATION: Fetch lesson progress with caching
 */
export function useLessonProgress(lessonId: string, enabled = true) {
  return useQuery({
    queryKey: courseLearnKeys.lessonProgress(lessonId),
    queryFn: async () => {
      const response = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 404) return { completed: false };
        throw new Error('Failed to fetch lesson progress');
      }
      return response.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: enabled && !!lessonId,
  });
}

/**
 * PERFORMANCE OPTIMIZATION: Mark lesson as complete with optimistic update
 */
export function useMarkLessonComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lessonId: string) => {
      const response = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to mark lesson as complete');
      }

      return response.json();
    },
    onMutate: async (lessonId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: courseLearnKeys.lessonProgress(lessonId) });

      // Snapshot previous value
      const previousProgress = queryClient.getQueryData(courseLearnKeys.lessonProgress(lessonId));

      // Optimistically update
      queryClient.setQueryData(courseLearnKeys.lessonProgress(lessonId), { completed: true });

      return { previousProgress };
    },
    onError: (err, lessonId, context) => {
      // Rollback on error
      if (context?.previousProgress) {
        queryClient.setQueryData(courseLearnKeys.lessonProgress(lessonId), context.previousProgress);
      }
    },
    onSuccess: (data, lessonId) => {
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: courseLearnKeys.lessonProgress(lessonId) });
    },
  });
}

/**
 * PERFORMANCE OPTIMIZATION: Fetch quiz with caching
 */
export function useQuiz(quizId: string | null) {
  return useQuery({
    queryKey: quizId ? courseLearnKeys.quiz(quizId) : ['quiz', 'null'],
    queryFn: async () => {
      if (!quizId) throw new Error('No quiz ID');
      const response = await fetch(`/api/quizzes/${quizId}`);
      if (!response.ok) throw new Error('Failed to fetch quiz');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - quizzes don't change often
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!quizId,
  });
}

/**
 * PERFORMANCE OPTIMIZATION: Fetch quiz attempts with caching
 */
export function useQuizAttempts(quizId: string | null, latest = true) {
  return useQuery({
    queryKey: quizId ? [...courseLearnKeys.quizAttempts(quizId), { latest }] : ['quiz', 'attempts', 'null'],
    queryFn: async () => {
      if (!quizId) return null;
      const response = await fetch(`/api/quiz-attempts?quizId=${quizId}&latest=${latest}`);
      if (!response.ok) throw new Error('Failed to fetch quiz attempts');
      return response.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!quizId,
  });
}

/**
 * PERFORMANCE OPTIMIZATION: Start quiz attempt
 */
export function useStartQuizAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quizId: string) => {
      const response = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start quiz');
      }

      return response.json();
    },
    onSuccess: (data, quizId) => {
      // Invalidate quiz attempts to refetch
      queryClient.invalidateQueries({ queryKey: courseLearnKeys.quizAttempts(quizId) });
    },
  });
}

/**
 * PERFORMANCE OPTIMIZATION: Submit quiz answer
 */
export function useSubmitQuizAnswer() {
  return useMutation({
    mutationFn: async ({
      attemptId,
      questionId,
      selectedOptionId,
    }: {
      attemptId: string;
      questionId: string;
      selectedOptionId: string;
    }) => {
      const response = await fetch(`/api/quiz-attempts/${attemptId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, selectedOptionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save answer');
      }

      return response.json();
    },
  });
}

/**
 * PERFORMANCE OPTIMIZATION: Submit quiz
 */
export function useSubmitQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attemptId,
      timeTakenSeconds,
    }: {
      attemptId: string;
      timeTakenSeconds: number | null;
    }) => {
      const response = await fetch(`/api/quiz-attempts/${attemptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeTakenSeconds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit quiz');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate quiz attempts
      if (data.attempt?.quiz_id) {
        queryClient.invalidateQueries({ 
          queryKey: courseLearnKeys.quizAttempts(data.attempt.quiz_id) 
        });
      }
    },
  });
}
