import { useEffect, useMemo, useState } from 'react';
import { useStudyResume } from '../hooks/useStudyResume';
import { StudyToolsPanel } from '../components/StudyToolsPanel';
import { supabase } from '../lib/supabaseClient';
import { ChevronLeft, BookOpen, FileText, LayoutDashboard, Users, BarChart3, Settings, Shield, LogOut, MessageCircle, CheckCircle, XCircle, Send, Loader2, Trash2, Pencil, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AssessmentRenderer from '../components/AssessmentRenderer';
import type { Assessment, Question } from '../components/AssessmentRenderer';
import StudyChat from '../components/StudyChat';
import {
    MermaidDiagram, StudyGuideNarrator, MediaImageCard, VideoRecommendation,
} from '../components/MultimediaComponents';
import type { TrainingMedia } from '../components/MultimediaComponents';

// ─── Types ─────────────────────────────────────────────────────────────────

type TrainingStatus = 'Published' | 'In Review' | 'Draft' | 'Rejected';

type TrainingContent = {
    study_guide: string;
    assessment: Assessment;
    media?: TrainingMedia;
};

type TrainingRow = {
    id: string | number;
    name?: string | null;
    company_role: string | null;
    training_json: unknown;
    created_at: string | null;
    status?: string;
};

type TrainingModule = {
    id: string;
    name: string;
    role: string;
    status: TrainingStatus;
    createdAt: string;
    contents: TrainingContent[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseTrainingJson(raw: unknown): TrainingContent[] {
    try {
        let parsed = raw;

        // If it's a string (possibly with ```json fences), clean and parse it
        if (typeof raw === 'string') {
            const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            parsed = JSON.parse(cleaned);
        }

        // It should be an array of { study_guide, assessment }
        if (Array.isArray(parsed)) return parsed as TrainingContent[];

        // Single object
        if (typeof parsed === 'object' && parsed !== null) return [parsed as TrainingContent];
    } catch {
        // ignore parse errors
    }
    return [];
}

function cloneTrainingContents(contents: TrainingContent[]): TrainingContent[] {
    return JSON.parse(JSON.stringify(contents)) as TrainingContent[];
}

const STATUS_MAP: Record<string, TrainingStatus> = {
    draft: 'Draft',
    in_review: 'In Review',
    published: 'Published',
    rejected: 'Rejected',
};

function mapTraining(row: TrainingRow): TrainingModule {
    const contents = parseTrainingJson(row.training_json);

    const formattedDate = row.created_at
        ? new Date(row.created_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
        : 'Unknown';

    return {
        id: String(row.id),
        name: row.name || '',
        role: row.company_role || 'Other',
        status: STATUS_MAP[row.status ?? 'published'] ?? 'Published',
        createdAt: formattedDate,
        contents,
    };
}

// ─── Markdown-lite renderer ────────────────────────────────────────────────
// Renders bold, headings, bullet lists from the study_guide markdown string

function StudyGuideRenderer({ markdown, media }: { markdown: string; media?: TrainingMedia }) {
    const lines = markdown.split('\n');

    const diagramsBySection = new Map<string, typeof media extends undefined ? never : NonNullable<TrainingMedia['diagrams']>>();
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
                if (line.startsWith('#### ')) {
                    return <h4 key={i} className="text-sm font-semibold text-gray-800 mt-2">{line.replace('#### ', '')}</h4>;
                }
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
                            {parts.map((part, j) =>
                                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                            )}
                        </p>
                    );
                }
                return <p key={i}>{line}</p>;
            })}
        </div>
    );
}

// ─── Status Badge ──────────────────────────────────────────────────────────

const STATUS_STYLES: Record<TrainingStatus, string> = {
    Draft:     'bg-gray-100 text-gray-700 border-gray-200',
    'In Review': 'bg-amber-100 text-amber-700 border-amber-200',
    Published: 'bg-green-100 text-green-700 border-green-200',
    Rejected:  'bg-red-100 text-red-700 border-red-200',
};

