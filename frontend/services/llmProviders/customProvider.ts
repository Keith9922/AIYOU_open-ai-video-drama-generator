/**
 * 自定义第三方 API 提供商实现
 * 请求格式与云雾一致（兼容 Gemini REST API）
 * BASE_URL 和 API Key 从 localStorage 动态读取
 */

import { LLMProvider, GenerateImageOptions, GenerateContentOptions } from './baseProvider';
import { LLMProviderType } from '../../types';
import { logAPICall } from '../apiLogger';

export class CustomProvider implements LLMProvider {
  getType(): LLMProviderType {
    return 'custom';
  }

  getName(): string {
    return '自定义 API';
  }

  /**
   * 获取用户配置的 API 基础地址
   */
  private getBaseUrl(): string | null {
    const url = localStorage.getItem('CUSTOM_API_URL');
    if (url && url.trim()) {
      // 移除末尾斜杠
      return url.trim().replace(/\/+$/, '');
    }
    return null;
  }

  /**
   * 获取 API Key
   */
  private getApiKey(): string | null {
    const userApiKey = localStorage.getItem('CUSTOM_API_KEY');
    if (userApiKey && userApiKey.trim()) {
      return userApiKey.trim();
    }
    return null;
  }

  /**
   * 获取客户端实例
   * 自定义 API 不支持 GoogleGenAI SDK，返回 null
   */
  getClient(): any {
    return null;
  }

  /**
   * 构建 API 请求 URL
   */
  private buildUrl(endpoint: string, apiKey: string): string {
    const baseUrl = this.getBaseUrl();
    if (!baseUrl) {
      throw new Error('CUSTOM_API_URL_NOT_CONFIGURED');
    }
    return `${baseUrl}${endpoint}?key=${apiKey}`;
  }

  /**
   * 生成文本内容
   */
  async generateContent(
    prompt: string,
    model: string,
    options?: GenerateContentOptions
  ): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('CUSTOM_API_KEY_NOT_CONFIGURED');
    }

    const endpoint = `/v1beta/models/${model}:generateContent`;
    const url = this.buildUrl(endpoint, apiKey);

    const requestBody: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]
    };

    if (options?.responseMimeType || options?.systemInstruction) {
      requestBody.generationConfig = {};

      if (options.responseMimeType) {
        requestBody.generationConfig.responseMimeType = options.responseMimeType;
      }

      if (options.systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: options.systemInstruction }]
        };
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '自定义 API 内容生成失败');
    }

    const data = await response.json();

    const parts = data.candidates?.[0]?.content?.parts || [];
    const contentParts = parts.filter((part: any) => !part.thought);
    const text = contentParts
      .map((part: any) => part.text || '')
      .filter((t: string) => t.trim())
      .join('\n\n');

    return text;
  }

  /**
   * 生成图片（返回图片数组）
   */
  async generateImages(
    prompt: string,
    model: string,
    referenceImages?: string[],
    options?: GenerateImageOptions
  ): Promise<string[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('CUSTOM_API_KEY_NOT_CONFIGURED');
    }

    const endpoint = `/v1beta/models/${model}:generateContent`;
    const url = this.buildUrl(endpoint, apiKey);

    const parts: any[] = [{ text: prompt }];

    if (referenceImages && referenceImages.length > 0) {
      for (const imageBase64 of referenceImages) {
        parts.push({
          inlineData: {
            data: imageBase64.split(',')[1] || imageBase64,
            mimeType: 'image/jpeg'
          }
        });
      }
    }

    const requestBody: any = {
      contents: [
        {
          role: 'user',
          parts
        }
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    };

    if (options?.aspectRatio || options?.resolution) {
      requestBody.generationConfig.imageConfig = {};

      if (options.aspectRatio) {
        requestBody.generationConfig.imageConfig.aspectRatio = options.aspectRatio;
      }

      if (options.resolution) {
        requestBody.generationConfig.imageConfig.imageSize = options.resolution;
      }
    }

    if (options?.count) {
      requestBody.generationConfig.numberOfImages = options.count;
    }

    return logAPICall(
      'customGenerateImages',
      async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || '自定义 API 图片生成失败');
        }

        const data = await response.json();

        const images: string[] = [];
        if (data.candidates && data.candidates[0]) {
          const parts = data.candidates[0].content?.parts || [];
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              const mimeType = part.inlineData.mimeType || 'image/png';
              images.push(`data:${mimeType};base64,${part.inlineData.data}`);
            }
          }
        }

        if (images.length === 0) {
          throw new Error('No images generated');
        }

        return images;
      },
      {
        model,
        prompt: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
        enhancedPrompt: prompt,
        inputImagesCount: referenceImages?.length || 0,
        generationConfig: {
          aspectRatio: options?.aspectRatio,
          resolution: options?.resolution,
          count: options?.count
        }
      },
      { platform: '自定义 API', logType: 'submission' }
    );
  }

  /**
   * 验证 API Key
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const baseUrl = this.getBaseUrl();
      if (!baseUrl) {
        return false;
      }
      const response = await fetch(
        `${baseUrl}/v1beta/models?key=${apiKey}`
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
