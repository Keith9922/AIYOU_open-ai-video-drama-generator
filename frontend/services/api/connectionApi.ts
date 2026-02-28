/**
 * 连接 API - 创建/删除
 */

import { apiRequest } from './client';
import type { ApiResponse } from './client';
import type { Connection } from '../../types';

interface CreateConnectionPayload {
  project_id: string;
  id?: string;
  from_node: string;
  to_node: string;
}

export function createConnection(
  payload: CreateConnectionPayload,
): Promise<ApiResponse<Connection>> {
  return apiRequest<Connection>('/connections', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteConnection(id: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/connections/${id}`, { method: 'DELETE' });
}
