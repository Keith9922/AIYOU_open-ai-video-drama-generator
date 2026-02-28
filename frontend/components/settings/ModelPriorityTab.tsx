import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertCircle, ArrowUp, ArrowDown, RefreshCw, Image as ImageIcon, Type, Music } from 'lucide-react';
import {
  ModelCategory,
  getModelsByCategory,
  getModelInfo,
  saveUserPriority,
  getUserPriority,
  IMAGE_MODELS,
  TEXT_MODELS,
  AUDIO_MODELS
} from '../../services/modelConfig';
import {
  getAllModelStats,
  getModelHealth,
  resetModelStats
} from '../../services/modelFallback';

const MODEL_CATEGORIES = {
  image: {
    label: '图片生成模型',
    icon: ImageIcon,
    description: '按效果排序，优先使用高质量模型，自动降级到备用模型',
    models: IMAGE_MODELS
  },
  text: {
    label: '文本生成模型 (LLM)',
    icon: Type,
    description: '推理能力优先，Flash 模型作为快速备用',
    models: TEXT_MODELS
  },
  audio: {
    label: '音频生成模型',
    icon: Music,
    description: 'TTS 和原生音频模型',
    models: AUDIO_MODELS
  }
};

interface ModelPriorityTabProps {
  onClose: () => void;
}

export const ModelPriorityTab: React.FC<ModelPriorityTabProps> = React.memo(({ onClose }) => {
  const [modelPriorities, setModelPriorities] = useState<Record<ModelCategory, string[]>>({
    image: [],
    text: [],
    audio: [],
    video: []
  });

  const [modelHealth, setModelHealth] = useState<Record<string, {
    healthy: boolean;
    successRate: number;
    consecutiveFailures: number;
  }>>({});

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const categories: ModelCategory[] = ['image', 'text', 'audio'];
    const priorities: Record<ModelCategory, string[]> = {} as Record<ModelCategory, string[]>;

    categories.forEach(category => {
      const savedPriority = getUserPriority(category);
      const availableModels = getModelsByCategory(category).map(m => m.id);
      priorities[category] = [
        ...savedPriority.filter(id => availableModels.includes(id)),
        ...availableModels.filter(id => !savedPriority.includes(id))
      ];
    });

    setModelPriorities(priorities);

    const stats = getAllModelStats();
    const health: Record<string, { healthy: boolean; successRate: number; consecutiveFailures: number }> = {};
    Object.keys(stats).forEach(modelId => {
      health[modelId] = getModelHealth(modelId);
    });
    setModelHealth(health);
  }, []);

  const moveModelUp = useCallback((category: ModelCategory, currentIndex: number) => {
    if (currentIndex === 0) return;
    setModelPriorities(prev => {
      const newPriority = [...prev[category]];
      [newPriority[currentIndex - 1], newPriority[currentIndex]] =
        [newPriority[currentIndex], newPriority[currentIndex - 1]];
      return { ...prev, [category]: newPriority };
    });
  }, []);

  const moveModelDown = useCallback((category: ModelCategory, currentIndex: number) => {
    setModelPriorities(prev => {
      if (currentIndex === prev[category].length - 1) return prev;
      const newPriority = [...prev[category]];
      [newPriority[currentIndex], newPriority[currentIndex + 1]] =
        [newPriority[currentIndex + 1], newPriority[currentIndex]];
      return { ...prev, [category]: newPriority };
    });
  }, []);

  const resetToDefault = useCallback((category: ModelCategory) => {
    const defaultPriority = getModelsByCategory(category)
      .sort((a, b) => a.priority - b.priority)
      .map(m => m.id);
    setModelPriorities(prev => ({ ...prev, [category]: defaultPriority }));
  }, []);

  const handleResetStats = useCallback(() => {
    resetModelStats();
    const stats = getAllModelStats();
    const health: Record<string, { healthy: boolean; successRate: number; consecutiveFailures: number }> = {};
    Object.keys(stats).forEach(id => {
      health[id] = getModelHealth(id);
    });
    setModelHealth(health);
  }, []);

  const getHealthIcon = useCallback((modelId: string) => {
    const health = modelHealth[modelId];
    if (!health) return <CheckCircle size={14} className="text-slate-600" />;
    if (health.healthy) return <CheckCircle size={14} className="text-green-500" />;
    if (health.consecutiveFailures >= 3) return <AlertCircle size={14} className="text-red-500" />;
    return <AlertCircle size={14} className="text-yellow-500" />;
  }, [modelHealth]);

  const handleSave = useCallback(() => {
    Object.entries(modelPriorities).forEach(([category, priority]) => {
      saveUserPriority(category as ModelCategory, priority);
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    setTimeout(onClose, 500);
  }, [modelPriorities, onClose]);

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">模型优先级配置</h3>
            <p className="text-[11px] text-slate-400">
              拖动调整模型顺序，优先使用排在最前面的模型
            </p>
          </div>
          <button
            onClick={() => {
              const categories: ModelCategory[] = ['image', 'text', 'audio'];
              categories.forEach(cat => resetToDefault(cat));
            }}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-slate-400 hover:text-white transition-all flex items-center gap-1"
          >
            <RefreshCw size={12} />
            <span>重置全部</span>
          </button>
        </div>

        {Object.entries(MODEL_CATEGORIES).map(([key, category]) => {
          const Icon = category.icon;
          const catKey = key as ModelCategory;
          const priority = modelPriorities[catKey];

          return (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Icon size={16} className="text-slate-500" />
                  <span className="text-xs font-bold text-slate-300">{category.label}</span>
                </div>
                <button
                  onClick={() => resetToDefault(catKey)}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  重置
                </button>
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed">
                {category.description}
              </p>

              <div className="space-y-2">
                {priority.map((modelId, index) => {
                  const modelInfo = getModelInfo(modelId);
                  if (!modelInfo) return null;

                  const health = modelHealth[modelId];

                  return (
                    <div
                      key={modelId}
                      className="flex items-center gap-3 p-3 bg-black/30 border border-white/10 rounded-lg group hover:bg-black/40 transition-all"
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-600 w-4">
                          {index + 1}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white truncate">
                            {modelInfo.name}
                          </span>
                          {modelInfo.isDefault && (
                            <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-[9px] font-bold rounded">
                              默认
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {getHealthIcon(modelId)}
                          {health && (
                            <span className="text-[9px] text-slate-500">
                              成功率: {health.successRate.toFixed(0)}%
                              {health.consecutiveFailures > 0 && (
                                <span className="text-yellow-500 ml-1">
                                  ({health.consecutiveFailures} 连续失败)
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="hidden lg:flex items-center gap-1 flex-wrap">
                        {modelInfo.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 bg-white/5 text-slate-500 text-[9px] rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveModelUp(catKey, index)}
                          disabled={index === 0}
                          className={`p-1 rounded transition-all ${
                            index === 0
                              ? 'text-slate-700 cursor-not-allowed'
                              : 'text-slate-500 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => moveModelDown(catKey, index)}
                          disabled={index === priority.length - 1}
                          className={`p-1 rounded transition-all ${
                            index === priority.length - 1
                              ? 'text-slate-700 cursor-not-allowed'
                              : 'text-slate-500 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* 模型统计 */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">模型调用统计</span>
            <button
              onClick={handleResetStats}
              className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
            >
              清除统计
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative flex items-center justify-between px-6 py-4 border-t border-white/5 bg-[#121214]">
        <div className="text-[10px] text-slate-500">
          {isSaved && <span className="text-green-400">已保存</span>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-xl transition-all"
          >
            保存设置
          </button>
        </div>
      </div>
    </>
  );
});
