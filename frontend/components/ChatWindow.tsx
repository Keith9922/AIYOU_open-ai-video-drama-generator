
import React, { useRef, useEffect, useState } from 'react';
import { X, Bot, Eraser, Copy, CornerDownLeft, Loader2, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  isLoading: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  isOpen, 
  onClose, 
  messages, 
  onSendMessage, 
  onClearChat, 
  isLoading 
}) => {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isOpen]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // --- Rich Text Rendering Logic ---

  const parseInlineStyles = (text: string): React.ReactNode[] => {
    // Regex to split by bold (**text**)
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            const content = part.slice(2, -2);
            // Highlight key values or important labels with brighter white/cyan
            return <span key={i} className="text-white font-bold mx-0.5">{content}</span>;
        }
        return part;
    });
  };

  const renderFormattedMessage = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    
    lines.forEach((line, index) => {
      const key = `line-${index}`;
      const trimmed = line.trim();
      
      // Empty lines
      if (!trimmed) {
         elements.push(<div key={key} className="h-2" />);
         return;
      }
  
      // H1 (# Title)
      if (line.startsWith('# ')) {
          elements.push(
              <h1 key={key} className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mt-5 mb-3 border-b border-white/10 pb-2">
                  {line.replace(/^#\s/, '')}
              </h1>
          );
          return;
      }
      
      // H2 (## Title)
      if (line.startsWith('## ')) {
           elements.push(
              <h2 key={key} className="text-sm font-bold text-white mt-4 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-cyan-500 rounded-full inline-block" />
                  {line.replace(/^##\s/, '')}
              </h2>
          );
          return;
      }
  
      // H3/H4 (### Title)
      if (line.startsWith('### ') || line.startsWith('#### ')) {
          const content = line.replace(/^#+\s/, '');
           elements.push(
              <h3 key={key} className="text-xs font-bold text-cyan-300 mt-3 mb-1 uppercase tracking-wider">
                  {content}
              </h3>
          );
          return;
      }
  
      // List Items (* Item or - Item)
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const content = trimmed.replace(/^[\*\-]\s/, '');
          elements.push(
              <div key={key} className="flex gap-2 ml-1 mb-1.5 items-start group/list">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 mt-[7px] shrink-0 group-hover/list:bg-cyan-400 transition-colors" />
                  <div className="text-[13px] leading-relaxed text-slate-300 flex-1">
                      {parseInlineStyles(content)}
                  </div>
              </div>
          );
          return;
      }
  
      // Numbered Lists (1. Item)
      if (/^\d+\.\s/.test(trimmed)) {
          const [num, ...rest] = trimmed.split(/\.\s/);
          const content = rest.join('. ');
          elements.push(
              <div key={key} className="flex gap-2 ml-1 mb-1.5 items-start">
                  <span className="text-xs font-mono text-cyan-500/80 mt-[2px] shrink-0">{num}.</span>
                  <div className="text-[13px] leading-relaxed text-slate-300 flex-1">
                      {parseInlineStyles(content)}
                  </div>
              </div>
          );
          return;
      }
  
      // Blockquotes (> Quote)
      if (trimmed.startsWith('> ')) {
          const content = trimmed.replace(/^>\s/, '');
          elements.push(
              <div key={key} className="pl-3 border-l-2 border-cyan-500/30 italic text-slate-400 my-2 text-xs">
                  {parseInlineStyles(content)}
              </div>
          );
          return;
      }
  
      // Normal Paragraphs
      elements.push(
          <div key={key} className="text-[13px] leading-relaxed text-slate-300 mb-1">
              {parseInlineStyles(line)}
          </div>
      );
    });
    
    return <div className="space-y-0.5">{elements}</div>;
  };

  // Apple-style spring animation classes
  const SPRING_ANIMATION = "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]";

  return (
    <div 
      className={`fixed right-6 top-1/2 -translate-y-1/2 h-[85vh] w-[420px] bg-[#1c1c1e]/95 backdrop-blur-3xl rounded-[24px] border border-white/10 shadow-2xl z-40 flex flex-col overflow-hidden ${SPRING_ANIMATION} ${isOpen ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-10 scale-95 pointer-events-none'}`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-1">
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-colors group"
          >
            <X size={14} className="group-hover:scale-110 transition-transform" />
          </button>
          <button 
            onClick={onClearChat} 
            className="p-2 hover:bg-white/10 rounded-full text-slate-500 hover:text-red-400 transition-colors group"
            title="清空对话"
          >
            <Eraser size={14} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-slate-200 tracking-wide">AI 创意助手</span>
            <span className="text-[10px] text-slate-500 font-medium">提示词优化 & 灵感生成</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-white/10 shadow-inner">
             <Sparkles size={14} className="text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Chat Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-[#0a0a0c]/50">
        {messages.map((m, i) => (
          <div key={i} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col max-w-[92%] gap-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                
                {/* Role Label */}
                <div className="flex items-center gap-2 px-1">
                    {m.role === 'model' && <span className="text-[10px] font-bold text-cyan-500/80 uppercase tracking-wider">AIYOU</span>}
                    {m.role === 'user' && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">You</span>}
                </div>

                {/* Message Bubble */}
                <div className="group relative transition-all">
                    <div 
                        className={`
                            px-5 py-4 rounded-2xl shadow-sm border select-text
                            ${m.role === 'user' 
                                ? 'bg-[#2c2c2e] border-white/10 text-slate-100 rounded-tr-sm' 
                                : 'bg-[#1c1c1e] border-white/5 text-slate-300 rounded-tl-sm w-full'
                            }
                        `}
                    >
                        {m.role === 'model' ? renderFormattedMessage(m.text) : <p className="leading-6 text-[13px]">{m.text}</p>}
                    </div>

                    {/* Copy Button */}
                    <button 
                        onClick={() => handleCopy(m.text, i)}
                        className={`absolute top-2 ${m.role === 'user' ? '-left-8' : '-right-8'} p-1.5 rounded-full bg-black/40 border border-white/10 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:text-white hover:scale-110 hover:bg-black/60`}
                        title="复制内容"
                    >
                        {copiedIndex === i ? <span className="text-[10px] font-bold text-green-400">OK</span> : <Copy size={12} />}
                    </button>
                </div>
            </div>
          </div>
        ))}

        {isLoading && (
            <div className="flex justify-start w-full animate-in fade-in slide-in-from-bottom-2">
                <div className="flex flex-col gap-2 max-w-[85%]">
                    <span className="text-[10px] font-bold text-cyan-500/80 uppercase tracking-wider px-1">Thinking</span>
                    <div className="px-5 py-4 bg-[#1c1c1e] border border-white/5 rounded-2xl rounded-tl-sm flex items-center gap-3 w-fit shadow-lg shadow-cyan-900/10">
                        <Loader2 size={16} className="animate-spin text-cyan-500" />
                        <span className="text-xs text-slate-400 font-medium tracking-wide">正在思考创意...</span>
                    </div>
                </div>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#1c1c1e] border-t border-white/5 shrink-0">
        <div className="relative group/input">
          <textarea 
            className="w-full bg-black/20 border border-white/10 rounded-[20px] pl-4 pr-12 py-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:bg-black/40 focus:border-cyan-500/30 transition-all resize-none custom-scrollbar leading-5" 
            placeholder="输入您的想法，让 AI 为您完善..." 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            }}
            rows={1}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading}
            className={`absolute right-2 top-2 p-2 rounded-full transition-all duration-300 ${input.trim() && !isLoading ? 'bg-cyan-500 text-black hover:bg-cyan-400 hover:scale-105 shadow-lg shadow-cyan-500/20' : 'bg-white/5 text-slate-600 cursor-not-allowed'}`}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CornerDownLeft size={16} />}
          </button>
        </div>
        <div className="text-[9px] text-slate-600 text-center mt-2 font-medium tracking-wide">
            Shift + Enter 换行
        </div>
      </div>
    </div>
  );
};
