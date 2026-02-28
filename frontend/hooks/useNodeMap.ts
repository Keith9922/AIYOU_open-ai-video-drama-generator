import { useMemo, useCallback } from 'react';
import { AppNode } from '../types';

/**
 * Maintains a Map<string, AppNode> that stays in sync with the nodes array.
 * Provides O(1) lookups by node ID instead of O(n) array.find().
 */
export function useNodeMap(nodes: AppNode[]) {
  const nodeMap = useMemo(() => {
    const map = new Map<string, AppNode>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [nodes]);

  const getNode = useCallback((id: string): AppNode | undefined => {
    return nodeMap.get(id);
  }, [nodeMap]);

  const getNodes = useCallback((ids: string[]): AppNode[] => {
    const result: AppNode[] = [];
    for (const id of ids) {
      const node = nodeMap.get(id);
      if (node) result.push(node);
    }
    return result;
  }, [nodeMap]);

  const hasNode = useCallback((id: string): boolean => {
    return nodeMap.has(id);
  }, [nodeMap]);

  return { nodeMap, getNode, getNodes, hasNode };
}
