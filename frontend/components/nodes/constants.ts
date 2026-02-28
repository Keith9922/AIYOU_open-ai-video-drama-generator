/**
 * AIYOU 漫剧生成平台 - 节点常量
 *
 * @developer 光波 (a@ggbo.com)
 * @copyright Copyright (c) 2025 光波. All rights reserved.
 */

import {
  Maximize2, Maximize, Square, Box, User, Users, Circle, ZoomIn,
  Minus, TrendingDown, TrendingUp, RotateCw, ArrowDown, ArrowUp,
  MoveHorizontal, ArrowUpDown, Move, RefreshCw
} from 'lucide-react';

export const IMAGE_ASPECT_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'];
export const VIDEO_ASPECT_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'];
export const IMAGE_RESOLUTIONS = ['1k', '2k', '4k'];
export const VIDEO_RESOLUTIONS = ['480p', '720p', '1080p'];

// 景别 (Shot Size) - 使用标准影视术语
export const SHOT_TYPES = [
  { value: '大远景', label: '大远景', icon: Maximize, desc: 'Extreme Long Shot - 人物如蚂蚁，环境主导' },
  { value: '远景', label: '远景', icon: Maximize, desc: 'Long Shot - 人物小但能看清动作' },
  { value: '全景', label: '全景', icon: Square, desc: 'Full Shot - 顶天立地，全身可见' },
  { value: '中景', label: '中景', icon: Box, desc: 'Medium Shot - 腰部以上，社交距离' },
  { value: '中近景', label: '中近景', icon: User, desc: 'Medium Close-up - 胸部以上，故事重心' },
  { value: '近景', label: '近景', icon: Circle, desc: 'Close Shot - 脖子以上，亲密审视' },
  { value: '特写', label: '特写', icon: ZoomIn, desc: 'Close-up - 只有脸，灵魂窗口' },
  { value: '大特写', label: '大特写', icon: ZoomIn, desc: 'Extreme Close-up - 局部细节，显微镜' },
];

// 拍摄角度 (Camera Angle) - 使用标准影视术语
export const CAMERA_ANGLES = [
  { value: '视平', label: '视平', icon: Minus, desc: 'Eye Level - 与角色眼睛同高，最中性自然' },
  { value: '高位俯拍', label: '高位俯拍', icon: TrendingDown, desc: 'High Angle - 从上往下拍，表现脆弱无助' },
  { value: '低位仰拍', label: '低位仰拍', icon: TrendingUp, desc: 'Low Angle - 从下往上拍，赋予力量' },
  { value: '斜拍', label: '斜拍', icon: RotateCw, desc: 'Dutch Angle - 摄影机倾斜，制造不安' },
  { value: '越肩', label: '越肩', icon: Users, desc: 'Over the Shoulder - 从肩膀后方拍摄' },
  { value: '鸟瞰', label: '鸟瞰', icon: ArrowDown, desc: 'Bird\'s Eye View - 垂直向下90度，上帝视角' },
];

// 运镜方式 (Camera Movement) - 使用标准影视术语
export const CAMERA_MOVEMENTS = [
  { value: '固定', label: '固定', icon: Maximize2, desc: 'Static - 摄影机纹丝不动' },
  { value: '横移', label: '横移', icon: MoveHorizontal, desc: 'Truck - 水平移动，产生视差' },
  { value: '俯仰', label: '俯仰', icon: ArrowUpDown, desc: 'Tilt - 镜头上下转动' },
  { value: '横摇', label: '横摇', icon: RotateCw, desc: 'Pan - 镜头左右转动' },
  { value: '升降', label: '升降', icon: ArrowUp, desc: 'Boom/Crane - 垂直升降' },
  { value: '轨道推拉', label: '轨道推拉', icon: ZoomIn, desc: 'Dolly - 物理靠近或远离' },
  { value: '变焦推拉', label: '变焦推拉', icon: ZoomIn, desc: 'Zoom - 改变焦距，人工感' },
  { value: '正跟随', label: '正跟随', icon: Move, desc: 'Following Shot - 位于角色身后跟随' },
  { value: '倒跟随', label: '倒跟随', icon: Move, desc: 'Leading Shot - 在角色前方后退' },
  { value: '环绕', label: '环绕', icon: RefreshCw, desc: 'Arc/Orbit - 围绕主体旋转' },
  { value: '滑轨横移', label: '滑轨横移', icon: MoveHorizontal, desc: 'Slider - 小型轨道平滑移动' },
];

export const IMAGE_COUNTS = [1, 2, 3, 4];
export const VIDEO_COUNTS = [1, 2, 3, 4];
export const GLASS_PANEL = "bg-[#2c2c2e]/95 backdrop-blur-2xl border border-white/10 shadow-2xl";
export const DEFAULT_NODE_WIDTH = 420;
export const DEFAULT_FIXED_HEIGHT = 360;
export const AUDIO_NODE_HEIGHT = 200;
export const STORYBOARD_NODE_HEIGHT = 500;
export const CHARACTER_NODE_HEIGHT = 600;

// 性能优化：提取静态样式常量，避免每次渲染时重新创建对象
export const STYLE_BLUR_ON = { filter: 'blur(10px)' } as const;
export const STYLE_BLUR_OFF = { filter: 'none' } as const;
export const STYLE_MAX_HEIGHT_180 = { maxHeight: '180px' } as const;
export const STYLE_MAX_HEIGHT_200 = { maxHeight: '200px' } as const;
export const STYLE_MIN_HEIGHT_80 = { minHeight: '80px' } as const;
export const STYLE_HEIGHT_60 = { height: '60px' } as const;
export const STYLE_HEIGHT_80 = { height: '80px' } as const;

export const SHORT_DRAMA_GENRES = [
    '霸总 (CEO)', '古装 (Historical)', '悬疑 (Suspense)', '甜宠 (Romance)',
    '复仇 (Revenge)', '穿越 (Time Travel)', '都市 (Urban)', '奇幻 (Fantasy)',
    '萌宝 (Cute Baby)', '战神 (God of War)'
];

export const SHORT_DRAMA_SETTINGS = [
    '现代都市 (Modern City)', '古代宫廷 (Ancient Palace)', '豪门别墅 (Luxury Villa)',
    '校园 (School)', '医院 (Hospital)', '办公室 (Office)', '民国 (Republic Era)',
    '仙侠世界 (Xianxia)', '赛博朋克 (Cyberpunk)'
];
