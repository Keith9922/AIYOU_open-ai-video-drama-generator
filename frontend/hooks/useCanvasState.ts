// hooks/useCanvasState.ts
import { useState, useCallback, useRef } from 'react';

interface Point {
  x: number;
  y: number;
}

/**
 * 画布状态管理 Hook
 * 管理平移、缩放、拖拽等画布交互状态
 *
 * 性能优化策略:
 * - 拖拽期间使用 ref 跟踪 pan 位置，避免每次 mousemove 触发 re-render
 * - 鼠标位置始终使用 ref，仅在需要 re-render 的场景才写入 state
 * - 拖拽结束时将 ref 值提交到 state，触发一次性 re-render
 * - 使用 requestAnimationFrame 批量处理拖拽期间的 DOM 更新
 */
export function useCanvasState() {
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });

  // High-frequency refs: updated on every mouse move without triggering re-renders
  const panRef = useRef<Point>({ x: 0, y: 0 });
  const mousePosRef = useRef<Point>({ x: 0, y: 0 });

  // Drag computation refs
  const panStartRef = useRef<Point>({ x: 0, y: 0 });
  const mouseStartRef = useRef<Point>({ x: 0, y: 0 });

  // rAF handle for batching DOM updates during drag
  const dragRafRef = useRef<number | null>(null);

  // Optional: DOM element ref for direct style manipulation during drag
  const canvasTransformRef = useRef<HTMLDivElement | null>(null);
  const gridBgRef = useRef<HTMLDivElement | null>(null);

  /**
   * 将 panRef 的当前值提交到 state，触发 re-render
   * 在拖拽结束时调用
   */
  const commitPan = useCallback(() => {
    const current = panRef.current;
    setPan({ x: current.x, y: current.y });
  }, []);

  /**
   * 直接更新 DOM transform，绕过 React 渲染管线
   * 在拖拽期间通过 rAF 调用
   */
  const applyTransformToDOM = useCallback(() => {
    const { x, y } = panRef.current;

    if (canvasTransformRef.current) {
      canvasTransformRef.current.style.transform =
        `translate(${x}px, ${y}px) scale(${scale})`;
    }

    if (gridBgRef.current) {
      gridBgRef.current.style.backgroundPosition = `${x}px ${y}px`;
      gridBgRef.current.style.backgroundSize =
        `${32 * scale}px ${32 * scale}px`;
    }
  }, [scale]);

  /**
   * 开始拖拽画布
   */
  const startCanvasDrag = useCallback((clientX: number, clientY: number) => {
    setIsDraggingCanvas(true);
    // Read from panRef (always up-to-date) instead of stale pan state
    panStartRef.current = { x: panRef.current.x, y: panRef.current.y };
    mouseStartRef.current = { x: clientX, y: clientY };
  }, []);

  /**
   * 拖拽画布中
   * 性能优化: 仅更新 ref + 通过 rAF 直接操作 DOM，不触发 React re-render
   */
  const dragCanvas = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - mouseStartRef.current.x;
    const dy = clientY - mouseStartRef.current.y;

    // Update ref (no re-render)
    panRef.current = {
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy
    };

    // Batch DOM update via rAF
    if (dragRafRef.current === null) {
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        applyTransformToDOM();
      });
    }
  }, [applyTransformToDOM]);

  /**
   * 结束拖拽画布
   * 将 ref 中的最终位置提交到 state，触发一次 re-render
   */
  const endCanvasDrag = useCallback(() => {
    // Cancel any pending rAF
    if (dragRafRef.current !== null) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }

    // Flush final position to state (single re-render)
    commitPan();
    setIsDraggingCanvas(false);
  }, [commitPan]);

  /**
   * 缩放画布（以指定屏幕坐标为中心）
   * @param delta 缩放增量
   * @param screenX 缩放中心的屏幕 X 坐标（可选）
   * @param screenY 缩放中心的屏幕 Y 坐标（可选）
   */
  const zoomCanvas = useCallback((delta: number, screenX?: number, screenY?: number) => {
    if (screenX !== undefined && screenY !== undefined) {
      // 以鼠标位置为中心缩放
      // Read from panRef for up-to-date values
      const currentPan = panRef.current;
      const currentScale = scale;

      // 1. 计算鼠标在当前画布世界坐标系中的位置
      const worldX = (screenX - currentPan.x) / currentScale;
      const worldY = (screenY - currentPan.y) / currentScale;

      // 2. 应用新缩放
      const newScale = Math.max(0.2, Math.min(3, currentScale + delta));

      // 3. 计算新的平移值，使鼠标下的世界坐标点保持在鼠标下方
      const newPanX = screenX - worldX * newScale;
      const newPanY = screenY - worldY * newScale;

      const newPan = { x: newPanX, y: newPanY };
      panRef.current = newPan;
      setPan(newPan);
      setScale(newScale);
    } else {
      // 无中心点，简单缩放
      setScale(prevScale => Math.max(0.2, Math.min(3, prevScale + delta)));
    }
  }, [scale]);

  /**
   * 重置画布视图
   */
  const resetCanvas = useCallback(() => {
    const origin = { x: 0, y: 0 };
    panRef.current = origin;
    setPan(origin);
    setScale(1);
  }, []);

  /**
   * 更新鼠标位置
   * 性能优化: 仅更新 ref，不触发 re-render
   * 需要 re-render 的组件（如 ConnectionLayer 拖拽连接线）
   * 应通过 mousePosRef 读取或显式调用 commitMousePos
   */
  const updateMousePos = useCallback((clientX: number, clientY: number) => {
    mousePosRef.current = { x: clientX, y: clientY };
  }, []);

  /**
   * 将 mousePosRef 提交到 state（仅在需要触发 re-render 时调用）
   * 例如：正在创建连接线时，ConnectionLayer 需要 mousePos 作为 prop
   */
  const commitMousePos = useCallback(() => {
    const current = mousePosRef.current;
    setMousePos({ x: current.x, y: current.y });
  }, []);

  /**
   * 屏幕坐标转换为画布坐标
   * 使用 ref 值确保在拖拽期间也能获取最新位置
   */
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const currentPan = panRef.current;
    return {
      x: (screenX - currentPan.x) / scale,
      y: (screenY - currentPan.y) / scale
    };
  }, [scale]);

  /**
   * 画布坐标转换为屏幕坐标
   * 使用 ref 值确保在拖拽期间也能获取最新位置
   */
  const canvasToScreen = useCallback((canvasX: number, canvasY: number) => {
    const currentPan = panRef.current;
    return {
      x: canvasX * scale + currentPan.x,
      y: canvasY * scale + currentPan.y
    };
  }, [scale]);

  return {
    // 状态 (triggers re-render when changed)
    pan,
    scale,
    isDraggingCanvas,
    mousePos,

    // Refs (read without re-render, always up-to-date)
    panRef,
    mousePosRef,

    // DOM refs for direct manipulation during drag
    canvasTransformRef,
    gridBgRef,

    // 操作
    setPan: useCallback((newPan: Point | ((prev: Point) => Point)) => {
      if (typeof newPan === 'function') {
        setPan(prev => {
          const result = newPan(prev);
          panRef.current = result;
          return result;
        });
      } else {
        panRef.current = newPan;
        setPan(newPan);
      }
    }, []),
    setScale,
    setIsDraggingCanvas,
    startCanvasDrag,
    dragCanvas,
    endCanvasDrag,
    zoomCanvas,
    resetCanvas,
    updateMousePos,
    commitMousePos,
    commitPan,

    // 工具函数
    screenToCanvas,
    canvasToScreen
  };
}
