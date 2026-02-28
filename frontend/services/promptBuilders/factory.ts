/**
 * 提示词构建器工厂
 * 根据节点类型或模型类型自动选择合适的构建器
 */

import { PromptBuilder } from './types';
import { Sora2PromptBuilder } from './sora2Builder';
import { GenericPromptBuilder } from './genericBuilder';
import { SimpleTextBuilder } from './simpleBuilder';
import { VideoModelType } from '../videoPlatforms';
import { NodeType } from '../../types';

/**
 * 提示词构建器工厂
 */
class PromptBuilderFactory {
  private builders: Map<string, PromptBuilder> = new Map();

  constructor() {
    // 注册所有构建器
    this.register(new Sora2PromptBuilder());
    this.register(new GenericPromptBuilder());
    this.register(new SimpleTextBuilder());
  }

  /**
   * 注册构建器
   */
  private register(builder: PromptBuilder): void {
    this.builders.set(builder.name, builder);
  }

  /**
   * 根据模型类型获取构建器
   * @param model 视频模型类型
   * @returns 提示词构建器
   */
  getByModel(model: VideoModelType): PromptBuilder {
    // Sora 模型使用 Sora2Builder
    if (model === 'sora') {
      return this.builders.get('sora2')!;
    }

    // 其他模型使用 GenericBuilder
    return this.builders.get('generic')!;
  }

  /**
   * 根据节点类型获取构建器
   * @param nodeType 节点类型
   * @returns 提示词构建器
   */
  getByNodeType(nodeType: NodeType): PromptBuilder {
    // SORA_VIDEO_GENERATOR 使用 Sora2Builder（包含黑色空镜）
    if (nodeType === 'SORA_VIDEO_GENERATOR') {
      return this.builders.get('sora2')!;
    }

    // STORYBOARD_VIDEO_GENERATOR 使用 GenericBuilder（不含黑色空镜）
    if (nodeType === 'STORYBOARD_VIDEO_GENERATOR') {
      return this.builders.get('generic')!;
    }

    // 默认使用 GenericBuilder
    return this.builders.get('generic')!;
  }

  /**
   * 获取所有已注册的构建器
   * @returns 所有构建器数组
   */
  getAllBuilders(): PromptBuilder[] {
    return Array.from(this.builders.values());
  }

  /**
   * 获取指定名称的构建器
   * @param name 构建器名称
   * @returns 提示词构建器，如果不存在则抛出错误
   */
  getByName(name: string): PromptBuilder {
    const builder = this.builders.get(name);
    if (!builder) {
      throw new Error(`未找到名为 "${name}" 的提示词构建器`);
    }
    return builder;
  }
}

// 导出单例
export const promptBuilderFactory = new PromptBuilderFactory();
