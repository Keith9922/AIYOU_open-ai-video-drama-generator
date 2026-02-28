
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    X, Play, Pause, Download, Mic2, Disc, Wand2, Volume2, 
    Search, Heart, MoreHorizontal, Loader2, Sparkles, Upload, FileAudio, User, Smile,
    FileText, MessageCircle, Activity, AudioLines
} from 'lucide-react';
import { generateAudio, transcribeAudio, connectLiveSession } from '../services/geminiService';

interface SonicStudioProps {
    isOpen: boolean;
    onClose: () => void;
    history: any[]; // Audio assets from global history
    onGenerate: (src: string, prompt: string, duration: number) => void;
}

type TabMode = 'factory' | 'transcribe' | 'live';

const VOICE_PERSONAS = [
    { label: '深沉叙述 (Narrator)', desc: 'Deep, resonant male voice, slow pacing, storytelling style.', gender: 'Male' },
    { label: '活力解说 (Energetic)', desc: 'High energy, fast paced, enthusiastic YouTuber style.', gender: 'Any' },
    { label: '知性新闻 (News)', desc: 'Professional, articulate, neutral tone, broadcast standard.', gender: 'Female' },
    { label: '动漫少女 (Anime)', desc: 'High pitched, cute, expressive, "kawaii" aesthetic.', gender: 'Female' },
    { label: '电影旁白 (Epic)', desc: 'Gravelly, dramatic, movie trailer voice, intense.', gender: 'Male' },
    { label: '慈祥长者 (Elder)', desc: 'Warm, shaky, wise, slow speaking grandmother/grandfather.', gender: 'Any' },
];

const EMOTIONS = [
    { label: '默认 (Neutral)', value: 'neutral' },
    { label: '开心 (Happy)', value: 'cheerful and excited' },
    { label: '悲伤 (Sad)', value: 'melancholic and tearful' },
    { label: '愤怒 (Angry)', value: 'furious and shouting' },
    { label: '耳语 (Whisper)', value: 'whispering quietly' },
    { label: '恐惧 (Scared)', value: 'trembling and fearful' },
];

const PRESET_COVERS = [
    'from-pink-500 to-rose-500',
    'from-cyan-500 to-blue-500', 
    'from-purple-500 to-indigo-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-slate-700 to-slate-900',
];

// Helper: Decode Base64 PCM to AudioBuffer
const decodeAudioData = async (base64PCM: string, ctx: AudioContext) => {
    const binaryString = atob(base64PCM);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
    }
    
    const buffer = ctx.createBuffer(1, float32.length, 24000); // Gemini output is usually 24kHz
    buffer.copyToChannel(float32, 0);
    return buffer;
};

// Helper: Convert Float32 mic input to 16kHz PCM Base64
const convertFloat32ToInt16PCM = (float32: Float32Array) => {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
};

