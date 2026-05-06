import { useEffect, useRef, useState } from 'react';
import { Folder as FolderIcon, FolderOpen, Inbox, Layers, MoreVertical, Pencil, Plus, Trash2, Palette, Check, X } from 'lucide-react';
import type { Folder } from '../lib/folders';

export type FolderSelection = 'all' | 'uncategorized' | string;

const FOLDER_COLORS: { value: string; label: string }[] = [
    { value: '#1e3a5f', label: 'Navy' },
    { value: '#2563eb', label: 'Blue' },
    { value: '#0d9488', label: 'Teal' },
    { value: '#16a34a', label: 'Green' },
    { value: '#ca8a04', label: 'Amber' },
    { value: '#dc2626', label: 'Red' },
    { value: '#9333ea', label: 'Purple' },
    { value: '#6b7280', label: 'Gray' },
];

type Props = {
    folders: Folder[];
    selectedFolderId: FolderSelection;
    deckCounts: { total: number; uncategorized: number; byFolder: Record<string, number> };
    onSelect: (selection: FolderSelection) => void;
    onCreate: (input: { name: string; color: string | null }) => Promise<void>;
    onRename: (id: string, name: string) => Promise<void>;
    onSetColor: (id: string, color: string | null) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
};

export function FolderSidebar({
    folders,
    selectedFolderId,
    deckCounts,
    onSelect,
    onCreate,
    onRename,
    onSetColor,
    onDelete,
}: Props) {
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState<string>(FOLDER_COLORS[0].value);
    const [busy, setBusy] = useState(false);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [colorPickerId, setColorPickerId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuId(null);
                setColorPickerId(null);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const handleCreate = async () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        setBusy(true);
        setErrorMsg(null);
        try {
            await onCreate({ name: trimmed, color: newColor });
            setNewName('');
            setNewColor(FOLDER_COLORS[0].value);
            setIsCreating(false);
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Failed to create folder');
        } finally {
            setBusy(false);
        }
    };

    const handleRename = async (id: string) => {
        const trimmed = renameValue.trim();
        if (!trimmed) {
            setRenamingId(null);
            return;
        }
        setBusy(true);
        setErrorMsg(null);
        try {
            await onRename(id, trimmed);
            setRenamingId(null);
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Failed to rename folder');
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (folder: Folder) => {
        const count = deckCounts.byFolder[folder.id] ?? 0;
        const message =
            count > 0
                ? `Delete folder "${folder.name}"? ${count} deck${count !== 1 ? 's' : ''} will become Uncategorized.`
                : `Delete folder "${folder.name}"?`;
        if (!window.confirm(message)) return;

        setBusy(true);
        setErrorMsg(null);
        try {
            await onDelete(folder.id);
            setOpenMenuId(null);
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Failed to delete folder');
        } finally {
            setBusy(false);
        }
    };

    const handleSetColor = async (folder: Folder, color: string | null) => {
        setBusy(true);
        setErrorMsg(null);
        try {
            await onSetColor(folder.id, color);
            setColorPickerId(null);
            setOpenMenuId(null);
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Failed to update color');
        } finally {
            setBusy(false);
        }
    };

    return (
        <aside className="w-64 shrink-0 bg-white border border-gray-200 rounded-xl p-4 h-fit">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Folders</h2>
                <button
                    onClick={() => setIsCreating((v) => !v)}
                    className="text-xs flex items-center gap-1 text-[#1e3a5f] hover:bg-gray-100 px-2 py-1 rounded-md"
                    title="New folder"
                >
                    <Plus className="w-3.5 h-3.5" />
                    New
                </button>
            </div>

            {errorMsg && (
                <div className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
                    {errorMsg}
                </div>
            )}

            <nav className="space-y-1">
                <PseudoRow
                    icon={<Layers className="w-4 h-4" />}
                    label="All Decks"
                    count={deckCounts.total}
                    selected={selectedFolderId === 'all'}
                    onClick={() => onSelect('all')}
                />
                <PseudoRow
                    icon={<Inbox className="w-4 h-4" />}
                    label="Uncategorized"
                    count={deckCounts.uncategorized}
                    selected={selectedFolderId === 'uncategorized'}
                    onClick={() => onSelect('uncategorized')}
                />

                {folders.length > 0 && <div className="h-px bg-gray-100 my-2" />}

                {folders.map((folder) => {
                    const isSelected = selectedFolderId === folder.id;
                    const isRenaming = renamingId === folder.id;
                    const count = deckCounts.byFolder[folder.id] ?? 0;
                    const dotColor = folder.color ?? '#9ca3af';

                    return (
                        <div key={folder.id} className="relative group">
                            {isRenaming ? (
                                <div className="flex items-center gap-1 px-2 py-1.5">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: dotColor }}
                                    />
                                    <input
                                        autoFocus
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') void handleRename(folder.id);
                                            if (e.key === 'Escape') setRenamingId(null);
                                        }}
                                        className="flex-1 min-w-0 text-sm border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-[#1e3a5f]"
                                        disabled={busy}
                                    />
                                    <button
                                        onClick={() => void handleRename(folder.id)}
                                        className="text-green-600 hover:bg-green-50 rounded p-1"
                                        disabled={busy}
                                        title="Save"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setRenamingId(null)}
                                        className="text-gray-500 hover:bg-gray-100 rounded p-1"
                                        title="Cancel"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => onSelect(folder.id)}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                                        isSelected
                                            ? 'bg-[#1e3a5f] text-white'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: dotColor }}
                                    />
                                    {isSelected ? (
                                        <FolderOpen className="w-4 h-4 shrink-0" />
                                    ) : (
                                        <FolderIcon className="w-4 h-4 shrink-0" />
                                    )}
                                    <span className="flex-1 truncate">{folder.name}</span>
                                    <span
                                        className={`text-xs ${
                                            isSelected ? 'text-white/80' : 'text-gray-500'
                                        }`}
                                    >
                                        {count}
                                    </span>
                                </button>
                            )}

                            {!isRenaming && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId((cur) => (cur === folder.id ? null : folder.id));
                                        setColorPickerId(null);
                                    }}
                                    className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md ${
                                        isSelected
                                            ? 'text-white/80 hover:bg-white/15'
                                            : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200 opacity-0 group-hover:opacity-100'
                                    }`}
                                    title="Folder actions"
                                >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                            )}

                            {openMenuId === folder.id && (
                                <div
                                    ref={menuRef}
                                    className="absolute right-1 top-9 z-20 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm"
                                >
                                    <button
                                        onClick={() => {
                                            setRenamingId(folder.id);
                                            setRenameValue(folder.name);
                                            setOpenMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-100"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                        Rename
                                    </button>
                                    <button
                                        onClick={() => setColorPickerId(folder.id)}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-100"
                                    >
                                        <Palette className="w-3.5 h-3.5" />
                                        Change color
                                    </button>
                                    {colorPickerId === folder.id && (
                                        <div className="px-3 py-2 border-t border-gray-100">
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {FOLDER_COLORS.map((c) => (
                                                    <button
                                                        key={c.value}
                                                        onClick={() => void handleSetColor(folder, c.value)}
                                                        className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                                                        style={{ backgroundColor: c.value }}
                                                        title={c.label}
                                                        disabled={busy}
                                                    />
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => void handleSetColor(folder, null)}
                                                className="mt-2 text-xs text-gray-500 hover:text-gray-800"
                                                disabled={busy}
                                            >
                                                Clear color
                                            </button>
                                        </div>
                                    )}
                                    <div className="h-px bg-gray-100 my-1" />
                                    <button
                                        onClick={() => void handleDelete(folder)}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50"
                                        disabled={busy}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {isCreating && (
                <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                    <input
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleCreate();
                            if (e.key === 'Escape') {
                                setIsCreating(false);
                                setNewName('');
                            }
                        }}
                        placeholder="Folder name"
                        className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:border-[#1e3a5f]"
                        disabled={busy}
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {FOLDER_COLORS.map((c) => (
                            <button
                                key={c.value}
                                onClick={() => setNewColor(c.value)}
                                className={`w-5 h-5 rounded-full border transition-transform ${
                                    newColor === c.value ? 'border-gray-900 scale-110' : 'border-gray-200'
                                }`}
                                style={{ backgroundColor: c.value }}
                                title={c.label}
                                disabled={busy}
                            />
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => void handleCreate()}
                            disabled={busy || !newName.trim()}
                            className="flex-1 text-xs font-medium bg-[#1e3a5f] text-white px-2 py-1.5 rounded-md hover:bg-[#15294a] disabled:opacity-50"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => {
                                setIsCreating(false);
                                setNewName('');
                            }}
                            disabled={busy}
                            className="text-xs text-gray-600 px-2 py-1.5 rounded-md hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </aside>
    );
}

function PseudoRow({
    icon,
    label,
    count,
    selected,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    count: number;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                selected ? 'bg-[#1e3a5f] text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
        >
            {icon}
            <span className="flex-1 truncate">{label}</span>
            <span className={`text-xs ${selected ? 'text-white/80' : 'text-gray-500'}`}>{count}</span>
        </button>
    );
}
