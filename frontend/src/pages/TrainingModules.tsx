import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ChevronLeft, BookOpen, FileText, LayoutDashboard, Users, BarChart3, Settings, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AssessmentRenderer from '../components/AssessmentRenderer';
import type { Assessment } from '../components/AssessmentRenderer';
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
    company_role: string | null;
    training_json: unknown;
    created_at: string | null;
    status?: string;
};

type TrainingModule = {
    id: string;
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

function AdaptiveStudyUI({ training }: { training: TrainingModule }) {
    const [contentIndex, setContentIndex] = useState(0);
    const [studyMode, setStudyMode] = useState<'guide' | 'assessment'>('guide');

    const content = training.contents[contentIndex];

    if (!content) {
        return <p className="text-sm text-gray-500 p-6">No training content available.</p>;
    }

    return (
        <div className="space-y-6">
            {training.contents.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {training.contents.map((_c, i) => {
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

            <div className="flex gap-2">
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
        { icon: Users, label: 'Roles & Assessments', href: null },
        { icon: BarChart3, label: 'Analytics', href: null },
        { icon: Settings, label: 'Settings', href: null },
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
                .select('id, company_role, training_json, created_at, status')
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
                                        <StatusBadge status={row.status} />
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