export const SonicStudio: React.FC<SonicStudioProps> = ({ isOpen, onClose, history, onGenerate }) => {
    const [activeTab, setActiveTab] = useState<TabMode>('factory');
    
    // --- Voice Factory State ---
    const [textPrompt, setTextPrompt] = useState('');
    const [selectedPersona, setSelectedPersona] = useState<any>(null);
    const [selectedEmotion, setSelectedEmotion] = useState(EMOTIONS[0]);
    const [referenceAudio, setReferenceAudio] = useState<string | null>(null);
    const [referenceFileName, setReferenceFileName] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // --- Transcriber State ---
    const [transcribeFile, setTranscribeFile] = useState<string | null>(null);
    const [transcribeFileName, setTranscribeFileName] = useState<string | null>(null);
    const [transcript, setTranscript] = useState('');
    const [isTranscribing, setIsTranscribing] = useState(false);

    // --- Live Conversation State ---
    const [isLiveActive, setIsLiveActive] = useState(false);
    const [liveStatus, setLiveStatus] = useState("Ready");
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const sessionRef = useRef<any>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // --- Player State ---
    const [currentTrack, setCurrentTrack] = useState<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const transcribeInputRef = useRef<HTMLInputElement>(null);

    // --- Audio Logic (Player) ---
    useEffect(() => {
        if (currentTrack && audioRef.current) {
            audioRef.current.src = currentTrack.src;
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
    }, [currentTrack]);

    const togglePlay = () => {
        if (!audioRef.current || !currentTrack) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
        }
    };

    // --- Voice Factory Handlers ---
    const handleUploadSample = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setReferenceFileName(file.name);
            const reader = new FileReader();
            reader.onload = (ev) => setReferenceAudio(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateClick = async () => {
        if (!textPrompt.trim() || isGenerating) return;
        setIsGenerating(true);
        try {
            const audioUri = await generateAudio(textPrompt, referenceAudio || undefined, { persona: selectedPersona, emotion: selectedEmotion });
            onGenerate(audioUri, textPrompt, 0); 
            setCurrentTrack({ id: `temp-${Date.now()}`, src: audioUri, title: textPrompt.substring(0, 30) + (textPrompt.length>30?'...':''), timestamp: Date.now() });
        } catch (e) {
            console.error(e);
            alert("生成失败，请重试");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Transcriber Handlers ---
    const handleUploadTranscribe = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setTranscribeFileName(file.name);
            const reader = new FileReader();
            reader.onload = (ev) => setTranscribeFile(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleTranscribeClick = async () => {
        if (!transcribeFile || isTranscribing) return;
        setIsTranscribing(true);
        try {
            const text = await transcribeAudio(transcribeFile);
            setTranscript(text);
        } catch (e) {
            console.error(e);
            alert("转录失败");
        } finally {
            setIsTranscribing(false);
        }
    };

    // --- Live Conversation Handlers ---
    const startLive = async () => {
        try {
            setLiveStatus("Connecting...");
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 }); // Gemini prefers 16k input
            setAudioContext(ctx);
            nextStartTimeRef.current = 0;

            const session = await connectLiveSession(
                async (pcmBase64) => {
                    // Playback received audio
                    if (ctx.state === 'suspended') await ctx.resume();
                    const buffer = await decodeAudioData(pcmBase64, ctx);
                    const source = ctx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(ctx.destination);
                    
                    const now = ctx.currentTime;
                    // Schedule next chunk to play immediately after the previous one
                    // If we fell behind (buffer underrun), start now
                    const startTime = Math.max(now, nextStartTimeRef.current);
                    source.start(startTime);
                    nextStartTimeRef.current = startTime + buffer.duration;
                },
                () => stopLive()
            );
            sessionRef.current = session;

            // Setup Mic Stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const source = ctx.createMediaStreamSource(stream);
            
            // Use ScriptProcessor for simple PCM access (deprecated but reliable for this demo without AudioWorklet files)
            const processor = ctx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                // Downsample is handled by AudioContext (16k), just convert to int16
                const pcmInt16 = convertFloat32ToInt16PCM(inputData);
                const base64 = arrayBufferToBase64(pcmInt16.buffer);
                
                // Send to Gemini
                session.sendRealtimeInput({
                    media: {
                        mimeType: 'audio/pcm;rate=16000',
                        data: base64
                    }
                });
            };

            source.connect(processor);
            processor.connect(ctx.destination); // Required for script processor to run, but mute it to prevent echo? 
            // Actually connecting processor to destination might cause feedback if not careful.
            // Better to connect processor to a Gain(0) then destination.
            const mute = ctx.createGain();
            mute.gain.value = 0;
            processor.connect(mute);
            mute.connect(ctx.destination);

            setLiveStatus("Connected & Listening");
            setIsLiveActive(true);

        } catch (e) {
            console.error("Live Error", e);
            setLiveStatus("Error Connecting");
            stopLive();
        }
    };

    const stopLive = () => {
        if (sessionRef.current) {
            // sessionRef.current.close(); // SDK might not expose explicit close, rely on disconnect logic
            sessionRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (audioContext) {
            audioContext.close();
            setAudioContext(null);
        }
        setIsLiveActive(false);
        setLiveStatus("Ready");
    };

    const toggleLive = () => {
        if (isLiveActive) stopLive();
        else startLive();
    };

    const getRandomCover = (id: string) => {
        const index = id.charCodeAt(id.length - 1) % PRESET_COVERS.length;
        return PRESET_COVERS[index];
    };

    return (
        <div 
            className={`fixed inset-0 z-[100] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] bg-[#0a0a0c] overflow-hidden flex ${isOpen ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 -translate-x-10 pointer-events-none'}`}
            style={{ transformOrigin: 'left center' }}
        >
            {/* --- Background Ambience --- */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-900/10 blur-[100px] pointer-events-none" />

            {/* --- Left Sidebar (Navigation) --- */}
            <div className="w-64 h-full border-r border-white/5 bg-[#121214] flex flex-col z-10">
                <div className="h-16 flex items-center px-6 border-b border-white/5 gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-900/20">
                        <AudioLines size={16} className="text-white" />
                    </div>
                    <span className="text-sm font-bold tracking-wide text-white">Audio Hub</span>
                </div>
                
                <div className="flex flex-col gap-1 p-4">
                    <button 
                        onClick={() => setActiveTab('factory')}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'factory' ? 'bg-white/10 text-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Mic2 size={16} /> 声音工厂 (Voice Factory)
                    </button>
                    <button 
                        onClick={() => setActiveTab('transcribe')}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'transcribe' ? 'bg-white/10 text-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <FileText size={16} /> 语音转文字 (Transcriber)
                    </button>
                    <button 
                        onClick={() => setActiveTab('live')}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'live' ? 'bg-white/10 text-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <MessageCircle size={16} /> 实时对话 (Live Chat)
                    </button>
                </div>

                <div className="mt-auto p-4 border-t border-white/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">历史记录</div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 h-48">
                        {history.length === 0 ? (
                            <div className="text-xs text-slate-600 text-center py-4">暂无历史</div>
                        ) : (
                            history.map((item) => (
                                <div 
                                    key={item.id}
                                    onClick={() => setCurrentTrack(item)}
                                    className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${currentTrack?.id === item.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                >
                                    <div className={`w-6 h-6 rounded bg-gradient-to-br ${getRandomCover(item.id)} flex items-center justify-center shrink-0`}>
                                        <Mic2 size={10} className="text-white/70" />
                                    </div>
                                    <span className={`text-xs truncate ${currentTrack?.id === item.id ? 'text-cyan-400' : 'text-slate-400'}`}>{item.title}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* --- Main Content --- */}
            <div className="flex-1 flex flex-col relative z-0">
                {/* Close Button - Apple Style Left */}
                <div className="absolute top-6 left-6 flex items-center gap-4 z-20">
                    <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pb-32">
                    <div className="max-w-5xl mx-auto flex flex-col gap-8">
                        
                        {/* --- TAB 1: VOICE FACTORY --- */}
                        {activeTab === 'factory' && (
                            <>
                                <div className="space-y-1 pl-12"> {/* Added left padding for title due to close button */}
                                    <h1 className="text-3xl font-black text-white tracking-tight">声音工厂 <span className="text-slate-500 font-light ml-2 text-xl">Voice Factory</span></h1>
                                    <p className="text-slate-400 text-sm">Create realistic voiceovers, clone voices, and generate emotional speech.</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-1 flex flex-col gap-6">
                                        <div className="space-y-3">
                                            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Upload size={12}/> 声音克隆 (参考音频)</h2>
                                            <div 
                                                className={`relative h-32 rounded-xl border border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group overflow-hidden ${referenceAudio ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10'}`}
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleUploadSample} />
                                                {referenceAudio ? (
                                                    <>
                                                        <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400"><FileAudio size={20} /></div>
                                                        <span className="text-xs font-medium text-cyan-200 truncate max-w-[80%]">{referenceFileName}</span>
                                                        <button onClick={(e) => { e.stopPropagation(); setReferenceAudio(null); setReferenceFileName(null); }} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 hover:bg-red-500/80 text-white/50 hover:text-white transition-colors"><X size={10} /></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Mic2 size={24} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                                                        <span className="text-xs text-slate-500 group-hover:text-slate-300">点击上传参考音频</span>
                                                        <span className="text-[9px] text-slate-600 text-center px-4">AI 将模仿此声音朗读文本 (Approximate)</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Smile size={12}/> 情感基调</h2>
                                            <div className="grid grid-cols-2 gap-2">
                                                {EMOTIONS.map(emo => (
                                                    <button key={emo.value} onClick={() => setSelectedEmotion(emo)} className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${selectedEmotion.value === emo.value ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'}`}>
                                                        {emo.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2 flex flex-col gap-6">
                                        <div className="relative group flex-1">
                                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                                            <div className="relative bg-[#1c1c1e] border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col h-full min-h-[240px]">
                                                <textarea className="w-full flex-1 bg-transparent text-lg text-slate-200 placeholder-slate-600 focus:outline-none resize-none font-medium leading-relaxed" placeholder="在此输入您想生成的语音文本..." value={textPrompt} onChange={(e) => setTextPrompt(e.target.value)} />
                                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                                                    <div className="flex items-center gap-2">
                                                        {selectedPersona && <div className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-[10px] text-purple-300 flex items-center gap-1"><User size={10} /> {selectedPersona.label}</div>}
                                                        {referenceAudio && <div className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded text-[10px] text-cyan-300 flex items-center gap-1"><FileAudio size={10} /> Custom Clone</div>}
                                                    </div>
                                                    <button onClick={handleGenerateClick} disabled={!textPrompt.trim() || isGenerating} className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2 ${!textPrompt.trim() || isGenerating ? 'bg-white/5 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:scale-105 hover:shadow-cyan-500/25'}`}>
                                                        {isGenerating ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16} />}
                                                        {isGenerating ? '合成中...' : '生成语音'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><User size={12}/> 声音画像 (Personas)</h2>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {VOICE_PERSONAS.map((persona) => (
                                                    <button key={persona.label} onClick={() => { setSelectedPersona(persona); setReferenceAudio(null); setReferenceFileName(null); }} className={`p-3 rounded-xl border text-left transition-all group ${selectedPersona?.label === persona.label ? 'bg-purple-500/10 border-purple-500/50' : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'}`}>
                                                        <div className="flex justify-between items-start mb-1"><span className={`text-xs font-bold ${selectedPersona?.label === persona.label ? 'text-purple-400' : 'text-slate-300'}`}>{persona.label}</span></div>
                                                        <p className="text-[9px] text-slate-500 leading-relaxed line-clamp-2">{persona.desc}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* --- TAB 2: TRANSCRIBER --- */}
                        {activeTab === 'transcribe' && (
                            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pl-12">
                                <div className="space-y-1">
                                    <h1 className="text-3xl font-black text-white tracking-tight">语音转文字 <span className="text-slate-500 font-light ml-2 text-xl">Transcriber</span></h1>
                                    <p className="text-slate-400 text-sm">Accurately transcribe audio files into text using Gemini 2.5.</p>
                                </div>

                                <div 
                                    className={`relative h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:bg-white/5 ${transcribeFile ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/10'}`}
                                    onClick={() => transcribeInputRef.current?.click()}
                                >
                                    <input type="file" ref={transcribeInputRef} className="hidden" accept="audio/*" onChange={handleUploadTranscribe} />
                                    {transcribeFile ? (
                                        <>
                                            <FileAudio size={48} className="text-cyan-400" />
                                            <span className="text-sm font-medium text-cyan-200">{transcribeFileName}</span>
                                            <button onClick={(e) => { e.stopPropagation(); setTranscribeFile(null); }} className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-red-500/20 text-white/50 hover:text-red-400 rounded-full"><X size={16}/></button>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={48} className="text-slate-600" />
                                            <div className="text-center">
                                                <span className="text-sm font-bold text-slate-400">点击上传音频文件</span>
                                                <p className="text-xs text-slate-600 mt-1">支持 MP3, WAV, M4A, AAC</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex justify-center">
                                    <button 
                                        onClick={handleTranscribeClick} 
                                        disabled={!transcribeFile || isTranscribing}
                                        className={`px-8 py-3 rounded-full font-bold text-sm shadow-lg transition-all flex items-center gap-2 ${!transcribeFile || isTranscribing ? 'bg-white/5 text-slate-500 cursor-not-allowed' : 'bg-cyan-500 text-black hover:scale-105'}`}
                                    >
                                        {isTranscribing ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                                        {isTranscribing ? '转录中...' : '开始转录'}
                                    </button>
                                </div>

                                {transcript && (
                                    <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 relative">
                                        <button onClick={() => navigator.clipboard.writeText(transcript)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white bg-black/20 hover:bg-black/40 rounded-lg transition-colors" title="复制"><FileText size={14}/></button>
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">转录结果</h3>
                                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{transcript}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- TAB 3: LIVE CONVERSATION --- */}
                        {activeTab === 'live' && (
                            <div className="flex flex-col items-center justify-center gap-10 py-10 animate-in fade-in slide-in-from-bottom-4 duration-300 pl-12">
                                <div className="space-y-2 text-center">
                                    <h1 className="text-3xl font-black text-white tracking-tight">实时语音对话 <span className="text-slate-500 font-light ml-2 text-xl">Live</span></h1>
                                    <p className="text-slate-400 text-sm">Bidirectional real-time conversation with Gemini 2.0 Flash Exp.</p>
                                </div>

                                <div className="relative w-64 h-64 flex items-center justify-center">
                                    {/* Visualizer Rings */}
                                    {isLiveActive && (
                                        <>
                                            <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-ping opacity-20" style={{ animationDuration: '2s' }} />
                                            <div className="absolute inset-4 bg-purple-500/20 rounded-full animate-ping opacity-20" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                                        </>
                                    )}
                                    
                                    {/* Status Circle */}
                                    <div className={`relative z-10 w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all duration-500 border-4 ${isLiveActive ? 'bg-gradient-to-br from-cyan-900/50 to-purple-900/50 border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.3)]' : 'bg-[#1c1c1e] border-white/10'}`}>
                                        <Activity size={48} className={isLiveActive ? "text-cyan-400 animate-pulse" : "text-slate-600"} />
                                        <span className={`text-xs font-bold mt-4 uppercase tracking-widest ${isLiveActive ? 'text-cyan-200' : 'text-slate-600'}`}>{liveStatus}</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={toggleLive}
                                    className={`px-10 py-4 rounded-full font-bold text-base shadow-xl transition-all flex items-center gap-3 hover:scale-105 active:scale-95 ${isLiveActive ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500 hover:text-white' : 'bg-cyan-500 text-black hover:bg-cyan-400'}`}
                                >
                                    {isLiveActive ? <X size={20} /> : <Mic2 size={20} />}
                                    {isLiveActive ? '结束对话' : '开始对话'}
                                </button>
                                
                                <p className="text-[10px] text-slate-500 max-w-sm text-center">
                                    Uses Gemini Live API (WebSocket). Please allow microphone access. Ensure you are in a quiet environment for best results.
                                </p>
                            </div>
                        )}

                    </div>
                </div>

                {/* --- Shared Player (Only for Factory/Transcribe if needed) --- */}
                {(activeTab === 'factory' || (currentTrack && activeTab !== 'live')) && (
                    <div className="h-24 bg-[#121214]/90 backdrop-blur-xl border-t border-white/10 flex items-center px-8 gap-8 relative z-20">
                        {/* Track Info */}
                        <div className="w-64 flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${currentTrack ? getRandomCover(currentTrack.id) : 'from-slate-700 to-slate-800'} shadow-lg flex items-center justify-center`}>
                                {currentTrack ? <Mic2 size={24} className="text-white/80" /> : <Disc size={24} className="text-slate-500" />}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold text-white truncate">{currentTrack?.title || 'Ready to speak'}</span>
                                <span className="text-xs text-slate-500">Voice Factory AI</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex-1 flex flex-col items-center gap-2 max-w-2xl mx-auto">
                            <div className="flex items-center gap-6">
                                <button onClick={togglePlay} disabled={!currentTrack} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentTrack ? 'bg-white text-black hover:scale-110' : 'bg-white/10 text-slate-600'}`}>
                                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                                </button>
                            </div>
                            <div className="w-full flex items-center gap-3 text-[10px] font-mono text-slate-500">
                                <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
                                <div className="flex-1 h-1 bg-white/10 rounded-full relative overflow-hidden group/bar cursor-pointer">
                                    <div className="absolute top-0 left-0 h-full bg-cyan-500 rounded-full" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
                                </div>
                                <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
                            </div>
                        </div>

                        {/* Volume */}
                        <div className="w-64 flex items-center justify-end gap-4">
                            <div className="flex items-center gap-2 group/vol">
                                <Volume2 size={16} className="text-slate-400" />
                                <div className="w-20 h-1 bg-white/10 rounded-full relative cursor-pointer">
                                    <div className="absolute top-0 left-0 h-full bg-slate-400 group-hover/vol:bg-white rounded-full" style={{ width: `${volume * 100}%` }} />
                                </div>
                            </div>
                            <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><Download size={18} /></button>
                        </div>
                        <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} onLoadedMetadata={handleTimeUpdate} />
                    </div>
                )}
            </div>
        </div>
    );
};
