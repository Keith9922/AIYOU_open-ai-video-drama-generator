/**
 * API 服务统一导出
 */

export { apiRequest, isApiAvailable, getApiBase, toApiUrl } from './client';
export type { ApiResponse } from './client';

export {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  saveProjectSnapshot,
} from './projectApi';
export type { ProjectSummary, ProjectDetail, SnapshotPayload } from './projectApi';

export { createNode, updateNode, batchUpdateNodes, deleteNode } from './nodeApi';

export { createConnection, deleteConnection } from './connectionApi';
