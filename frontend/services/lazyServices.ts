/**
 * AI 服务懒加载器
 * 所有 AI 服务在首次调用时才加载，减少首屏 JS 体积
 */

// Gemini 服务 - 按需加载
export async function getGeminiService() {
  return import('./geminiService');
}

// Sora 服务 - 按需加载
export async function getSoraService() {
  return import('./soraService');
}

// 文件系统服务 - 按需加载
export async function getFileSystemService() {
  return import('./fileSystemService');
}

// Sora 配置服务 - 按需加载
export async function getSoraConfigService() {
  return import('./soraConfigService');
}

// Gemini fallback 服务 - 按需加载
export async function getGeminiServiceWithFallback() {
  return import('./geminiServiceWithFallback');
}

// 角色动作处理 - 按需加载
export async function getCharacterActionHandler() {
  return import('./characterActionHandler');
}

// 视频策略 - 按需加载
export async function getVideoStrategies() {
  return import('./videoStrategies');
}

// 模型 fallback - 按需加载
export async function getModelFallback() {
  return import('./modelFallback');
}
