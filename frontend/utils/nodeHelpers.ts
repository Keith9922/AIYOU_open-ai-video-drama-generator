// utils/nodeHelpers.ts
import { AppNode, NodeType } from '../types';
import {
  Type,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  ScanFace,
  Brush,
  ScrollText,
  Clapperboard,
  User,
  BookOpen,
  Film,
  Sparkles,
  Palette,
  Grid,
  Wand2
} from 'lucide-react';

/**
 * 节点辅助函数集合
 */

/**
 * 获取节点中文名称
 */
export function getNodeNameCN(type: NodeType): string {
  switch (type) {
    case NodeType.PROMPT_INPUT: return '创意描述';
    case NodeType.IMAGE_GENERATOR: return '文字生图';
    case NodeType.VIDEO_GENERATOR: return '文生视频';
    case NodeType.AUDIO_GENERATOR: return '灵感音乐';
    case NodeType.VIDEO_ANALYZER: return '视频分析';
    case NodeType.IMAGE_EDITOR: return '图像编辑';
    case NodeType.SCRIPT_PLANNER: return '剧本大纲';
    case NodeType.SCRIPT_EPISODE: return '剧本分集';
    case NodeType.STORYBOARD_GENERATOR: return '分镜生成';
    case NodeType.STORYBOARD_IMAGE: return '分镜图设计';
    case NodeType.STORYBOARD_SPLITTER: return '分镜图拆解';
    case NodeType.SORA_VIDEO_GENERATOR: return 'Sora 2 视频';
    case NodeType.SORA_VIDEO_CHILD: return 'Sora 2 视频结果';
    case NodeType.STORYBOARD_VIDEO_GENERATOR: return '分镜视频生成';
    case NodeType.STORYBOARD_VIDEO_CHILD: return '分镜视频结果';
    case NodeType.CHARACTER_NODE: return '角色设计';
    case NodeType.DRAMA_ANALYZER: return '剧目分析';
    case NodeType.DRAMA_REFINED: return '剧目精炼';
    case NodeType.STYLE_PRESET: return '全局风格';
    case NodeType.VIDEO_EDITOR: return '视频编辑器';
    default: return type;
  }
}

/**
 * 获取节点介绍信息（描述 + 接入/接出范围）
 */
export function getNodeInfo(type: NodeType): { description: string; inputs: string; outputs: string } {
  switch (type) {
    case NodeType.PROMPT_INPUT:
      return { description: '输入创意文字描述，作为后续生成的起点', inputs: '无', outputs: '文字生图、文生视频、灵感音乐、剧本大纲' };
    case NodeType.IMAGE_GENERATOR:
      return { description: '根据文字描述生成图片', inputs: '创意描述、全局风格', outputs: '图像编辑、文生视频、分镜图设计' };
    case NodeType.VIDEO_GENERATOR:
      return { description: '根据文字或图片生成视频', inputs: '创意描述、文字生图、全局风格', outputs: '视频分析、视频编辑器' };
    case NodeType.AUDIO_GENERATOR:
      return { description: '根据描述生成背景音乐或音效', inputs: '创意描述', outputs: '视频编辑器' };
    case NodeType.VIDEO_ANALYZER:
      return { description: '分析视频内容，提取关键信息', inputs: '文生视频、分镜视频结果', outputs: '无' };
    case NodeType.IMAGE_EDITOR:
      return { description: '对已有图片进行编辑和调整', inputs: '文字生图、分镜图设计', outputs: '文生视频' };
    case NodeType.SCRIPT_PLANNER:
      return { description: '根据创意生成完整的剧本大纲', inputs: '创意描述', outputs: '剧本分集' };
    case NodeType.SCRIPT_EPISODE:
      return { description: '将剧本大纲拆分为具体分集内容', inputs: '剧本大纲', outputs: '分镜生成' };
    case NodeType.STORYBOARD_GENERATOR:
      return { description: '根据剧本分集生成详细分镜脚本', inputs: '剧本分集', outputs: '分镜图设计、分镜图拆解' };
    case NodeType.STORYBOARD_IMAGE:
      return { description: '为每个分镜生成对应的参考图片', inputs: '分镜生成、角色设计、全局风格', outputs: '分镜图拆解' };
    case NodeType.STORYBOARD_SPLITTER:
      return { description: '将分镜拆解为可独立生成视频的片段', inputs: '分镜生成、分镜图设计', outputs: 'Sora 2 视频、分镜视频生成' };
    case NodeType.SORA_VIDEO_GENERATOR:
      return { description: '使用 Sora 2 API 生成高质量视频片段', inputs: '分镜图拆解', outputs: 'Sora 2 视频结果' };
    case NodeType.SORA_VIDEO_CHILD:
      return { description: '展示 Sora 2 生成的单个视频结果', inputs: 'Sora 2 视频（自动生成）', outputs: '视频编辑器' };
    case NodeType.STORYBOARD_VIDEO_GENERATOR:
      return { description: '使用多种视频模型生成分镜视频', inputs: '分镜图拆解', outputs: '分镜视频结果' };
    case NodeType.STORYBOARD_VIDEO_CHILD:
      return { description: '展示分镜视频生成的单个结果', inputs: '分镜视频生成（自动生成）', outputs: '视频编辑器' };
    case NodeType.CHARACTER_NODE:
      return { description: '定义角色外观、性格等设定，保持一致性', inputs: '创意描述、剧本大纲、剧本分集、分镜生成', outputs: '分镜图设计' };
    case NodeType.DRAMA_ANALYZER:
      return { description: '分析剧目结构、节奏和情感走向', inputs: '剧本大纲、剧本分集', outputs: '剧目精炼' };
    case NodeType.DRAMA_REFINED:
      return { description: '对剧目分析结果进行精炼和优化', inputs: '剧目分析', outputs: '分镜生成' };
    case NodeType.STYLE_PRESET:
      return { description: '设置全局视觉风格，影响所有生成节点', inputs: '无', outputs: '文字生图、文生视频、分镜图设计' };
    case NodeType.VIDEO_EDITOR:
      return { description: '将多个视频片段拼接、剪辑为完整作品', inputs: 'Sora 2 视频结果、分镜视频结果、灵感音乐', outputs: '无（最终产物）' };
    default:
      return { description: '未知节点类型', inputs: '无', outputs: '无' };
  }
}

