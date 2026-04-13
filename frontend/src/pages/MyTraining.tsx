import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
    Shield, LogOut, BookOpen,
    BarChart3, Loader2, ChevronRight, Settings, ChevronLeft,
    FileText, MessageCircle,
} from 'lucide-react';
import AssessmentRenderer from '../components/AssessmentRenderer';
import type { Assessment } from '../components/AssessmentRenderer';
import StudyChat from '../components/StudyChat';
import {
    MermaidDiagram, StudyGuideNarrator, MediaImageCard, VideoRecommendation,
} from '../components/MultimediaComponents';
import type { TrainingMedia } from '../components/MultimediaComponents';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AssignedTraining {
    id: string;
    assigned_at: string;
    due_date: string | null;
    training: {
        id: number;
        company_role: string;
        training_json: string;
        created_at: string;
        status?: string;
    } | {
        id: number;
        company_role: string;
        training_json: string;
        created_at: string;
        status?: string;
    }[];
}

interface TrainingScore {
    training_id: number;
    score: number;
    passed: boolean;
    completed_at: string;
}

type TrainingContent = {
    study_guide: string;
    assessment: Assessment;
    media?: TrainingMedia;
};

type TrainingModule = {
    id: string;
    role: string;
    contents: TrainingContent[];
    createdAt: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function getTrainingFromAssignment(a: AssignedTraining) {
    return Array.isArray(a.training) ? a.training[0] : a.training;
}

// ─── Markdown renderer ──────────────────────────────────────────────────────

function StudyGuideRenderer({ markdown, media }: { markdown: string; media?: TrainingMedia }) {
    const lines = markdown.split('\n');

    const diagramsBySection = new Map<string, NonNullable<TrainingMedia['diagrams']>>();
    const imagesBySection = new Map<string, NonNullable<TrainingMedia['images']>>();
    const videosBySection = new Map<string, NonNullable<TrainingMedia['videos']>>();

    if (media?.diagrams) {
        for (const d of media.diagrams) {
            const key = d.section_ref.toLowerCase();
            if (!diagramsBySection.has(key)) diagramsBySection.set(key, []);
            diagramsBySection.get(key)!.push(d);
        }
    }
    if (media?.images) {
        for (const img of media.images) {
            const key = img.section_ref.toLowerCase();
            if (!imagesBySection.has(key)) imagesBySection.set(key, []);
            imagesBySection.get(key)!.push(img);
        }
    }
    if (media?.videos) {
        for (const v of media.videos) {
            const key = v.section_ref.toLowerCase();
            if (!videosBySection.has(key)) videosBySection.set(key, []);
            videosBySection.get(key)!.push(v);
        }
    }

    const renderedSections = new Set<string>();

    const renderMediaForSection = (heading: string) => {
        const key = heading.toLowerCase();
        if (renderedSections.has(key)) return null;
        renderedSections.add(key);

        const diagrams = diagramsBySection.get(key) || [];
        const images = imagesBySection.get(key) || [];
        const videos = videosBySection.get(key) || [];

        if (!diagrams.length && !images.length && !videos.length) return null;

        return (
            <div key={`media-${key}`}>
                {images.map(img => <MediaImageCard key={img.id} image={img} />)}
                {diagrams.map(d => <MermaidDiagram key={d.id} diagram={d} />)}
                {videos.map(v => <VideoRecommendation key={v.id} video={v} />)}
            </div>
        );
    };

    return (
        <div className="space-y-2 text-sm text-gray-800 leading-relaxed">
            {lines.map((line, i) => {
                if (line.startsWith('## ')) {
                    const heading = line.replace('## ', '');
                    return (
                        <div key={i}>
                            <h2 className="text-lg font-bold text-gray-900 mt-4 mb-1">{heading}</h2>
                            {renderMediaForSection(heading)}
                        </div>
                    );
                }
                if (line.startsWith('### ')) {
                    const heading = line.replace('### ', '');
                    return (
                        <div key={i}>
                            <h3 className="text-base font-semibold text-gray-900 mt-3 mb-1">{heading}</h3>
                            {renderMediaForSection(heading)}
                        </div>
                    );
                }
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

// ─── Adaptive Study UI ──────────────────────────────────────────────────────

function AdaptiveStudyUI({ training }: { training: TrainingModule }) {
    const [contentIndex, setContentIndex] = useState(0);
    const [studyMode, setStudyMode] = useState<'guide' | 'assessment' | 'chat'>('guide');

    const content = training.contents[contentIndex];

    if (!content) return <p className="text-sm text-gray-500 p-6">No training content available.</p>;

    return (
        <div className="space-y-6">
            {training.contents.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {training.contents.map((_c, i) => (
                        <button
                            key={i}
                            onClick={() => { setContentIndex(i); setStudyMode('guide'); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                contentIndex === i ? 'bg-[#1e3a5f] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            Module {i + 1}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex gap-2">
                <button
                    onClick={() => setStudyMode('guide')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        studyMode === 'guide' ? 'bg-[#1e3a5f] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    <BookOpen className="w-4 h-4" /> Study Guide
                </button>
                <button
                    onClick={() => setStudyMode('assessment')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        studyMode === 'assessment' ? 'bg-[#1e3a5f] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    <FileText className="w-4 h-4" />
                    {content.assessment?.type || 'Assessment'}
                </button>
                <button
                    onClick={() => setStudyMode('chat')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        studyMode === 'chat' ? 'bg-[#1e3a5f] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    <MessageCircle className="w-4 h-4" /> AI Chat
                </button>
            </div>

            {studyMode === 'guide' && (
                <>
                    <StudyGuideNarrator text={content.study_guide} />
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <StudyGuideRenderer markdown={content.study_guide} media={content.media} />
                    </div>
                </>
            )}

            {studyMode === 'assessment' && content.assessment && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <AssessmentRenderer assessment={content.assessment} role={training.role} />
                </div>
            )}

            {studyMode === 'chat' && (
                <StudyChat studyGuide={content.study_guide} role={training.role} />
            )}
        </div>
    );
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar() {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const currentPath = '/my-training';
    const navItems = [
        { icon: BookOpen, label: 'My Training', href: '/my-training' },
        { icon: BarChart3, label: 'My Analytics', href: null },
        { icon: Settings, label: 'Settings', href: '/settings' },
    ];

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
                            onClick={() => item.href ? navigate(item.href) : alert(`${item.label} page coming soon!`)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                item.href !== null && item.href === currentPath
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export function MyTrainingPage() {
    const { user, profile } = useAuth();
    const [assignments, setAssignments] = useState<AssignedTraining[]>([]);
    const [scores, setScores] = useState<TrainingScore[]>([]);
    const [loading, setLoading] = useState(true);

    // The training module currently open for study (null = list view)
    const [activeTraining, setActiveTraining] = useState<TrainingModule | null>(null);

    useEffect(() => {
        if (!user) return;

        const load = async () => {
            setLoading(true);

            const { data: assignData } = await supabase
                .from('assignments')
                .select(`
                    id,
                    assigned_at,
                    due_date,
                    training:training_id (
                        id, company_role, training_json, created_at, status
                    )
                `)
                .eq('user_id', user.id)
                .order('assigned_at', { ascending: false });

            const allAssignments = (assignData ?? []) as unknown as AssignedTraining[];
            const publishedOnly = allAssignments.filter(a => {
                const t = Array.isArray(a.training) ? a.training[0] : a.training;
                return !t?.status || t.status === 'published';
            });
            setAssignments(publishedOnly);

            const { data: scoreData } = await supabase
                .from('training_evidence')
                .select('training_id, score, passed, completed_at')
                .eq('user_id', user.id);

            setScores((scoreData ?? []) as TrainingScore[]);
            setLoading(false);
        };

        void load();
    }, [user]);

    const getScore = (trainingId: number) =>
        scores.find(s => s.training_id === trainingId);

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const displayName = profile ? `${profile.first_name} ${profile.last_name}` : user?.email ?? 'User';
    const initials = profile
        ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
        : '?';

    // Open a specific assigned training inline
    const openTraining = (a: AssignedTraining) => {
        const t = getTrainingFromAssignment(a);
        if (!t) return;

        const contents = parseTrainingJson(t.training_json);
        setActiveTraining({
            id: String(t.id),
            role: t.company_role,
            contents,
            createdAt: formatDate(t.created_at),
        });
    };

    // ── Detail / study view ──
    if (activeTraining) {
        return (
            <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                <Sidebar />
                <div className="ml-64">
                    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                        <div className="px-8 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setActiveTraining(null)}
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    My Training
                                </button>
                                <span className="text-gray-300">/</span>
                                <h2 className="text-lg font-semibold text-gray-900 capitalize">
                                    {activeTraining.role} Training
                                </h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">{displayName}</p>
                                    <p className="text-xs text-gray-600 capitalize">{profile?.role ?? ''}</p>
                                </div>
                                <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-medium uppercase">
                                    {initials}
                                </div>
                            </div>
                        </div>
                    </header>
                    <main className="p-8">
                        <AdaptiveStudyUI training={activeTraining} />
                    </main>
                </div>
            </div>
        );
    }

    // ── List view ──
    return (
        <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            <Sidebar />
            <div className="ml-64">
                <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="px-8 py-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900">My Training</h2>
                            <p className="text-sm text-gray-600 mt-1">Welcome back, {displayName}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{displayName}</p>
                                <p className="text-xs text-gray-600 capitalize">{profile?.role ?? ''}</p>
                            </div>
                            <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-medium uppercase">
                                {initials}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="p-8 space-y-6">
                    {/* Summary cards */}
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
                            <p className="text-3xl font-bold text-green-600 mt-1">
                                {scores.filter(s => s.passed).length}
                            </p>
                        </div>
                    </div>

                    {/* Assigned trainings table */}
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
                                    const t = getTrainingFromAssignment(a);
                                    const score = t ? getScore(t.id) : undefined;
                                    return (
                                        <tr key={a.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize">
                                                {t?.company_role ?? '—'} Training
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {formatDate(a.assigned_at)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {a.due_date ? formatDate(a.due_date) : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {score ? `${score.score}/100` : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {score ? (
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                                        score.passed
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}>
                                                            {score.passed ? 'Passed' : 'Failed'}
                                                        </span>
                                                ) : (
                                                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                                            Pending
                                                        </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => openTraining(a)}
                                                    className="flex items-center gap-1 text-xs text-[#1e3a5f] font-medium hover:underline"
                                                >
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
                </main>
            </div>
        </div>
    );
}