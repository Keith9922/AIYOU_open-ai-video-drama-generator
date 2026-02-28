/**
 * LLM/图片生成 API 提供商基础接口
 * 所有提供商必须实现此接口
 */

import { LLMProviderType } from '../../types';

/**
 * 图片生成选项
 */
export interface GenerateImageOptions {
  referenceImages?: string[];
  aspectRatio?: string;
  resolution?: string;
  count?: number;
}

/**
 * 内容生成选项
 */
export interface GenerateContentOptions {
  responseMimeType?: string;
  systemInstruction?: string;
}

/**
 * LLM 提供商接口
 */
export interface LLMProvider {
  /**
   * 获取提供商类型
   */
  getType(): LLMProviderType;

  /**
   * 获取提供商名称
   */
  getName(): string;

  /**
   * 获取客户端实例（用于兼容现有代码）
   * 注意：云雾提供商可能返回 null，因为它不支持 GoogleGenAI SDK
   */
  getClient(): any;

  /**
   * 生成文本内容
   */
  generateContent(
    prompt: string,
    model: string,
    options?: GenerateContentOptions
  ): Promise<string>;

  /**
   * 生成图片（返回图片数组）
   */
  generateImages(
    prompt: string,
    model: string,
    referenceImages?: string[],
    options?: GenerateImageOptions
  ): Promise<string[]>;

  /**
   * 验证 API Key
   */
  validateApiKey(apiKey: string): Promise<boolean>;
}
