import { useState } from 'react';
import {
    ChevronLeft, ChevronRight, RotateCw, CheckCircle,
    AlertCircle, XCircle, RefreshCw, Sparkles, FileText,
    CreditCard, PenTool, BookOpen, Scale, Lightbulb,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Question = {
    prompt?: string;
    rubric?: string;
    max_score?: number;
    scenario?: string;
    grading_rubric?: string;
    term?: string;
    definition?: string;
    question?: string;
    options?: string[];
    correct_answer?: string;
    criteria?: { name: string; weight: number; description: string }[];
    sections?: string[];
};

export type Assessment = {
    type: string;
    bloom_level?: string;
    questions: Question[];
};

type AssessmentFormat =
    | 'flashcard'
    | 'multiple_choice'
    | 'short_response'
    | 'case_study'
    | 'evaluation'
    | 'open_ended';

type FeedbackStatus = 'correct' | 'partial' | 'incorrect' | null;

type GradeResult = {
    score: number;
    feedback: string;
    is_correct: boolean;
    strengths?: string[];
    improvements?: string[];
    criterion_scores?: { criterion: string; weight: number; score: number; rationale: string }[];
};

const GRADING_API = 'http://127.0.0.1:8000/grading/grade';

// ─── Format Resolution ──────────────────────────────────────────────────────

function resolveFormat(assessment: Assessment): AssessmentFormat {
    const bloom = assessment.bloom_level?.toLowerCase();
    if (bloom) {
        const bloomMap: Record<string, AssessmentFormat> = {
            remembering: 'flashcard',
            understanding: 'multiple_choice',
            applying: 'short_response',
            analyzing: 'case_study',
            evaluating: 'evaluation',
            creating: 'open_ended',
        };
        if (bloomMap[bloom]) return bloomMap[bloom];
    }
    const t = (assessment.type || '').toLowerCase();
    if (t.includes('flashcard')) return 'flashcard';
    if (t.includes('multiple')) return 'multiple_choice';
    if (t.includes('evaluation')) return 'evaluation';
    if (t.includes('open')) return 'open_ended';
    if (t.includes('case')) return 'case_study';
    if (t.includes('short')) return 'short_response';
    return 'short_response';
}

const FORMAT_META: Record<AssessmentFormat, { icon: typeof FileText; label: string; color: string }> = {
    flashcard:       { icon: CreditCard, label: 'Flashcards',     color: 'text-purple-600' },
    multiple_choice: { icon: CheckCircle, label: 'Multiple Choice', color: 'text-blue-600' },
    short_response:  { icon: PenTool,    label: 'Short Response',  color: 'text-emerald-600' },
    case_study:      { icon: BookOpen,   label: 'Case Study',      color: 'text-amber-600' },
    evaluation:      { icon: Scale,      label: 'Evaluation',      color: 'text-rose-600' },
    open_ended:      { icon: Lightbulb,  label: 'Open-Ended',      color: 'text-indigo-600' },
};

// ─── Feedback Styling ───────────────────────────────────────────────────────

function getFeedbackStyle(status: FeedbackStatus) {
    switch (status) {
        case 'correct':   return { box: 'bg-green-50 border-green-200 text-green-800', icon: 'text-green-600', label: 'Excellent Work!' };
        case 'partial':   return { box: 'bg-yellow-50 border-yellow-200 text-yellow-800', icon: 'text-yellow-600', label: 'Partially Correct' };
        case 'incorrect': return { box: 'bg-red-50 border-red-200 text-red-800', icon: 'text-red-600', label: 'Needs Improvement' };
        default:          return { box: '', icon: '', label: '' };
    }
}

// ─── Grading API call ───────────────────────────────────────────────────────

async function gradeAnswer(
    questionId: string,
    prompt: string,
    answer: string,
    questionType: string,
    role: string,
    rubric: string,
    correctAnswer?: string,
): Promise<GradeResult> {
    const body = {
        questions: [{
            question_id: questionId,
            prompt,
            role,
            question_type: questionType,
            rubric,
            options: [],
            correct_answer: correctAnswer ?? null,
        }],
        selected_answers: [{ question_id: questionId, answer }],
    };

    const res = await fetch(GRADING_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error('Grading request failed');

    const data = await res.json();
    const detail = data.details?.[0] ?? {};
    return {
        score: detail.score ?? 0,
        feedback: detail.feedback ?? '',
        is_correct: detail.is_correct ?? false,
        strengths: detail.strengths,
        improvements: detail.improvements,
        criterion_scores: detail.criterion_scores,
    };
}

// ─── Shared Feedback Display ────────────────────────────────────────────────

function FeedbackPanel({
    feedbackStatus,
    feedback,
    gradeResult,
    onRegenerate,
}: {
    feedbackStatus: FeedbackStatus;
    feedback: string;
    gradeResult: GradeResult | null;
    onRegenerate?: () => void;
}) {
    if (!feedbackStatus) return null;
    const style = getFeedbackStyle(feedbackStatus);

    return (
        <div className={`p-4 border-2 rounded-lg ${style.box}`}>
            <div className="flex items-start gap-3 mb-3">
                <div className={style.icon}>
                    {feedbackStatus === 'correct' && <CheckCircle className="w-5 h-5" />}
                    {feedbackStatus === 'partial' && <AlertCircle className="w-5 h-5" />}
                    {feedbackStatus === 'incorrect' && <XCircle className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-semibold mb-1">{style.label}</p>
                    <p className="text-sm leading-relaxed">{feedback}</p>
                    {gradeResult && gradeResult.score !== undefined && (
                        <p className="text-xs mt-2 font-medium">Score: {Math.round(gradeResult.score * 100)}%</p>
                    )}
                </div>
            </div>

            {gradeResult?.strengths && gradeResult.strengths.length > 0 && (
                <div className="mb-2">
                    <p className="text-xs font-semibold mb-1">Strengths:</p>
                    <ul className="text-xs list-disc list-inside space-y-0.5">
                        {gradeResult.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                </div>
            )}

            {gradeResult?.improvements && gradeResult.improvements.length > 0 && (
                <div className="mb-2">
                    <p className="text-xs font-semibold mb-1">Areas for Improvement:</p>
                    <ul className="text-xs list-disc list-inside space-y-0.5">
                        {gradeResult.improvements.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                </div>
            )}

            {gradeResult?.criterion_scores && gradeResult.criterion_scores.length > 0 && (
                <div className="mb-2">
                    <p className="text-xs font-semibold mb-1">Criteria Breakdown:</p>
                    <div className="space-y-1">
                        {gradeResult.criterion_scores.map((c, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="font-medium w-32 truncate">{c.criterion}</span>
                                <div className="flex-1 bg-white/50 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-full bg-current rounded-full transition-all"
                                        style={{ width: `${Math.round(c.score * 100)}%` }}
                                    />
                                </div>
                                <span className="w-10 text-right">{Math.round(c.score * 100)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {onRegenerate && (
                <button
                    onClick={onRegenerate}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 mt-2"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate Feedback
                </button>
            )}
        </div>
    );
}

// ─── Navigation ─────────────────────────────────────────────────────────────

function QuestionNav({
    index,
    total,
    onPrev,
    onNext,
}: {
    index: number;
    total: number;
    onPrev: () => void;
    onNext: () => void;
}) {
    if (total <= 1) return null;
    return (
        <div className="flex justify-between items-center">
            <button
                onClick={onPrev}
                disabled={index === 0}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40"
            >
                <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-xs text-gray-500">
                Question {index + 1} of {total}
            </span>
            <button
                onClick={onNext}
                disabled={index === total - 1}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40"
            >
                Next <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}

// ─── 1. Flashcard Assessment (Remembering) ──────────────────────────────────

function FlashcardAssessment({ questions }: { questions: Question[] }) {
    const [index, setIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const q = questions[index];
    if (!q) return null;

    return (
        <div className="space-y-4">
            <div onClick={() => setIsFlipped(!isFlipped)} className="relative h-56 cursor-pointer">
                <div
                    className="w-full h-full rounded-xl flex items-center justify-center p-8 text-center transition-all duration-300"
                    style={{
                        background: isFlipped
                            ? 'linear-gradient(135deg, #16a34a, #15803d)'
                            : 'linear-gradient(135deg, #1e3a5f, #2d4a6f)',
                    }}
                >
                    <div>
                        <p className="text-xs text-white/60 mb-3">{isFlipped ? 'DEFINITION' : 'TERM'}</p>
                        <p className="text-lg text-white font-medium">
                            {isFlipped ? q.definition : q.term}
                        </p>
                        <p className="text-xs text-white/50 mt-6">Click to flip</p>
                    </div>
                </div>
            </div>
            <div className="flex justify-between">
                <button
                    onClick={() => { setIndex(i => Math.max(0, i - 1)); setIsFlipped(false); }}
                    disabled={index === 0}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40"
                >
                    <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-[#1e3a5f] border border-[#1e3a5f] rounded-lg hover:bg-[#1e3a5f] hover:text-white"
                >
                    <RotateCw className="w-4 h-4" /> Flip
                </button>
                <button
                    onClick={() => { setIndex(i => Math.min(questions.length - 1, i + 1)); setIsFlipped(false); }}
                    disabled={index === questions.length - 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40"
                >
                    Next <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// ─── 2. Multiple Choice Assessment (Understanding) ──────────────────────────

function MultipleChoiceAssessment({ questions }: { questions: Question[] }) {
    const [index, setIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [status, setStatus] = useState<FeedbackStatus>(null);
    const [feedback, setFeedback] = useState('');

    const q = questions[index];
    if (!q) return null;

    const reset = () => { setAnswer(''); setSubmitted(false); setStatus(null); setFeedback(''); };

    const handleSubmit = () => {
        if (!answer) return;
        setSubmitted(true);
        const correct = answer === q.correct_answer;
        setStatus(correct ? 'correct' : 'incorrect');
        setFeedback(correct ? 'Correct! Well done.' : `The correct answer is: ${q.correct_answer}`);
    };

    const navigate = (dir: number) => {
        setIndex(i => Math.max(0, Math.min(questions.length - 1, i + dir)));
        reset();
    };

    return (
        <div className="space-y-4">
            <p className="text-sm font-medium text-gray-900">{q.question || q.prompt}</p>
            <div className="space-y-2">
                {(q.options || []).map((option, i) => (
                    <button
                        key={i}
                        onClick={() => !submitted && setAnswer(option)}
                        className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                            answer === option
                                ? 'border-[#1e3a5f] bg-blue-50 text-[#1e3a5f]'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        } ${submitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        {option}
                    </button>
                ))}
            </div>

            {!submitted ? (
                <button
                    onClick={handleSubmit}
                    disabled={!answer}
                    className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] disabled:opacity-40"
                >
                    Submit Answer
                </button>
            ) : (
                <button onClick={reset} className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                    Try Again
                </button>
            )}

            <FeedbackPanel feedbackStatus={status} feedback={feedback} gradeResult={null} />
            <QuestionNav index={index} total={questions.length} onPrev={() => navigate(-1)} onNext={() => navigate(1)} />
        </div>
    );
}

// ─── Shared descriptive submission hook ─────────────────────────────────────

function useDescriptiveGrading(role: string) {
    const [answer, setAnswer] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [status, setStatus] = useState<FeedbackStatus>(null);
    const [feedback, setFeedback] = useState('');
    const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);

    const reset = () => {
        setAnswer(''); setSubmitted(false); setGenerating(false);
        setStatus(null); setFeedback(''); setGradeResult(null);
    };

    const submit = async (q: Question, questionType: string) => {
        if (!answer.trim()) return;
        setGenerating(true);
        try {
            const rubric = q.rubric || q.grading_rubric || '';
            const result = await gradeAnswer(
                `q-${Date.now()}`, q.prompt || q.question || '', answer,
                questionType, role, rubric, q.correct_answer,
            );
            setGradeResult(result);
            if (result.score >= 0.7) setStatus('correct');
            else if (result.score >= 0.4) setStatus('partial');
            else setStatus('incorrect');
            setFeedback(result.feedback || 'Grading complete.');
        } catch {
            setStatus('partial');
            setFeedback('Could not reach grading service. Please try again.');
        }
        setGenerating(false);
        setSubmitted(true);
    };

    return { answer, setAnswer, submitted, generating, status, feedback, gradeResult, reset, submit };
}

// ─── 3. Short Response Assessment (Applying) ────────────────────────────────

function ShortResponseAssessment({ questions, role }: { questions: Question[]; role: string }) {
    const [index, setIndex] = useState(0);
    const g = useDescriptiveGrading(role);
    const q = questions[index];
    if (!q) return null;

    const navigate = (dir: number) => {
        setIndex(i => Math.max(0, Math.min(questions.length - 1, i + dir)));
        g.reset();
    };

    return (
        <div className="space-y-4">
            {q.prompt && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-amber-700 mb-2">QUESTION</p>
                    <p className="text-sm text-gray-800 leading-relaxed">{q.prompt}</p>
                </div>
            )}
            {q.max_score && <p className="text-xs text-gray-500">Max score: {q.max_score} points</p>}

            <textarea
                value={g.answer}
                onChange={e => g.setAnswer(e.target.value)}
                disabled={g.submitted}
                rows={5}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
                placeholder="Write your response here..."
            />

            {!g.submitted ? (
                <button
                    onClick={() => g.submit(q, 'descriptive')}
                    disabled={!g.answer.trim()}
                    className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] disabled:opacity-40 flex items-center justify-center gap-2"
                >
                    {g.generating ? <><Sparkles className="w-4 h-4 animate-spin" /> Analyzing...</> : <><CheckCircle className="w-4 h-4" /> Submit Response</>}
                </button>
            ) : (
                <button onClick={g.reset} className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2">
                    <RotateCw className="w-4 h-4" /> Try Again
                </button>
            )}

            <FeedbackPanel
                feedbackStatus={g.status} feedback={g.feedback} gradeResult={g.gradeResult}
                onRegenerate={g.submitted ? () => { g.reset(); } : undefined}
            />
            <QuestionNav index={index} total={questions.length} onPrev={() => navigate(-1)} onNext={() => navigate(1)} />
        </div>
    );
}

// ─── 4. Case Study Assessment (Analyzing) ───────────────────────────────────

function CaseStudyAssessment({ questions, role }: { questions: Question[]; role: string }) {
    const [index, setIndex] = useState(0);
    const g = useDescriptiveGrading(role);
    const q = questions[index];
    if (!q) return null;

    const navigate = (dir: number) => {
        setIndex(i => Math.max(0, Math.min(questions.length - 1, i + dir)));
        g.reset();
    };

    return (
        <div className="space-y-4">
            {q.scenario && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-blue-700 mb-2">SCENARIO</p>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{q.scenario}</p>
                </div>
            )}
            {q.prompt && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-amber-700 mb-2">QUESTION</p>
                    <p className="text-sm text-gray-800 leading-relaxed">{q.prompt}</p>
                </div>
            )}
            {q.max_score && <p className="text-xs text-gray-500">Max score: {q.max_score} points</p>}

            <textarea
                value={g.answer}
                onChange={e => g.setAnswer(e.target.value)}
                disabled={g.submitted}
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
                placeholder="Write your detailed analysis here..."
            />

            {!g.submitted ? (
                <button
                    onClick={() => g.submit(q, 'descriptive')}
                    disabled={!g.answer.trim()}
                    className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] disabled:opacity-40 flex items-center justify-center gap-2"
                >
                    {g.generating ? <><Sparkles className="w-4 h-4 animate-spin" /> Analyzing...</> : <><CheckCircle className="w-4 h-4" /> Submit Response</>}
                </button>
            ) : (
                <button onClick={g.reset} className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2">
                    <RotateCw className="w-4 h-4" /> Try Again
                </button>
            )}

            <FeedbackPanel
                feedbackStatus={g.status} feedback={g.feedback} gradeResult={g.gradeResult}
                onRegenerate={g.submitted ? () => g.reset() : undefined}
            />
            <QuestionNav index={index} total={questions.length} onPrev={() => navigate(-1)} onNext={() => navigate(1)} />
        </div>
    );
}

// ─── 5. Evaluation Assessment (Evaluating) ──────────────────────────────────

function EvaluationAssessment({ questions, role }: { questions: Question[]; role: string }) {
    const [index, setIndex] = useState(0);
    const g = useDescriptiveGrading(role);
    const q = questions[index];
    if (!q) return null;

    const navigate = (dir: number) => {
        setIndex(i => Math.max(0, Math.min(questions.length - 1, i + dir)));
        g.reset();
    };

    return (
        <div className="space-y-4">
            {q.scenario && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-blue-700 mb-2">SCENARIO</p>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{q.scenario}</p>
                </div>
            )}
            {q.prompt && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-amber-700 mb-2">QUESTION</p>
                    <p className="text-sm text-gray-800 leading-relaxed">{q.prompt}</p>
                </div>
            )}

            {q.criteria && q.criteria.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-rose-700 mb-2">EVALUATION CRITERIA</p>
                    <div className="space-y-2">
                        {q.criteria.map((c, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                                <span className="bg-rose-200 text-rose-800 text-xs font-bold rounded px-1.5 py-0.5 shrink-0">
                                    {Math.round(c.weight * 100)}%
                                </span>
                                <div>
                                    <span className="font-medium text-gray-900">{c.name}: </span>
                                    <span className="text-gray-700">{c.description}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {q.max_score && <p className="text-xs text-gray-500">Max score: {q.max_score} points</p>}

            <textarea
                value={g.answer}
                onChange={e => g.setAnswer(e.target.value)}
                disabled={g.submitted}
                rows={8}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
                placeholder="Provide your evaluation with justification..."
            />

            {!g.submitted ? (
                <button
                    onClick={() => g.submit(q, 'descriptive')}
                    disabled={!g.answer.trim()}
                    className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] disabled:opacity-40 flex items-center justify-center gap-2"
                >
                    {g.generating ? <><Sparkles className="w-4 h-4 animate-spin" /> Evaluating...</> : <><CheckCircle className="w-4 h-4" /> Submit Evaluation</>}
                </button>
            ) : (
                <button onClick={g.reset} className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2">
                    <RotateCw className="w-4 h-4" /> Try Again
                </button>
            )}

            <FeedbackPanel
                feedbackStatus={g.status} feedback={g.feedback} gradeResult={g.gradeResult}
                onRegenerate={g.submitted ? () => g.reset() : undefined}
            />
            <QuestionNav index={index} total={questions.length} onPrev={() => navigate(-1)} onNext={() => navigate(1)} />
        </div>
    );
}

// ─── 6. Open-Ended Assessment (Creating) ────────────────────────────────────

function OpenEndedAssessment({ questions, role }: { questions: Question[]; role: string }) {
    const [index, setIndex] = useState(0);
    const g = useDescriptiveGrading(role);
    const [sectionAnswers, setSectionAnswers] = useState<Record<string, string>>({});
    const q = questions[index];
    if (!q) return null;

    const sections = q.sections && q.sections.length > 0 ? q.sections : null;

    const combinedAnswer = sections
        ? sections.map(s => `## ${s}\n${sectionAnswers[s] || ''}`).join('\n\n')
        : g.answer;

    const navigate = (dir: number) => {
        setIndex(i => Math.max(0, Math.min(questions.length - 1, i + dir)));
        g.reset();
        setSectionAnswers({});
    };

    const handleSubmit = () => {
        if (sections) g.setAnswer(combinedAnswer);
        g.submit(q, 'descriptive');
    };

    const isAnswerEmpty = sections
        ? Object.values(sectionAnswers).every(v => !v.trim())
        : !g.answer.trim();

    return (
        <div className="space-y-4">
            {q.prompt && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-indigo-700 mb-2">DESIGN PROMPT</p>
                    <p className="text-sm text-gray-800 leading-relaxed">{q.prompt}</p>
                </div>
            )}
            {q.max_score && <p className="text-xs text-gray-500">Max score: {q.max_score} points</p>}

            {sections ? (
                <div className="space-y-4">
                    {sections.map((section) => (
                        <div key={section}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{section}</label>
                            <textarea
                                value={sectionAnswers[section] || ''}
                                onChange={e => setSectionAnswers(prev => ({ ...prev, [section]: e.target.value }))}
                                disabled={g.submitted}
                                rows={4}
                                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
                                placeholder={`Describe your approach for "${section}"...`}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <textarea
                    value={g.answer}
                    onChange={e => g.setAnswer(e.target.value)}
                    disabled={g.submitted}
                    rows={10}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
                    placeholder="Design your solution here..."
                />
            )}

            {!g.submitted ? (
                <button
                    onClick={handleSubmit}
                    disabled={isAnswerEmpty}
                    className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] disabled:opacity-40 flex items-center justify-center gap-2"
                >
                    {g.generating ? <><Sparkles className="w-4 h-4 animate-spin" /> Analyzing...</> : <><CheckCircle className="w-4 h-4" /> Submit Design</>}
                </button>
            ) : (
                <button onClick={() => { g.reset(); setSectionAnswers({}); }} className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2">
                    <RotateCw className="w-4 h-4" /> Try Again
                </button>
            )}

            <FeedbackPanel
                feedbackStatus={g.status} feedback={g.feedback} gradeResult={g.gradeResult}
                onRegenerate={g.submitted ? () => { g.reset(); setSectionAnswers({}); } : undefined}
            />
            <QuestionNav index={index} total={questions.length} onPrev={() => navigate(-1)} onNext={() => navigate(1)} />
        </div>
    );
}

// ─── Main Renderer ──────────────────────────────────────────────────────────

export default function AssessmentRenderer({
    assessment,
    role = 'developer',
}: {
    assessment: Assessment;
    role?: string;
}) {
    const format = resolveFormat(assessment);
    const meta = FORMAT_META[format];
    const Icon = meta.icon;
    const questions = assessment.questions ?? [];

    if (questions.length === 0) {
        return <p className="text-sm text-gray-500">No assessment questions available.</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {meta.label} Assessment
                    </p>
                </div>
                {assessment.bloom_level && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        Bloom&apos;s: {assessment.bloom_level}
                    </span>
                )}
            </div>

            {format === 'flashcard' && <FlashcardAssessment questions={questions} />}
            {format === 'multiple_choice' && <MultipleChoiceAssessment questions={questions} />}
            {format === 'short_response' && <ShortResponseAssessment questions={questions} role={role} />}
            {format === 'case_study' && <CaseStudyAssessment questions={questions} role={role} />}
            {format === 'evaluation' && <EvaluationAssessment questions={questions} role={role} />}
            {format === 'open_ended' && <OpenEndedAssessment questions={questions} role={role} />}
        </div>
    );
}
