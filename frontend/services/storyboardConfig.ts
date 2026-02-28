/**
 * 分镜网格配置
 */

export interface GridConfig {
  shotsPerGrid: number;
  gridLayout: string;
  cols: number;
  rows: number;
}

export interface ResolutionConfig {
  quality: string;
  width: number;
  height: number;
}

/**
 * 网格类型配置
 */
export function getGridConfig(gridType: string): GridConfig {
  const configs: Record<string, GridConfig> = {
    '4': {
      shotsPerGrid: 4,
      gridLayout: '2x2',
      cols: 2,
      rows: 2
    },
    '9': {
      shotsPerGrid: 9,
      gridLayout: '3x3',
      cols: 3,
      rows: 3
    },
    '16': {
      shotsPerGrid: 16,
      gridLayout: '4x4',
      cols: 4,
      rows: 4
    }
  };

  return configs[gridType] || configs['9'];
}

/**
 * 分辨率配置
 */
export const STORYBOARD_RESOLUTIONS: ResolutionConfig[] = [
  { quality: '1k', width: 1024, height: 1024 },
  { quality: '2k', width: 2048, height: 2048 },
  { quality: '4k', width: 4096, height: 4096 }
];
