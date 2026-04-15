import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, BookOpen, FileText, Users, BarChart3, Settings,
    Search, Command,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Item = { id: string; label: string; path: string; icon: typeof LayoutDashboard; keywords?: string };

export function CommandPalette() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAdmin } = useAuth();
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');

    const items = useMemo<Item[]>(() => {
        if (isAdmin) {
            return [
                { id: 'dash', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, keywords: 'home metrics' },
                { id: 'tm', label: 'Training Modules', path: '/training-modules', icon: BookOpen, keywords: 'courses' },
                { id: 'ssp', label: 'SSP Documents', path: '/ssp-documents', icon: FileText, keywords: 'upload pdf' },
                { id: 'roles', label: 'Roles & Assessments', path: '/roles', icon: Users, keywords: 'employees quiz' },
                { id: 'prog', label: 'Analytics', path: '/progress', icon: BarChart3, keywords: 'reports stats' },
                { id: 'set', label: 'Settings', path: '/settings', icon: Settings, keywords: 'account profile' },
            ];
        }
        return [
            { id: 'my', label: 'My Training', path: '/my-training', icon: BookOpen, keywords: 'assigned' },
            { id: 'mya', label: 'My Analytics', path: '/my-analytics', icon: BarChart3, keywords: 'progress' },
            { id: 'set', label: 'Settings', path: '/settings', icon: Settings, keywords: 'account' },
        ];
    }, [isAdmin]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return items;
        return items.filter(
            it =>
                it.label.toLowerCase().includes(s) ||
                it.path.includes(s) ||
                it.keywords?.toLowerCase().includes(s),
        );
    }, [items, q]);

    const go = useCallback(
        (path: string) => {
            navigate(path);
            setOpen(false);
            setQ('');
        },
        [navigate],
    );

    useEffect(() => {
        const hide = location.pathname === '/login' || location.pathname === '/register';
        if (hide) return;
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen(o => !o);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [location.pathname]);

    if (location.pathname === '/login' || location.pathname === '/register') {
        return null;
    }

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-3 py-2 rounded-full bg-[#1e3a5f] text-white text-xs font-medium shadow-lg hover:bg-[#152d4a] border border-white/10"
                title="Open command palette"
            >
                <Command className="w-3.5 h-3.5" />
                Quick nav
                <kbd className="hidden sm:inline opacity-80 text-[10px] px-1 py-0.5 rounded bg-white/15">⌘K</kbd>
            </button>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 bg-black/40"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onClick={() => setOpen(false)}
        >
            <div
                className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                    <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                        autoFocus
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Go to page…"
                        className="flex-1 text-sm py-2 outline-none placeholder:text-gray-400"
                    />
                    <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-800 px-2">
                        Esc
                    </button>
                </div>
                <ul className="max-h-72 overflow-y-auto py-1">
                    {filtered.length === 0 && (
                        <li className="px-4 py-6 text-sm text-gray-500 text-center">No matches</li>
                    )}
                    {filtered.map(it => (
                        <li key={it.id}>
                            <button
                                type="button"
                                onClick={() => go(it.path)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-blue-50"
                            >
                                <it.icon className="w-4 h-4 text-[#1e3a5f] flex-shrink-0" />
                                <span className="font-medium">{it.label}</span>
                                <span className="ml-auto text-xs text-gray-400">{it.path}</span>
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="px-4 py-2 bg-gray-50 text-[10px] text-gray-500 border-t border-gray-100">
                    Tip: Press <kbd className="font-mono">⌘K</kbd> or <kbd className="font-mono">Ctrl+K</kbd> anywhere to open
                </div>
            </div>
        </div>
    );
}
