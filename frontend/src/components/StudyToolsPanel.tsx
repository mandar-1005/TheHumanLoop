import { useEffect, useState } from 'react';
import { Bookmark, StickyNote, ChevronDown, ChevronUp } from 'lucide-react';
import {
    extractMarkdownHeadings,
    loadBookmarks,
    loadNotes,
    saveBookmarks,
    saveNotes,
} from '../lib/studyPersistence';

type Props = {
    trainingId: string | number;
    studyGuideMarkdown: string;
};

export function StudyToolsPanel({ trainingId, studyGuideMarkdown }: Props) {
    const [open, setOpen] = useState(true);
    const [notes, setNotes] = useState(() => loadNotes(trainingId));
    const [bookmarks, setBookmarks] = useState(() => loadBookmarks(trainingId));

    const headings = extractMarkdownHeadings(studyGuideMarkdown);

    useEffect(() => {
        setNotes(loadNotes(trainingId));
        setBookmarks(loadBookmarks(trainingId));
    }, [trainingId]);

    useEffect(() => {
        const t = window.setTimeout(() => saveNotes(trainingId, notes), 400);
        return () => window.clearTimeout(t);
    }, [trainingId, notes]);

    const toggleBookmark = (text: string) => {
        setBookmarks(prev => {
            const next = prev.includes(text) ? prev.filter(h => h !== text) : [...prev, text];
            saveBookmarks(trainingId, next);
            return next;
        });
    };

    return (
        <div className="border border-gray-200 bg-gray-50 rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
                <span className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4" />
                    Notes & section bookmarks
                </span>
                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {open && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-200">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Your notes (saved in this browser)</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Jot down concepts to revisit…"
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
                        />
                    </div>
                    {headings.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                                <Bookmark className="w-3.5 h-3.5" /> Bookmark sections
                            </p>
                            <ul className="max-h-40 overflow-y-auto space-y-1">
                                {headings.map((h, i) => (
                                    <li key={`${h.text}-${i}`}>
                                        <button
                                            type="button"
                                            onClick={() => toggleBookmark(h.text)}
                                            className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors ${
                                                bookmarks.includes(h.text)
                                                    ? 'bg-[#1e3a5f] text-white'
                                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                                            }`}
                                        >
                                            <span className="opacity-60 mr-1">{h.level === 2 ? '##' : '###'}</span>
                                            {h.text}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}