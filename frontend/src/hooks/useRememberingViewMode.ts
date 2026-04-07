import { useEffect, useMemo, useState } from 'react';

export type RememberingViewMode = 'bullet' | 'flashcard' | 'long-form';

/** Minimal slice so callers need not create a circular type import from AssessmentRenderer. */
export type RememberingViewAssessmentSlice = {
    type: string;
    bloom_level?: string;
    questions: unknown[];
};

const DEFAULT_MODE: RememberingViewMode = 'flashcard';

function rememberingFingerprint(a: RememberingViewAssessmentSlice): string {
    const parts = [a.type, a.bloom_level ?? '', String(a.questions.length)];
    for (const q of a.questions) {
        if (q && typeof q === 'object') {
            const o = q as { term?: unknown; definition?: unknown };
            parts.push(String(o.term ?? ''), String(o.definition ?? ''));
        }
    }
    return parts.join('\u0001');
}

export function useRememberingViewMode(assessment: RememberingViewAssessmentSlice) {
    const [mode, setMode] = useState<RememberingViewMode>(DEFAULT_MODE);
    const fingerprint = useMemo(() => rememberingFingerprint(assessment), [assessment]);

    useEffect(() => {
        setMode(DEFAULT_MODE);
    }, [fingerprint]);

    return { mode, setMode };
}
