import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
    Shield, LogOut, BookOpen, BarChart3, Loader2, ChevronRight,
    ChevronLeft, CreditCard, FileText, CheckCircle, AlertCircle,
    XCircle, RotateCw, RefreshCw, Sparkles
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AssignedTraining {
    id: string;
    assigned_at: string;
    due_date: string | null;
    training: {
        id: number;
        company_role: string;
        training_json: unknown;
        created_at: string;
    } | {
        id: number;
        company_role: string;
        training_json: unknown;
        created_at: string;
    }[];
}

interface TrainingScore {
    training_id: number;
    score: number;
    passed: boolean;
    completed_at: string;
}

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

type Assessment = { type: string; questions: Question[] };
type TrainingContent = { study_guide: string; assessment: Assessment };
type TrainingModule = { id: string; role: string; createdAt: string; contents: TrainingContent[] };
type FeedbackStatus = 'correct' | 'partial' | 'incorrect' | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTrainingJson(raw: unknown): TrainingContent[] {
    try {
        let parsed = raw;
        if (typeof raw === 'string') {
            const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            parsed = JSON.parse(cleaned);
        }
        if (Array.isArray(parsed)) return parsed as TrainingContent[];
        if (typeof parsed === 'object' && parsed !== null) return [parsed as TrainingContent];
    } catch { /* ignore */ }
    return [];
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

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
                    return <p key={i}>{parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}</p>;
                }
                return <p key={i}>{line}</p>;
            })}
        </div>
    );
}

// ─── Training Viewer ─────────────────────────────────────────────────────────

