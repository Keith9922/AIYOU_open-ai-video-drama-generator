/**
 * 提示词管理服务
 * 支持角色生成、视频生成
 * 支持中英文切换、同步编辑，以及多种视觉风格（3D、REAL、ANIME）
 */

export interface PromptPair {
  zh: string;
  en: string;
}

export interface CharacterPrompts {
  expressionPrompt: PromptPair;
  threeViewPrompt: PromptPair;
}

export interface VideoPrompts {
  storyboardPrompt: PromptPair;
  cinematicPrompt: PromptPair;
  soraPrompt: PromptPair;
}

// ============================================
// 3D 动漫风格提示词模板
// ============================================

const DEFAULT_3D_EXPRESSION_PROMPT: PromptPair = {
  zh: `3D动漫风格，风格化3D渲染，PBR材质渲染，高精度3D建模，3D动漫美学。

构图：特写肖像，仅头部和肩部，专注于面部表情。

角色面部表情参考表，3×3网格布局，展示9种不同的面部表情（喜悦、愤怒、悲伤、惊讶、恐惧、厌恶、中性、思考、疲惫）。

角色面部描述：{APPEARANCE}

关键约束：
- 仅特写肖像镜头（头部和肩部）
- 无全身、无下半身、无腿部
- 专注于面部特征、表情和头部
- 纯色平背景 - 仅纯色背景（白色、浅灰色或黑色），无图案、无渐变、无环境元素
- 所有9个表情中保持一致的角色设计
- 3×3网格构图`,

  en: `Xianxia 3D animation character, semi-realistic style, Xianxia animation aesthetics, high precision 3D modeling, PBR shading with soft translucency, subsurface scattering, ambient occlusion, delicate and smooth skin texture (not overly realistic), flowing fabric clothing, individual hair strands, neutral studio lighting, clear focused gaze, natural demeanor.

PORTRAIT COMPOSITION: Extreme close-up, head and shoulders only, facial expressions focus.

Character facial expressions reference sheet, 3x3 grid layout showing 9 different facial expressions (joy, anger, sorrow, surprise, fear, disgust, neutral, thinking, tired).

Character Face Description: {APPEARANCE}

CRITICAL CONSTRAINTS:
- Close-up portrait shots ONLY (head and shoulders)
- NO full body, NO lower body, NO legs
- Focus on facial features, expressions, and head
- SOLID FLAT BACKGROUND - Plain solid color background ONLY (white, light gray, or black). NO patterns, NO gradients, NO environmental elements
- Consistent character design across all 9 expressions
- 3x3 grid composition`
};

const DEFAULT_3D_THREE_VIEW_PROMPT: PromptPair = {
  zh: `3D动漫风格，风格化3D渲染，PBR材质渲染，高精度3D建模，3D动漫美学。

角色三视图生成任务：生成角色三视图参考表（正视图、侧视图、后视图）。

角色描述：{APPEARANCE}
属性：{STATS}

构图：
- 创建垂直布局，包含3个视图：正视图、侧视图（侧面）、后视图
- 全身站立姿势，中性表情
- 纯色平背景 - 仅纯色背景（白色、浅灰色或黑色），无图案、无渐变、无环境元素
- 每个视图应清晰显示指定角度的角色

关键要求：
1. 一致的角色设计 - 三个视图必须显示相同的角色，面部特征、发型、身体比例和服装保持一致
2. 无文本、无标签 - 纯图像，无"正视图"或"侧视图"文字标签
3. 正确的解剖结构 - 确保每个视角的正确身体比例和自然姿势
4. 中性表情 - 在所有视图中使用平静、中性的面部表情
5. 清晰对齐 - 正视图、侧视图和后视图应垂直对齐且比例一致

参考图片：使用表情图作为面部和服装细节的视觉参考。`,

  en: `Xianxia 3D animation character, semi-realistic style, Xianxia animation aesthetics, high precision 3D modeling, PBR shading with soft translucency, subsurface scattering, ambient occlusion, delicate and smooth skin texture (not overly realistic), flowing fabric clothing, individual hair strands, neutral studio lighting, clear focused gaze, natural demeanor.

CHARACTER THREE-VIEW GENERATION TASK:
Generate a character three-view reference sheet (front, side, back views).

Character Description: {APPEARANCE}
Attributes: {STATS}

COMPOSITION:
- Create vertical layout with 3 views: Front View, Side View (profile), Back View
- Full body standing pose, neutral expression
- SOLID FLAT BACKGROUND - Plain solid color background ONLY (white, light gray, or black). NO patterns, NO gradients, NO environmental elements
- Each view should clearly show the character from the specified angle

CRITICAL REQUIREMENTS:
1. CONSISTENT CHARACTER DESIGN - All three views must show the SAME character with consistent facial features, hair style, body proportions, and clothing
2. NO TEXT, NO LABELS - Pure image only, no "Front View" or "Side View" text labels
3. PROPER ANATOMY - Ensure correct body proportions and natural stance for each view angle
4. NEUTRAL EXPRESSION - Use a calm, neutral face expression across all views
5. CLEAR ALIGNMENT - Front, side, and back views should be vertically aligned and proportionally consistent

REFERENCE IMAGE: Use the expression sheet as visual reference for face and clothing details.`
};

