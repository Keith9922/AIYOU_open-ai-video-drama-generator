/**
 * useWorkflowActions - 工作流操作 Hook
 *
 * @developer 光波 (a@ggbo.com)
 * @copyright Copyright (c) 2025 光波. All rights reserved.
 * @description 从 App.tsx 提取的工作流保存/加载/删除/重命名逻辑
 */

import { AppNode, Connection, Group, Workflow } from '../types';
import { useEditorStore } from '../stores/editor.store';
import { getApproxNodeHeight } from '../utils/nodeHelpers';

interface UseWorkflowActionsParams {
  saveHistory: () => void;
}

export function useWorkflowActions(params: UseWorkflowActionsParams) {
  const { saveHistory } = params;
  const {
    nodes, setNodes,
    connections, setConnections,
    groups, setGroups,
    workflows, setWorkflows,
    selectedWorkflowId, setSelectedWorkflowId,
  } = useEditorStore();

  const saveCurrentAsWorkflow = () => {
      const thumbnailNode = nodes.find(n => n.data.image);
      const thumbnail = thumbnailNode?.data.image || '';
      const newWf: Workflow = {
          id: `wf-${Date.now()}`,
          title: `工作流 ${new Date().toLocaleDateString()}`,
          thumbnail,
          nodes: structuredClone(nodes),
          connections: structuredClone(connections),
          groups: structuredClone(groups)
      };
      setWorkflows(prev => [newWf, ...prev]);
  };

  const saveGroupAsWorkflow = (groupId: string) => {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;
      const nodesInGroup = nodes.filter(n => { const w = n.width || 420; const h = n.height || getApproxNodeHeight(n); const cx = n.x + w/2; const cy = n.y + h/2; return cx > group.x && cx < group.x + group.width && cy > group.y && cy < group.y + group.height; });
      const nodeIds = new Set(nodesInGroup.map(n => n.id));
      const connectionsInGroup = connections.filter(c => nodeIds.has(c.from) && nodeIds.has(c.to));
      const thumbNode = nodesInGroup.find(n => n.data.image);
      const thumbnail = thumbNode ? thumbNode.data.image : '';
      const newWf: Workflow = { id: `wf-${Date.now()}`, title: group.title || '未命名工作流', thumbnail: thumbnail || '', nodes: structuredClone(nodesInGroup), connections: structuredClone(connectionsInGroup), groups: [structuredClone(group)] };
      setWorkflows(prev => [newWf, ...prev]);
  };

  const loadWorkflow = (id: string) => {
      const wf = workflows.find(w => w.id === id);
      if (wf) { saveHistory(); setNodes(structuredClone(wf.nodes)); setConnections(structuredClone(wf.connections)); setGroups(structuredClone(wf.groups)); setSelectedWorkflowId(id); }
  };

  const deleteWorkflow = (id: string) => { setWorkflows(prev => prev.filter(w => w.id !== id)); if (selectedWorkflowId === id) setSelectedWorkflowId(null); };
  const renameWorkflow = (id: string, newTitle: string) => { setWorkflows(prev => prev.map(w => w.id === id ? { ...w, title: newTitle } : w)); };

  return { saveCurrentAsWorkflow, saveGroupAsWorkflow, loadWorkflow, deleteWorkflow, renameWorkflow };
}
