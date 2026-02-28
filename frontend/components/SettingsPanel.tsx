// components/SettingsPanel.tsx
import React, { useState, useEffect } from 'react';
import { X, Key, CheckCircle, AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useLanguage } from '../src/i18n/LanguageContext';
import { LLMProviderType } from '../types';
import { StorageSettingsPanel } from './StorageSettingsPanel';
import { ModelPriorityTab } from './settings/ModelPriorityTab';
import { SoraSettingsTab } from './settings/SoraSettingsTab';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = React.memo(({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'models' | 'storage' | 'sora'>('basic');

  // LLM 提供商配置
  const [llmProvider, setLlmProvider] = useState<LLMProviderType>('gemini');
  const [yunwuLlmApiKey, setYunwuLlmApiKey] = useState('');
  const [showYunwuLlmApiKey, setShowYunwuLlmApiKey] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [showCustomApiKey, setShowCustomApiKey] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) {
      setApiKey(savedKey);
      setValidationStatus('success');
    }

    const savedLlmProvider = localStorage.getItem('LLM_API_PROVIDER') as LLMProviderType;
    if (savedLlmProvider) setLlmProvider(savedLlmProvider);

    const savedYunwuLlmKey = localStorage.getItem('YUNWU_API_KEY');
    if (savedYunwuLlmKey) setYunwuLlmApiKey(savedYunwuLlmKey);

    const savedCustomApiUrl = localStorage.getItem('CUSTOM_API_URL');
    if (savedCustomApiUrl) setCustomApiUrl(savedCustomApiUrl);

    const savedCustomApiKey = localStorage.getItem('CUSTOM_API_KEY');
    if (savedCustomApiKey) setCustomApiKey(savedCustomApiKey);
  }, [isOpen]);

  const validateApiKey = async (key: string): Promise<boolean> => {
    if (!key || key.length < 20) {
      setErrorMessage('API Key 长度不足，请检查是否完整');
      return false;
    }

    setIsValidating(true);
    setValidationStatus('idle');

    try {
      let url: string;
      if (llmProvider === 'gemini') {
        url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      } else if (llmProvider === 'yunwu') {
        url = `https://yunwu.ai/v1beta/models?key=${key}`;
      } else {
        const baseUrl = customApiUrl.trim().replace(/\/+$/, '');
        if (!baseUrl) {
          setErrorMessage('请先输入 API 地址');
          return false;
        }
        url = `${baseUrl}/v1beta/models?key=${key}`;
      }

      const response = await fetch(url);

      if (response.ok) {
        setValidationStatus('success');
        setErrorMessage('');
        return true;
      } else {
        const error = await response.json().catch(() => ({}));
        setValidationStatus('error');
        setErrorMessage(error.error?.message || 'API Key 验证失败，请检查是否正确');
        return false;
      }
    } catch {
      setValidationStatus('error');
      setErrorMessage('网络错误，无法验证 API Key');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveApiKey = async () => {
    let trimmedKey: string;
    if (llmProvider === 'gemini') {
      trimmedKey = apiKey.trim();
    } else if (llmProvider === 'yunwu') {
      trimmedKey = yunwuLlmApiKey.trim();
    } else {
      trimmedKey = customApiKey.trim();
    }

    if (!trimmedKey) {
      setValidationStatus('error');
      setErrorMessage('请输入 API Key');
      return;
    }

    if (llmProvider === 'custom' && !customApiUrl.trim()) {
      setValidationStatus('error');
      setErrorMessage('请输入 API 地址');
      return;
    }

    const isValid = await validateApiKey(trimmedKey);

    if (isValid) {
      localStorage.setItem('LLM_API_PROVIDER', llmProvider);
      if (llmProvider === 'gemini') {
        localStorage.setItem('GEMINI_API_KEY', trimmedKey);
      } else if (llmProvider === 'yunwu') {
        localStorage.setItem('YUNWU_API_KEY', trimmedKey);
      } else {
        localStorage.setItem('CUSTOM_API_URL', customApiUrl.trim().replace(/\/+$/, ''));
        localStorage.setItem('CUSTOM_API_KEY', trimmedKey);
      }
      window.dispatchEvent(new CustomEvent('llmProviderUpdated'));
      setTimeout(onClose, 1000);
    }
  };

  const handleClearApiKey = () => {
    if (llmProvider === 'gemini') {
      setApiKey('');
    } else if (llmProvider === 'yunwu') {
      setYunwuLlmApiKey('');
    } else {
      setCustomApiUrl('');
      setCustomApiKey('');
    }
    setValidationStatus('idle');
    setErrorMessage('');

    if (llmProvider === 'gemini') {
      localStorage.removeItem('GEMINI_API_KEY');
    } else if (llmProvider === 'yunwu') {
      localStorage.removeItem('YUNWU_API_KEY');
    } else {
      localStorage.removeItem('CUSTOM_API_URL');
      localStorage.removeItem('CUSTOM_API_KEY');
    }
    window.dispatchEvent(new CustomEvent('llmProviderUpdated'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl mx-4 bg-[#1c1c1e] rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        {/* 装饰性背景 */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-[120px]" />
        </div>

        {/* 标题栏 */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl">
              <Key size={20} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">设置 (Settings)</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">API Key & 模型配置</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            aria-label="关闭设置"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="relative flex border-b border-white/10">
          {[
            { key: 'basic' as const, label: '基础设置', activeColor: 'text-cyan-400 border-cyan-400' },
            { key: 'models' as const, label: '模型优先级', activeColor: 'text-cyan-400 border-cyan-400' },
            { key: 'sora' as const, label: 'Sora 2', activeColor: 'text-green-400 border-green-400' },
            { key: 'storage' as const, label: '存储设置', activeColor: 'text-cyan-400 border-cyan-400' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 px-4 text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? `${tab.activeColor} border-b-2 bg-white/5`
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'basic' ? (
            <div className="p-8 space-y-6">
              {/* API 提供商选择 */}
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">API 提供商</span>
                </label>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      setLlmProvider('gemini');
                      setValidationStatus('idle');
                      setErrorMessage('');
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      llmProvider === 'gemini'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold text-white">Gemini API</div>
                    <div className="text-xs text-slate-400 mt-1">Google 官方接口</div>
                  </button>

                  <button
                    onClick={() => {
                      setLlmProvider('yunwu');
                      setValidationStatus('idle');
                      setErrorMessage('');
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      llmProvider === 'yunwu'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold text-white">云雾 API</div>
                    <div className="text-xs text-slate-400 mt-1">第三方接口</div>
                  </button>

                  <button
                    onClick={() => {
                      setLlmProvider('custom');
                      setValidationStatus('idle');
                      setErrorMessage('');
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      llmProvider === 'custom'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold text-white">自定义 API</div>
                    <div className="text-xs text-slate-400 mt-1">自定义第三方接口</div>
                  </button>
                </div>
              </div>

              {/* API Key 配置 */}
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    {llmProvider === 'gemini' ? 'Gemini API Key' : llmProvider === 'yunwu' ? '云雾 API Key' : '自定义 API 配置'}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">必填</span>
                </label>

                {llmProvider === 'gemini' && (
                  <>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value);
                          setValidationStatus('idle');
                          setErrorMessage('');
                        }}
                        placeholder="AIzaSy..."
                        className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all font-mono text-sm"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition-colors"
                        type="button"
                      >
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>• 访问 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Google AI Studio</a> 获取免费 API Key</p>
                      <p>• API Key 将安全地存储在您的浏览器本地,不会上传到任何服务器</p>
                    </div>
                  </>
                )}

                {llmProvider === 'yunwu' && (
                  <>
                    <div className="relative">
                      <input
                        type={showYunwuLlmApiKey ? 'text' : 'password'}
                        value={yunwuLlmApiKey}
                        onChange={(e) => {
                          setYunwuLlmApiKey(e.target.value);
                          setValidationStatus('idle');
                          setErrorMessage('');
                        }}
                        placeholder="输入云雾 API Key"
                        className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all font-mono text-sm"
                      />
                      <button
                        onClick={() => setShowYunwuLlmApiKey(!showYunwuLlmApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition-colors"
                        type="button"
                      >
                        {showYunwuLlmApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>• 访问 <a href="https://yunwu.ai" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">云雾官网</a> 获取 API Key</p>
                      <p>• API Key 将安全地存储在您的浏览器本地,不会上传到任何服务器</p>
                    </div>
                  </>
                )}

                {llmProvider === 'custom' && (
                  <>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">API 地址</label>
                        <input
                          type="text"
                          value={customApiUrl}
                          onChange={(e) => {
                            setCustomApiUrl(e.target.value);
                            setValidationStatus('idle');
                            setErrorMessage('');
                          }}
                          placeholder="https://your-api.com"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">API Key</label>
                        <div className="relative">
                          <input
                            type={showCustomApiKey ? 'text' : 'password'}
                            value={customApiKey}
                            onChange={(e) => {
                              setCustomApiKey(e.target.value);
                              setValidationStatus('idle');
                              setErrorMessage('');
                            }}
                            placeholder="输入 API Key"
                            className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all font-mono text-sm"
                          />
                          <button
                            onClick={() => setShowCustomApiKey(!showCustomApiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition-colors"
                            type="button"
                          >
                            {showCustomApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>• 支持任何兼容 Gemini REST API 格式的第三方服务</p>
                      <p>• API 地址和 Key 将安全地存储在您的浏览器本地,不会上传到任何服务器</p>
                    </div>
                  </>
                )}

                {validationStatus === 'success' && (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <CheckCircle size={16} />
                    <span>API Key 已验证</span>
                  </div>
                )}

                {validationStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle size={16} />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* 自动降级说明 */}
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-cyan-400">
                  <RefreshCw size={14} />
                  <span className="text-xs font-bold">智能模型降级</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  系统会自动检测模型配额和可用性。当首选模型额度用完或调用失败时，
                  会自动切换到下一个可用模型，确保工作流持续运行。
                  您可以在"模型优先级"标签页调整模型顺序。
                </p>
              </div>
            </div>
          ) : activeTab === 'models' ? (
            <ModelPriorityTab onClose={onClose} />
          ) : activeTab === 'sora' ? (
            <SoraSettingsTab onClose={onClose} />
          ) : (
            <StorageSettingsPanel
              getCurrentWorkspaceId={() => 'default'}
            />
          )}
        </div>

        {/* 底部按钮 - 仅 basic 和 storage tab 需要 */}
        {activeTab === 'basic' && (
          <div className="relative flex items-center justify-between px-6 py-4 border-t border-white/5 bg-[#121214]">
            <button
              onClick={handleClearApiKey}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              disabled={
                (llmProvider === 'gemini' && !apiKey) ||
                (llmProvider === 'yunwu' && !yunwuLlmApiKey) ||
                (llmProvider === 'custom' && !customApiUrl && !customApiKey)
              }
            >
              清除
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSaveApiKey}
                disabled={isValidating || (!apiKey.trim() && llmProvider === 'gemini') || (!yunwuLlmApiKey.trim() && llmProvider === 'yunwu') || ((!customApiUrl.trim() || !customApiKey.trim()) && llmProvider === 'custom')}
                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 rounded-xl shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isValidating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    验证中...
                  </>
                ) : (
                  '保存'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default SettingsPanel;