// ============================================
// REAL 真人风格提示词模板
// ============================================

const DEFAULT_REAL_EXPRESSION_PROMPT: PromptPair = {
  zh: `专业人像摄影风格，真实写实，电影级摄影质感。

构图：专业人像构图，仅头部和肩部，专注于面部表情。

角色面部表情参考表，3×3网格布局，展示9种不同的面部表情（喜悦、愤怒、悲伤、惊讶、恐惧、厌恶、中性、思考、疲惫）。

角色面部描述：{APPEARANCE}

关键约束：
- 仅特写肖像镜头（头部和肩部）
- 无全身、无下半身、无腿部
- 专注于面部特征、表情和头部
- 纯色平背景 - 仅纯色背景（白色或黑色），无图案、无渐变、无环境元素
- 所有9个表情中保持一致的角色设计
- 3×3网格构图`,

  en: `Professional portrait photography, photorealistic human, cinematic photography, professional headshot, DSLR quality, 85mm lens, sharp focus, realistic skin texture, visible pores, natural skin imperfections, subsurface scattering.

PORTRAIT COMPOSITION: Professional headshot composition, head and shoulders only, facial expressions focus.

Character facial expressions reference sheet, 3x3 grid layout showing 9 different facial expressions (joy, anger, sadness, surprise, fear, disgust, neutral, thinking, tired).

Character Face Description: {APPEARANCE}

CRITICAL CONSTRAINTS:
- Close-up portrait shots ONLY (head and shoulders)
- NO full body, NO lower body, NO legs
- Focus on facial features, expressions, and head
- SOLID FLAT BACKGROUND - Plain solid color background ONLY (white or black). NO patterns, NO gradients, NO environmental elements
- Consistent character design across all 9 expressions
- 3x3 grid composition`
};

const DEFAULT_REAL_THREE_VIEW_PROMPT: PromptPair = {
  zh: `专业人像摄影风格，真实写实，电影级摄影质感。

角色三视图生成任务：生成角色三视图参考表（正视图、侧视图、后视图）。

角色描述：{APPEARANCE}
属性：{STATS}

构图：
- 创建垂直布局，包含3个视图：正视图、侧视图（侧面）、后视图
- 全身站立姿势，中性表情
- 纯色平背景 - 仅纯色背景（白色或黑色），无图案、无渐变、无环境元素
- 每个视图应清晰显示指定角度的角色

关键要求：
1. 一致的角色设计 - 三个视图必须显示相同的角色，面部特征、发型、身体比例和服装保持一致
2. 无文本、无标签 - 纯图像，无"正视图"或"侧视图"文字标签
3. 正确的解剖结构 - 确保每个视角的正确身体比例和自然姿势
4. 中性表情 - 在所有视图中使用平静、中性的面部表情
5. 清晰对齐 - 正视图、侧视图和后视图应垂直对齐且比例一致

参考图片：使用表情图作为面部和服装细节的视觉参考。`,

  en: `Professional portrait photography, photorealistic human, cinematic photography, fashion photography style, studio lighting, realistic skin texture, natural fabric folds, detailed clothing materials.

CHARACTER THREE-VIEW GENERATION TASK:
Generate a character three-view reference sheet (front, side, back views).

Character Description: {APPEARANCE}
Attributes: {STATS}

COMPOSITION:
- Create vertical layout with 3 views: Front View, Side View (profile), Back View
- Full body standing pose, neutral expression
- SOLID FLAT BACKGROUND - Plain solid color background ONLY (white or black). NO patterns, NO gradients, NO environmental elements
- Each view should clearly show the character from the specified angle

CRITICAL REQUIREMENTS:
1. CONSISTENT CHARACTER DESIGN - All three views must show the SAME character with consistent facial features, hair style, body proportions, and clothing
2. NO TEXT, NO LABELS - Pure image only, no "Front View" or "Side View" text labels
3. PROPER ANATOMY - Ensure correct body proportions and natural stance for each view angle
4. NEUTRAL EXPRESSION - Use a calm, neutral face expression across all views
5. CLEAR ALIGNMENT - Front, side, and back views should be vertically aligned and proportionally consistent

REFERENCE IMAGE: Use the expression sheet as visual reference for face and clothing details.`
};

