// hooks/useHistory.ts
import { useCallback, useRef } from 'react';
import { enablePatches, produceWithPatches, applyPatches, Patch } from 'immer';
import { AppNode, Connection, Group } from '../types';

// Enable Immer patches support (idempotent, safe to call multiple times)
enablePatches();

interface HistoryState {
  nodes: AppNode[];
  connections: Connection[];
  groups: Group[];
}

interface HistoryEntry {
  patches: Patch[];
  inversePatches: Patch[];
}

/**
 * Incremental history management using Immer patches.
 *
 * Instead of storing full state snapshots via structuredClone (O(n * history_size)),
 * this records only the diffs (patches) between consecutive states.
 * Memory usage: O(n + total_patch_size), which is dramatically smaller when
 * nodes contain large payloads like image data.
 *
 * API is backward-compatible with the previous snapshot-based implementation:
 *   - saveToHistory(nodes, connections, groups)
 *   - undo() => HistoryState | null
 *   - redo() => HistoryState | null
 *   - canUndo / canRedo (boolean getters)
 *   - clearHistory()
 */
export function useHistory(maxHistorySize = 50) {
  const undoStackRef = useRef<HistoryEntry[]>([]);
  const redoStackRef = useRef<HistoryEntry[]>([]);
  const currentStateRef = useRef<HistoryState | null>(null);
  const isUndoRedoRef = useRef(false);

  /**
   * Save current state to history.
   * Computes patches between the stored baseline and the new state.
   */
  const saveToHistory = useCallback((
    nodes: AppNode[],
    connections: Connection[],
    groups: Group[]
  ) => {
    const newState: HistoryState = { nodes, connections, groups };

    // First call: just store the baseline, no patches to record yet
    if (!currentStateRef.current) {
      currentStateRef.current = newState;
      return;
    }

    // Skip if we are inside an undo/redo operation
    if (isUndoRedoRef.current) {
      return;
    }

    try {
      const [, patches, inversePatches] = produceWithPatches(
        currentStateRef.current,
        (draft) => {
          draft.nodes = newState.nodes as any;
          draft.connections = newState.connections as any;
          draft.groups = newState.groups as any;
        }
      );

      // Only push if there are actual changes
      if (patches.length > 0) {
        undoStackRef.current = [...undoStackRef.current, { patches, inversePatches }];

        // Trim to max history size
        if (undoStackRef.current.length > maxHistorySize) {
          undoStackRef.current = undoStackRef.current.slice(
            undoStackRef.current.length - maxHistorySize
          );
        }

        // Clear redo stack on new action (standard undo/redo behavior)
        redoStackRef.current = [];

        // Update baseline
        currentStateRef.current = newState;
      }
    } catch (error) {
      // Fallback: update baseline so subsequent saves still work
      if (process.env.NODE_ENV !== 'production') {
        console.warn('History patch computation failed:', error);
      }
      currentStateRef.current = newState;
    }
  }, [maxHistorySize]);

  /**
   * Undo: apply inverse patches to revert to the previous state.
   * Returns the restored state, or null if nothing to undo.
   */
  const undo = useCallback((): HistoryState | null => {
    if (undoStackRef.current.length === 0 || !currentStateRef.current) {
      return null;
    }

    const entry = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);

    isUndoRedoRef.current = true;

    try {
      const restored = applyPatches(
        currentStateRef.current,
        entry.inversePatches
      ) as HistoryState;

      // Move entry to redo stack
      redoStackRef.current = [...redoStackRef.current, entry];

      currentStateRef.current = restored;
      return restored;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('History undo failed:', error);
      }
      return null;
    } finally {
      isUndoRedoRef.current = false;
    }
  }, []);

  /**
   * Redo: re-apply patches to restore the next state.
   * Returns the restored state, or null if nothing to redo.
   */
  const redo = useCallback((): HistoryState | null => {
    if (redoStackRef.current.length === 0 || !currentStateRef.current) {
      return null;
    }

    const entry = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);

    isUndoRedoRef.current = true;

    try {
      const restored = applyPatches(
        currentStateRef.current,
        entry.patches
      ) as HistoryState;

      // Move entry back to undo stack
      undoStackRef.current = [...undoStackRef.current, entry];

      currentStateRef.current = restored;
      return restored;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('History redo failed:', error);
      }
      return null;
    } finally {
      isUndoRedoRef.current = false;
    }
  }, []);

  /**
   * Clear all history and reset baseline.
   */
  const clearHistory = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    currentStateRef.current = null;
  }, []);

  /**
   * Get the current baseline state (if any).
   */
  const getCurrentState = useCallback((): HistoryState | null => {
    return currentStateRef.current;
  }, []);

  return {
    // State (computed from refs for compatibility)
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,

    // Operations
    saveToHistory,
    undo,
    redo,
    clearHistory,
    getCurrentState,
  };
}
