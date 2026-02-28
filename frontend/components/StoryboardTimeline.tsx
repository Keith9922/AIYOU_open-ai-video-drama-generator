import React, { useState } from 'react';
import { DetailedStoryboardShot, EpisodeStoryboard } from '../types';
import { Edit, Trash2, Plus, Clock } from 'lucide-react';

interface StoryboardTimelineProps {
    storyboard: EpisodeStoryboard;
    onEditShot: (shot: DetailedStoryboardShot) => void;
    onDeleteShot: (shotId: string) => void;
    onAddShot: () => void;
}

export const StoryboardTimeline: React.FC<StoryboardTimelineProps> = ({
    storyboard,
    onEditShot,
    onDeleteShot,
    onAddShot
}) => {
    const [currentTime, setCurrentTime] = useState(0);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progressPercentage = (currentTime / storyboard.totalDuration) * 100;

    return (
        <div className="w-full h-full flex flex-col bg-[#1c1c1e] overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 bg-white/5 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-white">
                            📊 概览：共 {storyboard.totalShots} 个分镜
                        </span>
                        <span className="text-xs text-slate-400">
                            总时长 {formatTime(storyboard.totalDuration)}
                        </span>
                        <span className="text-xs text-slate-400">
                            视觉风格：{storyboard.visualStyle}
                        </span>
                    </div>
                    <button
                        onClick={onAddShot}
                        className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-xs font-bold transition-colors"
                    >
                        <Plus size={12} />
                        新增分镜
                    </button>
                </div>
            </div>

            {/* Timeline Progress Bar */}
            <div className="px-4 py-3 border-b border-white/10 bg-black/20 shrink-0">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>0:00</span>
                        <span>0:30</span>
                        <span>1:00</span>
                        <span>1:30</span>
                        <span>{formatTime(storyboard.totalDuration)}</span>
                    </div>
                    <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                    <div className="text-[10px] text-slate-400 text-center">
                        <Clock size={10} className="inline mr-1" />
                        {formatTime(currentTime)} / {formatTime(storyboard.totalDuration)}
                    </div>
                </div>
            </div>

            {/* Shots Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                <div className="grid grid-cols-2 gap-4">
                    {storyboard.shots.map((shot, index) => (
                        <div
                            key={shot.id}
                            className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300 group"
                            onMouseEnter={() => setCurrentTime(shot.endTime)}
                        >
                            {/* Shot Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-cyan-400">
                                        🎞️ 分镜 {shot.shotNumber.toString().padStart(2, '0')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => onEditShot(shot)}
                                        className="p-1 hover:bg-cyan-500/20 text-cyan-400 rounded transition-colors"
                                        title="编辑"
                                    >
                                        <Edit size={12} />
                                    </button>
                                    <button
                                        onClick={() => onDeleteShot(shot.id)}
                                        className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>

                            <div className="h-px bg-white/10 mb-3" />

                            {/* Time */}
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-[10px] text-slate-500">⏱️ 时长：</span>
                                <span className="text-[10px] text-slate-300">
                                    {formatTime(shot.startTime)} - {formatTime(shot.endTime)} ({shot.duration}秒)
                                </span>
                            </div>

                            {/* Scene */}
                            <div className="mb-2">
                                <span className="text-[10px] text-slate-500">📍 场景：</span>
                                <span className="text-[10px] text-slate-300 ml-1">{shot.scene}</span>
                            </div>

                            {/* Characters */}
                            <div className="mb-2">
                                <span className="text-[10px] text-slate-500">👤 角色：</span>
                                <span className="text-[10px] text-slate-300 ml-1">
                                    {shot.characters.join('、') || '无'}
                                </span>
                            </div>

                            <div className="h-px bg-white/5 my-2" />

                            {/* Camera Info */}
                            <div className="mb-2">
                                <span className="text-[10px] text-slate-500">🎬 景别：</span>
                                <span className="text-[10px] text-slate-300 ml-1">{shot.shotSize}</span>
                            </div>
                            <div className="mb-2">
                                <span className="text-[10px] text-slate-500">📐 角度：</span>
                                <span className="text-[10px] text-slate-300 ml-1">{shot.cameraAngle}</span>
                            </div>
                            <div className="mb-2">
                                <span className="text-[10px] text-slate-500">🎥 运镜：</span>
                                <span className="text-[10px] text-slate-300 ml-1">{shot.cameraMovement}</span>
                            </div>

                            <div className="h-px bg-white/5 my-2" />

                            {/* Visual Description */}
                            <div className="mb-2">
                                <span className="text-[10px] text-slate-500">🎨 画面描述：</span>
                                <p className="text-[10px] text-slate-300 mt-1 leading-relaxed line-clamp-3">
                                    {shot.visualDescription}
                                </p>
                            </div>

                            {/* Dialogue */}
                            <div className="mb-2">
                                <span className="text-[10px] text-slate-500">💬 对白：</span>
                                <p className="text-[10px] text-slate-300 mt-1 leading-relaxed line-clamp-2">
                                    {shot.dialogue}
                                </p>
                            </div>

                            <div className="h-px bg-white/5 my-2" />

                            {/* Effects */}
                            <div className="mb-2">
                                <span className="text-[10px] text-slate-500">✨ 视觉效果：</span>
                                <p className="text-[10px] text-slate-300 mt-1 leading-relaxed line-clamp-2">
                                    {shot.visualEffects}
                                </p>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500">🎵 音效/配乐：</span>
                                <p className="text-[10px] text-slate-300 mt-1 leading-relaxed line-clamp-2">
                                    {shot.audioEffects}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