// ============================================
// ANIME 2D动漫风格提示词模板
// ============================================

const DEFAULT_ANIME_EXPRESSION_PROMPT: PromptPair = {
  zh: `2D动漫风格，日式动漫插画，漫画艺术风格。

构图：动漫肖像构图，仅头部和肩部，专注于面部表情。

角色面部表情参考表，3×3网格布局，展示9种不同的面部表情（喜悦、愤怒、悲伤、惊讶、恐惧、厌恶、中性、思考、疲惫）。

角色面部描述：{APPEARANCE}

关键约束：
- 仅特写肖像镜头（头部和肩部）
- 无全身、无下半身、无腿部
- 专注于面部特征、表情和头部
- 纯色平背景 - 仅纯色背景（白色、浅灰色或黑色），无图案、无渐变、无环境元素
- 所有9个表情中保持一致的角色设计
- 3×3网格构图`,

  en: `Anime character, anime style, 2D anime art, manga illustration style, clean linework, crisp outlines, manga art style, detailed illustration.

PORTRAIT COMPOSITION: Anime portrait composition, head and shoulders only, facial expressions focus.

Character facial expressions reference sheet, 3x3 grid layout showing 9 different facial expressions (joy, anger, sadness, surprise, fear, disgust, neutral, thinking, tired).

Character Face Description: {APPEARANCE}

CRITICAL CONSTRAINTS:
- Close-up portrait shots ONLY (head and shoulders)
- NO full body, NO lower body, NO legs
- Focus on facial features, expressions, and head
- SOLID FLAT BACKGROUND - Plain solid color background ONLY (white, light gray, or black). NO patterns, NO gradients, NO environmental elements
- Consistent character design across all 9 expressions
- 3x3 grid composition`
};

const DEFAULT_ANIME_THREE_VIEW_PROMPT: PromptPair = {
  zh: `2D动漫风格，日式动漫插画，漫画艺术风格。

角色三视图生成任务：生成角色三视图参考表（正视图、侧视图、后视图）。

角色描述：{APPEARANCE}
属性：{STATS}

构图：
- 创建垂直布局，包含3个视图：正视图、侧视图（侧面）、后视图
- 全身站立姿势，中性表情
- 纯色平背景 - 仅纯色背景（白色、浅灰色或黑色），无图案、无渐变、无环境元素
- 每个视图应清晰显示指定角度的角色

关键要求：
1. 一致的角色设计 - 三个视图必须显示相同的角色，面部特征、发型、身体比例和服装保持一致
2. 无文本、无标签 - 纯图像，无"正视图"或"侧视图"文字标签
3. 正确的解剖结构 - 确保每个视角的正确身体比例和自然姿势
4. 中性表情 - 在所有视图中使用平静、中性的面部表情
5. 清晰对齐 - 正视图、侧视图和后视图应垂直对齐且比例一致

参考图片：使用表情图作为面部和服装细节的视觉参考。`,

  en: `Anime character, 2D anime art, manga illustration, character reference sheet, clean linework, crisp outlines, anime style.

CHARACTER THREE-VIEW GENERATION TASK:
Generate a character three-view reference sheet (front, side, back views).

Character Description: {APPEARANCE}
Attributes: {STATS}

COMPOSITION:
- Create vertical layout with 3 views: Front View, Side View (profile), Back View
- Full body standing pose, neutral expression
- SOLID FLAT BACKGROUND - Plain solid color background ONLY (white, light gray, or black). NO patterns, NO gradients, NO environmental elements
- Each view should clearly show the character from the specified angle

CRITICAL REQUIREMENTS:
1. CONSISTENT CHARACTER DESIGN - All three views must show the SAME character with consistent facial features, hair style, body proportions, and clothing
2. NO TEXT, NO LABELS - Pure image only, no "Front View" or "Side View" text labels
3. PROPER ANATOMY - Ensure correct body proportions and natural stance for each view angle
4. NEUTRAL EXPRESSION - Use a calm, neutral face expression across all views
5. CLEAR ALIGNMENT - Front, side, and back views should be vertically aligned and proportionally consistent

REFERENCE IMAGE: Use the expression sheet as visual reference for face and clothing details.`
};

