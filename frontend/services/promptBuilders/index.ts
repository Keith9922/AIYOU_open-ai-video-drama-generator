/**
 * 提示词构建器模块
 * 提供多种视频生成模型的提示词构建功能
 */

// 导出类型定义
export * from './types';

// 导出具体构建器
export { Sora2PromptBuilder } from './sora2Builder';
export { GenericPromptBuilder } from './genericBuilder';
export { SimpleTextBuilder } from './simpleBuilder';

// 导出工厂单例
export { promptBuilderFactory } from './factory';
