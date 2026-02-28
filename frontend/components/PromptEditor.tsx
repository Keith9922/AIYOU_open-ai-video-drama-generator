/**
 * 角色生成提示词编辑器
 * 支持中英文切换、同步编辑和重新生成
 */

import { useState, useEffect } from 'react';
import { Languages, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface PromptEditorProps {
  nodeId: string;
  charName: string;
  expressionPromptZh: string;
  expressionPromptEn: string;
  threeViewPromptZh: string;
  threeViewPromptEn: string;
  hasExpressionSheet: boolean;
  hasThreeViewSheet: boolean;
  onRegenerateExpression: (customPrompt: string) => void;
  onRegenerateThreeView: (customPrompt: string) => void;
}

export function PromptEditor({
  nodeId,
  charName,
  expressionPromptZh,
  expressionPromptEn,
  threeViewPromptZh,
  threeViewPromptEn,
  hasExpressionSheet,
  hasThreeViewSheet,
  onRegenerateExpression,
  onRegenerateThreeView
}: PromptEditorProps) {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [expressionPrompt, setExpressionPrompt] = useState(lang === 'zh' ? expressionPromptZh : expressionPromptEn);
  const [threeViewPrompt, setThreeViewPrompt] = useState(lang === 'zh' ? threeViewPromptZh : threeViewPromptEn);
  const [isExpanded, setIsExpanded] = useState(false);

  // 同步更新提示词
  useEffect(() => {
    if (lang === 'zh') {
      setExpressionPrompt(expressionPromptZh);
      setThreeViewPrompt(threeViewPromptZh);
    } else {
      setExpressionPrompt(expressionPromptEn);
      setThreeViewPrompt(threeViewPromptEn);
    }
  }, [lang, expressionPromptZh, expressionPromptEn, threeViewPromptZh, threeViewPromptEn]);

  // 切换语言
  const toggleLanguage = () => {
    setLang(prev => prev === 'zh' ? 'en' : 'zh');
  };

  return (
    <div className="bg-black/40 border border-orange-500/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-orange-500/10 cursor-pointer hover:bg-orange-500/20 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Languages size={14} className="text-orange-400" />
          <span className="text-[10px] font-bold text-orange-300">
            提示词编辑器
          </span>
          <span className="text-[9px] text-slate-400">
            ({lang === 'zh' ? '中文' : 'English'})
          </span>
        </div>
        {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </div>

      {isExpanded && (
        <div className="p-3 space-y-4">
          {/* Language Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-400">语言 / Language:</span>
              <button
                onClick={toggleLanguage}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[9px] text-slate-300 hover:text-white transition-all"
              >
                {lang === 'zh' ? 'English' : '中文'}
              </button>
            </div>
            <span className="text-[9px] text-slate-500">
              修改后点击生成按钮重新生成
            </span>
          </div>

          {/* Expression Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-300 font-medium">
                {lang === 'zh' ? '九宫格表情提示词' : 'Expression Sheet Prompt'}
              </label>
              <button
                onClick={() => onRegenerateExpression(expressionPrompt)}
                disabled={!hasExpressionSheet}
                className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 disabled:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-orange-300 disabled:text-slate-500 text-[9px] font-bold rounded transition-all"
              >
                <RefreshCw size={10} />
                {lang === 'zh' ? '重新生成' : 'Regenerate'}
              </button>
            </div>
            <textarea
              className="w-full h-32 bg-black/30 border border-white/10 rounded-lg p-2 text-[9px] text-slate-300 outline-none resize-y custom-scrollbar focus:border-orange-500/30"
              value={expressionPrompt}
              onChange={(e) => setExpressionPrompt(e.target.value)}
              placeholder={lang === 'zh' ? '输入九宫格表情提示词...' : 'Enter expression sheet prompt...'}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            />
          </div>

          {/* Three View Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-300 font-medium">
                {lang === 'zh' ? '三视图提示词' : 'Three-View Prompt'}
              </label>
              <button
                onClick={() => onRegenerateThreeView(threeViewPrompt)}
                disabled={!hasThreeViewSheet}
                className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 disabled:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-orange-300 disabled:text-slate-500 text-[9px] font-bold rounded transition-all"
              >
                <RefreshCw size={10} />
                {lang === 'zh' ? '重新生成' : 'Regenerate'}
              </button>
            </div>
            <textarea
              className="w-full h-32 bg-black/30 border border-white/10 rounded-lg p-2 text-[9px] text-slate-300 outline-none resize-y custom-scrollbar focus:border-orange-500/30"
              value={threeViewPrompt}
              onChange={(e) => setThreeViewPrompt(e.target.value)}
              placeholder={lang === 'zh' ? '输入三视图提示词...' : 'Enter three-view prompt...'}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            />
            <div className="text-[9px] text-slate-500 italic">
              {lang === 'zh'
                ? 'ℹ️ 三视图会自动使用九宫格表情图作为参考图片'
                : 'ℹ️ Three-view will automatically use expression sheet as reference image'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
