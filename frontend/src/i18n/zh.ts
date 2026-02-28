export const zh = {
  // App Name
  appName: 'AIYOUSTUDIO',
  welcome: '人人可用的短剧生产力',

  // Node Types
  nodes: {
    promptInput: '创意描述',
    imageGenerator: '文字生图',
    videoGenerator: '文生视频',
    audioGenerator: '灵感音乐',
    videoAnalyzer: '视频分析',
    imageEditor: '图像编辑',
    scriptPlanner: '剧本大纲',
    scriptEpisode: '剧本分集',
    storyboardGenerator: '分镜生成',
    characterNode: '角色设计',
  },

  // Actions
  actions: {
    doubleClick: '双击',
    canvasHint: '画布自由生成，或查看工作流模板',
    generate: '生成',
    delete: '删除',
    copy: '复制',
    paste: '粘贴',
    undo: '撤销',
    save: '保存',
    cancel: '取消',
    confirm: '确认',
  },

  // Context Menu
  contextMenu: {
    createNode: '创建新节点',
    copyNode: '复制节点',
    deleteNode: '删除节点',
    replaceAsset: '替换素材',
    deleteConnection: '删除连接线',
    saveAsWorkflow: '保存为工作流',
    deleteGroup: '删除分组',
  },

  // Settings
  settings: {
    language: '语言',
    chinese: '中文',
    english: 'English',
  },
};

export type Translation = typeof zh;