function StatusBadge({ status }: { status: TrainingStatus }) {
    return (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[status] ?? STATUS_STYLES.Draft}`}>
            {status}
        </span>
    );
}

// ─── Adaptive Study UI ─────────────────────────────────────────────────────

function AdaptiveStudyUI({
                             training,
                             workingContents,
                             onFlashcardQuestionsChange,
                             persistFlashcards,
                         }: {
    training: TrainingModule;
    workingContents: TrainingContent[];
    onFlashcardQuestionsChange?: (contentIndex: number, questions: Question[]) => void;
    persistFlashcards?: boolean;
}) {
    const {
        contentIndex,
        setContentIndex,
        studyMode,
        setStudyMode,
        resumeApplied,
    } = useStudyResume(training.id);
    const [hideResumeBanner, setHideResumeBanner] = useState(false);

    useEffect(() => {
        setHideResumeBanner(false);
    }, [training.id]);

    const content = workingContents[contentIndex];

    if (!content) {
        return <p className="text-sm text-gray-500 p-6">No training content available.</p>;
    }

    return (
        <div className="space-y-6">
            {resumeApplied && !hideResumeBanner && (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-2.5 text-sm text-blue-900">
                    <span>Restored where you left off (saved in this browser).</span>
                    <button
                        type="button"
                        onClick={() => setHideResumeBanner(true)}
                        className="text-xs font-medium text-blue-700 hover:underline flex-shrink-0"
                    >
                        Dismiss
                    </button>
                </div>
            )}
            {workingContents.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {workingContents.map((_c, i) => {
                        const label = training.role === 'Software Developer' && i === 0 ? 'Software Developer'
                            : training.role === 'Development Lead' && i === 1 ? 'Development Lead'
                                : `Module ${i + 1}`;
                        return (
                            <button
                                key={i}
                                onClick={() => { setContentIndex(i); setStudyMode('guide'); }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    contentIndex === i ? 'bg-[#1e3a5f] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setStudyMode('guide')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        studyMode === 'guide' ? 'bg-[#1e3a5f] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    <BookOpen className="w-4 h-4" />
                    Study Guide
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
                    <MessageCircle className="w-4 h-4" />
                    AI Chat
                </button>
            </div>

            {studyMode === 'guide' && (
                <>
                    <StudyToolsPanel trainingId={training.id} studyGuideMarkdown={content.study_guide} />
                    <StudyGuideNarrator text={content.study_guide} />
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <StudyGuideRenderer markdown={content.study_guide} media={content.media} />
                    </div>
                </>
            )}

            {studyMode === 'assessment' && content.assessment && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <AssessmentRenderer
                        assessment={content.assessment}
                        role={training.role}
                        enableFlashcardEdit={Boolean(onFlashcardQuestionsChange)}
                        onFlashcardQuestionsChange={
                            onFlashcardQuestionsChange
                                ? (questions) => onFlashcardQuestionsChange(contentIndex, questions)
                                : undefined
                        }
                        persistFlashcards={persistFlashcards}
                    />
                </div>
            )}

            {studyMode === 'chat' && (
                <StudyChat studyGuide={content.study_guide} role={training.role} />
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
        { icon: BarChart3, label: 'Analytics', href: '/progress' },
        { icon: Settings, label: 'Settings', href: '/settings' },
    ];

    const current = '/training-modules';

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-10">
            <div className="p-6">
                {/* Logo */}
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Secure Training</h1>
                        <p className="text-xs text-gray-500">MARi Platform</p>
                    </div>
                </div>

                {/* Nav */}
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

            {/* Bottom */}
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
    const { user } = useAuth();
    const [rows, setRows] = useState<TrainingModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<TrainingModule | null>(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [workingContents, setWorkingContents] = useState<TrainingContent[]>([]);
    const [flashcardPersist, setFlashcardPersist] = useState(false);
    const [flashcardSaveMsg, setFlashcardSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [editingName, setEditingName] = useState<string | null>(null);
    const [nameInput, setNameInput] = useState('');

    const total = useMemo(() => rows.length, [rows]);

    useEffect(() => {
        if (selected) {
            setWorkingContents(cloneTrainingContents(selected.contents));
            setFlashcardSaveMsg(null);
        }
    }, [selected?.id]);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('trainings')
                .select('id, name, company_role, training_json, created_at, status')
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

    const refreshSelected = (newStatus: TrainingStatus) => {
        if (!selected) return;
        const updated = { ...selected, status: newStatus };
        setSelected(updated);
        setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
    };

    const handleSubmitForReview = async () => {
        if (!selected) return;
        setReviewLoading(true);
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/trainings/${selected.id}/submit-review`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to submit for review');
            refreshSelected('In Review');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to submit for review');
        } finally {
            setReviewLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selected || !user) return;
        setReviewLoading(true);
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/trainings/${selected.id}/approve?user_id=${user.id}`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to approve training');
            refreshSelected('Published');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to approve');
        } finally {
            setReviewLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selected || !user) return;
        setReviewLoading(true);
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/trainings/${selected.id}/reject?user_id=${user.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rejection_reason: rejectReason || null }),
            });
            if (!res.ok) throw new Error('Failed to reject training');
            refreshSelected('Rejected');
            setShowRejectInput(false);
            setRejectReason('');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to reject');
        } finally {
            setReviewLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('trainings').delete().eq('id', Number(id));
        if (error) { console.error('Delete failed:', error); return; }
        setRows(prev => prev.filter(r => r.id !== id));
        if (selected?.id === id) setSelected(null);
        setDeleteConfirm(null);
    };

    const handleSaveName = async (id: string) => {
        const trimmed = nameInput.trim();
        if (!trimmed) { setEditingName(null); return; }
        const { error } = await supabase
            .from('trainings')
            .update({ name: trimmed })
            .eq('id', Number(id));
        if (error) { console.error('Name save failed:', error); return; }
        setRows(prev => prev.map(r => r.id === id ? { ...r, name: trimmed } : r));
        if (selected?.id === id) setSelected(prev => prev ? { ...prev, name: trimmed } : prev);
        setEditingName(null);
    };

    const handleFlashcardQuestionsChange = async (contentIndex: number, questions: Question[]) => {
        if (!selected) return;

        let nextContents: TrainingContent[] = [];
        setWorkingContents(prev => {
            nextContents = prev.map((c, i) =>
                i === contentIndex ? { ...c, assessment: { ...c.assessment, questions } } : c,
            );
            return nextContents;
        });

        setFlashcardPersist(true);
        setFlashcardSaveMsg(null);

        const trainingId = typeof selected.id === 'string' ? Number(selected.id) : selected.id;
        const { error: updateError } = await supabase
            .from('trainings')
            .update({ training_json: JSON.stringify(nextContents) })
            .eq('id', trainingId);

        setFlashcardPersist(false);

        if (updateError) {
            setFlashcardSaveMsg({ type: 'err', text: updateError.message });
            return;
        }

        setFlashcardSaveMsg({ type: 'ok', text: 'Flashcards saved.' });
        setRows(prev => prev.map(r => (r.id === selected.id ? { ...r, contents: nextContents } : r)));
        setSelected(prev => (prev && prev.id === selected.id ? { ...prev, contents: nextContents } : prev));
    };

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
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900 capitalize">
                                        {selected.name || `${selected.role} Training`}
                                    </h1>
                                    <p className="text-sm text-gray-500 mt-1 capitalize">{selected.role} · Created {selected.createdAt}</p>
                                </div>
                                <StatusBadge status={selected.status} />
                            </div>
                        </div>

                        {/* Review Actions */}
                        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4">
                            {selected.status === 'Draft' && (
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-600">This training is a draft. Submit it for review to publish.</p>
                                    <button
                                        onClick={handleSubmitForReview}
                                        disabled={reviewLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] disabled:opacity-50 transition-colors"
                                    >
                                        {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        Submit for Review
                                    </button>
                                </div>
                            )}

                            {selected.status === 'In Review' && (
                                <div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-amber-700 font-medium">This training is awaiting review. Approve or reject it.</p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleApprove}
                                                disabled={reviewLoading}
                                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                                            >
                                                {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => setShowRejectInput(!showRejectInput)}
                                                disabled={reviewLoading}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                    {showRejectInput && (
                                        <div className="mt-3 flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={rejectReason}
                                                onChange={e => setRejectReason(e.target.value)}
                                                placeholder="Reason for rejection (optional)"
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-400"
                                            />
                                            <button
                                                onClick={handleReject}
                                                disabled={reviewLoading}
                                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                                            >
                                                {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Reject'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {selected.status === 'Published' && (
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <p className="text-sm text-green-700 font-medium">This training is published and visible to employees.</p>
                                </div>
                            )}

                            {selected.status === 'Rejected' && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <XCircle className="w-5 h-5 text-red-500" />
                                        <p className="text-sm text-red-700">This training was rejected. You can resubmit it for review.</p>
                                    </div>
                                    <button
                                        onClick={handleSubmitForReview}
                                        disabled={reviewLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] disabled:opacity-50 transition-colors"
                                    >
                                        {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        Resubmit for Review
                                    </button>
                                </div>
                            )}
                        </div>

                        {flashcardSaveMsg && (
                            <div
                                className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                                    flashcardSaveMsg.type === 'ok'
                                        ? 'bg-green-50 border-green-200 text-green-800'
                                        : 'bg-red-50 border-red-200 text-red-800'
                                }`}
                            >
                                {flashcardSaveMsg.text}
                            </div>
                        )}

                        <AdaptiveStudyUI
                            key={selected.id}
                            training={selected}
                            workingContents={workingContents}
                            onFlashcardQuestionsChange={handleFlashcardQuestionsChange}
                            persistFlashcards={flashcardPersist}
                        />
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
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px]">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Name</th>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Role</th>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Assessment Type</th>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Modules</th>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Status</th>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Created</th>
                                    <th className="px-6 py-3" />
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                {loading && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-6 text-sm text-gray-500">Loading trainings...</td>
                                    </tr>
                                )}
                                {!loading && error && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-6 text-sm text-red-600">Failed to load: {error}</td>
                                    </tr>
                                )}
                                {!loading && !error && rows.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-6 text-sm text-gray-500">No trainings found. Run the AI pipeline to generate some.</td>
                                    </tr>
                                )}
                                {!loading && !error && rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        onClick={() => {
                                            if (editingName === row.id) return;
                                            setSelected(row);
                                            setWorkingContents(cloneTrainingContents(row.contents));
                                            setFlashcardSaveMsg(null);
                                        }}
                                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                                    >
                                        {/* Name cell with inline edit */}
                                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                            {editingName === row.id ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        autoFocus
                                                        value={nameInput}
                                                        onChange={e => setNameInput(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') void handleSaveName(row.id);
                                                            if (e.key === 'Escape') setEditingName(null);
                                                        }}
                                                        className="w-36 px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none"
                                                    />
                                                    <button onClick={() => void handleSaveName(row.id)} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                                                    <button onClick={() => setEditingName(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 group">
                                                <span className="text-sm text-gray-800">
                                                    {row.name || <span className="text-gray-400 italic">Untitled</span>}
                                                </span>
                                                    <button
                                                        onClick={() => { setEditingName(row.id); setNameInput(row.name || ''); }}
                                                        className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-600 transition-opacity"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize">{row.role}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {row.contents[0]?.assessment?.type ?? '—'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{row.contents.length}</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={row.status} />
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{row.createdAt}</td>
                                        {/* Actions cell */}
                                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                            {deleteConfirm === row.id ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-red-600 font-medium">Delete?</span>
                                                    <button onClick={() => void handleDelete(row.id)} className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700">Yes</button>
                                                    <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">No</button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setDeleteConfirm(row.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete training"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}