// ============================================
// 视频生成提示词模板
// ============================================

// 分镜图视频提示词
const DEFAULT_STORYBOARD_VIDEO_PROMPT: PromptPair = {
  zh: `{SCENE_DESCRIPTION}

运镜要求：
{CAMERA_MOVEMENT}

视觉风格：
{VISUAL_STYLE}

角色：
{CHARACTERS}

关键约束：
- 视频时长：{DURATION}
- 保持场景连续性和一致性
- 流畅的运镜和自然的动作
- 高质量视频输出，避免帧率不稳定
- 遵循分镜图描述的构图和氛围`,

  en: `{SCENE_DESCRIPTION}

Camera Movement:
{CAMERA_MOVEMENT}

Visual Style:
{VISUAL_STYLE}

Characters:
{CHARACTERS}

Key Constraints:
- Video Duration: {DURATION}
- Maintain scene continuity and consistency
- Smooth camera movement and natural motion
- High quality video output, avoid frame rate instability
- Follow the composition and atmosphere described in the storyboard`
};

// 电影感视频提示词
const DEFAULT_CINEMATIC_VIDEO_PROMPT: PromptPair = {
  zh: `电影感视频生成，专业级电影摄影质感。

场景描述：{SCENE}

摄影参数：
- 光线：{LIGHTING}
- 色调：{COLOR_GRADE}
- 运镜：{CAMERA_WORK}
- 景别：{SHOT_SIZE}

技术要求：
- 4K分辨率，电影级画质
- 专业色彩分级，电影质感调色
- 平滑的摄像机运动
- 自然的演员表演和动作
- 环境光和阴影的真实处理
- 高动态范围（HDR）质量

输出要求：
- 视频时长：{DURATION}
- 帧率：24fps 或 30fps
- 无抖动、无闪烁
- 流畅的镜头过渡`,

  en: `Cinematic video generation, professional movie-quality cinematography.

Scene Description: {SCENE}

Cinematography Parameters:
- Lighting: {LIGHTING}
- Color Grade: {COLOR_GRADE}
- Camera Work: {CAMERA_WORK}
- Shot Size: {SHOT_SIZE}

Technical Requirements:
- 4K resolution, movie-grade quality
- Professional color grading, cinematic color timing
- Smooth camera movement
- Natural acting and motion
- Realistic handling of ambient light and shadows
- High Dynamic Range (HDR) quality

Output Requirements:
- Video Duration: {DURATION}
- Frame Rate: 24fps or 30fps
- No shaking, no flickering
- Smooth shot transitions`
};

