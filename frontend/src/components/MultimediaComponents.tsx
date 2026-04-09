import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import {
    Play, Pause, Square, Volume2, VolumeX,
    ChevronDown, ZoomIn, X, Image as ImageIcon,
} from 'lucide-react';

mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'Inter, system-ui, sans-serif',
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type MediaDiagram = {
    id: string;
    mermaid_code: string;
    caption: string;
    section_ref: string;
};

export type MediaImage = {
    id: string;
    storage_path?: string;
    url: string;
    alt: string;
    caption: string;
    section_ref: string;
};

export type MediaVideo = {
    id: string;
    search_query: string;
    title: string;
    section_ref: string;
    youtube_url?: string;
};

export type TrainingMedia = {
    diagrams?: MediaDiagram[];
    images?: MediaImage[];
    videos?: MediaVideo[];
};

// ─── Mermaid Diagram ─────────────────────────────────────────────────────────

export function MermaidDiagram({ diagram }: { diagram: MediaDiagram }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;
        const id = `mermaid-${diagram.id}-${Date.now()}`;
        const code = diagram.mermaid_code.replace(/\\n/g, '\n');

        mermaid.render(id, code)
            .then(({ svg }) => {
                if (containerRef.current) {
                    containerRef.current.innerHTML = svg;
                }
            })
            .catch(() => setError(true));
    }, [diagram.mermaid_code, diagram.id]);

    if (error) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 my-4">
                <p className="text-xs text-gray-500 mb-2">Diagram: {diagram.caption}</p>
                <pre className="text-xs text-gray-600 bg-white p-3 rounded border overflow-x-auto">
                    {diagram.mermaid_code}
                </pre>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 my-4">
            <div ref={containerRef} className="flex justify-center overflow-x-auto" />
            {diagram.caption && (
                <p className="text-xs text-gray-500 text-center mt-3 italic">{diagram.caption}</p>
            )}
        </div>
    );
}

// ─── Study Guide Narrator (Web Speech API) ──────────────────────────────────

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function StudyGuideNarrator({ text }: { text: string }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceIdx, setSelectedVoiceIdx] = useState(0);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

    useEffect(() => {
        if (!supported) return;
        const load = () => {
            const v = speechSynthesis.getVoices().filter(
                voice => voice.lang.startsWith('en')
            );
            if (v.length) setVoices(v);
        };
        load();
        speechSynthesis.onvoiceschanged = load;
    }, [supported]);

    const stop = () => {
        speechSynthesis.cancel();
        setIsPlaying(false);
        setIsPaused(false);
        utteranceRef.current = null;
    };

    const play = () => {
        if (isPaused) {
            speechSynthesis.resume();
            setIsPaused(false);
            setIsPlaying(true);
            return;
        }

        stop();

        const plain = text
            .replace(/#{1,4}\s/g, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/[*\-]\s+/g, '')
            .replace(/\n{2,}/g, '. ')
            .replace(/\n/g, ' ');

        const utterance = new SpeechSynthesisUtterance(plain);
        utterance.rate = speed;
        if (voices[selectedVoiceIdx]) {
            utterance.voice = voices[selectedVoiceIdx];
        }
        utterance.onend = () => {
            setIsPlaying(false);
            setIsPaused(false);
        };
        utteranceRef.current = utterance;
        speechSynthesis.speak(utterance);
        setIsPlaying(true);
    };

    const pause = () => {
        speechSynthesis.pause();
        setIsPaused(true);
        setIsPlaying(false);
    };

    if (!supported) return null;

    return (
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] rounded-xl p-4 mb-6 flex items-center gap-4 text-white">
            <Volume2 className="w-5 h-5 flex-shrink-0 opacity-70" />
            <span className="text-sm font-medium flex-shrink-0">Listen to Study Guide</span>

            <div className="flex items-center gap-2 ml-auto">
                {!isPlaying && !isPaused && (
                    <button onClick={play} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors" title="Play">
                        <Play className="w-4 h-4" />
                    </button>
                )}
                {isPlaying && (
                    <button onClick={pause} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors" title="Pause">
                        <Pause className="w-4 h-4" />
                    </button>
                )}
                {isPaused && (
                    <button onClick={play} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors" title="Resume">
                        <Play className="w-4 h-4" />
                    </button>
                )}
                {(isPlaying || isPaused) && (
                    <button onClick={stop} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors" title="Stop">
                        <Square className="w-4 h-4" />
                    </button>
                )}

                <div className="relative">
                    <button
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="px-2 py-1 bg-white/20 rounded-lg text-xs font-medium hover:bg-white/30 transition-colors flex items-center gap-1"
                    >
                        {speed}x <ChevronDown className="w-3 h-3" />
                    </button>
                    {showSpeedMenu && (
                        <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                            {SPEEDS.map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setSpeed(s); setShowSpeedMenu(false); }}
                                    className={`block w-full px-4 py-1.5 text-xs text-left hover:bg-gray-50 ${
                                        s === speed ? 'text-[#1e3a5f] font-bold' : 'text-gray-700'
                                    }`}
                                >
                                    {s}x
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {voices.length > 1 && (
                    <select
                        value={selectedVoiceIdx}
                        onChange={e => setSelectedVoiceIdx(Number(e.target.value))}
                        className="bg-white/20 rounded-lg text-xs px-2 py-1 border-0 outline-none text-white max-w-[120px]"
                    >
                        {voices.map((v, i) => (
                            <option key={i} value={i} className="text-gray-900">
                                {v.name.replace(/^(Microsoft |Google )/, '')}
                            </option>
                        ))}
                    </select>
                )}
            </div>
        </div>
    );
}

// ─── Image Gallery ───────────────────────────────────────────────────────────

export function MediaImageCard({ image }: { image: MediaImage }) {
    const [lightbox, setLightbox] = useState(false);
    const [loadError, setLoadError] = useState(false);

    if (loadError) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 my-4 flex items-center gap-3">
                <ImageIcon className="w-8 h-8 text-gray-300" />
                <div>
                    <p className="text-sm text-gray-500">{image.caption || image.alt}</p>
                    <p className="text-xs text-gray-400">Image could not be loaded</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden my-4 group">
                <div className="relative cursor-pointer" onClick={() => setLightbox(true)}>
                    <img
                        src={image.url}
                        alt={image.alt}
                        className="w-full max-h-80 object-contain bg-gray-50"
                        onError={() => setLoadError(true)}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                </div>
                {image.caption && (
                    <p className="text-xs text-gray-500 text-center py-2 px-4 italic">{image.caption}</p>
                )}
            </div>

            {lightbox && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
                    onClick={() => setLightbox(false)}
                >
                    <button
                        onClick={() => setLightbox(false)}
                        className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img
                        src={image.url}
                        alt={image.alt}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}

// ─── Video Embed ─────────────────────────────────────────────────────────────

function youtubeSearchUrl(query: string): string {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function VideoRecommendation({ video }: { video: MediaVideo }) {
    const url = video.youtube_url || youtubeSearchUrl(video.search_query);

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 my-4">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-600 fill-current">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-gray-900 hover:text-[#1e3a5f] hover:underline"
                    >
                        {video.title}
                    </a>
                    <p className="text-xs text-gray-500 mt-1">
                        Related to: {video.section_ref}
                    </p>
                </div>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                >
                    Watch
                </a>
            </div>
        </div>
    );
}