/**
 * 获取节点图标
 */
export function getNodeIcon(type: NodeType) {
  const icons: Record<NodeType, any> = {
    [NodeType.PROMPT_INPUT]: Type,
    [NodeType.IMAGE_GENERATOR]: ImageIcon,
    [NodeType.VIDEO_GENERATOR]: VideoIcon,
    [NodeType.AUDIO_GENERATOR]: Music,
    [NodeType.VIDEO_ANALYZER]: ScanFace,
    [NodeType.IMAGE_EDITOR]: Brush,
    [NodeType.SCRIPT_PLANNER]: ScrollText,
    [NodeType.SCRIPT_EPISODE]: BookOpen,
    [NodeType.STORYBOARD_GENERATOR]: Clapperboard,
    [NodeType.STORYBOARD_IMAGE]: Clapperboard,
    [NodeType.STORYBOARD_SPLITTER]: Grid,
    [NodeType.SORA_VIDEO_GENERATOR]: Wand2,
    [NodeType.CHARACTER_NODE]: User,
    [NodeType.DRAMA_ANALYZER]: Film,
    [NodeType.DRAMA_REFINED]: Sparkles,
    [NodeType.STYLE_PRESET]: Palette,
    [NodeType.STORYBOARD_VIDEO_GENERATOR]: Film,
    [NodeType.STORYBOARD_VIDEO_CHILD]: VideoIcon,
    [NodeType.VIDEO_EDITOR]: Film
  };

  return icons[type] || Type;
}

/**
 * 获取节点颜色
 */
export function getNodeColor(type: NodeType): string {
  const colors: Record<NodeType, string> = {
    [NodeType.PROMPT_INPUT]: '#6366f1',
    [NodeType.IMAGE_GENERATOR]: '#10b981',
    [NodeType.VIDEO_GENERATOR]: '#8b5cf6',
    [NodeType.AUDIO_GENERATOR]: '#f59e0b',
    [NodeType.VIDEO_ANALYZER]: '#06b6d4',
    [NodeType.IMAGE_EDITOR]: '#ec4899',
    [NodeType.SCRIPT_PLANNER]: '#3b82f6',
    [NodeType.SCRIPT_EPISODE]: '#14b8a6',
    [NodeType.STORYBOARD_GENERATOR]: '#a855f7',
    [NodeType.STORYBOARD_IMAGE]: '#a855f7',
    [NodeType.STORYBOARD_SPLITTER]: '#3b82f6',  // Blue color for analysis/processing
    [NodeType.SORA_VIDEO_GENERATOR]: '#10b981',  // Green color for Sora video generation
    [NodeType.SORA_VIDEO_CHILD]: '#10b981',
    [NodeType.CHARACTER_NODE]: '#f97316',
    [NodeType.DRAMA_ANALYZER]: '#7c3aed',
    [NodeType.DRAMA_REFINED]: '#06b6d4',
    [NodeType.STYLE_PRESET]: '#a855f7',
    [NodeType.STORYBOARD_VIDEO_GENERATOR]: '#a855f7',  // Purple color for storyboard video generator
    [NodeType.STORYBOARD_VIDEO_CHILD]: '#a855f7',
    [NodeType.VIDEO_EDITOR]: '#ef4444'  // Red color for video editor
  };

  return colors[type] || '#6366f1';
}

