import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ChevronLeft, BookOpen, FileText, LayoutDashboard, Users, BarChart3, Settings, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AssessmentRenderer from '../components/AssessmentRenderer';
import type { Assessment, Question } from '../components/AssessmentRenderer';
import { FolderSidebar } from '../components/FolderSidebar';
import type { FolderSelection } from '../components/FolderSidebar';
import {
    listFolders,
    createFolder,
    renameFolder,
    setFolderColor,
    deleteFolder,
    assignDeckToFolder,
} from '../lib/folders';
import type { Folder } from '../lib/folders';

// ─── Types ─────────────────────────────────────────────────────────────────

type TrainingStatus = 'Published' | 'In Review' | 'Draft' | 'Rejected';

type TrainingContent = {
    study_guide: string;
    assessment: Assessment;
};

type TrainingRow = {
    id: string | number;
    company_role: string | null;
    training_json: unknown;
    created_at: string | null;
    status?: string;
    folder_id?: string | null;
};

type TrainingModule = {
    id: string;
    role: string;
    status: TrainingStatus;
    createdAt: string;
    contents: TrainingContent[];
    folderId: string | null;
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
        role: row.company_role || 'Other',
        status: STATUS_MAP[row.status ?? 'published'] ?? 'Published',
        createdAt: formattedDate,
        contents,
        folderId: row.folder_id ?? null,
    };
}

// ─── Markdown-lite renderer ────────────────────────────────────────────────
// Renders bold, headings, bullet lists from the study_guide markdown string

