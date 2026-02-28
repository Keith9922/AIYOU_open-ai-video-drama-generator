/**
 * AIYOU API 客户端 - 统一 HTTP 请求封装
 *
 * @developer 光波 (a@ggbo.com)
 * @copyright Copyright (c) 2025 光波. All rights reserved.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const DEFAULT_API_BASE = 'http://localhost:3001/api';
const API_BASE_ENV = (import.meta as any).env?.VITE_API_BASE || DEFAULT_API_BASE;
const API_BASE = API_BASE_ENV.replace(/\/+$/, '');

/** 获取 API 基础地址（默认 http://localhost:3001/api） */
export function getApiBase(): string {
  return API_BASE;
}

/** 构造 API 完整地址，path 形如 "/kling/create" */
export function toApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = toApiUrl(path);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const json = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: json.error || `HTTP ${response.status}`,
      };
    }

    return json as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败',
    };
  }
}

/** 后端是否可达（用于离线检测） */
export async function isApiAvailable(): Promise<boolean> {
  try {
    const response = await fetch(toApiUrl('/projects'), {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
