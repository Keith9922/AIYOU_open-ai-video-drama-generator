/**
 * useKeyboardShortcuts - 键盘快捷键 Hook
 *
 * @developer 光波 (a@ggbo.com)
 * @copyright Copyright (c) 2025 光波. All rights reserved.
 * @description 从 App.tsx 提取的键盘快捷键处理逻辑 (Ctrl+A/C/V/Z, Delete, Space)
 */

import React, { useEffect } from 'react';
import { AppNode, NodeStatus } from '../types';
import { useEditorStore } from '../stores/editor.store';

interface UseKeyboardShortcutsParams {
  nodesRef: React.MutableRefObject<AppNode[]>;
  saveHistory: () => void;
  deleteNodes: (ids: string[]) => void;
  undo: () => void;
  zoomCanvas?: (delta: number, screenX?: number, screenY?: number) => void;
  mousePosRef?: React.MutableRefObject<{ x: number; y: number }>;
}

export function useKeyboardShortcuts(params: UseKeyboardShortcutsParams) {
  const { nodesRef, saveHistory, deleteNodes, undo, zoomCanvas, mousePosRef } = params;
  const {
    nodes, setNodes,
    groups, setGroups,
    selectedNodeIds, setSelectedNodeIds,
    selectedGroupId, setSelectedGroupId,
    clipboard, setClipboard,
    selectedWorkflowId,
  } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); setSelectedNodeIds(nodesRef.current.map(n => n.id)); return; }
        if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); if (zoomCanvas && mousePosRef) { zoomCanvas(0.1, mousePosRef.current.x, mousePosRef.current.y); } return; }
        if ((e.metaKey || e.ctrlKey) && e.key === '-') { e.preventDefault(); if (zoomCanvas && mousePosRef) { zoomCanvas(-0.1, mousePosRef.current.x, mousePosRef.current.y); } return; }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') { const lastSelected = selectedNodeIds[selectedNodeIds.length - 1]; if (lastSelected) { const nodeToCopy = nodesRef.current.find(n => n.id === lastSelected); if (nodeToCopy) { e.preventDefault(); setClipboard(structuredClone(nodeToCopy)); } } return; }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') { if (clipboard) { e.preventDefault(); saveHistory(); const newNode: AppNode = { ...clipboard, id: `n-${Date.now()}-${Math.floor(Math.random()*1000)}`, x: clipboard.x + 50, y: clipboard.y + 50, status: NodeStatus.IDLE, inputs: [] }; setNodes(prev => [...prev, newNode]); setSelectedNodeIds([newNode.id]); } return; }
        if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedGroupId) { saveHistory(); setGroups(prev => prev.filter(g => g.id !== selectedGroupId)); setSelectedGroupId(null); return; } if (selectedNodeIds.length > 0) { deleteNodes(selectedNodeIds); } }
    };
    const handleKeyDownSpace = (e: KeyboardEvent) => { if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') { document.body.classList.add('cursor-grab-override'); } };
    const handleKeyUpSpace = (e: KeyboardEvent) => { if (e.code === 'Space') { document.body.classList.remove('cursor-grab-override'); } };
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keydown', handleKeyDownSpace); window.addEventListener('keyup', handleKeyUpSpace);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keydown', handleKeyDownSpace); window.removeEventListener('keyup', handleKeyUpSpace); };
  }, [selectedWorkflowId, selectedNodeIds, selectedGroupId, deleteNodes, undo, saveHistory, clipboard, zoomCanvas]);
}
