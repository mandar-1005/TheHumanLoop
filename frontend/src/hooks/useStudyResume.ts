import { useEffect, useState } from 'react';
import { loadResume, saveResume, type StudyResume } from '../lib/studyPersistence';

export function useStudyResume(trainingId: string | number | undefined) {
    const [hydrated, setHydrated] = useState(false);
    const [contentIndex, setContentIndex] = useState(0);
    const [studyMode, setStudyMode] = useState<StudyResume['studyMode']>('guide');
    const [resumeApplied, setResumeApplied] = useState(false);

    useEffect(() => {
        setResumeApplied(false);
        if (trainingId === undefined || trainingId === '') {
            setHydrated(true);
            return;
        }
        const r = loadResume(trainingId);
        if (r) {
            setContentIndex(Math.max(0, r.contentIndex));
            setStudyMode(r.studyMode);
            setResumeApplied(true);
        }
        setHydrated(true);
    }, [trainingId]);

    useEffect(() => {
        if (!hydrated || trainingId === undefined || trainingId === '') return;
        saveResume(trainingId, { contentIndex, studyMode });
    }, [trainingId, contentIndex, studyMode, hydrated]);

    return {
        hydrated,
        contentIndex,
        setContentIndex,
        studyMode,
        setStudyMode,
        resumeApplied,
    };
}
