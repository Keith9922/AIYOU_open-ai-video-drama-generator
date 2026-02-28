/**
 * 提示词构建器架构
 * 支持多种视频生成模型的提示词格式
 */

import { SplitStoryboardShot } from '../../types';
import { VideoModelType } from '../videoPlatforms';

/**
 * 提示词构建选项
 */
export interface PromptBuilderOptions {
  // Sora2 特定选项
  includeBlackScreen?: boolean;
  blackScreenDuration?: number;

  // 通用选项
  visualStyle?: string;
  context?: string;
  maxShots?: number;
  targetDuration?: number;
  preserveDialogue?: boolean;  // 是否保留对白（默认 true）
}

/**
 * 提示词构建器接口
 * 所有提示词构建器必须实现此接口
 */
export interface PromptBuilder {
  /**
   * 构建提示词
   * @param shots 分镜列表
   * @param options 构建选项
   * @returns 提示词字符串
   */
  build(
    shots: SplitStoryboardShot[],
    options?: PromptBuilderOptions
  ): Promise<string>;

  /**
   * 获取构建器名称
   */
  readonly name: string;

  /**
   * 获取支持的模型列表
   */
  readonly supportedModels: readonly VideoModelType[];
}
