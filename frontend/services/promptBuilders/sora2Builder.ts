/**
 * Sora 2 专用提示词构建器
 * 生成 Sora 2 Story Mode 格式，支持黑色空镜作为开头
 */

import { SplitStoryboardShot } from '../../types';
import { PromptBuilder, PromptBuilderOptions } from './types';

/**
 * Sora2 提示词构建器
 */
export class Sora2PromptBuilder implements PromptBuilder {
  readonly name = 'sora2';
  readonly supportedModels = ['sora' as const];

  /**
   * 构建 Sora 2 提示词
   * 直接使用中文分镜信息生成，不调用 AI 增强
   */
  async build(
    shots: SplitStoryboardShot[],
    options?: PromptBuilderOptions
  ): Promise<string> {
    const {
      includeBlackScreen = true,
      blackScreenDuration = 0.5
    } = options || {};

    if (shots.length === 0) {
      throw new Error('至少需要一个分镜');
    }

    return this.buildBasicPrompt(shots, includeBlackScreen, blackScreenDuration);
  }

  /**
   * 构建基础提示词（中文格式）
   * 保留完整的分镜信息（景别、角度、运镜、场景、特效、对话、音效）
   */
  private buildBasicPrompt(
    shots: SplitStoryboardShot[],
    includeBlackScreen: boolean,
    blackScreenDuration: number
  ): string {
    let result = '';

    // 添加黑色空镜
    if (includeBlackScreen) {
      result += `Shot 1:
duration: ${blackScreenDuration.toFixed(1)}s
Scene: 纯黑空镜，无任何视觉内容

`;
    }

    // 添加实际分镜（中文描述）
    const startIndex = includeBlackScreen ? 2 : 1;
    const actualShots = shots.map((shot, index) => {
      const duration = shot.duration || 5;
      const shotNumber = startIndex + index;

      // 构建中文 Scene 描述
      const sceneParts: string[] = [];

      if (shot.shotSize) sceneParts.push(shot.shotSize);
      if (shot.cameraAngle) sceneParts.push(shot.cameraAngle);
      if (shot.cameraMovement) sceneParts.push(shot.cameraMovement);
      if (shot.visualDescription) sceneParts.push(shot.visualDescription);
      if (shot.visualEffects && shot.visualEffects !== '无') {
        sceneParts.push(`[${shot.visualEffects}]`);
      }
      if (shot.dialogue && shot.dialogue !== '无') {
        sceneParts.push(`"${shot.dialogue}"`);
      }
      if (shot.audioEffects && shot.audioEffects !== '无') {
        sceneParts.push(`[${shot.audioEffects}]`);
      }

      const scene = sceneParts.join('，') || shot.visualDescription || '';

      return `Shot ${shotNumber}:
duration: ${duration.toFixed(1)}s
Scene: ${scene}`;
    }).join('\n\n');

    return result + actualShots;
  }
}