// Sora 专用视频提示词
const DEFAULT_SORA_VIDEO_PROMPT: PromptPair = {
  zh: `AI视频生成提示词，适用于Sora等高质量视频生成模型。

场景描述：{SCENE}

详细视觉要求：
{VISUAL_DETAILS}

镜头语言：
- 运镜方式：{CAMERA_MOVEMENT}
- 景别：{SHOT_SIZE}
- 拍摄角度：{ANGLE}
- 镜头语言：{LANGUAGE_OF_LENS}

环境与氛围：
- 场景设定：{ENVIRONMENT}
- 灯光：{LIGHTING}
- 色调：{MOOD}
- 氛围感：{ATMOSPHERE}

人物与动作：
{CHARACTERS_AND_ACTIONS}

技术规范：
- 视频比例：{ASPECT_RATIO}
- 视频时长：{DURATION}
- 画质质量：{QUALITY}

创作风格：
{STYLE_GUIDANCE}

质量要求：
- 高度连贯的时序一致性
- 物理准确的运动和互动
- 稳定的画面质量，无闪烁或突变
- 自然的过渡和流畅的动作
- 符合现实世界的物理规律`,

  en: `AI video generation prompt, optimized for high-quality video generation models like Sora.

Scene Description: {SCENE}

Detailed Visual Requirements:
{VISUAL_DETAILS}

Cinematography:
- Camera Movement: {CAMERA_MOVEMENT}
- Shot Size: {SHOT_SIZE}
- Camera Angle: {ANGLE}
- Lens Language: {LANGUAGE_OF_LENS}

Environment and Atmosphere:
- Scene Setting: {ENVIRONMENT}
- Lighting: {LIGHTING}
- Color Tone: {MOOD}
- Atmosphere: {ATMOSPHERE}

Characters and Actions:
{CHARACTERS_AND_ACTIONS}

Technical Specifications:
- Aspect Ratio: {ASPECT_RATIO}
- Duration: {DURATION}
- Quality: {QUALITY}

Creative Style:
{STYLE_GUIDANCE}

Quality Requirements:
- High degree of temporal consistency
- Physically accurate motion and interactions
- Stable image quality, no flickering or sudden changes
- Natural transitions and smooth motion
- Consistent with real-world physics`
};

// ============================================
// PromptManager 类
// ============================================

class PromptManager {
  /**
   * 根据风格类型获取九宫格表情提示词模板
   */
  private getExpressionPromptTemplate(styleType: '3D' | 'REAL' | 'ANIME'): PromptPair {
    switch (styleType) {
      case '3D':
        return DEFAULT_3D_EXPRESSION_PROMPT;
      case 'REAL':
        return DEFAULT_REAL_EXPRESSION_PROMPT;
      case 'ANIME':
        return DEFAULT_ANIME_EXPRESSION_PROMPT;
      default:
        return DEFAULT_3D_EXPRESSION_PROMPT;
    }
  }

  /**
   * 根据风格类型获取三视图提示词模板
   */
  private getThreeViewPromptTemplate(styleType: '3D' | 'REAL' | 'ANIME'): PromptPair {
    switch (styleType) {
      case '3D':
        return DEFAULT_3D_THREE_VIEW_PROMPT;
      case 'REAL':
        return DEFAULT_REAL_THREE_VIEW_PROMPT;
      case 'ANIME':
        return DEFAULT_ANIME_THREE_VIEW_PROMPT;
      default:
        return DEFAULT_3D_THREE_VIEW_PROMPT;
    }
  }

