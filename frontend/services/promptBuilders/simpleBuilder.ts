/**
 * 简单文本提示词构建器
 * 生成简单的文本描述，不使用多镜头格式
 * 适用于不支持多镜头格式的模型
 */

import { SplitStoryboardShot } from '../../types';
import { PromptBuilder, PromptBuilderOptions } from './types';
import { getUserDefaultModel } from '../modelConfig';
import { logAPICall } from '../apiLogger';
import { llmProviderManager } from '../llmProviders';

/**
 * 简单文本提示词构建器
 */
export class SimpleTextBuilder implements PromptBuilder {
  readonly name = 'simple';
  readonly supportedModels: never[] = []; // 不与任何模型直接关联

  /**
   * 构建简单文本提示词
   */
  async build(
    shots: SplitStoryboardShot[],
    options?: PromptBuilderOptions
  ): Promise<string> {
    if (shots.length === 0) {
      throw new Error('至少需要一个分镜');
    }

    const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);

    // 构建简单的场景描述
    const shotsDescription = shots.map((shot, index) => {
      return `镜头 ${index + 1}: ${shot.visualDescription}`;
    }).join(', 然后 ');

    const userPrompt = `请将以下分镜信息转换为一个流畅的视频描述：

分镜信息：
${shots.map((shot, index) => `
镜头 ${shot.shotNumber} (${shot.duration}秒)
- 景别: ${shot.shotSize}
- 拍摄角度: ${shot.cameraAngle}
- 运镜方式: ${shot.cameraMovement}
- 场景: ${shot.scene || '未指定'}
- 视觉描述: ${shot.visualDescription}
- 对话: ${shot.dialogue || '无'}`).join('\n')}

总时长：约 ${totalDuration.toFixed(1)} 秒

输出要求：
1. 生成一个简洁流畅的视频描述文本
2. 包含所有关键视觉信息
3. 不要添加任何前缀、后缀或解释
4. 直接输出描述文本`;

    const systemPrompt = `你是一个视频描述生成工具。负责将分镜信息转换为简洁的视频描述。`;

    try {
      return await logAPICall(
        'SimpleTextBuilder.build',
        async () => {
          const modelName = getUserDefaultModel('text');

          // 使用 llmProviderManager 统一调用，支持 Gemini 和云雾 API
          const text = await llmProviderManager.generateContent(
            systemPrompt + '\n\n' + userPrompt,
            modelName,
            {
              systemInstruction: systemPrompt
            }
          );

          if (!text) return this.buildBasicPrompt(shots);

          return text.trim();
        },
        {
          model: getUserDefaultModel('text'),
          prompt: userPrompt.substring(0, 200),
          options: {
            shotCount: shots.length,
            totalDuration
          }
        },
        { nodeId: 'simple-builder', nodeType: 'SIMPLE_PROMPT_BUILDER', platform: llmProviderManager.getCurrentProvider().getName() }
      );
    } catch (error: any) {
      console.error('[SimpleTextBuilder] AI enhancement failed, using basic prompt:', error);
      return this.buildBasicPrompt(shots);
    }
  }

  /**
   * 构建基础提示词（回退方案）
   */
  private buildBasicPrompt(shots: SplitStoryboardShot[]): string {
    return shots.map((shot, index) => {
      const duration = shot.duration || 5;
      const scene = shot.visualDescription || '';
      return `${index + 1}. (${duration.toFixed(1)}s) ${scene}`;
    }).join('\n');
  }
}
