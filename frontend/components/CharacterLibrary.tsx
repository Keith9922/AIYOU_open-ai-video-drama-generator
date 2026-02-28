
import React from 'react';
import { X, User, Trash2 } from 'lucide-react';
import { CharacterProfile } from '../types';

interface CharacterLibraryProps {
    isOpen: boolean;
    onClose: () => void;
    characters: CharacterProfile[];
    onDelete: (id: string) => void;
}

export const CharacterLibrary: React.FC<CharacterLibraryProps> = ({ isOpen, onClose, characters, onDelete }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="w-[800px] h-[600px] bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-orange-500/20 rounded-lg text-orange-400">
                            <User size={18} />
                        </div>
                        <span className="text-sm font-bold text-white tracking-wide">角色库 (Character Library)</span>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {characters.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                            <User size={48} className="opacity-20" />
                            <span className="text-xs">暂无已生成角色</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {characters.map(char => (
                                <div key={char.id} className="group relative bg-black/20 border border-white/10 rounded-xl overflow-hidden hover:border-orange-500/30 transition-all">
                                    <div className="aspect-square bg-zinc-900 relative">
                                        {/* Prefer 3-view or expression sheet as thumbnail */}
                                        {char.threeViewSheet || char.expressionSheet ? (
                                            <img src={char.threeViewSheet || char.expressionSheet} alt={char.name || '角色'} loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-700">
                                                <User size={32} />
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 to-transparent p-3 pt-8">
                                            <div className="font-bold text-sm text-white">{char.name}</div>
                                            <div className="text-[10px] text-slate-400 truncate">{char.profession || '未知职业'}</div>
                                        </div>
                                    </div>
                                    <div className="p-3 space-y-1 bg-[#18181b]">
                                        <div className="text-[10px] text-slate-500 line-clamp-2">{char.personality || '无性格描述'}</div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDelete(char.id); }}
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 text-slate-400 hover:text-red-400 hover:bg-black/80 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
