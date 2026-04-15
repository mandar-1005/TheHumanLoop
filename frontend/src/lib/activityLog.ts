/** Lightweight client-side activity trail for Settings (audit awareness). */

const KEY = 'mari-activity-log';
const MAX = 40;

export type ActivityEntry = {
    id: string;
    at: string;
    action: string;
    detail?: string;
};

function read(): ActivityEntry[] {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        const p = JSON.parse(raw) as unknown;
        return Array.isArray(p) ? p : [];
    } catch {
        return [];
    }
}

function write(entries: ActivityEntry[]): void {
    try {
        localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
    } catch { /* quota */ }
}

export function logActivity(action: string, detail?: string): void {
    const entry: ActivityEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        at: new Date().toISOString(),
        action,
        detail,
    };
    const next = [entry, ...read()].slice(0, MAX);
    write(next);
}

export function getActivityLog(): ActivityEntry[] {
    return read();
}