  /**
   * 生成九宫格表情提示词
   * @param stylePrompt 用户自定义的风格提示词（可选）
   * @param profile 角色档案
   * @param customPrompt 用户自定义的完整提示词（可选，会覆盖默认模板）
   * @param styleType 视觉风格类型：3D、REAL、ANIME
   */
  buildExpressionPrompt(
    stylePrompt: string,
    profile: any,
    customPrompt?: PromptPair,
    styleType: '3D' | 'REAL' | 'ANIME' = '3D'
  ): { zh: string; en: string } {
    const basePrompt = customPrompt || this.getExpressionPromptTemplate(styleType);
    const appearance = profile?.appearance || profile?.basicStats || 'Detailed character appearance';

    // 根据风格类型生成对应的负面提示词
    let negativePrompt = '';
    if (styleType === '3D') {
      negativePrompt = "nsfw, text, watermark, label, signature, bad anatomy, deformed, low quality, writing, letters, logo, interface, ui, username, website, chinese characters, chinese text, english text, korean text, japanese text, any text, any characters, any letters, numbers, symbols, subtitles, captions, title, full body, standing, legs, feet, full-length portrait, wide shot, environmental background, patterned background, gradient background, 2D illustration, hand-drawn, anime 2D, flat shading, cel shading, toon shading, cartoon 2D, paper cutout, translucent, ghostly, ethereal, glowing aura, overly photorealistic, hyper-realistic skin, photorealistic rendering";
    } else if (styleType === 'REAL') {
      negativePrompt = "nsfw, text, watermark, label, signature, bad anatomy, deformed, low quality, writing, letters, logo, interface, ui, username, website, chinese characters, chinese text, english text, korean text, japanese text, any text, any characters, any letters, numbers, symbols, subtitles, captions, title, full body, standing, legs, feet, full-length portrait, wide shot, environmental background, patterned background, gradient background, anime, cartoon, illustration, 3d render, cgi, 3d animation, painting, drawing";
    } else if (styleType === 'ANIME') {
      negativePrompt = "nsfw, text, watermark, label, signature, bad anatomy, deformed, low quality, writing, letters, logo, interface, ui, username, website, chinese characters, chinese text, english text, korean text, japanese text, any text, any characters, any letters, numbers, symbols, subtitles, captions, title, full body, standing, legs, feet, full-length portrait, wide shot, environmental background, patterned background, gradient background, photorealistic, realistic, photo, 3d, cgi, live action, hyper-realistic, skin texture, pores";
    }

    return {
      zh: `${stylePrompt}\n\n${basePrompt.zh.replace('{APPEARANCE}', appearance)}\n\n负面提示词：${negativePrompt}`,
      en: `${stylePrompt}\n\n${basePrompt.en.replace('{APPEARANCE}', appearance)}\n\nNegative Prompt: ${negativePrompt}`
    };
  }

  /**
   * 生成三视图提示词
   * @param stylePrompt 用户自定义的风格提示词（可选）
   * @param profile 角色档案
   * @param customPrompt 用户自定义的完整提示词（可选，会覆盖默认模板）
   * @param styleType 视觉风格类型：3D、REAL、ANIME
   */
  buildThreeViewPrompt(
    stylePrompt: string,
    profile: any,
    customPrompt?: PromptPair,
    styleType: '3D' | 'REAL' | 'ANIME' = '3D'
  ): { zh: string; en: string } {
    const basePrompt = customPrompt || this.getThreeViewPromptTemplate(styleType);
    // 优先使用 appearancePrompt（专门为生图准备的提示词），避免使用 basicStats 中可能包含状态性描述
    const appearance = profile?.appearancePrompt || profile?.appearance || 'Detailed character appearance';
    const stats = profile?.profession || 'Character attributes';

    // 根据风格类型生成对应的负面提示词
    let negativePrompt = '';
    if (styleType === '3D') {
      negativePrompt = "nsfw, text, watermark, label, signature, bad anatomy, deformed, low quality, writing, letters, logo, interface, ui, username, website, chinese characters, english text, patterned background, gradient background, scenery, environmental background, shadows on background, 2D illustration, hand-drawn, anime 2D, flat shading, cel shading, toon shading, cartoon 2D, paper cutout, translucent, ghostly, ethereal, glowing aura, overly photorealistic, hyper-realistic skin, photorealistic rendering";
    } else if (styleType === 'REAL') {
      negativePrompt = "nsfw, text, watermark, label, signature, bad anatomy, deformed, low quality, writing, letters, logo, interface, ui, username, website, chinese characters, english text, patterned background, gradient background, scenery, environmental background, shadows on background, anime, cartoon, illustration, 3d render, cgi, 3d animation, painting, drawing";
    } else if (styleType === 'ANIME') {
      negativePrompt = "nsfw, text, watermark, label, signature, bad anatomy, deformed, low quality, writing, letters, logo, interface, ui, username, website, chinese characters, english text, patterned background, gradient background, scenery, environmental background, shadows on background, photorealistic, realistic, photo, 3d, cgi, live action, hyper-realistic, skin texture, pores";
    }

    return {
      zh: `${stylePrompt}\n\n${basePrompt.zh.replace('{APPEARANCE}', appearance).replace('{STATS}', stats)}\n\n负面提示词：${negativePrompt}`,
      en: `${stylePrompt}\n\n${basePrompt.en.replace('{APPEARANCE}', appearance).replace('{STATS}', stats)}\n\nNegative Prompt: ${negativePrompt}`
    };
  }

