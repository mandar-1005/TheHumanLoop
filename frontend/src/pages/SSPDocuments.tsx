import { useCallback, useEffect, useRef, useState } from 'react';
import {
    LayoutDashboard,
    BookOpen,
    FileText,
    Users,
    BarChart3,
    Settings,
    Shield,
    LogOut,
    Upload,
    Trash2,
    Download,
    Loader2,
    AlertCircle,
    CheckCircle,
    X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
).toString();

// ─── Types ──────────────────────────────────────────────────────────────────

interface SSPDocument {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    created_at: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

async function extractTextFromPdf(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items
            .filter((item) => 'str' in item)
            .map((item) => (item as { str: string }).str);
        pages.push(strings.join(' '));
    }

    return pages.join('\n\n').replace(/\u0000/g, '');
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar() {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { icon: BookOpen, label: 'Training Modules', href: '/training-modules' },
        { icon: FileText, label: 'SSP Documents', href: '/ssp-documents' },
        { icon: Users, label: 'Roles & Assessments', href: '/roles' },
        { icon: BarChart3, label: 'Analytics', href: null },
        { icon: Settings, label: 'Settings', href: null },
    ];

    const current = '/ssp-documents';

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
                    <p className="mb-1">&copy; 2026 MARi</p>
                    <p>FedRAMP Compliant</p>
                </div>
            </div>
        </aside>
    );
}

// ─── Upload Modal ───────────────────────────────────────────────────────────

type UploadStage = 'idle' | 'extracting' | 'uploading' | 'saving' | 'done' | 'error';

function UploadModal({
    open,
    onClose,
    onUploaded,
}: {
    open: boolean;
    onClose: () => void;
    onUploaded: () => void;
}) {
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [stage, setStage] = useState<UploadStage>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setFile(null);
        setStage('idle');
        setErrorMsg('');
        setDragging(false);
    };

    const handleClose = () => {
        if (stage === 'extracting' || stage === 'uploading' || stage === 'saving') return;
        reset();
        onClose();
    };

    const pickFile = (f: File | undefined) => {
        if (!f) return;
        if (f.type !== 'application/pdf') {
            setErrorMsg('Only PDF files are accepted.');
            return;
        }
        setErrorMsg('');
        setFile(f);
        setStage('idle');
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        pickFile(e.dataTransfer.files[0]);
    }, []);

    const handleUpload = async () => {
        if (!file || !user) return;

        try {
            setStage('extracting');
            const text = await extractTextFromPdf(file);

            setStage('uploading');
            const storagePath = `${user.id}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('ssp-documents')
                .upload(storagePath, file, { contentType: 'application/pdf' });

            if (uploadError) throw uploadError;

            setStage('saving');
            const { error: dbError } = await supabase.from('ssp_documents').insert({
                user_id: user.id,
                file_name: file.name,
                file_path: storagePath,
                file_size: file.size,
                extracted_text: text,
            });

            if (dbError) throw dbError;

            setStage('done');
            setTimeout(() => {
                reset();
                onClose();
                onUploaded();
            }, 800);
        } catch (err: unknown) {
            setStage('error');
            console.error(err);
            setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
        }
    };

    if (!open) return null;

    const busy = stage === 'extracting' || stage === 'uploading' || stage === 'saving';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Upload SSP Document</h2>
                    <button
                        onClick={handleClose}
                        disabled={busy}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Drop zone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                            dragging
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                        }`}
                    >
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        {file ? (
                            <p className="text-sm text-gray-900 font-medium">{file.name} ({formatFileSize(file.size)})</p>
                        ) : (
                            <>
                                <p className="text-sm text-gray-700 font-medium">
                                    Drag & drop a PDF here, or click to browse
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Only .pdf files are accepted</p>
                            </>
                        )}
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => pickFile(e.target.files?.[0])}
                        />
                    </div>

                    {/* Status */}
                    {busy && (
                        <div className="flex items-center gap-3 mt-4 text-sm text-gray-700">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            {stage === 'extracting' && 'Extracting text from PDF...'}
                            {stage === 'uploading' && 'Uploading file to storage...'}
                            {stage === 'saving' && 'Saving document record...'}
                        </div>
                    )}

                    {stage === 'done' && (
                        <div className="flex items-center gap-2 mt-4 text-sm text-green-700">
                            <CheckCircle className="w-4 h-4" />
                            Document uploaded successfully!
                        </div>
                    )}

                    {errorMsg && (
                        <div className="flex items-center gap-2 mt-4 text-sm text-red-600">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {errorMsg}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
                    <button
                        onClick={handleClose}
                        disabled={busy}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!file || busy || stage === 'done'}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#152d4a] transition-colors disabled:opacity-50"
                    >
                        Upload
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function SSPDocumentsPage() {
    const { user } = useAuth();
    const [docs, setDocs] = useState<SSPDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showUpload, setShowUpload] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadDocs = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('ssp_documents')
            .select('id, file_name, file_path, file_size, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (fetchError) {
            setError(fetchError.message);
            setDocs([]);
        } else {
            setDocs((data ?? []) as SSPDocument[]);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        void loadDocs();
    }, [loadDocs]);

    const handleDownload = async (doc: SSPDocument) => {
        const { data, error } = await supabase.storage
            .from('ssp-documents')
            .createSignedUrl(doc.file_path, 60);

        if (error || !data?.signedUrl) {
            alert('Failed to generate download link.');
            return;
        }
        window.open(data.signedUrl, '_blank');
    };

    const handleDelete = async (doc: SSPDocument) => {
        if (!confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return;

        setDeletingId(doc.id);

        const { error: storageError } = await supabase.storage
            .from('ssp-documents')
            .remove([doc.file_path]);

        if (storageError) {
            alert('Failed to delete file from storage.');
            setDeletingId(null);
            return;
        }

        const { error: dbError } = await supabase
            .from('ssp_documents')
            .delete()
            .eq('id', doc.id);

        if (dbError) {
            alert('Failed to delete document record.');
        }

        setDeletingId(null);
        void loadDocs();
    };

    return (
        <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            <Sidebar />
            <div className="ml-64">
                <main className="p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">SSP Documents</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                {docs.length} document{docs.length !== 1 ? 's' : ''} uploaded
                            </p>
                        </div>
                        <button
                            onClick={() => setShowUpload(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            Upload Document
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">File Name</th>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Size</th>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Uploaded</th>
                                    <th className="text-right text-xs font-medium text-gray-600 px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center">
                                            <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">Loading documents...</p>
                                        </td>
                                    </tr>
                                )}
                                {!loading && error && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center">
                                            <AlertCircle className="w-5 h-5 text-red-400 mx-auto mb-2" />
                                            <p className="text-sm text-red-600">Failed to load: {error}</p>
                                        </td>
                                    </tr>
                                )}
                                {!loading && !error && docs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-14 text-center">
                                            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-sm text-gray-500 font-medium">No documents yet</p>
                                            <p className="text-xs text-gray-400 mt-1">Upload a PDF to get started</p>
                                        </td>
                                    </tr>
                                )}
                                {!loading && !error && docs.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                                                    <FileText className="w-4 h-4 text-red-500" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                                    {doc.file_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {formatFileSize(doc.file_size)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {formatDate(doc.created_at)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleDownload(doc)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(doc)}
                                                    disabled={deletingId === doc.id}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                    title="Delete"
                                                >
                                                    {deletingId === doc.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>

            <UploadModal
                open={showUpload}
                onClose={() => setShowUpload(false)}
                onUploaded={loadDocs}
            />
        </div>
    );
}
