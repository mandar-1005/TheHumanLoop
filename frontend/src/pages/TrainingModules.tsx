import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
    ChevronLeft, BookOpen, CreditCard, FileText,
    CheckCircle, AlertCircle, XCircle, RotateCw, RefreshCw,
    Sparkles, ChevronRight, LayoutDashboard, Users,
    BarChart3, Settings, Shield, LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AIGradingChat } from '../components/AIGradingChat';

// ─── Types ─────────────────────────────────────────────────────────────────

type TrainingStatus = 'Published' | 'In Review' | 'Draft';

type Question = {
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
};

type Assessment = {
    type: string;
    questions: Question[];
};

type TrainingContent = {
    study_guide: string;
    assessment: Assessment;
};

type TrainingRow = {
    id: string | number;
    company_role: string | null;
    training_json: unknown;
    created_at: string | null;
};

type TrainingModule = {
    id: string;
    role: string;
    status: TrainingStatus;
    createdAt: string;
    contents: TrainingContent[];
};

type FeedbackStatus = 'correct' | 'partial' | 'incorrect' | null;

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseTrainingJson(raw: unknown): TrainingContent[] {
    try {
        let parsed = raw;
        if (typeof raw === 'string') {
            const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            parsed = JSON.parse(cleaned);
        }
        if (Array.isArray(parsed)) return parsed as TrainingContent[];
        if (typeof parsed === 'object' && parsed !== null) return [parsed as TrainingContent];
    } catch {
        // ignore parse errors
    }
    return [];
}

function mapTraining(row: TrainingRow): TrainingModule {
    const contents = parseTrainingJson(row.training_json);
    const formattedDate = row.created_at
        ? new Date(row.created_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        })
        : 'Unknown';

    return {
        id: String(row.id),
        role: row.company_role || 'Other',
        status: 'Published',
        createdAt: formattedDate,
        contents,
    };
}

// ─── Markdown-lite renderer ────────────────────────────────────────────────