function StudyGuideRenderer({ markdown }: { markdown: string }) {
    const lines = markdown.split('\n');

    return (
        <div className="space-y-2 text-sm text-gray-800 leading-relaxed">
            {lines.map((line, i) => {
                if (line.startsWith('## ')) {
                    return <h2 key={i} className="text-lg font-bold text-gray-900 mt-4 mb-1">{line.replace('## ', '')}</h2>;
                }
                if (line.startsWith('### ')) {
                    return <h3 key={i} className="text-base font-semibold text-gray-900 mt-3 mb-1">{line.replace('### ', '')}</h3>;
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

                // Inline bold
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
    const [contentIndex, setContentIndex] = useState(0);
    const [studyMode, setStudyMode] = useState<'guide' | 'assessment'>('guide');

    const content = workingContents[contentIndex];

    if (!content) {
        return <p className="text-sm text-gray-500 p-6">No training content available.</p>;
    }

    return (
        <div className="space-y-6">
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
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <StudyGuideRenderer markdown={content.study_guide} />
                </div>
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
    const { profile } = useAuth();
    const [rows, setRows] = useState<TrainingModule[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [folderError, setFolderError] = useState<string | null>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<FolderSelection>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<TrainingModule | null>(null);
    const [workingContents, setWorkingContents] = useState<TrainingContent[]>([]);
    const [flashcardPersist, setFlashcardPersist] = useState(false);
    const [flashcardSaveMsg, setFlashcardSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [reassigningId, setReassigningId] = useState<string | null>(null);

    const filteredRows = useMemo(() => {
        if (selectedFolderId === 'all') return rows;
        if (selectedFolderId === 'uncategorized') return rows.filter((r) => r.folderId === null);
        return rows.filter((r) => r.folderId === selectedFolderId);
    }, [rows, selectedFolderId]);

    const total = filteredRows.length;

    const deckCounts = useMemo(() => {
        const byFolder: Record<string, number> = {};
        let uncategorized = 0;
        for (const r of rows) {
            if (r.folderId === null) uncategorized += 1;
            else byFolder[r.folderId] = (byFolder[r.folderId] ?? 0) + 1;
        }
        return { total: rows.length, uncategorized, byFolder };
    }, [rows]);

    const folderById = useMemo(() => {
        const map = new Map<string, Folder>();
        for (const f of folders) map.set(f.id, f);
        return map;
    }, [folders]);

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
            setFolderError(null);

            const [trainingsResp, foldersResult] = await Promise.all([
                supabase
                    .from('trainings')
                    .select('id, company_role, training_json, created_at, status, folder_id')
                    .order('created_at', { ascending: false }),
                listFolders().catch((err: unknown) => {
                    return err instanceof Error ? err : new Error('Failed to load folders');
                }),
            ]);

            if (!mounted) return;

            const { data, error } = trainingsResp;

            if (error) {
                setError(error.message);
                setRows([]);
            } else {
                setRows(((data ?? []) as TrainingRow[]).map(mapTraining));
            }

            if (foldersResult instanceof Error) {
                setFolderError(foldersResult.message);
                setFolders([]);
            } else {
                setFolders(foldersResult);
            }

            setLoading(false);
        };

        void load();
        return () => { mounted = false; };
    }, []);

    const handleCreateFolder = async ({ name, color }: { name: string; color: string | null }) => {
        if (!profile?.organization_id) {
            throw new Error('No organization on profile');
        }
        const created = await createFolder({ name, color, organization_id: profile.organization_id });
        setFolders((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    };

    const handleRenameFolder = async (id: string, name: string) => {
        await renameFolder(id, name);
        setFolders((prev) =>
            prev.map((f) => (f.id === id ? { ...f, name } : f)).sort((a, b) => a.name.localeCompare(b.name)),
        );
    };

    const handleSetFolderColor = async (id: string, color: string | null) => {
        await setFolderColor(id, color);
        setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, color } : f)));
    };

    const handleDeleteFolder = async (id: string) => {
        await deleteFolder(id);
        setFolders((prev) => prev.filter((f) => f.id !== id));
        setRows((prev) => prev.map((r) => (r.folderId === id ? { ...r, folderId: null } : r)));
        if (selectedFolderId === id) setSelectedFolderId('all');
    };

    const handleReassignDeck = async (trainingId: string, folderId: string | null) => {
        setReassigningId(trainingId);
        const previous = rows;
        setRows((prev) => prev.map((r) => (r.id === trainingId ? { ...r, folderId } : r)));
        try {
            await assignDeckToFolder(trainingId, folderId);
        } catch (err) {
            setRows(previous);
            const msg = err instanceof Error ? err.message : 'Failed to move deck';
            window.alert(msg);
        } finally {
            setReassigningId(null);
        }
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
                            <h1 className="text-2xl font-semibold text-gray-900 capitalize">
                                {selected.role} Training
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">Created {selected.createdAt}</p>
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
    const headerLabel =
        selectedFolderId === 'all'
            ? 'All Decks'
            : selectedFolderId === 'uncategorized'
                ? 'Uncategorized'
                : folderById.get(selectedFolderId)?.name ?? 'Training Modules';

    return (
        <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            <Sidebar />
            <div className="ml-64">
                <main className="p-8">
                    <h1 className="text-2xl font-semibold text-gray-900 mb-2">Training Modules</h1>
                    <p className="text-sm text-gray-600 mb-6">
                        {headerLabel} — {total} training{total !== 1 ? 's' : ''}
                        {selectedFolderId === 'all' ? ' available' : ' in this folder'} — click a row to study
                    </p>

                    {folderError && (
                        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            Could not load folders: {folderError}
                        </div>
                    )}

                    <div className="flex gap-6 items-start">
                        <FolderSidebar
                            folders={folders}
                            selectedFolderId={selectedFolderId}
                            deckCounts={deckCounts}
                            onSelect={setSelectedFolderId}
                            onCreate={handleCreateFolder}
                            onRename={handleRenameFolder}
                            onSetColor={handleSetFolderColor}
                            onDelete={handleDeleteFolder}
                        />

                        <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Role</th>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Assessment Type</th>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Modules</th>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Status</th>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Folder</th>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Created</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                {loading && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-6 text-sm text-gray-500">Loading trainings...</td>
                                    </tr>
                                )}
                                {!loading && error && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-6 text-sm text-red-600">Failed to load: {error}</td>
                                    </tr>
                                )}
                                {!loading && !error && rows.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-6 text-sm text-gray-500">No trainings found. Run the AI pipeline to generate some.</td>
                                    </tr>
                                )}
                                {!loading && !error && rows.length > 0 && filteredRows.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-6 text-sm text-gray-500">
                                            No trainings in this folder yet. Use the Folder column to move decks here.
                                        </td>
                                    </tr>
                                )}
                                {!loading && !error && filteredRows.map((row) => {
                                    const folder = row.folderId ? folderById.get(row.folderId) : null;
                                    return (
                                        <tr
                                            key={row.id}
                                            onClick={() => {
                                                setSelected(row);
                                                setWorkingContents(cloneTrainingContents(row.contents));
                                                setFlashcardSaveMsg(null);
                                            }}
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
                                            <td className="px-6 py-4 text-sm text-gray-700" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: folder?.color ?? '#d1d5db' }}
                                                    />
                                                    <select
                                                        value={row.folderId ?? ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            void handleReassignDeck(row.id, value === '' ? null : value);
                                                        }}
                                                        disabled={reassigningId === row.id}
                                                        className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white hover:border-gray-300 focus:outline-none focus:border-[#1e3a5f] disabled:opacity-60"
                                                    >
                                                        <option value="">None</option>
                                                        {folders.map((f) => (
                                                            <option key={f.id} value={f.id}>
                                                                {f.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{row.createdAt}</td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}