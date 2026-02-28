import { useMemo } from 'react';
import { AppNode } from '../types';

interface ViewportBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Calculates which nodes are visible in the current viewport.
 * Uses a padding buffer so nodes about to scroll into view are pre-rendered.
 *
 * @param nodes - All nodes in the canvas
 * @param pan - Current canvas pan offset { x, y }
 * @param scale - Current zoom scale
 * @param viewportWidth - Browser window width
 * @param viewportHeight - Browser window height
 * @param padding - Extra pixels around viewport to pre-render (default 200)
 * @returns Array of nodes that are within or near the viewport
 */
export function useViewportCulling(
  nodes: AppNode[],
  pan: { x: number; y: number },
  scale: number,
  viewportWidth: number,
  viewportHeight: number,
  padding: number = 200
): AppNode[] {
  return useMemo(() => {
    // If few nodes, skip culling overhead
    if (nodes.length <= 20) return nodes;

    // Calculate viewport bounds in canvas coordinates
    const bounds: ViewportBounds = {
      left: -pan.x / scale - padding / scale,
      top: -pan.y / scale - padding / scale,
      right: (-pan.x + viewportWidth) / scale + padding / scale,
      bottom: (-pan.y + viewportHeight) / scale + padding / scale,
    };

    return nodes.filter(node => {
      const nodeRight = node.x + (node.width || 420);
      const nodeBottom = node.y + (node.height || 360);

      // AABB intersection test
      return (
        nodeRight >= bounds.left &&
        node.x <= bounds.right &&
        nodeBottom >= bounds.top &&
        node.y <= bounds.bottom
      );
    });
  }, [nodes, pan.x, pan.y, scale, viewportWidth, viewportHeight, padding]);
}
