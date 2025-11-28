"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourseStudentProgress } from "@/hooks/useQueryCache";
import { StudentProgressData, StudentProgress } from "@/types/progressTracking";

// Icons
const Icons = {
  Users: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
      />
    </svg>
  ),
  Progress: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  Quiz: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Trophy: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Calendar: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  ChevronDown: () => (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  ),
  ChevronUp: () => (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 15l7-7 7 7"
      />
    </svg>
  ),
};

interface StudentProgressDashboardProps {
  courseId: string;
}

export function StudentProgressDashboard({
  courseId,
}: StudentProgressDashboardProps) {
  const { data, isLoading, error } = useCourseStudentProgress(courseId);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"progress" | "quiz" | "name">(
    "progress"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-white">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-white border-red-200">
        <CardContent className="p-6 text-center">
          <div className="text-red-600 mb-4">⚠️ {error.message}</div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-white">
        <CardContent className="p-6 text-center">
          <div className="text-gray-500">No data available</div>
        </CardContent>
      </Card>
    );
  }

  const progressData = data as StudentProgressData;

  // Sort students based on selected criteria
  const sortedStudents = [...progressData.students].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "progress":
        comparison = a.progress.percentage - b.progress.percentage;
        break;
      case "quiz":
        const aQuizScore = a.quizStats.averageScore ?? 0;
        const bQuizScore = b.quizStats.averageScore ?? 0;
        comparison = aQuizScore - bQuizScore;
        break;
      case "name":
        const aName =
          [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email;
        const bName =
          [b.firstName, b.lastName].filter(Boolean).join(" ") || b.email;
        comparison = aName.localeCompare(bName);
        break;
    }

    return sortOrder === "desc" ? -comparison : comparison;
  });

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-500";
    if (percentage >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getQuizScoreColor = (score: number | null) => {
    if (score === null) return "bg-gray-500";
    if (score >= 80) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Course Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">
              Total Students
            </CardTitle>
            <Icons.Users />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {progressData.totalStudents}
            </div>
            <p className="text-xs text-gray-600">Enrolled in this course</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">
              Average Progress
            </CardTitle>
            <Icons.Progress />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {progressData.courseStats?.averageProgress ?? 0}%
            </div>
            <p className="text-xs text-gray-600">Across all students</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">
              Completed
            </CardTitle>
            <Icons.Trophy />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {progressData.courseStats?.studentsCompleted ?? 0}
            </div>
            <p className="text-xs text-gray-600">Students finished course</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">
              Total Lessons
            </CardTitle>
            <Icons.Quiz />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {progressData.courseStats?.totalLessons ?? 0}
            </div>
            <p className="text-xs text-gray-600">In this course</p>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2 text-gray-900">
                <Icons.Users />
                <span>Student Progress - {progressData.course.title}</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Track individual student progress and quiz performance
              </CardDescription>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "progress" | "quiz" | "name")
                }
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="progress">Progress</option>
                <option value="quiz">Quiz Score</option>
                <option value="name">Name</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
              >
                {sortOrder === "desc" ? (
                  <Icons.ChevronDown />
                ) : (
                  <Icons.ChevronUp />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {progressData.totalStudents === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No students enrolled in this course yet.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedStudents.map((student: StudentProgress) => {
                const displayName =
                  [student.firstName, student.lastName]
                    .filter(Boolean)
                    .join(" ") || student.email;
                const isExpanded = expandedStudent === student.id;

                return (
                  <div
                    key={student.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {displayName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {student.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            Enrolled: {formatDate(student.enrolledAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        {/* Progress */}
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">
                            Progress
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full">
                              <div
                                className={`h-2 rounded-full ${getProgressColor(
                                  student.progress.percentage
                                )}`}
                                style={{
                                  width: `${student.progress.percentage}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {student.progress.percentage}%
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {student.progress.completedLessons}/
                            {student.progress.totalLessons} lessons
                          </div>
                        </div>

                        {/* Quiz Score */}
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">
                            Quiz Avg
                          </div>
                          <div
                            className={`text-lg font-bold ${getQuizScoreColor(
                              student.quizStats.averageScore
                            )}`}
                          >
                            {student.quizStats.averageScore !== null
                              ? `${student.quizStats.averageScore}%`
                              : "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {student.quizStats.totalAttempts} attempts
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExpandedStudent(isExpanded ? null : student.id)
                          }
                        >
                          {isExpanded ? (
                            <Icons.ChevronUp />
                          ) : (
                            <Icons.ChevronDown />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Recent Quiz Scores */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">
                              Recent Quiz Scores
                            </h4>
                            {student.quizScores.length === 0 ? (
                              <p className="text-sm text-gray-500">
                                No quiz attempts yet
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {student.quizScores.map((quiz, index) => (
                                  <div
                                    key={`${quiz.quizTitle}-${index}`}
                                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                  >
                                    <div>
                                      <div className="font-medium text-sm">
                                        {quiz.quizTitle}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        {quiz.lessonTitle}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div
                                        className={`font-bold ${getQuizScoreColor(
                                          quiz.score
                                        )}`}
                                      >
                                        {quiz.score !== null
                                          ? `${quiz.score}%`
                                          : "N/A"}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {quiz.completedAt
                                          ? formatDateTime(quiz.completedAt)
                                          : "In progress"}
                                      </div>
                                      {quiz.passed !== null && (
                                        <Badge
                                          variant={
                                            quiz.passed
                                              ? "default"
                                              : "destructive"
                                          }
                                          className="text-xs"
                                        >
                                          {quiz.passed ? "Passed" : "Failed"}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Recent Activity */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">
                              Recent Activity
                            </h4>
                            {student.recentActivity.length === 0 ? (
                              <p className="text-sm text-gray-500">
                                No recent activity
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {student.recentActivity.map(
                                  (activity, index) => (
                                    <div
                                      key={`${activity.lessonTitle}-${index}`}
                                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                    >
                                      <div>
                                        <div className="font-medium text-sm">
                                          {activity.lessonTitle}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          Completed
                                        </div>
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {formatDateTime(activity.completedAt)}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
