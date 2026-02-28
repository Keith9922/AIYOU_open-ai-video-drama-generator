/**
 * AIYOU 数据同步中间件
 *
 * 监听 Zustand store 变更，自动同步到 PostgreSQL 后端。
 * 策略：
 *   - 节点位置变更（拖拽）→ 500ms 防抖后 batchUpdateNodes
 *   - 节点数据变更 → 300ms 防抖后 updateNode
 *   - 连接增删 → 立即同步
 *   - 节点增删 → 立即同步
 *   - 后端不可用时静默降级（IndexedDB 仍在保存）
 *
 * @developer 光波 (a@ggbo.com)
 * @copyright Copyright (c) 2025 光波. All rights reserved.
 */

import type { AppNode, Connection, Group } from '../types';
import {
  isApiAvailable,
  createNode as apiCreateNode,
  updateNode as apiUpdateNode,
  batchUpdateNodes as apiBatchUpdate,
  deleteNode as apiDeleteNode,
  createConnection as apiCreateConnection,
  deleteConnection as apiDeleteConnection,
  saveProjectSnapshot,
} from './api';

let currentProjectId: string | null = null;
let online = false;

// Debounce timers
const positionTimers = new Map<string, ReturnType<typeof setTimeout>>();
let batchPositionTimer: ReturnType<typeof setTimeout> | null = null;
const pendingPositionUpdates = new Map<string, { id: string; x: number; y: number; width?: number; height?: number }>();
const dataTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function setSyncProjectId(id: string | null) {
  currentProjectId = id;
}

export function getSyncProjectId(): string | null {
  return currentProjectId;
}

export async function initSync(): Promise<boolean> {
  online = await isApiAvailable();
  return online;
}

function isOnline(): boolean {
  return online && currentProjectId !== null;
}

export function setOnlineStatus(status: boolean) {
  online = status;
}

// ─── Node position changes (debounced batch) ───

export function syncNodePosition(node: AppNode) {
  if (!isOnline()) return;

  pendingPositionUpdates.set(node.id, {
    id: node.id,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  });

  if (batchPositionTimer) clearTimeout(batchPositionTimer);
  batchPositionTimer = setTimeout(flushPositionUpdates, 500);
}

async function flushPositionUpdates() {
  if (pendingPositionUpdates.size === 0) return;

  const batch = Array.from(pendingPositionUpdates.values());
  pendingPositionUpdates.clear();
  batchPositionTimer = null;

  try {
    await apiBatchUpdate(batch);
  } catch {
    // Silently fail — IndexedDB still has the data
  }
}

// ─── Node data changes (debounced per-node) ───

export function syncNodeData(node: AppNode) {
  if (!isOnline()) return;

  const existing = dataTimers.get(node.id);
  if (existing) clearTimeout(existing);

  dataTimers.set(
    node.id,
    setTimeout(async () => {
      dataTimers.delete(node.id);
      try {
        await apiUpdateNode(node.id, {
          type: node.type,
          title: node.title,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          status: node.status,
          data: node.data,
          inputs: node.inputs,
        });
      } catch {
        // silent
      }
    }, 300),
  );
}

// ─── Node add/remove (immediate) ───

export async function syncNodeAdd(node: AppNode) {
  if (!isOnline()) return;
  try {
    await apiCreateNode({
      project_id: currentProjectId!,
      id: node.id,
      type: node.type,
      title: node.title,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      data: node.data,
      inputs: node.inputs,
    });
  } catch {
    // silent
  }
}

export async function syncNodeRemove(nodeId: string) {
  if (!isOnline()) return;
  try {
    await apiDeleteNode(nodeId);
  } catch {
    // silent
  }
}

// ─── Connection add/remove (immediate) ───

export async function syncConnectionAdd(conn: Connection) {
  if (!isOnline()) return;
  try {
    await apiCreateConnection({
      project_id: currentProjectId!,
      id: conn.id,
      from_node: conn.from,
      to_node: conn.to,
    });
  } catch {
    // silent
  }
}

export async function syncConnectionRemove(connId: string) {
  if (!isOnline()) return;
  try {
    await apiDeleteConnection(connId);
  } catch {
    // silent
  }
}

// ─── Full snapshot save (for initial upload or manual save) ───

export async function syncFullSnapshot(
  nodes: AppNode[],
  connections: Connection[],
  groups: Group[],
) {
  if (!isOnline()) return;
  try {
    await saveProjectSnapshot(currentProjectId!, { nodes, connections, groups });
  } catch {
    // silent
  }
}

// ─── Diff-based sync helpers ───

/**
 * Detect added/removed nodes between prev and next arrays.
 * Returns { added, removed } arrays.
 */
export function diffNodes(
  prev: AppNode[],
  next: AppNode[],
): { added: AppNode[]; removed: AppNode[]; positionChanged: AppNode[]; dataChanged: AppNode[] } {
  const prevMap = new Map(prev.map((n) => [n.id, n]));
  const nextMap = new Map(next.map((n) => [n.id, n]));

  const added: AppNode[] = [];
  const removed: AppNode[] = [];
  const positionChanged: AppNode[] = [];
  const dataChanged: AppNode[] = [];

  for (const [id, node] of nextMap) {
    const old = prevMap.get(id);
    if (!old) {
      added.push(node);
    } else {
      if (old.x !== node.x || old.y !== node.y || old.width !== node.width || old.height !== node.height) {
        positionChanged.push(node);
      }
      if (old.data !== node.data || old.title !== node.title || old.status !== node.status) {
        dataChanged.push(node);
      }
    }
  }

  for (const [id] of prevMap) {
    if (!nextMap.has(id)) {
      removed.push(prevMap.get(id)!);
    }
  }

  return { added, removed, positionChanged, dataChanged };
}

export function diffConnections(
  prev: Connection[],
  next: Connection[],
): { added: Connection[]; removed: Connection[] } {
  const key = (c: Connection) => `${c.from}->${c.to}`;
  const prevSet = new Set(prev.map(key));
  const nextSet = new Set(next.map(key));
  const prevMap = new Map(prev.map((c) => [key(c), c]));
  const nextMap = new Map(next.map((c) => [key(c), c]));

  const added = next.filter((c) => !prevSet.has(key(c)));
  const removed = prev.filter((c) => !nextSet.has(key(c)));

  return { added, removed };
}

/**
 * Subscribe to Zustand store and auto-sync changes.
 * Call this once after store is initialized and project is loaded.
 */
export function createStoreSubscription(store: {
  getState: () => { nodes: AppNode[]; connections: Connection[]; groups: Group[] };
  subscribe: (listener: (state: any, prevState: any) => void) => () => void;
}): () => void {
  return store.subscribe((state, prevState) => {
    if (!isOnline()) return;

    // Diff nodes
    if (state.nodes !== prevState.nodes) {
      const { added, removed, positionChanged, dataChanged } = diffNodes(
        prevState.nodes,
        state.nodes,
      );
      for (const node of added) syncNodeAdd(node);
      for (const node of removed) syncNodeRemove(node.id);
      for (const node of positionChanged) syncNodePosition(node);
      for (const node of dataChanged) syncNodeData(node);
    }

    // Diff connections
    if (state.connections !== prevState.connections) {
      const { added, removed } = diffConnections(
        prevState.connections,
        state.connections,
      );
      for (const conn of added) syncConnectionAdd(conn);
      for (const conn of removed) {
        if (conn.id) syncConnectionRemove(conn.id);
      }
    }
  });
}
