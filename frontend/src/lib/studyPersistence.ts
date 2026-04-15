/** Local persistence for study UX (per browser). */

const RESUME_PREFIX = 'mari-resume-';
const NOTES_PREFIX = 'mari-notes-';
const BM_PREFIX = 'mari-bm-';

export type StudyResume = {
    contentIndex: number;
    studyMode: 'guide' | 'assessment' | 'chat';
    updatedAt: string;
};

export function trainingKey(id: string | number): string {
    return String(id);
}

export function loadResume(trainingId: string | number): StudyResume | null {
    try {
        const raw = localStorage.getItem(RESUME_PREFIX + trainingKey(trainingId));
        if (!raw) return null;
        const p = JSON.parse(raw) as StudyResume;
        if (typeof p.contentIndex !== 'number' || !p.studyMode) return null;
        return p;
    } catch {
        return null;
    }
}

export function saveResume(trainingId: string | number, data: Omit<StudyResume, 'updatedAt'>): void {
    const full: StudyResume = { ...data, updatedAt: new Date().toISOString() };
    try {
        localStorage.setItem(RESUME_PREFIX + trainingKey(trainingId), JSON.stringify(full));
    } catch { /* quota */ }
}

export function loadNotes(trainingId: string | number): string {
    try {
        return localStorage.getItem(NOTES_PREFIX + trainingKey(trainingId)) ?? '';
    } catch {
        return '';
    }
}

export function saveNotes(trainingId: string | number, notes: string): void {
    try {
        localStorage.setItem(NOTES_PREFIX + trainingKey(trainingId), notes);
    } catch { /* quota */ }
}

export function loadBookmarks(trainingId: string | number): string[] {
    try {
        const raw = localStorage.getItem(BM_PREFIX + trainingKey(trainingId));
        if (!raw) return [];
        const p = JSON.parse(raw) as unknown;
        return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

export function saveBookmarks(trainingId: string | number, headings: string[]): void {
    try {
        localStorage.setItem(BM_PREFIX + trainingKey(trainingId), JSON.stringify(headings));
    } catch { /* quota */ }
}

export function extractMarkdownHeadings(markdown: string): { level: 2 | 3; text: string }[] {
    const out: { level: 2 | 3; text: string }[] = [];
    for (const line of markdown.split('\n')) {
        if (line.startsWith('### ')) {
            out.push({ level: 3, text: line.replace(/^###\s+/, '').trim() });
        } else if (line.startsWith('## ')) {
            out.push({ level: 2, text: line.replace(/^##\s+/, '').trim() });
        }
    }
    return out;
}
