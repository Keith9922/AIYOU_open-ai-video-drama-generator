/**
 * 项目 API - CRUD 操作
 */

import { apiRequest } from './client';
import type { ApiResponse } from './client';
import type { AppNode, Connection, Group } from '../../types';

export interface ProjectSummary {
  id: string;
  title: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends ProjectSummary {
  nodes: AppNode[];
  connections: Connection[];
  groups: Group[];
}

export interface SnapshotPayload {
  nodes: AppNode[];
  connections: Connection[];
  groups: Group[];
}

export function getProjects(): Promise<ApiResponse<ProjectSummary[]>> {
  return apiRequest<ProjectSummary[]>('/projects');
}

export function getProject(id: string): Promise<ApiResponse<ProjectDetail>> {
  return apiRequest<ProjectDetail>(`/projects/${id}`);
}

export function createProject(title: string): Promise<ApiResponse<ProjectSummary>> {
  return apiRequest<ProjectSummary>('/projects', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export function updateProject(
  id: string,
  data: { title?: string; settings?: Record<string, unknown> },
): Promise<ApiResponse<ProjectSummary>> {
  return apiRequest<ProjectSummary>(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteProject(id: string): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/projects/${id}`, { method: 'DELETE' });
}

export function saveProjectSnapshot(
  id: string,
  payload: SnapshotPayload,
): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/projects/${id}/snapshot`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
