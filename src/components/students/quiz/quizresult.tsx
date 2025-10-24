import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, RotateCcw, X } from 'lucide-react'

interface QuizResultsProps {
  score: number
  totalQuestions: number
  passingScore: number
  percentage: number
  passed: boolean
  attemptNumber: number
  maxAttempts: number
  onRetakeQuiz: () => void
  onCancelQuiz: () => void
  timeSpent?: number
}

export default function QuizResults({
  score,
  totalQuestions,
  passingScore,
  percentage,
  passed,
  attemptNumber,
  maxAttempts,
  onRetakeQuiz,
  onCancelQuiz,
  timeSpent
}: QuizResultsProps) {
  const [isRetaking, setIsRetaking] = useState(false)

  const handleRetake = () => {
    setIsRetaking(true)
    onRetakeQuiz()
  }

  const canRetake = attemptNumber < maxAttempts && !passed

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          {passed ? (
            <CheckCircle className="w-16 h-16 text-green-500" />
          ) : (
            <AlertCircle className="w-16 h-16 text-red-500" />
          )}
        </div>
        <CardTitle className="text-2xl">
          {passed ? '🎉 Quiz Passed!' : '😔 Quiz Failed'}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Score Summary */}
        <div className="text-center space-y-2">
          <div className="text-4xl font-bold">
            <span className={passed ? 'text-green-600' : 'text-red-600'}>
              {score}/{totalQuestions}
            </span>
          </div>
          <div className="text-lg text-muted-foreground">
            {percentage.toFixed(1)}% (Need {passingScore}% to pass)
          </div>
          {timeSpent && (
            <div className="text-sm text-muted-foreground">
              Time: {formatTime(timeSpent)}
            </div>
          )}
        </div>

        {/* Attempt Info */}
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Attempt {attemptNumber} of {maxAttempts}
          </p>
          {canRetake && (
            <p className="text-sm text-blue-600 mt-1">
              You have {maxAttempts - attemptNumber} attempt{maxAttempts - attemptNumber !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>

        {/* Failed Quiz Message */}
        {!passed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">
              Don't give up! 💪
            </h3>
            <p className="text-red-700 text-sm">
              {canRetake 
                ? "You didn't pass this time, but you can retake the quiz to improve your score. Review the material and try again!"
                : "You've used all available attempts for this quiz. Consider reviewing the course material before moving on."
              }
            </p>
          </div>
        )}

        {/* Passed Quiz Message */}
        {passed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">
              Congratulations! 🎉
            </h3>
            <p className="text-green-700 text-sm">
              You've successfully completed this quiz. You can now continue to the next lesson.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          {!passed && canRetake && (
            <Button 
              onClick={handleRetake} 
              disabled={isRetaking}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {isRetaking ? 'Preparing Quiz...' : 'Retake Quiz'}
            </Button>
          )}
          
          <Button 
            variant={passed ? "default" : "outline"} 
            onClick={onCancelQuiz}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            {passed ? 'Continue' : 'Exit Quiz'}
          </Button>
        </div>

        {/* Warning for last attempt */}
        {!passed && attemptNumber === maxAttempts - 1 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <p className="text-yellow-800 text-sm font-medium">
              ⚠️ This will be your final attempt!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}