function TrainingViewer({ training, onBack }: { training: TrainingModule; onBack: () => void }) {
    const [contentIndex, setContentIndex] = useState(0);
    const [studyMode, setStudyMode] = useState<'guide' | 'assessment'>('guide');
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
        setUserAnswer(''); setFeedbackStatus(null); setFeedback('');
        setIsSubmitted(false); setIsFlipped(false);
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
            if (ratio >= 0.5) { setFeedbackStatus('correct'); setFeedback('Excellent response! You demonstrated strong understanding of the key security concepts and their practical application.'); }
            else if (ratio >= 0.25) { setFeedbackStatus('partial'); setFeedback('Good start! You covered some important points. Consider expanding on specific implementation details and FedRAMP control references.'); }
            else { setFeedbackStatus('incorrect'); setFeedback('Your response needs more detail. Focus on specific security practices, how to implement them, and which FedRAMP controls they satisfy.'); }
            setIsGenerating(false); setIsSubmitted(true);
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

    if (!content) return <p className="text-sm text-gray-500 p-6">No training content available.</p>;

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                <ChevronLeft className="w-4 h-4" /> Back to My Training
            </button>
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 capitalize">{training.role} Training</h1>
                <p className="text-sm text-gray-500 mt-1">Created {training.createdAt}</p>
            </div>

            {training.contents.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {training.contents.map((_c, i) => (
                        <button key={i} onClick={() => { setContentIndex(i); resetAssessment(); setStudyMode('guide'); }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${contentIndex === i ? 'bg-[#1e3a5f] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            Module {i + 1}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex gap-2">
                <button onClick={() => { setStudyMode('guide'); resetAssessment(); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${studyMode === 'guide' ? 'bg-[#1e3a5f] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                    <BookOpen className="w-4 h-4" /> Study Guide
                </button>
                <button onClick={() => { setStudyMode('assessment'); resetAssessment(); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${studyMode === 'assessment' ? 'bg-[#1e3a5f] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                    {assessmentType.includes('flashcard') ? <CreditCard className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    {content.assessment.type}
                </button>
            </div>

            {studyMode === 'guide' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <StudyGuideRenderer markdown={content.study_guide} />
                </div>
            )}

            {studyMode === 'assessment' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{content.assessment.type} Assessment</p>
                        {questions.length > 1 && <span className="text-xs text-gray-500">Question {questionIndex + 1} of {questions.length}</span>}
                    </div>

                    {assessmentType.includes('flashcard') && currentQuestion && (
                        <div className="space-y-4">
                            <div onClick={() => setIsFlipped(!isFlipped)} className="relative h-56 cursor-pointer">
                                <div className="w-full h-full rounded-xl flex items-center justify-center p-8 text-center transition-all duration-300"
                                     style={{ background: isFlipped ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }}>
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

                    {assessmentType.includes('multiple') && currentQuestion && (
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-gray-900">{currentQuestion.question || currentQuestion.prompt}</p>
                            <div className="space-y-2">
                                {(currentQuestion.options || []).map((option, i) => (
                                    <button key={i} onClick={() => !isSubmitted && setUserAnswer(option)}
                                            className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${userAnswer === option ? 'border-[#1e3a5f] bg-blue-50 text-[#1e3a5f]' : 'border-gray-200 hover:border-gray-300 text-gray-700'} ${isSubmitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        {option}
                                    </button>
                                ))}
                            </div>
                            {!isSubmitted ? (
                                <button onClick={() => { if (!userAnswer) return; setIsSubmitted(true); const correct = userAnswer === currentQuestion.correct_answer; setFeedbackStatus(correct ? 'correct' : 'incorrect'); setFeedback(correct ? 'Correct! Well done.' : `The correct answer is: ${currentQuestion.correct_answer}`); }} disabled={!userAnswer} className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] disabled:opacity-40">Submit Answer</button>
                            ) : (
                                <button onClick={resetAssessment} className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Try Again</button>
                            )}
                        </div>
                    )}

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
                            <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} disabled={isSubmitted} rows={6}
                                      className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                      placeholder="Write your detailed response here..." />
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
        </div>
    );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar() {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const navItems = [
        { icon: BookOpen, label: 'My Training', href: '/my-training' },
        { icon: BarChart3, label: 'My Analytics', href: '/my-analytics' },
    ];
    const current = '/my-training';
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
                        <button key={item.label} onClick={() => navigate(item.href)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${item.href === current ? 'bg-[#1e3a5f] text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
                <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors mb-4">
                    <LogOut className="w-5 h-5" /> Sign Out
                </button>
                <div className="text-xs text-gray-500">
                    <p className="mb-1">© 2026 MARi</p>
                    <p>FedRAMP Compliant</p>
                </div>
            </div>
        </aside>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MyTrainingPage() {
    const { user, profile } = useAuth();
    // const navigate = useNavigate();
    const [assignments, setAssignments] = useState<AssignedTraining[]>([]);
    const [scores, setScores] = useState<TrainingScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTraining, setActiveTraining] = useState<TrainingModule | null>(null);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            setLoading(true);
            const { data: assignData } = await supabase
                .from('assignments')
                .select(`id, assigned_at, due_date, training:training_id (id, company_role, training_json, created_at)`)
                .eq('user_id', user.id)
                .order('assigned_at', { ascending: false });
            setAssignments((assignData ?? []) as unknown as AssignedTraining[]);

            const { data: scoreData } = await supabase
                .from('training_evidence')
                .select('training_id, score, passed, completed_at')
                .eq('user_id', user.id);
            setScores((scoreData ?? []) as TrainingScore[]);
            setLoading(false);
        };
        void load();
    }, [user]);

    const getTraining = (a: AssignedTraining) => Array.isArray(a.training) ? a.training[0] : a.training;
    const getScore = (trainingId: number) => scores.find(s => s.training_id === trainingId);
    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const displayName = profile ? `${profile.first_name} ${profile.last_name}` : user?.email ?? 'User';
    const initials = profile ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() : '?';

    const handleStart = (a: AssignedTraining) => {
        const t = getTraining(a);
        if (!t) return;
        setActiveTraining({
            id: String(t.id),
            role: t.company_role,
            createdAt: new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            contents: parseTrainingJson(t.training_json),
        });
    };

    return (
        <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            <Sidebar />
            <div className="ml-64">
                <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="px-8 py-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900">{activeTraining ? `${activeTraining.role} Training` : 'My Training'}</h2>
                            <p className="text-sm text-gray-600 mt-1">Welcome back, {displayName}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{displayName}</p>
                                <p className="text-xs text-gray-600 capitalize">{profile?.role ?? ''}</p>
                            </div>
                            <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-medium uppercase">{initials}</div>
                        </div>
                    </div>
                </header>

                <main className="p-8 space-y-6">
                    {activeTraining ? (
                        <TrainingViewer training={activeTraining} onBack={() => setActiveTraining(null)} />
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-6">
                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                    <p className="text-sm text-gray-600">Assigned</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{assignments.length}</p>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                    <p className="text-sm text-gray-600">Completed</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">{scores.length}</p>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                    <p className="text-sm text-gray-600">Passed</p>
                                    <p className="text-3xl font-bold text-green-600 mt-1">{scores.filter(s => s.passed).length}</p>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <div className="p-6 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900">Assigned Trainings</h3>
                                </div>
                                {loading ? (
                                    <div className="p-12 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">Loading your trainings...</p>
                                    </div>
                                ) : assignments.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm text-gray-500 font-medium">No trainings assigned yet</p>
                                        <p className="text-xs text-gray-400 mt-1">Your admin will assign trainings to you</p>
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Training</th>
                                            <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Assigned</th>
                                            <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Due Date</th>
                                            <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Score</th>
                                            <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Status</th>
                                            <th className="px-6 py-3" />
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                        {assignments.map((a) => {
                                            const t = getTraining(a);
                                            const score = t ? getScore(t.id) : undefined;
                                            return (
                                                <tr key={a.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize">{t?.company_role ?? '—'} Training</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(a.assigned_at)}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{a.due_date ? formatDate(a.due_date) : '—'}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{score ? `${score.score}/100` : '—'}</td>
                                                    <td className="px-6 py-4">
                                                        {score ? (
                                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${score.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {score.passed ? 'Passed' : 'Failed'}
                                                                </span>
                                                        ) : (
                                                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button onClick={() => handleStart(a)} className="flex items-center gap-1 text-xs text-[#1e3a5f] font-medium hover:underline">
                                                            Start <ChevronRight className="w-3 h-3" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}