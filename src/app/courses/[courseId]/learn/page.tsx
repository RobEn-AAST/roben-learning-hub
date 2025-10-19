'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { Tooltip } from "@/components/ui/tooltip";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import '@/styles/highlight.css';

interface Lesson {
  id: string;
  title: string;
  description: string;
  content_type: string;
  content_url: string;
  duration: number;
  order_index: number;
  is_preview: boolean;
  quizId?: string | null;
  articleContent?: string | null;
  projectInstructions?: string | null;
  projectExternalLink?: string | null;
}


interface Module {
  id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: Lesson[];
}

interface CourseData {
  course: {
    id: string;
    title: string;
    description: string;
  };
  modules: Module[];
  isEnrolled: boolean;
  progress: {
    completedLessons: number;
    totalLessons: number;
    percentage: number;
  } | null;
}

interface QuizQuestion {
  id: string;
  quizId: string;
  text: string;
  type: 'multiple_choice' | 'short_answer' | 'true_false';
  options: QuestionOption[];
}

interface QuestionOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
}

interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
}

function ArticleRenderer({ content }: { content?: string | null }) {
  const [showTOC, setShowTOC] = useState(false);
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);

  // Generate table of contents from headings
  useEffect(() => {
    if (content) {
      const headingMatches = content.match(/^#{1,6}\s+(.+)$/gm);
      if (headingMatches && headingMatches.length > 1) {
        const parsedHeadings = headingMatches.map((heading, index) => {
          const level = heading.match(/^#+/)?.[0].length || 1;
          const text = heading.replace(/^#+\s+/, '');
          return {
            id: `heading-${index}`,
            text: text,
            level: level
          };
        });
        setHeadings(parsedHeadings);
      }
    }
  }, [content]);

  if (!content) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Article Content</h3>
          <p className="text-gray-500">This lesson doesn't have any article content yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Article Header with TOC toggle */}
      {headings.length > 1 && (
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-200">
          <button
            onClick={() => setShowTOC(!showTOC)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${showTOC ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Table of Contents
            <span className="text-gray-500">({headings.length} sections)</span>
          </button>
          
          {/* Table of Contents */}
          {showTOC && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
              <nav className="space-y-1">
                {headings.map((heading, index) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={`block py-1 text-sm hover:text-blue-600 transition-colors ${
                      heading.level === 1 
                        ? 'font-semibold text-gray-900' 
                        : heading.level === 2 
                          ? 'font-medium text-gray-800 pl-3' 
                          : 'text-gray-600 pl-6'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      const element = document.getElementById(heading.id);
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </div>
          )}
        </div>
      )}

      <div className="p-8">
        <article className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900 prose-code:text-pink-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:text-blue-900 prose-hr:border-gray-300">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight, rehypeRaw, rehypeSanitize]}
            components={{
              h1: ({ children, ...props }: any) => {
                const headingIndex = headings.findIndex(h => h.text === children);
                const id = headingIndex >= 0 ? headings[headingIndex].id : undefined;
                return (
                  <h1 id={id} className="text-3xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200" {...props}>
                    {children}
                  </h1>
                );
              },
              h2: ({ children, ...props }: any) => {
                const headingIndex = headings.findIndex(h => h.text === children);
                const id = headingIndex >= 0 ? headings[headingIndex].id : undefined;
                return (
                  <h2 id={id} className="text-2xl font-semibold text-gray-900 mb-4 mt-8" {...props}>
                    {children}
                  </h2>
                );
              },
              h3: ({ children, ...props }: any) => {
                const headingIndex = headings.findIndex(h => h.text === children);
                const id = headingIndex >= 0 ? headings[headingIndex].id : undefined;
                return (
                  <h3 id={id} className="text-xl font-semibold text-gray-900 mb-3 mt-6" {...props}>
                    {children}
                  </h3>
                );
              },
              p: ({ children }) => (
                <p className="text-gray-700 mb-4 leading-relaxed">
                  {children}
                </p>
              ),
              a: ({ children, href }) => (
                <a 
                  href={href} 
                  className="text-blue-600 hover:text-blue-800 underline transition-colors"
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {children}
                </a>
              ),
              code: ({ children, className, ...props }: any) => {
                const isInline = !className?.includes('language-');
                if (isInline) {
                  return (
                    <code className="bg-gray-100 text-pink-600 px-2 py-1 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  );
                }
                const codeString = String(children).replace(/\n$/, '');
                const language = className?.replace('language-', '') || 'text';
                
                return (
                  <div className="relative group">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(codeString);
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs"
                      title="Copy code"
                    >
                      Copy
                    </button>
                    {language !== 'text' && (
                      <div className="absolute top-2 left-2 text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                        {language}
                      </div>
                    )}
                  </div>
                );
              },
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-500 bg-blue-50 pl-4 py-2 my-6 italic text-blue-900">
                  {children}
                </blockquote>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="mb-1">
                  {children}
                </li>
              ),
              img: ({ src, alt }) => (
                <div className="my-6">
                  <img 
                    src={src} 
                    alt={alt || ''} 
                    className="max-w-full h-auto rounded-lg shadow-sm border border-gray-200"
                  />
                  {alt && (
                    <p className="text-sm text-gray-500 text-center mt-2 italic">
                      {alt}
                    </p>
                  )}
                </div>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-6">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-gray-50">
                  {children}
                </thead>
              ),
              th: ({ children }) => (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-3 text-sm text-gray-900 border-t border-gray-200">
                  {children}
                </td>
              ),
              hr: () => (
                <hr className="my-8 border-gray-300" />
              )
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>
      
      {/* Reading progress indicator */}
      <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Reading time: ~{Math.ceil(content.split(' ').length / 200)} min</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{content.split(' ').length} words</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuizRenderer({ lesson }: { lesson: Lesson }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadQuiz = async () => {
      console.log('🧩 QuizRenderer - Loading quiz:', {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        quizId: lesson.quizId,
        hasQuizId: !!lesson.quizId
      });

      if (!lesson.quizId) {
        console.log('❌ No quiz ID found for lesson');
        setLoading(false);
        return;
      }

      try {
        console.log('📡 Fetching quiz data from API:', `/api/quizzes/${lesson.quizId}`);
        const response = await fetch(`/api/quizzes/${lesson.quizId}`);
        const data = await response.json();
        
        if (response.ok) {
          setQuiz(data.quiz);
          setQuestions(data.questions);
        } else {
          console.error('Failed to load quiz:', data.error);
        }
      } catch (error) {
        console.error('Error loading quiz:', error);
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [lesson.quizId]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmitQuiz = async () => {
    setSubmitting(true);
    
    // Calculate score
    let correctAnswers = 0;
    questions.forEach(question => {
      if (question.type === 'multiple_choice' || question.type === 'true_false') {
        const userAnswer = userAnswers[question.id];
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (userAnswer && correctOption && userAnswer === correctOption.id) {
          correctAnswers++;
        }
      }
    });
    
    const finalScore = Math.round((correctAnswers / questions.length) * 100);
    setScore(finalScore);
    setShowResults(true);
    setSubmitting(false);
  };

  const resetQuiz = () => {
    setUserAnswers({});
    setShowResults(false);
    setScore(0);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading quiz...</p>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No quiz available for this lesson.</p>
      </div>
    );
  }

  if (showResults) {
    const correctCount = Math.round((score / 100) * questions.length);
    const incorrectCount = questions.length - correctCount;
    
    return (
      <div className="space-y-8">
        <div className="text-center">
          {/* Score ring */}
          <div className="relative inline-flex mb-6">
            <div className="w-48 h-48">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle 
                  className="text-gray-200" 
                  strokeWidth="10" 
                  stroke="currentColor" 
                  fill="transparent" 
                  r="40" 
                  cx="50" 
                  cy="50"
                />
                <circle 
                  className={`${score >= 70 ? 'text-green-500' : 'text-orange-500'}`}
                  strokeWidth="10" 
                  strokeDasharray={`${(score / 100) * 251.2} 251.2`}
                  strokeLinecap="round" 
                  stroke="currentColor" 
                  fill="transparent" 
                  r="40" 
                  cx="50" 
                  cy="50"
                  style={{
                    transformOrigin: '50% 50%',
                    transform: 'rotate(-90deg)',
                    transition: 'stroke-dasharray 0.8s ease-in-out'
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div>
                  <div className={`text-4xl font-bold ${score >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
                    {score}%
                  </div>
                  <div className="text-sm text-gray-500">Score</div>
                </div>
              </div>
            </div>
          </div>

          {/* Result title */}
          <h3 className={`text-2xl font-bold mb-4 ${score >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
            {score >= 70 ? 'Congratulations! 🎉' : 'Almost There! �'}
          </h3>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-gray-800">{questions.length}</div>
              <div className="text-sm text-gray-500">Total Questions</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-600">{correctCount}</div>
              <div className="text-sm text-green-600">Correct</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{incorrectCount}</div>
              <div className="text-sm text-orange-600">Incorrect</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-center mb-8">
            <Button 
              onClick={resetQuiz} 
              variant="outline"
              className="border-2"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retake Quiz
            </Button>
            {score >= 70 && (
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                Continue to Next Lesson
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Button>
            )}
          </div>
        </div>

        {/* Review section */}
        <div className="space-y-6">
          <h4 className="text-xl font-bold text-gray-800 mb-4">Question Review:</h4>
          {questions.map((question, index) => {
            const userAnswer = userAnswers[question.id];
            const correctOption = question.options.find(opt => opt.isCorrect);
            const userOption = question.options.find(opt => opt.id === userAnswer);
            const isCorrect = userAnswer === correctOption?.id;
            
            return (
              <div key={question.id} className={`rounded-lg border ${
                isCorrect ? 'border-green-200' : 'border-red-200'
              }`}>
                {/* Question header */}
                <div className={`px-6 py-4 flex items-center justify-between ${
                  isCorrect ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCorrect 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {index + 1}
                    </span>
                    <h5 className="font-medium text-gray-900">Question {index + 1}</h5>
                  </div>
                  {isCorrect ? (
                    <div className="flex items-center text-green-700">
                      <svg className="w-5 h-5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Correct
                    </div>
                  ) : (
                    <div className="flex items-center text-red-700">
                      <svg className="w-5 h-5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Incorrect
                    </div>
                  )}
                </div>

                {/* Question content */}
                <div className="px-6 py-4">
                  <p className="text-gray-800 mb-4">{question.text}</p>
                  
                  <div className="space-y-3">
                    {question.options.map(option => {
                      const isUserAnswer = option.id === userAnswer;
                      const isCorrectAnswer = option.isCorrect;
                      
                      return (
                        <div 
                          key={option.id}
                          className={`p-3 rounded-lg flex items-center ${
                            isUserAnswer && isCorrectAnswer
                              ? 'bg-green-100 border border-green-200'
                              : isUserAnswer && !isCorrectAnswer
                                ? 'bg-red-100 border border-red-200'
                                : isCorrectAnswer
                                  ? 'bg-green-50 border border-green-100'
                                  : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          {/* Answer indicator */}
                          {isUserAnswer && isCorrectAnswer && (
                            <svg className="w-5 h-5 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          {isUserAnswer && !isCorrectAnswer && (
                            <svg className="w-5 h-5 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                          {!isUserAnswer && isCorrectAnswer && (
                            <svg className="w-5 h-5 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          {!isUserAnswer && !isCorrectAnswer && (
                            <div className="w-5 mr-3" />
                          )}
                          
                          <span className={`flex-1 ${
                            isUserAnswer
                              ? isCorrectAnswer
                                ? 'text-green-800 font-medium'
                                : 'text-red-800 font-medium'
                              : isCorrectAnswer
                                ? 'text-green-800 font-medium'
                                : 'text-gray-800'
                          }`}>
                            {option.text}
                          </span>

                          {/* Status labels */}
                          {isUserAnswer && (
                            <span className={`text-sm px-2 py-1 rounded ${
                              isCorrectAnswer 
                                ? 'bg-green-200 text-green-800' 
                                : 'bg-red-200 text-red-800'
                            }`}>
                              Your Answer
                            </span>
                          )}
                          {!isUserAnswer && isCorrectAnswer && (
                            <span className="text-sm px-2 py-1 rounded bg-green-200 text-green-800">
                              Correct Answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold mb-2">{quiz.title}</h3>
          {quiz.description && (
            <p className="text-gray-600">{quiz.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            {questions.length} {questions.length === 1 ? 'question' : 'questions'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8 bg-gray-100 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${(Object.keys(userAnswers).length / questions.length) * 100}%` }}
          ></div>
        </div>

        {/* Progress stats */}
        <div className="flex justify-between items-center mb-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">
              {Object.keys(userAnswers).length}
            </div>
            <span className="text-gray-600">Questions Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-medium">
              {questions.length - Object.keys(userAnswers).length}
            </div>
            <span className="text-gray-600">Questions Remaining</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-medium">
              {questions.length}
            </div>
            <span className="text-gray-600">Total Questions</span>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-8">
          {questions.map((question, index) => {
            const isAnswered = userAnswers[question.id] !== undefined;
            
            return (
              <div 
                key={question.id} 
                className={`p-6 rounded-lg transition-all duration-300 ${
                  isAnswered 
                    ? 'border-2 border-green-200 bg-green-50' 
                    : 'border border-gray-200 bg-white'
                }`}
              >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-500 capitalize">{question.type.replace('_', ' ')}</span>
                </div>
                {isAnswered && (
                  <span className="text-green-600 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Answered
                  </span>
                )}
              </div>
              
              <h4 className="text-lg font-medium mb-4">{question.text}</h4>
              
              {question.type === 'short_answer' ? (
                <div className="space-y-4">
                  <textarea
                    className="w-full p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow min-h-[120px] text-base"
                    rows={4}
                    placeholder="Enter your answer here..."
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    value={userAnswers[question.id] || ''}
                  />
                  {isAnswered && (
                    <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg text-blue-700 text-sm">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>Your answer has been saved</span>
                      </div>
                      <button
                        onClick={() => handleAnswerChange(question.id, '')}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Clear Answer
                      </button>
                    </div>
                  )}
                </div>
              ) : (question.type === 'multiple_choice' || question.type === 'true_false') && (
                <div className="space-y-3">
                  {question.options.map((option) => {
                    const isSelected = userAnswers[question.id] === option.id;
                    
                    return (
                      <label 
                        key={option.id} 
                        className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option.id}
                          checked={isSelected}
                          onChange={() => handleAnswerChange(question.id, option.id)}
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                          {option.text}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })}
        </div>

        <div className="text-center pt-6">
          <Button 
            onClick={handleSubmitQuiz}
            disabled={submitting || Object.keys(userAnswers).length !== questions.length}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            {submitting ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Submitting...
              </span>
            ) : (
              'Submit Quiz'
            )}
          </Button>
          {Object.keys(userAnswers).length !== questions.length && (
            <p className="text-sm text-gray-500 mt-2">
              Please answer all questions before submitting
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CourseLearnPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;
  
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentModule, setCurrentModule] = useState<Module | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.status === 401) {
        router.push('/auth/login?redirect=/courses/' + courseId + '/learn');
        return;
      }
      const data = await response.json();
      
      if (!data.isEnrolled) {
        router.push(`/courses/${courseId}`);
        return;
      }

      setCourseData(data);
      
      // Load completed lessons
      if (data.modules.length > 0) {
        const completedLessonsSet = await fetchCompletedLessons(data.modules);
        
        // Set first incomplete lesson or first lesson using the actual completed lessons
        const firstIncompleteLesson = findFirstIncompleteLesson(data.modules, completedLessonsSet);
        if (firstIncompleteLesson) {
          console.log('🎯 Starting at lesson:', firstIncompleteLesson.lesson.title, 'in module:', firstIncompleteLesson.module.title);
          setCurrentLesson(firstIncompleteLesson.lesson);
          setCurrentModule(firstIncompleteLesson.module);
        }
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedLessons = async (modules: Module[]) => {
    const allLessons = modules.flatMap(m => m.lessons);
    const completed = new Set<string>();
    
    console.log('📚 Loading progress for', allLessons.length, 'lessons...');
    
    // Fetch completion status for all lessons
    for (const lesson of allLessons) {
      try {
        const response = await fetch(`/api/lessons/${lesson.id}/progress`, {
          cache: 'no-store' // Ensure we get fresh data, not cached
        });
        const data = await response.json();
        if (data.completed) {
          completed.add(lesson.id);
          console.log('✅ Lesson completed:', lesson.title);
        }
      } catch (error) {
        console.error('Error fetching lesson progress:', error);
      }
    }
    
    console.log('✨ Total completed lessons:', completed.size);
    setCompletedLessons(completed);
    return completed;
  };

  const findFirstIncompleteLesson = (modules: Module[], completed: Set<string>) => {
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        if (!completed.has(lesson.id)) {
          return { lesson, module: mod };
        }
      }
    }
    // If all completed, return first lesson
    if (modules.length > 0 && modules[0].lessons.length > 0) {
      return { lesson: modules[0].lessons[0], module: modules[0] };
    }
    return null;
  };

  const handleLessonSelect = (lesson: Lesson, selectedModule: Module) => {
    setCurrentLesson(lesson);
    setCurrentModule(selectedModule);
  };

  const handleMarkComplete = async () => {
    if (!currentLesson) return;
    
    setMarkingComplete(true);
    try {
      const response = await fetch(`/api/lessons/${currentLesson.id}/progress`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setCompletedLessons(prev => new Set([...prev, currentLesson.id]));
        
        // Update progress percentage
        if (courseData) {
          const totalLessons = courseData.modules.reduce((acc, m) => acc + m.lessons.length, 0);
          const newCompletedCount = completedLessons.size + 1; // +1 for the newly completed lesson
          const newPercentage = Math.round((newCompletedCount / totalLessons) * 100);
          
          setCourseData({
            ...courseData,
            progress: {
              completedLessons: newCompletedCount,
              totalLessons: totalLessons,
              percentage: newPercentage
            }
          });
        }
        
        // Auto-advance to next lesson
        const nextLesson = getNextLesson();
        if (nextLesson) {
          setTimeout(() => {
            setCurrentLesson(nextLesson.lesson);
            setCurrentModule(nextLesson.module);
          }, 500);
        }
      } else {
        console.error('Failed to mark lesson complete:', data.error, data.details);
      }
    } catch (error) {
      console.error('Error marking lesson complete:', error);
    } finally {
      setMarkingComplete(false);
    }
  };

  const getNextLesson = (): { lesson: Lesson; module: Module } | null => {
    if (!courseData || !currentLesson || !currentModule) return null;

    const currentModuleIndex = courseData.modules.findIndex(m => m.id === currentModule.id);
    const currentLessonIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id);

    // Try next lesson in current module
    if (currentLessonIndex < currentModule.lessons.length - 1) {
      return {
        lesson: currentModule.lessons[currentLessonIndex + 1],
        module: currentModule
      };
    }

    // Try first lesson in next module
    if (currentModuleIndex < courseData.modules.length - 1) {
      const nextModule = courseData.modules[currentModuleIndex + 1];
      if (nextModule.lessons.length > 0) {
        return {
          lesson: nextModule.lessons[0],
          module: nextModule
        };
      }
    }

    return null;
  };

  const getPreviousLesson = (): { lesson: Lesson; module: Module } | null => {
    if (!courseData || !currentLesson || !currentModule) return null;

    const currentModuleIndex = courseData.modules.findIndex(m => m.id === currentModule.id);
    const currentLessonIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id);

    // Try previous lesson in current module
    if (currentLessonIndex > 0) {
      return {
        lesson: currentModule.lessons[currentLessonIndex - 1],
        module: currentModule
      };
    }

    // Try last lesson in previous module
    if (currentModuleIndex > 0) {
      const prevModule = courseData.modules[currentModuleIndex - 1];
      if (prevModule.lessons.length > 0) {
        return {
          lesson: prevModule.lessons[prevModule.lessons.length - 1],
          module: prevModule
        };
      }
    }

    return null;
  };

  const renderLessonContent = () => {
    if (!currentLesson) return null;

    // Convert YouTube URLs to embed format
    const convertToEmbedUrl = (url: string): string => {
      if (!url) return url;
      
      // YouTube URL patterns to convert to embed
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(youtubeRegex);
      
      if (match && match[1]) {
        const videoId = match[1];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      
      // If it's not a YouTube URL or already an embed URL, return as is
      return url;
    };

    const renderVideoContent = () => {
      console.log('🎥 Rendering video content:', {
        content_type: currentLesson.content_type,
        content_url: currentLesson.content_url,
        hasUrl: !!currentLesson.content_url,
        urlLength: currentLesson.content_url?.length
      });

      if (currentLesson.content_type === 'video' && currentLesson.content_url) {
        const embedUrl = convertToEmbedUrl(currentLesson.content_url);
        
        console.log('🔄 Converting video URL:', {
          originalUrl: currentLesson.content_url,
          embedUrl: embedUrl
        });
        
        return (
          <div className="w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg relative">
            <iframe
              src={embedUrl}
              title={currentLesson.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => console.log('✅ Iframe loaded successfully')}
              onError={(e) => console.error('❌ Iframe error:', e)}
            />
          </div>
        );
      }
      
      // Show debug info when no video
      return (
        <div className="w-full aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">No Video Content</p>
            <p className="text-xs text-gray-500 mt-2">
              Type: {currentLesson.content_type} | URL: {currentLesson.content_url || 'None'}
            </p>
          </div>
        </div>
      );
    };

    // Debug logging
    console.log('🔍 Current lesson debug:', {
      id: currentLesson.id,
      title: currentLesson.title,
      content_type: currentLesson.content_type,
      quizId: currentLesson.quizId,
      hasQuizId: !!currentLesson.quizId
    });

    return (
      <div className="p-6">
        {currentLesson.content_type === 'video' && renderVideoContent()}
        
        {currentLesson.content_type === 'article' && (
          <div className="max-w-none">
            <ArticleRenderer content={currentLesson.articleContent} />
          </div>
        )}
        
        {currentLesson.content_type === 'project' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Project Instructions</h3>
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: currentLesson.projectInstructions || 'No project instructions available.' }} />
            </div>
            {currentLesson.projectExternalLink && (
              <div className="mt-4">
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                  <a href={currentLesson.projectExternalLink} target="_blank" rel="noopener noreferrer">
                    Open Project
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}
        
        {currentLesson.content_type === 'quiz' && (
          <div className="p-6">
            <QuizRenderer lesson={currentLesson} />
          </div>
        )}
      </div>
    );
  };

  const nextLesson = getNextLesson();
  const prevLesson = getPreviousLesson();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-blue-600 text-xl flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
          Loading course...
        </div>
      </div>
    );
  }

  if (!courseData || !currentLesson) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 text-xl mb-4">Unable to load course</p>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
            <Link href="/courses">Back to Courses</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isLessonComplete = completedLessons.has(currentLesson.id);
  const progress = courseData.progress;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Course Progress Bar */}
      {progress && (
        <div className="bg-blue-600 h-1">
          <div 
            className="bg-white h-1" 
            style={{width: `${progress.percentage}%`}}
          ></div>
        </div>
      )}
      
      {/* Top Navigation */}
      <div className="bg-blue-600 shadow-md px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/courses/${courseId}`} className="text-white hover:text-blue-100 transition-colors bg-blue-700 rounded-full p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-white font-bold">{courseData.course.title}</h1>
            <div className="flex items-center gap-2 text-sm text-blue-100">
              {progress && (
                <span className="bg-blue-700 px-2 py-0.5 rounded-full flex items-center">
                  <div className="w-16 h-2 bg-blue-300/30 rounded-full mr-2">
                    <div 
                      className="h-2 bg-white rounded-full" 
                      style={{width: `${progress.percentage}%`}}
                    ></div>
                  </div>
                  <span>{progress.percentage}%</span>
                </span>
              )}
              <span>
                {courseData.modules.length} {courseData.modules.length === 1 ? 'module' : 'modules'} • 
                {courseData.modules.reduce((acc, m) => acc + m.lessons.length, 0)} {courseData.modules.reduce((acc, m) => acc + m.lessons.length, 0) === 1 ? 'lesson' : 'lessons'}
              </span>
            </div>
          </div>
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-white bg-blue-700 hover:bg-blue-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-5xl mx-auto p-6">
            <motion.div
              key={currentLesson.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white p-6 rounded-lg shadow-sm"
            >
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {currentModule?.title}
                  </span>
                  {isLessonComplete && (
                    <span className="flex items-center text-green-600 text-sm bg-green-50 px-3 py-1 rounded-full">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Completed
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{currentLesson.title}</h2>
                {currentLesson.description && (
                  <p className="text-gray-600">{currentLesson.description}</p>
                )}
              </div>

              <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
                {renderLessonContent()}
              </div>

              <div className="flex items-center justify-between mt-8">
                <Button
                  onClick={() => {
                    if (prevLesson) {
                      setCurrentLesson(prevLesson.lesson);
                      setCurrentModule(prevLesson.module);
                    }
                  }}
                  disabled={!prevLesson}
                  variant="outline"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50 disabled:text-gray-400 disabled:border-gray-200 rounded-md"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </Button>

                <div className="flex gap-2">
                  {!isLessonComplete && (
                    <Button
                      onClick={handleMarkComplete}
                      disabled={markingComplete}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                    >
                      {markingComplete ? (
                        <span className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                          Marking...
                        </span>
                      ) : (
                        'Mark as Complete'
                      )}
                    </Button>
                  )}
                  
                  {nextLesson && (
                    <Tooltip 
                      content={!isLessonComplete ? "Complete this lesson first" : ""}
                      side="top"
                    >
                      <Button
                        onClick={() => {
                          if (isLessonComplete) {
                            setCurrentLesson(nextLesson.lesson);
                            setCurrentModule(nextLesson.module);
                          }
                        }}
                        disabled={!isLessonComplete}
                        className={`${isLessonComplete ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'} text-white rounded-md`}
                      >
                        {!isLessonComplete && (
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                        Next Lesson
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Button>
                    </Tooltip>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              transition={{ duration: 0.3 }}
              className="w-80 bg-white border-l border-gray-200 overflow-y-auto shadow-inner"
            >
              <div className="p-4">
                <div className="border-b border-gray-200 pb-3 mb-4">
                  <h3 className="text-gray-800 font-bold">Course Content</h3>
                  <div className="flex items-center justify-between text-sm text-gray-500 mt-1">
                    <div>
                      {courseData.modules.length} {courseData.modules.length === 1 ? 'module' : 'modules'} • 
                      {' '}{courseData.modules.reduce((acc, m) => acc + m.lessons.length, 0)} {courseData.modules.reduce((acc, m) => acc + m.lessons.length, 0) === 1 ? 'lesson' : 'lessons'}
                    </div>
                    {progress && <div>{progress.percentage}% complete</div>}
                  </div>
                </div>
                
                {courseData.modules.map((module, moduleIndex) => (
                  <div key={module.id} className="mb-6">
                    <div className="bg-blue-50 px-3 py-2 rounded-md text-sm font-semibold text-blue-800 mb-2 flex items-center justify-between">
                      <span>Module {moduleIndex + 1}: {module.title}</span>
                      <div className="text-xs text-blue-600">
                        {module.lessons.filter(l => completedLessons.has(l.id)).length}/{module.lessons.length}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {module.lessons.map((lesson, lessonIndex) => {
                        const isComplete = completedLessons.has(lesson.id);
                        const isCurrent = currentLesson.id === lesson.id;
                        
                        // Calculate if this lesson is accessible
                        // First lesson is always accessible
                        let isAccessible = lessonIndex === 0;
                        
                        // Check if any previous lessons in this module are incomplete
                        if (lessonIndex > 0) {
                          const prevLesson = module.lessons[lessonIndex - 1];
                          isAccessible = completedLessons.has(prevLesson.id) || isComplete;
                        }
                        
                        // If it's in a later module, check if the last lesson of the previous module is complete
                        const moduleIndex = courseData.modules.findIndex(m => m.id === module.id);
                        if (moduleIndex > 0 && lessonIndex === 0) {
                          const prevModule = courseData.modules[moduleIndex - 1];
                          const lastLessonInPrevModule = prevModule.lessons[prevModule.lessons.length - 1];
                          isAccessible = completedLessons.has(lastLessonInPrevModule.id) || isComplete;
                        }
                        
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => {
                              if (isAccessible) {
                                handleLessonSelect(lesson, module);
                              }
                            }}
                            disabled={!isAccessible}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                              isCurrent
                                ? 'bg-blue-100 text-blue-800 border-l-4 border-blue-600'
                                : isAccessible
                                  ? 'text-gray-700 hover:bg-gray-100'
                                  : 'text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex flex-col w-full">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {isComplete ? (
                                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  ) : !isAccessible ? (
                                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                  ) : (
                                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                                  )}
                                  <span className="flex-1">{lesson.title}</span>
                                </div>
                              </div>
                              <div className="flex items-center text-xs text-gray-500 mt-1 ml-6">
                                <span className="capitalize flex items-center">
                                  {lesson.content_type === 'video' && (
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  )}
                                  {lesson.content_type === 'quiz' && (
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  )}
                                  {lesson.content_type === 'article' && (
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                  )}
                                  {lesson.content_type === 'project' && (
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                  {lesson.content_type}
                                </span>
                                {lesson.duration > 0 && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <span>{lesson.duration} min</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
