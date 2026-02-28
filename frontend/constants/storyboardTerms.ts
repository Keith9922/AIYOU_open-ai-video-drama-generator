/**
 * 影视分镜标准术语常量
 * 基于专业影视制作规范定义
 */

/**
 * 景别（Shot Size）标准术语
 * 导演与观众的心理距离
 */
export const SHOT_SIZES = {
  EXTREME_LONG_SHOT: {
    id: 'extreme_long_shot',
    name: '大远景',
    en: 'Extreme Long Shot',
    abbr: 'ELS',
    description: '人物如蚂蚁，环境主导。上帝视角，展现天地辽阔或孤独渺小',
    useCase: '开场定场、表现孤独'
  },
  LONG_SHOT: {
    id: 'long_shot',
    name: '远景',
    en: 'Long Shot',
    abbr: 'LS',
    description: '人物小但能看清动作。舞台距离，表现人与环境关系',
    useCase: '动作场面、环境展示'
  },
  FULL_SHOT: {
    id: 'full_shot',
    name: '全景',
    en: 'Full Shot',
    abbr: 'FS',
    description: '顶天立地，全身可见。肢体语言，展示姿态和衣着',
    useCase: '角色介绍、舞蹈、西部片对决'
  },
  MEDIUM_SHOT: {
    id: 'medium_shot',
    name: '中景',
    en: 'Medium Shot',
    abbr: 'MS',
    description: '腰部以上。社交距离，最中性的叙事视角',
    useCase: '标准对话、动作与表情兼顾'
  },
  MEDIUM_CLOSE_UP: {
    id: 'medium_close_up',
    name: '中近景',
    en: 'Medium Close-up',
    abbr: 'MCU',
    description: '胸部以上。故事重心，现代影视最常用',
    useCase: '情感交流、反应镜头'
  },
  CLOSE_SHOT: {
    id: 'close_shot',
    name: '近景',
    en: 'Close Shot',
    abbr: 'CS',
    description: '脖子以上。亲密审视，侵入私人空间',
    useCase: '强调情绪、重要台词'
  },
  CLOSE_UP: {
    id: 'close_up',
    name: '特写',
    en: 'Close-up',
    abbr: 'CU',
    description: '只有脸。灵魂窗口，内心戏，强烈冲击力',
    useCase: '内心戏、希区柯克时刻'
  },
  EXTREME_CLOSE_UP: {
    id: 'extreme_close_up',
    name: '大特写',
    en: 'Extreme Close-up',
    abbr: 'ECU',
    description: '局部细节。显微镜下的焦虑，象征意义',
    useCase: '制造紧张感、感官描写、暗示线索'
  }
};

/**
 * 拍摄角度（Camera Angle）标准术语
 */
export const CAMERA_ANGLES = {
  EYE_LEVEL: {
    id: 'eye_level',
    name: '视平',
    en: 'Eye Level',
    description: '与角色眼睛同高。最中性、最自然的视角',
    useCase: '建立共情、写实风格、平等对话'
  },
  HIGH_ANGLE: {
    id: 'high_angle',
    name: '高位俯拍',
    en: 'High Angle',
    description: '从上往下拍。表现脆弱与无助，剥夺力量',
    useCase: '表现无助、被压迫、强调孤独'
  },
  LOW_ANGLE: {
    id: 'low_angle',
    name: '低位仰拍',
    en: 'Low Angle',
    description: '从下往上拍。赋予角色力量和威胁性',
    useCase: '塑造英雄、制造恐惧、表现混乱中的迷茫'
  },
  DUTCH_ANGLE: {
    id: 'dutch_angle',
    name: '斜拍',
    en: 'Dutch Angle / Canted Angle',
    description: '摄影机倾斜，地平线不平。制造心理不安',
    useCase: '精神错乱、悬疑氛围、世界崩塌'
  },
  OVER_THE_SHOULDER: {
    id: 'over_the_shoulder',
    name: '越肩',
    en: "Over the Shoulder (OTS)",
    description: '从肩膀后方拍摄。强调关系和空间位置',
    useCase: '对话场面、建立对抗或亲密'
  },
  BIRDS_EYE_VIEW: {
    id: 'birds_eye_view',
    name: '鸟瞰',
    en: "Bird's Eye View / God's Eye View",
    description: '垂直向下90度。上帝视角，宿命感',
    useCase: '交代地理环境、表现宿命论、视觉奇观'
  }
};

