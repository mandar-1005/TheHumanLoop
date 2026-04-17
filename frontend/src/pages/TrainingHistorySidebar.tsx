import { useState } from 'react';
import { History, X, ChevronRight, Award, Calendar, Target, ThumbsUp, ThumbsDown } from 'lucide-react';

export interface TrainingAttempt {
  id: string;
  trainingName: string;
  completedAt: string;
  score: number;
  passed: boolean;
  feedback: {
    strengths?: string[];
    improvements?: string[];
    aiResponse?: string;
    userFeedback?: 'positive' | 'negative' | null;
  };
}

interface TrainingHistorySidebarProps {
  attempts: TrainingAttempt[];
  isOpen: boolean;
  onClose: () => void;
  onSelectAttempt: (attempt: TrainingAttempt) => void;
}

export function TrainingHistorySidebar({
  attempts,
  isOpen,
  onClose,
  onSelectAttempt
}: TrainingHistorySidebarProps) {
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number, passed: boolean) => {
    if (passed) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number, passed: boolean) => {
    if (passed) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <History className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Training History</h2>
                <p className="text-xs text-gray-500">{attempts.length} attempts</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Attempts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {attempts.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No training attempts yet</p>
            </div>
          ) : (
            attempts.map((attempt) => (
              <div
                key={attempt.id}
                onClick={() => {
                  setSelectedAttemptId(attempt.id);
                  onSelectAttempt(attempt);
                }}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedAttemptId === attempt.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {/* Training Name */}
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center justify-between">
                  <span className="truncate">{attempt.trainingName}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </h3>

                {/* Date */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(attempt.completedAt)}
                </div>

                {/* Score */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getScoreBg(attempt.score, attempt.passed)}`}>
                  <Target className={`w-4 h-4 ${getScoreColor(attempt.score, attempt.passed)}`} />
                  <span className={`text-sm font-bold ${getScoreColor(attempt.score, attempt.passed)}`}>
                    {attempt.score}/100
                  </span>
                  <span className={`text-xs ${getScoreColor(attempt.score, attempt.passed)}`}>
                    · {attempt.passed ? 'Passed' : 'Failed'}
                  </span>
                </div>

                {/* Feedback Summary */}
                {(attempt.feedback.strengths || attempt.feedback.improvements) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                    {attempt.feedback.strengths && attempt.feedback.strengths.length > 0 && (
                      <div className="flex items-start gap-2">
                        <ThumbsUp className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {attempt.feedback.strengths[0]}
                        </p>
                      </div>
                    )}
                    {attempt.feedback.improvements && attempt.feedback.improvements.length > 0 && (
                      <div className="flex items-start gap-2">
                        <ThumbsDown className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {attempt.feedback.improvements[0]}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* User Feedback Badge */}
                {attempt.feedback.userFeedback && (
                  <div className="mt-2">
                    {attempt.feedback.userFeedback === 'positive' ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        <ThumbsUp className="w-3 h-3" /> Helpful
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                        <ThumbsDown className="w-3 h-3" /> Not Helpful
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
