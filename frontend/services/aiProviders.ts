/**
 * AI Providers - 提供商类型定义和工具函数
 * 作为 llmProviderManager 的适配层
 */

import { llmProviderManager } from './llmProviders';

export type AIProviderType = 'gemini' | 'yunwu' | 'openai' | 'deepseek';

/**
 * 获取当前AI提供商类型
 */
export const getAIProviderType = (): AIProviderType => {
    return llmProviderManager.getCurrentProviderType() as AIProviderType;
};

/**
 * 获取当前AI提供商名称
 */
export const getAIProviderName = (): string => {
    return llmProviderManager.getCurrentProvider().getName();
};

/**
 * 检查当前提供商是否为指定的类型
 */
export const isProviderType = (type: AIProviderType): boolean => {
    return llmProviderManager.getCurrentProviderType() === type;
};

/**
 * 检查当前提供商是否支持特定功能
 */
export const isFeatureSupported = (feature: 'text' | 'image' | 'video' | 'audio'): boolean => {
    const providerType = llmProviderManager.getCurrentProviderType();

    // 所有提供商都支持文本和图片生成
    if (feature === 'text' || feature === 'image') {
        return true;
    }

    // 视频和音频生成只有 Gemini 官方 API 支持
    if (feature === 'video' || feature === 'audio') {
        return providerType === 'gemini';
    }

    return false;
};