/**
 * 运镜方式（Camera Movement）标准术语
 */
export const CAMERA_MOVEMENTS = {
  STATIC: {
    id: 'static',
    name: '固定',
    en: 'Static / Locked-off',
    description: '摄影机纹丝不动。强迫观众关注表演',
    useCase: '喜剧效果、积蓄张力、强调表演'
  },
  TRUCK: {
    id: 'truck',
    name: '横移',
    en: 'Truck / Crab',
    description: '水平移动。产生视差，立体感和空间感',
    useCase: '跟随行动、展示环境'
  },
  TILT: {
    id: 'tilt',
    name: '俯仰',
    en: 'Tilt',
    description: '镜头上下转动。引导视线扫描',
    useCase: '揭示高度、展现力量关系、信息揭露'
  },
  PAN: {
    id: 'pan',
    name: '横摇',
    en: 'Pan',
    description: '镜头左右转动。跟随视线、建立空间',
    useCase: '跟随视线、建立空间关系、甩镜头转场'
  },
  BOOM: {
    id: 'boom',
    name: '升降',
    en: 'Boom / Crane / Pedestal',
    description: '垂直升降。瞬间改变视角',
    useCase: '史诗感开场/结尾、展现规模'
  },
  DOLLY: {
    id: 'dolly',
    name: '轨道推拉',
    en: 'Dolly In / Dolly Out',
    description: '物理靠近或远离。产生透视变化',
    useCase: '情绪高潮、表现孤独、强调重要性'
  },
  ZOOM: {
    id: 'zoom',
    name: '变焦推拉',
    en: 'Zoom In / Zoom Out',
    description: '改变焦距。压缩空间，人工感',
    useCase: '复古风、急推、希区柯克变焦'
  },
  FOLLOWING: {
    id: 'following',
    name: '正跟随',
    en: 'Following Shot',
    description: '位于角色身后跟随。代入感，强调背影',
    useCase: '代入感、强调背影、走进未知环境'
  },
  LEADING: {
    id: 'leading',
    name: '倒跟随',
    en: 'Leading Shot / Backward Tracking',
    description: '在角色前方后退。重点是脸和表情',
    useCase: '边走边谈、恐惧与逃亡'
  },
  ORBIT: {
    id: 'orbit',
    name: '环绕',
    en: 'Arc / Orbit',
    description: '围绕主体旋转。背景旋转变化',
    useCase: '英雄时刻、浪漫时刻、混乱与困惑'
  },
  SLIDER: {
    id: 'slider',
    name: '滑轨横移',
    en: 'Slider',
    description: '小型轨道平滑移动。低成本电影感',
    useCase: '静物特写、狭小空间、增加视差'
  }
};

/**
 * 获取景别选项列表
 */
export function getShotSizeOptions(): Array<{id: string; name: string; en: string}> {
  return Object.values(SHOT_SIZES).map(size => ({
    id: size.id,
    name: size.name,
    en: size.en
  }));
}

/**
 * 获取拍摄角度选项列表
 */
export function getCameraAngleOptions(): Array<{id: string; name: string; en: string}> {
  return Object.values(CAMERA_ANGLES).map(angle => ({
    id: angle.id,
    name: angle.name,
    en: angle.en
  }));
}

/**
 * 获取运镜方式选项列表
 */
export function getCameraMovementOptions(): Array<{id: string; name: string; en: string}> {
  return Object.values(CAMERA_MOVEMENTS).map(movement => ({
    id: movement.id,
    name: movement.name,
    en: movement.en
  }));
}

/**
 * 根据名称获取景别信息
 */
export function getShotSizeByName(name: string) {
  return Object.values(SHOT_SIZES).find(size => size.name === name);
}

/**
 * 根据名称获取拍摄角度信息
 */
export function getCameraAngleByName(name: string) {
  return Object.values(CAMERA_ANGLES).find(angle => angle.name === name);
}

/**
 * 根据名称获取运镜方式信息
 */
export function getCameraMovementByName(name: string) {
  return Object.values(CAMERA_MOVEMENTS).find(movement => movement.name === name);
}