function StudyGuideRenderer({ markdown }: { markdown: string }) {
    const lines = markdown.split('\n');

    return (
        <div className="space-y-2 text-sm text-gray-800 leading-relaxed">
            {lines.map((line, i) => {
                if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-gray-900 mt-4 mb-1">{line.replace('## ', '')}</h2>;
                if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-gray-900 mt-3 mb-1">{line.replace('### ', '')}</h3>;
                if (line.startsWith('#### ')) return <h4 key={i} className="text-sm font-semibold text-gray-800 mt-2">{line.replace('#### ', '')}</h4>;
                if (line.match(/^\d+\.\s+\*\*/)) {
                    const text = line.replace(/^\d+\.\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1');
                    return <p key={i} className="font-semibold text-gray-900 mt-2">{text}</p>;
                }
                if (line.startsWith('*   ') || line.startsWith('-   ') || line.startsWith('*  ') || line.startsWith('- ')) {
                    const text = line.replace(/^[\*\-]\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1');
                    return (
                        <div key={i} className="flex gap-2 pl-4">
                            <span className="text-[#1e3a5f] mt-1">•</span>
                            <span>{text}</span>
                        </div>
                    );
                }
                if (line.trim() === '') return <div key={i} className="h-1" />;
                const parts = line.split(/\*\*(.*?)\*\*/g);
                if (parts.length > 1) {
                    return (
                        <p key={i}>
                            {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
                        </p>
                    );
                }
                return <p key={i}>{line}</p>;
            })}
        </div>
    );
}

// ─── Adaptive Study UI ─────────────────────────────────────────────────────

function AdaptiveStudyUI({ training }: { training: TrainingModule }) {
    const [contentIndex, setContentIndex] = useState(0);
    const [studyMode, setStudyMode] = useState<'guide' | 'assessment' | 'chat'>('guide');
    const [userAnswer, setUserAnswer] = useState('');
    const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>(null);
    const [feedback, setFeedback] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [questionIndex, setQuestionIndex] = useState(0);

    const content = training.contents[contentIndex];
    const assessmentType = content?.assessment?.type?.toLowerCase() ?? '';
    const questions = content?.assessment?.questions ?? [];
    const currentQuestion = questions[questionIndex];

    const resetAssessment = () => {
        setUserAnswer('');
        setFeedbackStatus(null);
        setFeedback('');
        setIsSubmitted(false);
        setIsFlipped(false);
    };

    const handleSubmit = () => {
        if (!userAnswer.trim()) return;
        setIsGenerating(true);

        setTimeout(() => {
            const lower = userAnswer.toLowerCase();
            const rubric = String(currentQuestion?.rubric || currentQuestion?.grading_rubric || '').toLowerCase();
            const keywords = rubric.match(/\b(validation|encoding|injection|encryption|authentication|authorization|least privilege|owasp|xss|sql|input|output|secure|remediat|isolat|contain|notif|document)\b/g) || [];
            const matched = keywords.filter(k => lower.includes(k));
            const ratio = keywords.length > 0 ? matched.length / keywords.length : 0;

            if (ratio >= 0.5) {
                setFeedbackStatus('correct');
                setFeedback('Excellent response! You demonstrated strong understanding of the key security concepts and their practical application.');
            } else if (ratio >= 0.25) {
                setFeedbackStatus('partial');
                setFeedback('Good start! You covered some important points. Consider expanding on specific implementation details and FedRAMP control references.');
            } else {
                setFeedbackStatus('incorrect');
                setFeedback('Your response needs more detail. Focus on specific security practices, how to implement them, and which FedRAMP controls they satisfy.');
            }

            setIsGenerating(false);
            setIsSubmitted(true);
        }, 1500);
    };

    const getFeedbackStyle = () => {
        switch (feedbackStatus) {
            case 'correct': return { box: 'bg-green-50 border-green-200 text-green-800', icon: 'text-green-600', label: '✅ Excellent Work!' };
            case 'partial': return { box: 'bg-yellow-50 border-yellow-200 text-yellow-800', icon: 'text-yellow-600', label: '⚠️ Partially Correct' };
            case 'incorrect': return { box: 'bg-red-50 border-red-200 text-red-800', icon: 'text-red-600', label: '❌ Needs Improvement' };
            default: return { box: '', icon: '', label: '' };
        }
    };

    const feedbackStyle = getFeedbackStyle();

    if (!content) {
        return <p className="text-sm text-gray-500 p-6">No training content available.</p>;
    }

    return (
        <div className="space-y-6">
            {/* Role tabs if multiple contents */}
            {training.contents.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {training.contents.map((_c, i) => {
                        const role = training.role === 'Software Developer' && i === 0 ? 'Software Developer'
                            : training.role === 'Development Lead' && i === 1 ? 'Development Lead'
                                : `Module ${i + 1}`;
                        return (
                            <button
                                key={i}
                                onClick={() => { setContentIndex(i); resetAssessment(); setStudyMode('guide'); }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    contentIndex === i ? 'bg-[#1e3a5f] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {role}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Mode toggle */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => { setStudyMode('guide'); resetAssessment(); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        studyMode === 'guide' ? 'bg-[#1e3a5f] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    <BookOpen className="w-4 h-4" />
                    Study Guide
                </button>
                <button
                    onClick={() => { setStudyMode('assessment'); resetAssessment(); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        studyMode === 'assessment' ? 'bg-[#1e3a5f] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    {assessmentType.includes('flashcard') ? <CreditCard className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    {content.assessment.type}
                </button>
                <button
                    onClick={() => { setStudyMode('chat'); resetAssessment(); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        studyMode === 'chat' ? 'bg-[#1e3a5f] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    <Sparkles className="w-4 h-4" />
                    AI Grading Chat
                </button>
            </div>

            {/* ── Study Guide ── */}
            {studyMode === 'guide' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <StudyGuideRenderer markdown={content.study_guide} />
                </div>
            )}

            {/* ── Assessment ── */}
            {studyMode === 'assessment' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {content.assessment.type} Assessment
                        </p>
                        {questions.length > 1 && (
                            <span className="text-xs text-gray-500">
                                Question {questionIndex + 1} of {questions.length}
                            </span>
                        )}
                    </div>

                    {/* Flashcards */}
                    {assessmentType.includes('flashcard') && currentQuestion && (
                        <div className="space-y-4">
                            <div onClick={() => setIsFlipped(!isFlipped)} className="relative h-56 cursor-pointer">
                                <div
                                    className="w-full h-full rounded-xl flex items-center justify-center p-8 text-center transition-all duration-300"
                                    style={{ background: isFlipped ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }}
                                >
                                    <div>
                                        <p className="text-xs text-white/60 mb-3">{isFlipped ? 'DEFINITION' : 'TERM'}</p>
                                        <p className="text-lg text-white font-medium">{isFlipped ? currentQuestion.definition : currentQuestion.term}</p>
                                        <p className="text-xs text-white/50 mt-6">Click to flip</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <button onClick={() => { setQuestionIndex(q => Math.max(0, q - 1)); setIsFlipped(false); }} disabled={questionIndex === 0} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40">
                                    <ChevronLeft className="w-4 h-4" /> Previous
                                </button>
                                <button onClick={() => setIsFlipped(!isFlipped)} className="flex items-center gap-1 px-3 py-2 text-sm text-[#1e3a5f] border border-[#1e3a5f] rounded-lg hover:bg-[#1e3a5f] hover:text-white">
                                    <RotateCw className="w-4 h-4" /> Flip
                                </button>
                                <button onClick={() => { setQuestionIndex(q => Math.min(questions.length - 1, q + 1)); setIsFlipped(false); }} disabled={questionIndex === questions.length - 1} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40">
                                    Next <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Multiple Choice */}
                    {assessmentType.includes('multiple') && currentQuestion && (
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-gray-900">{currentQuestion.question || currentQuestion.prompt}</p>
                            <div className="space-y-2">
                                {(currentQuestion.options || []).map((option, i) => (
                                    <button
                                        key={i}
                                        onClick={() => !isSubmitted && setUserAnswer(option)}
                                        className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                                            userAnswer === option ? 'border-[#1e3a5f] bg-blue-50 text-[#1e3a5f]' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                        } ${isSubmitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                            {!isSubmitted ? (
                                <button
                                    onClick={() => {
                                        if (!userAnswer) return;
                                        setIsSubmitted(true);
                                        const correct = userAnswer === currentQuestion.correct_answer;
                                        setFeedbackStatus(correct ? 'correct' : 'incorrect');
                                        setFeedback(correct ? 'Correct! Well done.' : `The correct answer is: ${currentQuestion.correct_answer}`);
                                    }}
                                    disabled={!userAnswer}
                                    className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] disabled:opacity-40"
                                >
                                    Submit Answer
                                </button>
                            ) : (
                                <button onClick={resetAssessment} className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Try Again</button>
                            )}
                        </div>
                    )}

                    {/* Short Response / Case Study */}
                    {(assessmentType.includes('short') || assessmentType.includes('case')) && currentQuestion && (
                        <div className="space-y-4">
                            {currentQuestion.scenario && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-blue-700 mb-2">SCENARIO</p>
                                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{currentQuestion.scenario}</p>
                                </div>
                            )}
                            {currentQuestion.prompt && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-amber-700 mb-2">QUESTION</p>
                                    <p className="text-sm text-gray-800 leading-relaxed">{currentQuestion.prompt}</p>
                                </div>
                            )}
                            {currentQuestion.max_score && <p className="text-xs text-gray-500">Max score: {currentQuestion.max_score} points</p>}
                            <textarea
                                value={userAnswer}
                                onChange={(e) => setUserAnswer(e.target.value)}
                                disabled={isSubmitted}
                                rows={6}
                                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                placeholder="Write your detailed response here..."
                            />
                            {!isSubmitted ? (
                                <button onClick={handleSubmit} disabled={!userAnswer.trim()} className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] disabled:opacity-40 flex items-center justify-center gap-2">
                                    <CheckCircle className="w-4 h-4" /> Submit Response
                                </button>
                            ) : (
                                <button onClick={resetAssessment} className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2">
                                    <RotateCw className="w-4 h-4" /> Try Again
                                </button>
                            )}
                            {isGenerating && (
                                <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <Sparkles className="w-5 h-5 text-blue-600 animate-spin" />
                                    <span className="text-sm font-medium text-blue-700">Analyzing your response...</span>
                                </div>
                            )}
                            {isSubmitted && feedbackStatus && !isGenerating && (
                                <div className={`p-4 border-2 rounded-lg ${feedbackStyle.box}`}>
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className={feedbackStyle.icon}>
                                            {feedbackStatus === 'correct' && <CheckCircle className="w-5 h-5" />}
                                            {feedbackStatus === 'partial' && <AlertCircle className="w-5 h-5" />}
                                            {feedbackStatus === 'incorrect' && <XCircle className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold mb-1">{feedbackStyle.label}</p>
                                            <p className="text-sm leading-relaxed">{feedback}</p>
                                        </div>
                                    </div>
                                    <button onClick={handleSubmit} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                                        <RefreshCw className="w-3.5 h-3.5" /> Regenerate Feedback
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── AI Grading Chat ── */}
            {studyMode === 'chat' && (
                <AIGradingChat training={training} />
            )}
        </div>
    );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────

function Sidebar() {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { icon: BookOpen, label: 'Training Modules', href: '/training-modules' },
        { icon: FileText, label: 'SSP Documents', href: '/ssp-documents' },
        { icon: Users, label: 'Roles & Assessments', href: '/roles' },
        { icon: BarChart3, label: 'Analytics', href: null },
        { icon: Settings, label: 'Settings', href: '/settings' },
    ];

    const current = '/training-modules';

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-10">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Secure Training</h1>
                        <p className="text-xs text-gray-500">MARi Platform</p>
                    </div>
                </div>

                <nav className="space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => {
                                if (item.href) navigate(item.href);
                                else alert(`${item.label} page coming soon!`);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                item.href === current
                                    ? 'bg-[#1e3a5f] text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
                <button
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors mb-4"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
                <div className="text-xs text-gray-500">
                    <p className="mb-1">© 2026 MARi</p>
                    <p>FedRAMP Compliant</p>
                </div>
            </div>
        </aside>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export function TrainingModulesPage() {
    const [rows, setRows] = useState<TrainingModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<TrainingModule | null>(null);

    const total = useMemo(() => rows.length, [rows]);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('trainings')
                .select('id, company_role, training_json, created_at')
                .order('created_at', { ascending: false });

            if (!mounted) return;

            if (error) {
                setError(error.message);
                setRows([]);
            } else {
                setRows(((data ?? []) as TrainingRow[]).map(mapTraining));
            }

            setLoading(false);
        };

        void load();
        return () => { mounted = false; };
    }, []);

    // ── Detail view ──
    if (selected) {
        return (
            <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                <Sidebar />
                <div className="ml-64">
                    <main className="p-8">
                        <button
                            onClick={() => setSelected(null)}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back to Training Modules
                        </button>

                        <div className="mb-6">
                            <h1 className="text-2xl font-semibold text-gray-900 capitalize">
                                {selected.role} Training
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">Created {selected.createdAt}</p>
                        </div>

                        <AdaptiveStudyUI training={selected} />
                    </main>
                </div>
            </div>
        );
    }

    // ── Table view ──
    return (
        <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            <Sidebar />
            <div className="ml-64">
                <main className="p-8">
                    <h1 className="text-2xl font-semibold text-gray-900 mb-2">Training Modules</h1>
                    <p className="text-sm text-gray-600 mb-6">
                        {total} training{total !== 1 ? 's' : ''} available — click a row to study
                    </p>

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Role</th>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Assessment Type</th>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Modules</th>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Status</th>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Created</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-6 text-sm text-gray-500">Loading trainings...</td>
                                </tr>
                            )}
                            {!loading && error && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-6 text-sm text-red-600">Failed to load: {error}</td>
                                </tr>
                            )}
                            {!loading && !error && rows.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-6 text-sm text-gray-500">No trainings found. Run the AI pipeline to generate some.</td>
                                </tr>
                            )}
                            {!loading && !error && rows.map((row) => (
                                <tr
                                    key={row.id}
                                    onClick={() => setSelected(row)}
                                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize">{row.role}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        {row.contents[0]?.assessment?.type ?? '—'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{row.contents.length}</td>
                                    <td className="px-6 py-4">
                                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                                {row.status}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{row.createdAt}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
}