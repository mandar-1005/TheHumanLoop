import { useState } from 'react';
import { History, X, ChevronRight, ChevronDown, Calendar, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export interface TrainingAttempt {
    id: string;           // training_evidence row id
    trainingId: number;
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
    /** Called after a thumb vote is persisted so the parent can refresh its local state */
    onFeedbackUpdate: (trainingId: number, vote: 'positive' | 'negative' | null) => void;
}

export function TrainingHistorySidebar({
                                           attempts,
                                           isOpen,
                                           onClose,
                                           onFeedbackUpdate,
                                       }: TrainingHistorySidebarProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [savingId, setSavingId]     = useState<string | null>(null);

    if (!isOpen) return null;

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

    const handleThumb = async (
        attempt: TrainingAttempt,
        vote: 'positive' | 'negative',
    ) => {
        // Toggle off if same vote clicked again
        const next = attempt.feedback.userFeedback === vote ? null : vote;
        setSavingId(attempt.id);
        const { error } = await supabase
            .from('training_evidence')
            .update({ user_feedback: next })
            .eq('id', attempt.id);
        setSavingId(null);
        if (!error) onFeedbackUpdate(attempt.trainingId, next);
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

            {/* Sidebar */}
            <div className="fixed right-0 top-0 h-full w-[26rem] bg-white shadow-2xl z-50 flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <History className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Training History</h2>
                                <p className="text-xs text-gray-500">{attempts.length} attempt{attempts.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Attempts list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {attempts.length === 0 ? (
                        <div className="text-center py-12">
                            <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">No training attempts yet</p>
                        </div>
                    ) : (
                        attempts.map((attempt) => {
                            const isExpanded = expandedId === attempt.id;
                            const isSaving   = savingId === attempt.id;
                            const vote       = attempt.feedback.userFeedback ?? null;
                            const hasFeedback =
                                (attempt.feedback.strengths?.length ?? 0) > 0 ||
                                (attempt.feedback.improvements?.length ?? 0) > 0 ||
                                !!attempt.feedback.aiResponse;

                            return (
                                <div
                                    key={attempt.id}
                                    className="rounded-xl border border-gray-200 bg-white overflow-hidden"
                                >
                                    {/* Summary row — click to expand */}
                                    <button
                                        className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                                        onClick={() => setExpandedId(isExpanded ? null : attempt.id)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                    {attempt.trainingName}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                                                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                                                    {formatDate(attempt.completedAt)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-sm font-bold ${attempt.passed ? 'text-green-600' : attempt.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {attempt.score}/100
                        </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {attempt.passed ? 'Passed' : 'Failed'}
                        </span>
                                                {hasFeedback && (
                                                    isExpanded
                                                        ? <ChevronDown className="w-4 h-4 text-gray-400" />
                                                        : <ChevronRight className="w-4 h-4 text-gray-400" />
                                                )}
                                            </div>
                                        </div>
                                    </button>

                                    {/* Expanded feedback detail */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3 bg-gray-50">

                                            {attempt.feedback.aiResponse && (
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">AI Feedback</p>
                                                    <p className="text-sm text-gray-700 leading-relaxed">{attempt.feedback.aiResponse}</p>
                                                </div>
                                            )}

                                            {(attempt.feedback.strengths?.length ?? 0) > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Strengths</p>
                                                    <ul className="space-y-1">
                                                        {attempt.feedback.strengths!.map((s, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                                <ThumbsUp className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                                                                {s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {(attempt.feedback.improvements?.length ?? 0) > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Areas for Improvement</p>
                                                    <ul className="space-y-1">
                                                        {attempt.feedback.improvements!.map((s, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                                <ThumbsDown className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                                                                {s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Thumbs — only shown when detail is open */}
                                            <div className="pt-1 border-t border-gray-200 flex items-center gap-3">
                                                <p className="text-xs text-gray-500 mr-auto">Was this feedback helpful?</p>
                                                {isSaving ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => void handleThumb(attempt, 'positive')}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                                vote === 'positive'
                                                                    ? 'bg-green-100 text-green-700 border border-green-300'
                                                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-200'
                                                            }`}
                                                        >
                                                            <ThumbsUp className="w-3.5 h-3.5" /> Helpful
                                                        </button>
                                                        <button
                                                            onClick={() => void handleThumb(attempt, 'negative')}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                                vote === 'negative'
                                                                    ? 'bg-red-100 text-red-700 border border-red-300'
                                                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-200'
                                                            }`}
                                                        >
                                                            <ThumbsDown className="w-3.5 h-3.5" /> Not Helpful
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
}