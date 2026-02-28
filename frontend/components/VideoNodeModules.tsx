



import React from 'react';
import { Film, Link, Scissors, ScanFace } from 'lucide-react';
import { VideoGenerationMode } from '../types';

// --- Module 1: UI for Mode Selection ---
interface VideoModeSelectorProps {
    currentMode: VideoGenerationMode;
    onSelect: (mode: VideoGenerationMode) => void;
}

export const VideoModeSelector: React.FC<VideoModeSelectorProps> = ({ currentMode, onSelect }) => {
    const modes = [
        { mode: 'CONTINUE' as const, icon: Film, title: '剧情延展 (StoryContinuator)' },
        { mode: 'FIRST_LAST_FRAME' as const, icon: Link, title: '收尾插帧 (FrameWeaver)' },
        { mode: 'CUT' as const, icon: Scissors, title: '局部分镜 (SceneDirector)' },
        { mode: 'CHARACTER_REF' as const, icon: ScanFace, title: '角色迁移 (CharacterRef)' }
    ];

    const handleSelect = (mode: VideoGenerationMode) => {
        // Toggle logic: If clicking the active mode, turn it off (return to DEFAULT)
        if (currentMode === mode) {
            onSelect('DEFAULT');
        } else {
            onSelect(mode);
        }
    };

    return (
        <div className="flex items-center gap-1">
            {modes.map(item => (
                <button 
                   key={item.mode}
                   onClick={(e) => { e.stopPropagation(); handleSelect(item.mode); }}
                   className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-[10px] font-bold border ${currentMode === item.mode ? 'bg-white text-black border-white shadow-md' : 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:border-white/30 backdrop-blur-md opacity-70 hover:opacity-100'}`}
                   title={item.title}
                >
                    <item.icon size={12} />
                    <span>{item.title.split(' ')[0]}</span>
                </button>
            ))}
        </div>
    );
};

// --- Module 2: UI for Scene Director Overlay (Timeline & Crop) ---
interface SceneDirectorOverlayProps {
    visible: boolean;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onCrop: () => void;
    onTimeHover: (time: number) => void;
}

export const SceneDirectorOverlay: React.FC<SceneDirectorOverlayProps> = ({ visible, videoRef, onCrop, onTimeHover }) => {
    const timelineRef = React.useRef<HTMLDivElement>(null);
    const [hoverTime, setHoverTime] = React.useState<number | null>(null);
    const [duration, setDuration] = React.useState(0);

    React.useEffect(() => {
        const vid = videoRef.current;
        if (vid) {
            setDuration(vid.duration || 0);
            const updateDur = () => setDuration(vid.duration);
            vid.addEventListener('loadedmetadata', updateDur);
            return () => vid.removeEventListener('loadedmetadata', updateDur);
        }
    }, [videoRef]);

    if (!visible) return null;

    return (
        <div 
            ref={timelineRef}
            className="absolute bottom-0 left-0 w-full h-9 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 flex items-center cursor-crosshair z-30 opacity-0 group-hover/media:opacity-100 transition-opacity duration-300"
            onMouseMove={(e) => {
                if (!timelineRef.current || !videoRef.current) return;
                const rect = timelineRef.current.getBoundingClientRect();
                const per = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
                const vid = videoRef.current;
                if (vid && Number.isFinite(vid.duration)) {
                    vid.currentTime = vid.duration * per;
                    setHoverTime(vid.duration * per);
                    onTimeHover(vid.duration * per);
                }
            }}
            onClick={(e) => {
                e.stopPropagation();
                onCrop();
            }}
        >
            {hoverTime !== null && duration > 0 && <div className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10 shadow-[0_0_8px_rgba(34,211,238,0.8)]" style={{ left: `${(hoverTime / duration) * 100}%` }} />}
            <div className="w-full text-center text-[9px] text-slate-500 font-bold tracking-widest pointer-events-none">Scene Director Timeline</div>
        </div>
    );
};
