// components/CanvasContextMenu.tsx
import React from 'react';
import { Copy, Trash2, FolderHeart, Unplug, RefreshCw, Download, Users, Layers } from 'lucide-react';
import { NodeType } from '../types';
import { useLanguage } from '../src/i18n/LanguageContext';

interface ContextMenuTarget {
  type: 'node' | 'create' | 'group' | 'connection';
  id?: string;
  from?: string;
  to?: string;
}

interface CanvasContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  target: ContextMenuTarget | null;
  nodeTypes?: NodeType[];
  nodeData?: any; // 添加节点数据
  nodeType?: NodeType; // 添加节点类型
  selectedNodeIds?: string[]; // 多选节点ID列表
  onClose: () => void;
  onAction: (action: string, data?: any) => void;
  getNodeIcon: (type: NodeType) => any;
  getNodeName: (type: NodeType) => string;
}

/**
 * 画布右键菜单组件
 */
export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  visible,
  x,
  y,
  target,
  nodeTypes = [],
  nodeData,
  nodeType,
  selectedNodeIds = [],
  onClose,
  onAction,
  getNodeIcon,
  getNodeName
}) => {
  const { t } = useLanguage();

  if (!visible || !target) return null;

  const handleAction = (action: string, data?: any) => {
    onAction(action, data);
    onClose();
  };

  // 检查是否为分镜图设计节点且有图片
  const isStoryboardImageWithImage = nodeType === NodeType.STORYBOARD_IMAGE && (
    nodeData?.storyboardGridImages?.length > 0 || nodeData?.storyboardGridImage
  );

  // 检查是否为多选场景
  const isMultiSelect = target.type === 'node' && selectedNodeIds.length > 1;

  return (
    <div
      className="fixed z-[100] bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-200 origin-top-left"
      style={{ top: y, left: x }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* 节点右键菜单 */}
      {target.type === 'node' && (
        <>
          {/* 多选操作提示 */}
          {isMultiSelect && (
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 border-b border-white/10 mb-1">
              已选中 {selectedNodeIds.length} 个节点
            </div>
          )}

          {/* 下载原图 - 仅分镜图设计节点显示 */}
          {isStoryboardImageWithImage && (
            <button
              className="w-full text-left px-3 py-2 text-xs font-medium text-green-400 hover:bg-green-500/20 rounded-lg flex items-center gap-2 transition-colors"
              onClick={() => handleAction('downloadImage', target.id)}
            >
              <Download size={12} /> 下载原图
            </button>
          )}

          {/* 多选操作：创建分组 */}
          {isMultiSelect && (
            <button
              className="w-full text-left px-3 py-2 text-xs font-medium text-purple-400 hover:bg-purple-500/20 rounded-lg flex items-center gap-2 transition-colors"
              onClick={() => handleAction('createGroupFromSelection', selectedNodeIds)}
            >
              <Layers size={12} /> 创建分组
            </button>
          )}

          <button
            className="w-full text-left px-3 py-2 text-xs font-medium text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-400 rounded-lg flex items-center gap-2 transition-colors"
            onClick={() => handleAction('copy', target.id)}
          >
            <Copy size={12} /> {t.contextMenu.copyNode}
          </button>

          <button
            className="w-full text-left px-3 py-2 text-xs font-medium text-slate-300 hover:bg-purple-500/20 hover:text-purple-400 rounded-lg flex items-center gap-2 transition-colors"
            onClick={() => handleAction('replace', target.id)}
          >
            <RefreshCw size={12} /> {t.contextMenu.replaceAsset}
          </button>

          {/* 多选操作：删除所有选中的节点 */}
          {isMultiSelect ? (
            <button
              className="w-full text-left px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 rounded-lg flex items-center gap-2 transition-colors mt-1"
              onClick={() => handleAction('deleteMultiple', selectedNodeIds)}
            >
              <Users size={12} /> 删除所有选中 ({selectedNodeIds.length})
            </button>
          ) : (
            <button
              className="w-full text-left px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 rounded-lg flex items-center gap-2 transition-colors mt-1"
              onClick={() => handleAction('delete', target.id)}
            >
              <Trash2 size={12} /> {t.contextMenu.deleteNode}
            </button>
          )}
        </>
      )}

      {/* 创建节点菜单 */}
      {target.type === 'create' && (
        <>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {t.contextMenu.createNode}
          </div>
          {nodeTypes.map(type => {
            const ItemIcon = getNodeIcon(type);
            return (
              <button
                key={type}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 rounded-lg flex items-center gap-2.5 transition-colors"
                onClick={() => handleAction('createNode', { type, x, y })}
              >
                <ItemIcon size={12} className="text-cyan-400" />
                {getNodeName(type)}
              </button>
            );
          })}
        </>
      )}

      {/* 分组右键菜单 */}
      {target.type === 'group' && (
        <>
          <button
            className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors mb-1"
            onClick={() => handleAction('saveGroup', target.id)}
          >
            <FolderHeart size={12} className="text-cyan-400" />
            {t.contextMenu.saveAsWorkflow}
          </button>
          <button
            className="w-full text-left px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 rounded-lg flex items-center gap-2 transition-colors"
            onClick={() => handleAction('deleteGroup', target.id)}
          >
            <Trash2 size={12} />
            {t.contextMenu.deleteGroup}
          </button>
        </>
      )}

      {/* 连接线右键菜单 */}
      {target.type === 'connection' && (
        <button
          className="w-full text-left px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 rounded-lg flex items-center gap-2 transition-colors"
          onClick={() => handleAction('deleteConnection', { from: target.from, to: target.to })}
        >
          <Unplug size={12} />
          {t.contextMenu.deleteConnection}
        </button>
      )}
    </div>
  );
};