  /**
   * 同步中英文提示词（当一边编辑时，保持另一边结构一致）
   */
  syncPrompt(
    sourceLang: 'zh' | 'en',
    sourceText: string,
    targetText: string
  ): string {
    // 简单实现：检测新增或删除的行数，在目标文本中做相应调整
    const sourceLines = sourceText.split('\n');
    const targetLines = targetText.split('\n');
    const sourceLineCount = sourceLines.length;
    const targetLineCount = targetLines.length;

    // 如果行数相同，不做调整
    if (sourceLineCount === targetLineCount) {
      return targetText;
    }

    // 如果源文本行数多于目标文本，在目标文本末尾添加空行
    if (sourceLineCount > targetLineCount) {
      const diff = sourceLineCount - targetLineCount;
      return targetText + '\n'.repeat(diff);
    }

    // 如果源文本行数少于目标文本，从目标文本末尾删除行
    if (sourceLineCount < targetLineCount) {
      const diff = targetLineCount - sourceLineCount;
      return targetLines.slice(0, targetLineCount - diff).join('\n');
    }

    return targetText;
  }

  /**
   * 获取默认提示词（保持向后兼容，默认返回3D风格）
   */
  getDefaultPrompts(): CharacterPrompts {
    return {
      expressionPrompt: { ...DEFAULT_3D_EXPRESSION_PROMPT },
      threeViewPrompt: { ...DEFAULT_3D_THREE_VIEW_PROMPT }
    };
  }

  /**
   * 根据风格类型获取默认提示词
   */
  getDefaultPromptsByStyle(styleType: '3D' | 'REAL' | 'ANIME'): CharacterPrompts {
    return {
      expressionPrompt: { ...this.getExpressionPromptTemplate(styleType) },
      threeViewPrompt: { ...this.getThreeViewPromptTemplate(styleType) }
    };
  }

  // ============================================
  // 视频生成提示词方法
  // ============================================

  /**
   * 构建分镜图视频提示词
   * @param params 视频参数
   */
  buildStoryboardVideoPrompt(params: {
    sceneDescription: string;
    cameraMovement?: string;
    visualStyle?: string;
    characters?: string;
    duration?: string;
  }): { zh: string; en: string } {
    const {
      sceneDescription,
      cameraMovement = '平滑运镜，自然过渡',
      visualStyle = '高质量3D动漫风格',
      characters = '主要角色表演',
      duration = '5秒'
    } = params;

    return {
      zh: DEFAULT_STORYBOARD_VIDEO_PROMPT.zh
        .replace('{SCENE_DESCRIPTION}', sceneDescription)
        .replace('{CAMERA_MOVEMENT}', cameraMovement)
        .replace('{VISUAL_STYLE}', visualStyle)
        .replace('{CHARACTERS}', characters)
        .replace('{DURATION}', duration),
      en: DEFAULT_STORYBOARD_VIDEO_PROMPT.en
        .replace('{SCENE_DESCRIPTION}', sceneDescription)
        .replace('{CAMERA_MOVEMENT}', cameraMovement)
        .replace('{VISUAL_STYLE}', visualStyle)
        .replace('{CHARACTERS}', characters)
        .replace('{DURATION}', duration)
    };
  }

  /**
   * 构建电影感视频提示词
   * @param params 视频参数
   */
  buildCinematicVideoPrompt(params: {
    scene: string;
    lighting?: string;
    colorGrade?: string;
    cameraWork?: string;
    shotSize?: string;
    duration?: string;
  }): { zh: string; en: string } {
    const {
      scene,
      lighting = '专业电影灯光，自然光与环境光结合',
      colorGrade = '电影级色彩分级，暖色调',
      cameraWork = '平滑的电影摄像机运动',
      shotSize = '中景',
      duration = '5秒'
    } = params;

    return {
      zh: DEFAULT_CINEMATIC_VIDEO_PROMPT.zh
        .replace('{SCENE}', scene)
        .replace('{LIGHTING}', lighting)
        .replace('{COLOR_GRADE}', colorGrade)
        .replace('{CAMERA_WORK}', cameraWork)
        .replace('{SHOT_SIZE}', shotSize)
        .replace('{DURATION}', duration),
      en: DEFAULT_CINEMATIC_VIDEO_PROMPT.en
        .replace('{SCENE}', scene)
        .replace('{LIGHTING}', lighting)
        .replace('{COLOR_GRADE}', colorGrade)
        .replace('{CAMERA_WORK}', cameraWork)
        .replace('{SHOT_SIZE}', shotSize)
        .replace('{DURATION}', duration)
    };
  }