/**
 * 计算节点高度（与 Node 组件渲染逻辑保持一致）
 */
export function getApproxNodeHeight(node: AppNode): number {
  if (node.height) return node.height;

  const DEFAULT_NODE_WIDTH = 420;
  const DEFAULT_FIXED_HEIGHT = 360;
  const AUDIO_NODE_HEIGHT = 200;
  const STORYBOARD_NODE_HEIGHT = 500;
  const CHARACTER_NODE_HEIGHT = 600;

  // 与 components/nodes/index.tsx getNodeHeight() 保持一致
  if (node.type === NodeType.STORYBOARD_GENERATOR) return STORYBOARD_NODE_HEIGHT;
  if (node.type === NodeType.STORYBOARD_IMAGE) return 600;
  if (node.type === NodeType.CHARACTER_NODE) return CHARACTER_NODE_HEIGHT;
  if (node.type === NodeType.DRAMA_ANALYZER) return 600;
  if (node.type === NodeType.SORA_VIDEO_GENERATOR) return 700;
  if (node.type === NodeType.SORA_VIDEO_CHILD) return 500;
  if (node.type === NodeType.SCRIPT_PLANNER && node.data.scriptOutline) return 500;
  if ([NodeType.VIDEO_ANALYZER, NodeType.IMAGE_EDITOR, NodeType.PROMPT_INPUT, NodeType.SCRIPT_PLANNER, NodeType.SCRIPT_EPISODE].includes(node.type)) return DEFAULT_FIXED_HEIGHT;
  if (node.type === NodeType.AUDIO_GENERATOR) return AUDIO_NODE_HEIGHT;

  // 基于宽高比计算（图片/视频生成节点）
  const ratio = node.data.aspectRatio || '16:9';
  const parts = ratio.split(':').map(Number);
  if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
    return (node.width || DEFAULT_NODE_WIDTH) * parts[1] / parts[0];
  }

  return DEFAULT_FIXED_HEIGHT;
}

/**
 * 获取节点边界框
 */
export function getNodeBounds(node: AppNode) {
  const width = node.width || 420;
  const height = getApproxNodeHeight(node);

  return {
    x: node.x,
    y: node.y,
    width,
    height,
    right: node.x + width,
    bottom: node.y + height
  };
}

/**
 * 检查两个节点是否重叠
 */
export function nodesOverlap(node1: AppNode, node2: AppNode, padding = 0): boolean {
  const bounds1 = getNodeBounds(node1);
  const bounds2 = getNodeBounds(node2);

  return !(
    bounds1.right + padding < bounds2.x ||
    bounds1.x - padding > bounds2.right ||
    bounds1.bottom + padding < bounds2.y ||
    bounds1.y - padding > bounds2.bottom
  );
}

/**
 * 查找最近的可用位置 (避免重叠)
 */
export function findNearestFreePosition(
  x: number,
  y: number,
  existingNodes: AppNode[],
  width = 420,
  height = 360,
  padding = 24
): { x: number; y: number } {
  const testNode: AppNode = {
    id: 'test',
    type: NodeType.PROMPT_INPUT,
    x,
    y,
    width,
    height,
    title: '',
    status: 'IDLE' as any,
    data: {},
    inputs: []
  };

  // 检查是否与现有节点重叠
  let hasOverlap = existingNodes.some(node => nodesOverlap(testNode, node, padding));

  if (!hasOverlap) {
    return { x, y };
  }

  // 螺旋搜索可用位置
  const step = 50;
  let radius = step;
  let angle = 0;

  while (radius < 1000) {
    const testX = x + Math.cos(angle) * radius;
    const testY = y + Math.sin(angle) * radius;

    testNode.x = testX;
    testNode.y = testY;

    hasOverlap = existingNodes.some(node => nodesOverlap(testNode, node, padding));

    if (!hasOverlap) {
      return { x: testX, y: testY };
    }

    angle += Math.PI / 6; // 30度增量
    if (angle >= Math.PI * 2) {
      angle = 0;
      radius += step;
    }
  }

  // 如果找不到,返回原位置偏移
  return { x: x + 50, y: y + 50 };
}

/**
 * 对齐到网格
 */
export function snapToGrid(value: number, gridSize = 16): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * 磁性吸附检测
 */
export function magneticSnap(
  value: number,
  targets: number[],
  threshold = 8
): number {
  for (const target of targets) {
    if (Math.abs(value - target) < threshold) {
      return target;
    }
  }
  return value;
}
