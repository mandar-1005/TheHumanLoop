import { useState, type MouseEvent } from 'react';
import {
    ChevronLeft, ChevronRight, RotateCw, CheckCircle,
    AlertCircle, XCircle, RefreshCw, Sparkles, FileText,
    CreditCard, PenTool, BookOpen, Scale, Lightbulb, Pencil,
    List, AlignLeft,
} from 'lucide-react';
import { useRememberingViewMode, type RememberingViewMode } from '../hooks/useRememberingViewMode';

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
    // Matches GradeAssessmentRequest schema exactly
    const body = {
        questions: [{
            question_id: questionId,
            prompt: prompt || 'Answer the following question.',
            role: role || 'developer',
            question_type: questionType,
            bloom_level: null,
            rubric: rubric || '',
            options: [] as string[],
            correct_answer: correctAnswer ?? null,
            answer_key: null,
        }],
        selected_answers: [{ question_id: questionId, answer }],
        temperature: 0.2,
    };

    console.log('[gradeAnswer] sending:', JSON.stringify(body, null, 2));

    const res = await fetch(GRADING_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error('[gradeAnswer] error ' + res.status + ':', errText);
        throw new Error('Grading failed ' + res.status + ': ' + errText);
    }

    const data = await res.json();
    console.log('[gradeAnswer] response:', data);
    const detail = data.details?.[0] ?? {};

    // Normalize score: API may return 0-1 float or 0-100 integer
    const rawScore: number = detail.score ?? 0;
    const normalizedScore = rawScore <= 1 ? rawScore : rawScore / 100;

    return {
        score: normalizedScore,   // always 0-1 internally; multiply by 100 when saving
        feedback: detail.feedback ?? '',
        is_correct: detail.is_correct ?? false,
        strengths: detail.strengths,
        improvements: detail.improvements,
        // Normalize criterion scores the same way — API may return 0-100 integers
        criterion_scores: detail.criterion_scores?.map((c: { criterion: string; weight: number; score: number; rationale: string }) => ({
            ...c,
            score: c.score <= 1 ? c.score : c.score / 100,
        })),
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

// ─── Remembering: bullet / long-form (same term+definition data as flashcards) ─

function BulletRememberingView({ questions }: { questions: Question[] }) {
    return (
        <ul className="max-h-[min(28rem,70vh)] overflow-y-auto space-y-3 pr-1 list-none m-0 p-0">
            {questions.map((q, i) => (
                <li
                    key={i}
                    className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-800"
                >
                    <p className="font-semibold text-gray-900 whitespace-pre-wrap">{q.term || '—'}</p>
                    <p className="mt-2 text-gray-700 whitespace-pre-wrap leading-relaxed">{q.definition || '—'}</p>
                </li>
            ))}
        </ul>
    );
}

function LongFormRememberingView({ questions }: { questions: Question[] }) {
    return (
        <div className="max-h-[min(32rem,75vh)] overflow-y-auto space-y-8 pr-1">
            {questions.map((q, i) => (
                <section key={i} className="rounded-xl border border-gray-100 bg-white px-6 py-5 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 whitespace-pre-wrap">
                        {q.term || '—'}
                    </h3>
                    <p className="mt-4 text-sm text-gray-700 leading-7 whitespace-pre-wrap">
                        {q.definition || '—'}
                    </p>
                </section>
            ))}
        </div>
    );
}


// ─── Submit Confirmation Modal ───────────────────────────────────────────────

function SubmitConfirmModal({
                                total,
                                answered,
                                onConfirm,
                                onReturn,
                            }: {
    total: number;
    answered: number;
    onConfirm: () => void;
    onReturn: () => void;
}) {
    const unanswered = total - answered;
    const allAnswered = unanswered === 0;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="p-6 text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${allAnswered ? 'bg-green-100' : 'bg-amber-100'}`}>
                        {allAnswered
                            ? <CheckCircle className="w-7 h-7 text-green-600" />
                            : <AlertCircle className="w-7 h-7 text-amber-600" />
                        }
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {allAnswered ? 'Ready to Submit?' : 'Submit with unanswered questions?'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                        <span className="font-semibold text-green-600">{answered}</span> of <span className="font-semibold">{total}</span> questions answered
                    </p>
                    {!allAnswered && (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                            {unanswered} unanswered question{unanswered > 1 ? 's' : ''} will be scored as <span className="font-semibold">0/100</span>
                        </p>
                    )}
                </div>
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onReturn}
                        className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Return to Assessment
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 text-white text-sm font-medium rounded-lg transition-colors ${allAnswered ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                    >
                        Submit Anyway
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── 1. Flashcard Assessment (Remembering) ──────────────────────────────────

function FlashcardAssessment({
                                 questions,
                                 enableEdit,
                                 onQuestionsChange,
                                 persistFlashcards,
                                 onComplete,
                             }: {
    questions: Question[];
    enableEdit?: boolean;
    onQuestionsChange?: (questions: Question[]) => void;
    persistFlashcards?: boolean;
    onComplete?: (score: number, passed: boolean) => void;
}) {
    const [index, setIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [editing, setEditing] = useState(false);
    const [draftTerm, setDraftTerm] = useState('');
    const [draftDefinition, setDraftDefinition] = useState('');
    // Track which card indices have been flipped at least once
    const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

    const q = questions[index];
    if (!q) return null;

    const canEdit = Boolean(enableEdit && onQuestionsChange);
    const allFlipped = flippedCards.size >= questions.length;

    const handleFlip = () => {
        if (!isFlipped) {
            // Mark this card as seen when flipping to definition side
            setFlippedCards(prev => new Set(prev).add(index));
        }
        setIsFlipped(f => !f);
    };

    const startEdit = (e: MouseEvent) => {
        e.stopPropagation();
        setDraftTerm(q.term ?? '');
        setDraftDefinition(q.definition ?? '');
        setEditing(true);
        setIsFlipped(false);
    };

    const cancelEdit = () => {
        setEditing(false);
    };

    const saveEdit = () => {
        if (!onQuestionsChange) return;
        const next = questions.map((item, i) =>
            i === index ? { ...item, term: draftTerm, definition: draftDefinition } : item,
        );
        onQuestionsChange(next);
        setEditing(false);
    };

    const goPrev = () => {
        setIndex(i => Math.max(0, i - 1));
        setIsFlipped(false);
        setEditing(false);
    };

    const goNext = () => {
        setIndex(i => Math.min(questions.length - 1, i + 1));
        setIsFlipped(false);
        setEditing(false);
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                {canEdit && !editing && (
                    <button
                        type="button"
                        onClick={startEdit}
                        className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/90 bg-black/25 hover:bg-black/40 border border-white/20"
                        aria-label="Edit flashcard"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                    </button>
                )}

                {editing ? (
                    <div
                        className="min-h-56 rounded-xl p-6 border border-gray-200 bg-white space-y-3 shadow-sm"
                        onClick={e => e.stopPropagation()}
                    >
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">TERM</label>
                            <textarea
                                value={draftTerm}
                                onChange={e => setDraftTerm(e.target.value)}
                                rows={3}
                                className="w-full p-3 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#1e3a5f]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">DEFINITION</label>
                            <textarea
                                value={draftDefinition}
                                onChange={e => setDraftDefinition(e.target.value)}
                                rows={4}
                                className="w-full p-3 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#1e3a5f]"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                            <button
                                type="button"
                                onClick={saveEdit}
                                disabled={persistFlashcards}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#152d4a] disabled:opacity-50"
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={persistFlashcards}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div
                        onClick={handleFlip}
                        className="relative h-56 cursor-pointer"
                    >
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
                                <p className="text-lg text-white font-medium whitespace-pre-wrap">
                                    {isFlipped ? q.definition : q.term}
                                </p>
                                <p className="text-xs text-white/50 mt-6">Click to flip</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex justify-between">
                <button
                    type="button"
                    onClick={goPrev}
                    disabled={index === 0}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40"
                >
                    <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                    type="button"
                    onClick={handleFlip}
                    disabled={editing}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-[#1e3a5f] border border-[#1e3a5f] rounded-lg hover:bg-[#1e3a5f] hover:text-white disabled:opacity-40"
                >
                    <RotateCw className="w-4 h-4" /> Flip
                </button>
                <button
                    type="button"
                    onClick={goNext}
                    disabled={index === questions.length - 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40"
                >
                    Next <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1 flex-wrap">
                {questions.map((_, i) => (
                    <button key={i} onClick={() => { setIndex(i); setIsFlipped(false); setEditing(false); }}
                            className={`w-5 h-5 rounded-full text-xs transition-colors ${
                                i === index ? 'bg-[#1e3a5f]'
                                    : flippedCards.has(i) ? 'bg-green-500'
                                        : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                            title={`Card ${i + 1}${flippedCards.has(i) ? ' ✓' : ''}`}
                    />
                ))}
            </div>
            <p className="text-xs text-center text-gray-400">
                {flippedCards.size}/{questions.length} cards reviewed
            </p>

            {allFlipped && onComplete ? (
                <button
                    onClick={() => onComplete(100, true)}
                    className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                    <CheckCircle className="w-4 h-4" /> Complete Training — All Cards Reviewed
                </button>
            ) : onComplete ? (
                <p className="text-xs text-center text-amber-600 bg-amber-50 border border-amber-200 rounded-lg py-2">
                    Flip all {questions.length} cards to complete — {questions.length - flippedCards.size} remaining
                </p>
            ) : null}
        </div>
    );
}

function RememberingPresentation({
                                     assessment,
                                     questions,
                                     enableEdit,
                                     onQuestionsChange,
                                     persistFlashcards,
                                     onComplete,
                                 }: {
    assessment: Assessment;
    questions: Question[];
    enableEdit?: boolean;
    onQuestionsChange?: (questions: Question[]) => void;
    persistFlashcards?: boolean;
    onComplete?: (score: number, passed: boolean) => void;
}) {
    const { mode, setMode } = useRememberingViewMode(assessment);

    const options: { id: RememberingViewMode; label: string; icon: typeof List }[] = [
        { id: 'bullet', label: 'Bullet', icon: List },
        { id: 'flashcard', label: 'Flashcard', icon: CreditCard },
        { id: 'long-form', label: 'Long-form', icon: AlignLeft },
    ];

    return (
        <div className="space-y-4">
            <div
                role="tablist"
                aria-label="Remembering display format"
                className="flex flex-wrap gap-2"
            >
                {options.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        id={`remembering-mode-${id}`}
                        aria-selected={mode === id}
                        aria-controls="remembering-content-panel"
                        onClick={() => setMode(id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            mode === id
                                ? 'bg-[#1e3a5f] text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>
            <div
                role="tabpanel"
                id="remembering-content-panel"
                aria-labelledby={`remembering-mode-${mode}`}
            >
                {mode === 'bullet' && <BulletRememberingView questions={questions} />}
                {mode === 'flashcard' && (
                    <FlashcardAssessment
                        questions={questions}
                        enableEdit={enableEdit}
                        onQuestionsChange={onQuestionsChange}
                        persistFlashcards={persistFlashcards}
                        onComplete={onComplete}
                    />
                )}
                {mode === 'long-form' && <LongFormRememberingView questions={questions} />}
            </div>
        </div>
    );
}

// ─── 2. Multiple Choice Assessment (Understanding) ──────────────────────────

function MultipleChoiceAssessment({ questions, onComplete }: { questions: Question[]; onComplete?: (score: number, passed: boolean) => void }) {
    const [index, setIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [status, setStatus] = useState<FeedbackStatus>(null);
    const [feedback, setFeedback] = useState('');
    const [scores, setScores] = useState<Record<number, number>>({});
    const [viewed, setViewed] = useState<Set<number>>(new Set([0]));
    const [finished, setFinished] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const q = questions[index];
    if (!q) return null;

    const answeredCount = Object.keys(scores).length;
    const allViewed = viewed.size >= questions.length;
    const isLastQuestion = index === questions.length - 1;
    const calcAvg = () => Math.round(Array.from({ length: questions.length }, (_, i) => scores[i] ?? 0).reduce((a, b) => a + b, 0) / questions.length);

    const reset = () => { setAnswer(''); setSubmitted(false); setStatus(null); setFeedback(''); };

    const handleSubmit = () => {
        if (!answer) return;
        setSubmitted(true);
        const correct = answer === q.correct_answer;
        setStatus(correct ? 'correct' : 'incorrect');
        setFeedback(correct ? 'Correct! Well done.' : `The correct answer is: ${q.correct_answer}`);
        setScores(prev => ({ ...prev, [index]: correct ? 100 : 0 }));
    };

    const navigate = (dir: number) => {
        const next = Math.max(0, Math.min(questions.length - 1, index + dir));
        setIndex(next); setViewed(prev => new Set(prev).add(next)); reset();
    };

    if (finished) return (
        <div className="text-center py-8 space-y-3">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-lg font-semibold text-gray-900">Assessment Complete</p>
            <p className="text-sm text-gray-600">{answeredCount} of {questions.length} questions answered</p>
            <p className="text-2xl font-bold text-[#1e3a5f]">{calcAvg()}/100</p>
            <p className="text-xs text-gray-400">Unanswered questions scored as 0</p>
        </div>
    );

    return (
        <>
            <div className="space-y-4">
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Question {index + 1} of {questions.length}</span>
                        <span>{answeredCount}/{questions.length} answered</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1e3a5f] rounded-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
                    </div>
                    <div className="flex gap-1 flex-wrap pt-1">
                        {questions.map((_, i) => (
                            <button key={i} onClick={() => { setIndex(i); setViewed(prev => new Set(prev).add(i)); reset(); }}
                                    className={`w-6 h-6 rounded-full text-xs font-medium transition-colors ${i === index ? 'bg-[#1e3a5f] text-white' : scores[i] !== undefined ? (scores[i] >= 70 ? 'bg-green-500 text-white' : 'bg-red-400 text-white') : viewed.has(i) ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>
                <p className="text-sm font-medium text-gray-900">{q.question || q.prompt}</p>
                <div className="space-y-2">
                    {(q.options || []).map((option, i) => (
                        <button key={i} onClick={() => !submitted && setAnswer(option)}
                                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${answer === option ? 'border-[#1e3a5f] bg-blue-50 text-[#1e3a5f]' : 'border-gray-200 hover:border-gray-300 text-gray-700'} ${submitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            {option}
                        </button>
                    ))}
                </div>
                {!submitted ? (
                    <button onClick={handleSubmit} disabled={!answer}
                            className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] disabled:opacity-40">
                        Submit Answer
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={reset} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Retry</button>
                        {index < questions.length - 1 && (<button onClick={() => navigate(1)} className="flex-1 py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] flex items-center justify-center gap-2">Next <ChevronRight className="w-4 h-4" /></button>)}
                    </div>
                )}
                <FeedbackPanel feedbackStatus={status} feedback={feedback} gradeResult={null} />
                {isLastQuestion && allViewed && (
                    <button onClick={() => setShowConfirm(true)} className="w-full py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Submit Assessment
                    </button>
                )}
                <QuestionNav index={index} total={questions.length} onPrev={() => navigate(-1)} onNext={() => navigate(1)} />
            </div>
            {showConfirm && <SubmitConfirmModal total={questions.length} answered={answeredCount} onConfirm={() => { setShowConfirm(false); setFinished(true); const avg = calcAvg(); onComplete?.(avg, avg >= 70); }} onReturn={() => setShowConfirm(false)} />}
        </>
    );
}
// ─── Shared descriptive submission hook ─────────────────────────────────────

function useDescriptiveGrading(role: string, onQuestionScored?: (score: number) => void) {
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
            const rawRubric: unknown = q.rubric || q.grading_rubric || '';
            // Backend expects rubric as plain string — serialize if it's a JSON object
            const rubric = typeof rawRubric === 'string'
                ? rawRubric
                : JSON.stringify(rawRubric);
            // Include scenario in prompt so the grader has full context
            const fullPrompt = [q.scenario, q.prompt || q.question].filter(Boolean).join('\n\n') || 'Answer the following question.';
            const result = await gradeAnswer(
                `q-${Date.now()}`, fullPrompt, answer,
                questionType, role, rubric, q.correct_answer,
            );
            setGradeResult(result);
            if (result.score >= 0.7) setStatus('correct');
            else if (result.score >= 0.4) setStatus('partial');
            else setStatus('incorrect');
            setFeedback(result.feedback || 'Grading complete.');
            onQuestionScored?.(Math.round(result.score * 100));
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

function ShortResponseAssessment({ questions, role, onComplete }: { questions: Question[]; role: string; onComplete?: (score: number, passed: boolean) => void }) {
    const [index, setIndex] = useState(0);
    const [scores, setScores] = useState<Record<number, number>>({});
    const [viewed, setViewed] = useState<Set<number>>(new Set([0]));
    const [finished, setFinished] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleQuestionScored = (score: number) => setScores(prev => ({ ...prev, [index]: score }));
    const g = useDescriptiveGrading(role, handleQuestionScored);
    const q = questions[index];
    if (!q) return null;

    const answeredCount = Object.keys(scores).length;
    const allViewed = viewed.size >= questions.length;
    const isLastQuestion = index === questions.length - 1;

    const avgScore = () => {
        const total = questions.length;
        const sum = Array.from({ length: total }, (_, i) => scores[i] ?? 0).reduce((a, b) => a + b, 0);
        return Math.round(sum / total);
    };

    const navigate = (dir: number) => {
        const next = Math.max(0, Math.min(questions.length - 1, index + dir));
        setIndex(next);
        setViewed(prev => new Set(prev).add(next));
        g.reset();
    };

    const handleConfirmSubmit = () => {
        setShowConfirm(false);
        setFinished(true);
        const avg = avgScore();
        onComplete?.(avg, avg >= 70);
    };

    if (finished) return (
        <div className="text-center py-8 space-y-3">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-lg font-semibold text-gray-900">Assessment Complete</p>
            <p className="text-sm text-gray-600">{answeredCount} of {questions.length} questions answered</p>
            <p className="text-2xl font-bold text-[#1e3a5f]">{avgScore()}/100</p>
            <p className="text-xs text-gray-400">Unanswered questions scored as 0</p>
        </div>
    );

    return (
        <>
            <div className="space-y-4">
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Question {index + 1} of {questions.length}</span>
                        <span>{answeredCount}/{questions.length} answered</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1e3a5f] rounded-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
                    </div>
                    <div className="flex gap-1 flex-wrap pt-1">
                        {questions.map((_, i) => (
                            <button key={i} onClick={() => { setIndex(i); setViewed(prev => new Set(prev).add(i)); g.reset(); }}
                                    className={`w-6 h-6 rounded-full text-xs font-medium transition-colors ${
                                        i === index ? 'bg-[#1e3a5f] text-white'
                                            : scores[i] !== undefined ? 'bg-green-500 text-white'
                                                : viewed.has(i) ? 'bg-gray-400 text-white'
                                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}>{i + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {q.prompt && (<div className="bg-amber-50 border border-amber-200 rounded-lg p-4"><p className="text-xs font-semibold text-amber-700 mb-2">QUESTION</p><p className="text-sm text-gray-800 leading-relaxed">{q.prompt}</p></div>)}
                {q.max_score && <p className="text-xs text-gray-500">Max score: {q.max_score} points</p>}

                <textarea value={g.answer} onChange={e => g.setAnswer(e.target.value)} disabled={g.submitted} rows={5}
                          className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
                          placeholder="Write your response here... (optional — you may skip)" />

                {!g.submitted ? (
                    <button onClick={() => void g.submit(q, 'short_response')} disabled={!g.answer.trim() || g.generating}
                            className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] disabled:opacity-40 flex items-center justify-center gap-2">
                        {g.generating ? <><Sparkles className="w-4 h-4 animate-spin" /> Analyzing...</> : <><CheckCircle className="w-4 h-4" /> Submit Response</>}
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={g.reset} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2"><RotateCw className="w-4 h-4" /> Retry</button>
                        {index < questions.length - 1 && (<button onClick={() => navigate(1)} className="flex-1 py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] flex items-center justify-center gap-2">Next <ChevronRight className="w-4 h-4" /></button>)}
                    </div>
                )}
                <FeedbackPanel feedbackStatus={g.status} feedback={g.feedback} gradeResult={g.gradeResult} onRegenerate={g.submitted ? () => g.reset() : undefined} />

                {isLastQuestion && allViewed && (
                    <button onClick={() => setShowConfirm(true)}
                            className="w-full py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Submit Assessment
                    </button>
                )}

                <QuestionNav index={index} total={questions.length} onPrev={() => navigate(-1)} onNext={() => navigate(1)} />
            </div>
            {showConfirm && (
                <SubmitConfirmModal
                    total={questions.length}
                    answered={answeredCount}
                    onConfirm={handleConfirmSubmit}
                    onReturn={() => setShowConfirm(false)}
                />
            )}
        </>
    );
}

// ─── 4. Case Study Assessment (Analyzing) ───────────────────────────────────

function CaseStudyAssessment({ questions, role, onComplete }: { questions: Question[]; role: string; onComplete?: (score: number, passed: boolean) => void }) {
    const [index, setIndex] = useState(0);
    const [scores, setScores] = useState<Record<number, number>>({});
    const [viewed, setViewed] = useState<Set<number>>(new Set([0]));
    const [finished, setFinished] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleQuestionScored = (score: number) => setScores(prev => ({ ...prev, [index]: score }));
    const g = useDescriptiveGrading(role, handleQuestionScored);
    const q = questions[index];
    if (!q) return null;

    const answeredCount = Object.keys(scores).length;
    const allViewed = viewed.size >= questions.length;
    const isLastQuestion = index === questions.length - 1;
    const avgScore = () => Math.round(Array.from({ length: questions.length }, (_, i) => scores[i] ?? 0).reduce((a, b) => a + b, 0) / questions.length);

    const navigate = (dir: number) => {
        const next = Math.max(0, Math.min(questions.length - 1, index + dir));
        setIndex(next); setViewed(prev => new Set(prev).add(next)); g.reset();
    };

    const handleConfirmSubmit = () => { setShowConfirm(false); setFinished(true); const avg = avgScore(); onComplete?.(avg, avg >= 70); };

    if (finished) return (
        <div className="text-center py-8 space-y-3">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-lg font-semibold text-gray-900">Assessment Complete</p>
            <p className="text-sm text-gray-600">{answeredCount} of {questions.length} questions answered</p>
            <p className="text-2xl font-bold text-[#1e3a5f]">{avgScore()}/100</p>
            <p className="text-xs text-gray-400">Unanswered questions scored as 0</p>
        </div>
    );

    return (
        <>
            <div className="space-y-4">
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500"><span>Question {index + 1} of {questions.length}</span><span>{answeredCount}/{questions.length} answered</span></div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-[#1e3a5f] rounded-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div>
                    <div className="flex gap-1 flex-wrap pt-1">
                        {questions.map((_, i) => (
                            <button key={i} onClick={() => { setIndex(i); setViewed(prev => new Set(prev).add(i)); g.reset(); }}
                                    className={`w-6 h-6 rounded-full text-xs font-medium transition-colors ${i === index ? 'bg-[#1e3a5f] text-white' : scores[i] !== undefined ? 'bg-green-500 text-white' : viewed.has(i) ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>{i + 1}
                            </button>
                        ))}
                    </div>
                </div>
                {q.scenario && (<div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-xs font-semibold text-blue-700 mb-2">SCENARIO</p><p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{q.scenario}</p></div>)}
                {q.prompt && (<div className="bg-amber-50 border border-amber-200 rounded-lg p-4"><p className="text-xs font-semibold text-amber-700 mb-2">QUESTION</p><p className="text-sm text-gray-800 leading-relaxed">{q.prompt}</p></div>)}
                {q.max_score && <p className="text-xs text-gray-500">Max score: {q.max_score} points</p>}
                <textarea value={g.answer} onChange={e => g.setAnswer(e.target.value)} disabled={g.submitted} rows={6}
                          className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
                          placeholder="Write your detailed analysis here... (optional — you may skip)" />
                {!g.submitted ? (
                    <button onClick={() => void g.submit(q, 'case_study')} disabled={!g.answer.trim() || g.generating}
                            className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] disabled:opacity-40 flex items-center justify-center gap-2">
                        {g.generating ? <><Sparkles className="w-4 h-4 animate-spin" /> Analyzing...</> : <><CheckCircle className="w-4 h-4" /> Submit Response</>}
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={g.reset} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2"><RotateCw className="w-4 h-4" /> Retry</button>
                        {index < questions.length - 1 && (<button onClick={() => navigate(1)} className="flex-1 py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] flex items-center justify-center gap-2">Next <ChevronRight className="w-4 h-4" /></button>)}
                    </div>
                )}
                <FeedbackPanel feedbackStatus={g.status} feedback={g.feedback} gradeResult={g.gradeResult} onRegenerate={g.submitted ? () => g.reset() : undefined} />
                {isLastQuestion && allViewed && (
                    <button onClick={() => setShowConfirm(true)} className="w-full py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Submit Assessment
                    </button>
                )}
                <QuestionNav index={index} total={questions.length} onPrev={() => navigate(-1)} onNext={() => navigate(1)} />
            </div>
            {showConfirm && <SubmitConfirmModal total={questions.length} answered={answeredCount} onConfirm={handleConfirmSubmit} onReturn={() => setShowConfirm(false)} />}
        </>
    );
}

// ─── 5. Evaluation Assessment (Evaluating) ──────────────────────────────────

function EvaluationAssessment({ questions, role, onComplete }: { questions: Question[]; role: string; onComplete?: (score: number, passed: boolean) => void }) {
    const [index, setIndex] = useState(0);
    const [scores, setScores] = useState<Record<number, number>>({});
    const [viewed, setViewed] = useState<Set<number>>(new Set([0]));
    const [finished, setFinished] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleQuestionScored = (score: number) => setScores(prev => ({ ...prev, [index]: score }));
    const g = useDescriptiveGrading(role, handleQuestionScored);
    const q = questions[index];
    if (!q) return null;

    const answeredCount = Object.keys(scores).length;
    const allViewed = viewed.size >= questions.length;
    const isLastQuestion = index === questions.length - 1;
    const avgScore = () => Math.round(Array.from({ length: questions.length }, (_, i) => scores[i] ?? 0).reduce((a, b) => a + b, 0) / questions.length);

    const navigate = (dir: number) => {
        const next = Math.max(0, Math.min(questions.length - 1, index + dir));
        setIndex(next); setViewed(prev => new Set(prev).add(next)); g.reset();
    };

    const handleConfirmSubmit = () => { setShowConfirm(false); setFinished(true); const avg = avgScore(); onComplete?.(avg, avg >= 70); };

    if (finished) return (
        <div className="text-center py-8 space-y-3">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-lg font-semibold text-gray-900">Assessment Complete</p>
            <p className="text-sm text-gray-600">{answeredCount} of {questions.length} questions answered</p>
            <p className="text-2xl font-bold text-[#1e3a5f]">{avgScore()}/100</p>
            <p className="text-xs text-gray-400">Unanswered questions scored as 0</p>
        </div>
    );

    return (
        <>
            <div className="space-y-4">
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500"><span>Question {index + 1} of {questions.length}</span><span>{answeredCount}/{questions.length} answered</span></div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-[#1e3a5f] rounded-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div>
                    <div className="flex gap-1 flex-wrap pt-1">
                        {questions.map((_, i) => (
                            <button key={i} onClick={() => { setIndex(i); setViewed(prev => new Set(prev).add(i)); g.reset(); }}
                                    className={`w-6 h-6 rounded-full text-xs font-medium transition-colors ${i === index ? 'bg-[#1e3a5f] text-white' : scores[i] !== undefined ? 'bg-green-500 text-white' : viewed.has(i) ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>{i + 1}
                            </button>
                        ))}
                    </div>
                </div>
                {q.scenario && (<div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-xs font-semibold text-blue-700 mb-2">SCENARIO</p><p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{q.scenario}</p></div>)}
                {q.prompt && (<div className="bg-amber-50 border border-amber-200 rounded-lg p-4"><p className="text-xs font-semibold text-amber-700 mb-2">QUESTION</p><p className="text-sm text-gray-800 leading-relaxed">{q.prompt}</p></div>)}
                {q.criteria && q.criteria.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                        <p className="text-xs font-semibold text-rose-700 mb-2">EVALUATION CRITERIA</p>
                        <div className="space-y-2">
                            {q.criteria.map((c, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                    <span className="bg-rose-200 text-rose-800 text-xs font-bold rounded px-1.5 py-0.5 shrink-0">{Math.round(c.weight * 100)}%</span>
                                    <div><span className="font-medium text-gray-900">{c.name}: </span><span className="text-gray-700">{c.description}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {q.max_score && <p className="text-xs text-gray-500">Max score: {q.max_score} points</p>}
                <textarea value={g.answer} onChange={e => g.setAnswer(e.target.value)} disabled={g.submitted} rows={8}
                          className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
                          placeholder="Provide your evaluation with justification... (optional — you may skip)" />
                {!g.submitted ? (
                    <button onClick={() => void g.submit(q, 'evaluation')} disabled={!g.answer.trim() || g.generating}
                            className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] disabled:opacity-40 flex items-center justify-center gap-2">
                        {g.generating ? <><Sparkles className="w-4 h-4 animate-spin" /> Evaluating...</> : <><CheckCircle className="w-4 h-4" /> Submit Evaluation</>}
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={g.reset} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2"><RotateCw className="w-4 h-4" /> Retry</button>
                        {index < questions.length - 1 && (<button onClick={() => navigate(1)} className="flex-1 py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] flex items-center justify-center gap-2">Next <ChevronRight className="w-4 h-4" /></button>)}
                    </div>
                )}
                <FeedbackPanel feedbackStatus={g.status} feedback={g.feedback} gradeResult={g.gradeResult} onRegenerate={g.submitted ? () => g.reset() : undefined} />
                {isLastQuestion && allViewed && (
                    <button onClick={() => setShowConfirm(true)} className="w-full py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Submit Assessment
                    </button>
                )}
                <QuestionNav index={index} total={questions.length} onPrev={() => navigate(-1)} onNext={() => navigate(1)} />
            </div>
            {showConfirm && <SubmitConfirmModal total={questions.length} answered={answeredCount} onConfirm={handleConfirmSubmit} onReturn={() => setShowConfirm(false)} />}
        </>
    );
}

// ─── 6. Open-Ended Assessment (Creating) ────────────────────────────────────

function OpenEndedAssessment({ questions, role, onComplete }: { questions: Question[]; role: string; onComplete?: (score: number, passed: boolean) => void }) {
    const [index, setIndex] = useState(0);
    const [scores, setScores] = useState<Record<number, number>>({});
    const [viewed, setViewed] = useState<Set<number>>(new Set([0]));
    const [finished, setFinished] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [sectionAnswers, setSectionAnswers] = useState<Record<string, string>>({});

    const handleQuestionScored = (score: number) => setScores(prev => ({ ...prev, [index]: score }));
    const g = useDescriptiveGrading(role, handleQuestionScored);
    const q = questions[index];
    if (!q) return null;

    const answeredCount = Object.keys(scores).length;
    const allViewed = viewed.size >= questions.length;
    const isLastQuestion = index === questions.length - 1;
    const avgScore = () => Math.round(Array.from({ length: questions.length }, (_, i) => scores[i] ?? 0).reduce((a, b) => a + b, 0) / questions.length);

    const sections = q.sections && q.sections.length > 0 ? q.sections : null;
    const combinedAnswer = sections
        ? sections.map(s => '## ' + s + '\n' + (sectionAnswers[s] || '')).join('\n\n')
        : g.answer;

    const navigate = (dir: number) => {
        const next = Math.max(0, Math.min(questions.length - 1, index + dir));
        setIndex(next); setViewed(prev => new Set(prev).add(next)); g.reset(); setSectionAnswers({});
    };

    const handleSubmit = () => {
        if (sections) g.setAnswer(combinedAnswer);
        void g.submit(q, 'open_ended');
    };

    const isAnswerEmpty = sections ? Object.values(sectionAnswers).every(v => !v.trim()) : !g.answer.trim();
    const handleConfirmSubmit = () => { setShowConfirm(false); setFinished(true); const avg = avgScore(); onComplete?.(avg, avg >= 70); };

    if (finished) return (
        <div className="text-center py-8 space-y-3">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-lg font-semibold text-gray-900">Assessment Complete</p>
            <p className="text-sm text-gray-600">{answeredCount} of {questions.length} questions answered</p>
            <p className="text-2xl font-bold text-[#1e3a5f]">{avgScore()}/100</p>
            <p className="text-xs text-gray-400">Unanswered questions scored as 0</p>
        </div>
    );

    return (
        <>
            <div className="space-y-4">
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500"><span>Question {index + 1} of {questions.length}</span><span>{answeredCount}/{questions.length} answered</span></div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-[#1e3a5f] rounded-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div>
                    <div className="flex gap-1 flex-wrap pt-1">
                        {questions.map((_, i) => (
                            <button key={i} onClick={() => { setIndex(i); setViewed(prev => new Set(prev).add(i)); g.reset(); setSectionAnswers({}); }}
                                    className={`w-6 h-6 rounded-full text-xs font-medium transition-colors ${i === index ? 'bg-[#1e3a5f] text-white' : scores[i] !== undefined ? 'bg-green-500 text-white' : viewed.has(i) ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>{i + 1}
                            </button>
                        ))}
                    </div>
                </div>
                {q.prompt && (<div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4"><p className="text-xs font-semibold text-indigo-700 mb-2">DESIGN PROMPT</p><p className="text-sm text-gray-800 leading-relaxed">{q.prompt}</p></div>)}
                {q.max_score && <p className="text-xs text-gray-500">Max score: {q.max_score} points</p>}
                {sections ? (
                    <div className="space-y-4">
                        {sections.map((section) => (
                            <div key={section}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{section}</label>
                                <textarea value={sectionAnswers[section] || ''} onChange={e => setSectionAnswers(prev => ({ ...prev, [section]: e.target.value }))}
                                          disabled={g.submitted} rows={4}
                                          className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
                                          placeholder={`Describe your approach for "${section}"... (optional)`} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <textarea value={g.answer} onChange={e => g.setAnswer(e.target.value)} disabled={g.submitted} rows={10}
                              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
                              placeholder="Design your solution here... (optional — you may skip)" />
                )}
                {!g.submitted ? (
                    <button onClick={handleSubmit} disabled={isAnswerEmpty || g.generating}
                            className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] disabled:opacity-40 flex items-center justify-center gap-2">
                        {g.generating ? <><Sparkles className="w-4 h-4 animate-spin" /> Analyzing...</> : <><CheckCircle className="w-4 h-4" /> Submit Design</>}
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={() => { g.reset(); setSectionAnswers({}); }} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2"><RotateCw className="w-4 h-4" /> Retry</button>
                        {index < questions.length - 1 && (<button onClick={() => navigate(1)} className="flex-1 py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] flex items-center justify-center gap-2">Next <ChevronRight className="w-4 h-4" /></button>)}
                    </div>
                )}
                <FeedbackPanel feedbackStatus={g.status} feedback={g.feedback} gradeResult={g.gradeResult} onRegenerate={g.submitted ? () => { g.reset(); setSectionAnswers({}); } : undefined} />
                {isLastQuestion && allViewed && (
                    <button onClick={() => setShowConfirm(true)} className="w-full py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Submit Assessment
                    </button>
                )}
                <QuestionNav index={index} total={questions.length} onPrev={() => navigate(-1)} onNext={() => navigate(1)} />
            </div>
            {showConfirm && <SubmitConfirmModal total={questions.length} answered={answeredCount} onConfirm={handleConfirmSubmit} onReturn={() => setShowConfirm(false)} />}
        </>
    );
}

// ─── Main Renderer ──────────────────────────────────────────────────────────

export default function AssessmentRenderer({
                                               assessment,
                                               role = 'developer',
                                               enableFlashcardEdit,
                                               onFlashcardQuestionsChange,
                                               persistFlashcards,
                                               onComplete,
                                           }: {
    assessment: Assessment;
    role?: string;
    enableFlashcardEdit?: boolean;
    onFlashcardQuestionsChange?: (questions: Question[]) => void;
    persistFlashcards?: boolean;
    onComplete?: (score: number, passed: boolean) => void;
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

            {format === 'flashcard' && (
                <RememberingPresentation
                    assessment={assessment}
                    questions={questions}
                    enableEdit={enableFlashcardEdit}
                    onQuestionsChange={onFlashcardQuestionsChange}
                    persistFlashcards={persistFlashcards}
                    onComplete={onComplete}
                />
            )}
            {format === 'multiple_choice' && <MultipleChoiceAssessment questions={questions} onComplete={onComplete} />}
            {format === 'short_response' && <ShortResponseAssessment questions={questions} role={role} onComplete={onComplete} />}
            {format === 'case_study' && <CaseStudyAssessment questions={questions} role={role} onComplete={onComplete} />}
            {format === 'evaluation' && <EvaluationAssessment questions={questions} role={role} onComplete={onComplete} />}
            {format === 'open_ended' && <OpenEndedAssessment questions={questions} role={role} onComplete={onComplete} />}
        </div>
    );
}