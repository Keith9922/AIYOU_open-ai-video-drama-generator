import React, { useState } from 'react';
import { X, Key } from 'lucide-react';

interface ApiKeyPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

export const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setError('请输入有效的 API Key');
      return;
    }

    if (!trimmedKey.startsWith('AIzaSy')) {
      setError('API Key 格式不正确，应以 AIzaSy 开头');
      return;
    }

    onSave(trimmedKey);
    setApiKey('');
    setError('');
  };

  const handleClose = () => {
    setApiKey('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-[#1c1c1e] rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Key className="text-cyan-500" size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">配置 API Key</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-200">
              <span className="font-semibold">⚠️ 提示：</span>
              您尚未配置 Gemini API Key，无法使用 AI 功能。
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError('');
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
              placeholder="请输入您的 Gemini API Key (以 AIzaSy 开头)"
              className="w-full px-4 py-3 bg-[#2c2c2e] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />
            {error && (
              <p className="text-xs text-red-400 animate-in fade-in duration-200">
                {error}
              </p>
            )}
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-2">
            <p className="text-xs text-blue-200">
              <span className="font-semibold">💡 如何获取 API Key？</span>
            </p>
            <ol className="text-xs text-blue-200/80 space-y-1 list-decimal list-inside">
              <li>访问 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan-400">Google AI Studio</a></li>
              <li>登录您的 Google 账号</li>
              <li>点击 "Get API key" 或 "Create API key"</li>
              <li>复制生成的 API Key 并粘贴到上方输入框</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all hover:scale-105"
          >
            保存并开始使用
          </button>
        </div>
      </div>
    </div>
  );
};