  /**
   * 构建 Sora 视频提示词
   * @param params Sora 视频参数
   */
  buildSoraVideoPrompt(params: {
    scene: string;
    visualDetails?: string;
    cameraMovement?: string;
    shotSize?: string;
    angle?: string;
    languageOfLens?: string;
    environment?: string;
    lighting?: string;
    mood?: string;
    atmosphere?: string;
    charactersAndActions?: string;
    aspectRatio?: '16:9' | '9:16';
    duration?: string;
    quality?: 'hd' | 'sd';
    styleGuidance?: string;
  }): { zh: string; en: string } {
    const {
      scene,
      visualDetails = '高精度细节，电影级画质',
      cameraMovement = '平滑运镜',
      shotSize = '中景',
      angle = '平视',
      languageOfLens = '标准镜头',
      environment = '室内场景',
      lighting = '自然光',
      mood = '暖色调',
      atmosphere = '舒适氛围',
      charactersAndActions = '角色自然表演',
      aspectRatio = '16:9',
      duration = '5秒',
      quality = 'hd',
      styleGuidance = '写实风格'
    } = params;

    return {
      zh: DEFAULT_SORA_VIDEO_PROMPT.zh
        .replace('{SCENE}', scene)
        .replace('{VISUAL_DETAILS}', visualDetails)
        .replace('{CAMERA_MOVEMENT}', cameraMovement)
        .replace('{SHOT_SIZE}', shotSize)
        .replace('{ANGLE}', angle)
        .replace('{LANGUAGE_OF_LENS}', languageOfLens)
        .replace('{ENVIRONMENT}', environment)
        .replace('{LIGHTING}', lighting)
        .replace('{MOOD}', mood)
        .replace('{ATMOSPHERE}', atmosphere)
        .replace('{CHARACTERS_AND_ACTIONS}', charactersAndActions)
        .replace('{ASPECT_RATIO}', aspectRatio)
        .replace('{DURATION}', duration)
        .replace('{QUALITY}', quality === 'hd' ? '高清' : '标清')
        .replace('{STYLE_GUIDANCE}', styleGuidance),
      en: DEFAULT_SORA_VIDEO_PROMPT.en
        .replace('{SCENE}', scene)
        .replace('{VISUAL_DETAILS}', visualDetails)
        .replace('{CAMERA_MOVEMENT}', cameraMovement)
        .replace('{SHOT_SIZE}', shotSize)
        .replace('{ANGLE}', angle)
        .replace('{LANGUAGE_OF_LENS}', languageOfLens)
        .replace('{ENVIRONMENT}', environment)
        .replace('{LIGHTING}', lighting)
        .replace('{MOOD}', mood)
        .replace('{ATMOSPHERE}', atmosphere)
        .replace('{CHARACTERS_AND_ACTIONS}', charactersAndActions)
        .replace('{ASPECT_RATIO}', aspectRatio)
        .replace('{DURATION}', duration)
        .replace('{QUALITY}', quality)
        .replace('{STYLE_GUIDANCE}', styleGuidance)
    };
  }

  /**
   * 获取默认视频提示词
   */
  getDefaultVideoPrompts(): VideoPrompts {
    return {
      storyboardPrompt: { ...DEFAULT_STORYBOARD_VIDEO_PROMPT },
      cinematicPrompt: { ...DEFAULT_CINEMATIC_VIDEO_PROMPT },
      soraPrompt: { ...DEFAULT_SORA_VIDEO_PROMPT }
    };
  }
}

export const promptManager = new PromptManager();
