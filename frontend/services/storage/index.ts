/**
 * 存储服务导出入口
 */

import { FileStorageService } from './FileStorageService';
import { createFileStorageService as _createFileStorageService } from './FileStorageService';
import { supportsFileSystemAccessAPI as _supportsFileSystemAccessAPI } from './FileStorageService';

// 类型定义
export * from './types';

// 核心服务 - 明确导出
export { FileStorageService };
export { createFileStorageService } from './FileStorageService';
export { supportsFileSystemAccessAPI } from './FileStorageService';

// 辅助服务
export * from './PathManager';
export * from './MetadataManager';

/**
 * 获取默认存储服务实例
 */
let defaultInstance: FileStorageService | null = null;

export function getFileStorageService(): FileStorageService {
  if (!defaultInstance) {
    defaultInstance = _createFileStorageService();
  }
  return defaultInstance;
}

/**
 * 重置默认实例
 */
export function resetFileStorageService(): void {
  defaultInstance = null;
}
