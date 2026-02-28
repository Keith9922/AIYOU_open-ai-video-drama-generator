/**
 * 节点 API - CRUD + 批量操作
 */

import { apiRequest } from './client';
import type { ApiResponse } from './client';
import type { AppNode } from '../../types';

interface CreateNodePayload {
  project_id: string;
  id?: string;
  type: string;
  title?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  data?: Record<string, unknown>;
  inputs?: string[];
}

interface BatchNodeUpdate {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  data?: Record<string, unknown>;
}

export function createNode(payload: CreateNodePayload): Promise<ApiResponse<AppNode>> {
  return apiRequest<AppNode>('/nodes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateNode(
  id: string,
  updates: Partial<Pick<AppNode, 'type' | 'title' | 'x' | 'y' | 'width' | 'height' | 'status' | 'data' | 'inputs'>>,
): Promise<ApiResponse<AppNode>> {
  return apiRequest<AppNode>(`/nodes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export function batchUpdateNodes(nodes: BatchNodeUpdate[]): Promise<ApiResponse<void>> {
  return apiRequest<void>('/nodes/batch/update', {
    method: 'PUT',
    body: JSON.stringify({ nodes }),
  });
}

export function deleteNode(id: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/nodes/${id}`, { method: 'DELETE' });
}
