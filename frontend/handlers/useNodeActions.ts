/**
 * useNodeActions - 节点动作处理 Hook
 *
 * @developer 光波 (a@ggbo.com)
 * @copyright Copyright (c) 2025 光波. All rights reserved.
 * @description 从 App.tsx 提取的节点动作处理逻辑，包含 handleNodeAction 及其辅助函数
 */

import React, { useCallback } from 'react';
import { AppNode, NodeType, NodeStatus, Connection, SoraTaskGroup, CharacterProfile } from '../types';
import { useEditorStore } from '../stores/editor.store';
import { getUserPriority, ModelCategory, getDefaultModel, getUserDefaultModel } from '../services/modelConfig';
import { getGridConfig, STORYBOARD_RESOLUTIONS } from '../services/storyboardConfig';
import { saveImageNodeOutput, saveVideoNodeOutput, saveAudioNodeOutput, saveStoryboardGridOutput } from '../utils/storageHelper';
import { checkImageNodeCache, checkVideoNodeCache, checkAudioNodeCache } from '../utils/cacheChecker';
import { createNodeQuery } from '../hooks/usePerformanceOptimization';
import { toApiUrl } from '../services/api/client';

interface UseNodeActionsParams {
  nodesRef: React.MutableRefObject<AppNode[]>;
  connectionsRef: React.MutableRefObject<Connection[]>;
  abortControllersRef: React.MutableRefObject<Map<string, AbortController>>;
  nodeQuery: React.MutableRefObject<ReturnType<typeof createNodeQuery>>;
  saveHistory: () => void;
  handleNodeUpdate: (id: string, data: any, size?: any, title?: string) => void;
  handleAssetGenerated: (type: 'image' | 'video' | 'audio', src: string, title: string) => void;
}

/**
 * 保存视频到服务器数据库
 * 注意：已禁用 IndexedDB 保存，直接使用 Sora URL 避免卡顿
 */
async function saveVideoToDatabase(videoUrl: string, taskId: string, taskNumber: number, soraPrompt: string): Promise<string> {
    return taskId;
}

export function useNodeActions(params: UseNodeActionsParams) {
  const { nodesRef, connectionsRef, abortControllersRef, nodeQuery, saveHistory, handleNodeUpdate, handleAssetGenerated } = params;
  const { nodes, setNodes, connections, setConnections, groups, setGroups } = useEditorStore();

  const getVisualPromptPrefix = (style: string, genre?: string, setting?: string): string => {
      let base = '';
      // Enhanced Visual Style Definitions
      if (style === 'ANIME') {
          base = 'Anime style, Japanese 2D animation, vibrant colors, Studio Ghibli style, clean lines, high detail, 8k resolution, cel shaded, flat color, expressive characters.';
      } else if (style === '3D') {
          base = 'Xianxia 3D animation character, semi-realistic style, Xianxia animation aesthetics, high precision 3D modeling, PBR shading with soft translucency, subsurface scattering, ambient occlusion, delicate and smooth skin texture (not overly realistic), flowing fabric clothing, individual hair strands, soft ethereal lighting, cinematic rim lighting with cool blue tones, otherworldly gaze, elegant and cold demeanor, 3D animation quality, vibrant colors.';
      } else {
          // Default to REAL
          base = 'Cinematic, Photorealistic, 8k, raw photo, hyperrealistic, movie still, live action, cinematic lighting, Arri Alexa, depth of field, film grain, color graded.';
      }

      if (genre) base += ` Genre: ${genre}.`;
      if (setting) base += ` Setting: ${setting}.`;

      base += " Unified art style, consistent character design across all generated images.";
      return base;
  };

  // Helper to recursively collect upstream context
  const getUpstreamContext = (node: AppNode, allNodes: AppNode[], visited: Set<string> = new Set()): string[] => {
      if (visited.has(node.id)) return [];
      visited.add(node.id);

      const texts: string[] = [];
      const inputs = node.inputs.map(i => allNodes.find(n => n.id === i)).filter(Boolean) as AppNode[];

      for (const inputNode of inputs) {
          // Collect content from this node
          if (inputNode.type === NodeType.PROMPT_INPUT && inputNode.data.prompt) {
              texts.push(inputNode.data.prompt);
          } else if (inputNode.type === NodeType.VIDEO_ANALYZER && inputNode.data.analysis) {
              texts.push(inputNode.data.analysis);
          } else if (inputNode.type === NodeType.SCRIPT_EPISODE && inputNode.data.generatedEpisodes) {
              texts.push(inputNode.data.generatedEpisodes.map(ep => `${ep.title}\n角色: ${ep.characters}`).join('\n'));
          } else if (inputNode.type === NodeType.SCRIPT_PLANNER && inputNode.data.scriptOutline) {
              // Include script outline (may contain character backstories)
              texts.push(inputNode.data.scriptOutline);
          } else if (inputNode.type === NodeType.DRAMA_ANALYZER) {
              const selected = inputNode.data.selectedFields || [];
              if (selected.length > 0) {
                  const fieldLabels: Record<string, string> = {
                      dramaIntroduction: '剧集介绍',
                      worldview: '世界观分析',
                      logicalConsistency: '逻辑自洽性',
                      extensibility: '延展性分析',
                      characterTags: '角色标签',
                      protagonistArc: '主角弧光',
                      audienceResonance: '受众共鸣点',
                      artStyle: '画风分析'
                  };
                  const parts = selected.map(fieldKey => {
                      const value = inputNode.data[fieldKey as keyof typeof inputNode.data] as string || '';
                      const label = fieldLabels[fieldKey] || fieldKey;
                      return `【${label}】\n${value}`;
                  });
                  texts.push(parts.join('\n\n'));
              }
          } else if (inputNode.type === NodeType.DRAMA_REFINED && inputNode.data.refinedContent) {
              // Include refined content if available
              const refined = inputNode.data.refinedContent;
              if (refined.characterTags) texts.push(`角色标签: ${refined.characterTags.join(', ')}`);
          }

          // Recursively collect from upstream nodes
          const upstreamTexts = getUpstreamContext(inputNode, allNodes, visited);
          texts.push(...upstreamTexts);
      }

      return texts;
  };

  // Helper to get unified style context from upstream (with recursive tracing)
  const getUpstreamStyleContext = (node: AppNode, allNodes: AppNode[]): { style: string, genre: string, setting: string } => {
      const inputs = node.inputs.map(i => allNodes.find(n => n.id === i)).filter(Boolean) as AppNode[];
      let style = node.data.scriptVisualStyle || 'REAL';
      let genre = '';
      let setting = '';

      // Function to recursively find SCRIPT_PLANNER
      const findPlannerRecursive = (currentNode: AppNode, visited: Set<string> = new Set()): AppNode | null => {
          if (visited.has(currentNode.id)) return null;
          visited.add(currentNode.id);

          if (currentNode.type === NodeType.SCRIPT_PLANNER) {
              return currentNode;
          }

          // Check inputs of current node
          const currentInputs = currentNode.inputs.map(i => allNodes.find(n => n.id === i)).filter(Boolean) as AppNode[];
          for (const inputNode of currentInputs) {
              const found = findPlannerRecursive(inputNode, visited);
              if (found) return found;
          }

          return null;
      };

      // First, try to find SCRIPT_EPISODE or SCRIPT_PLANNER directly in inputs
      const episodeNode = inputs.find(n => n.type === NodeType.SCRIPT_EPISODE);
      const plannerNode = inputs.find(n => n.type === NodeType.SCRIPT_PLANNER);

      if (episodeNode) {
          if (episodeNode.data.scriptVisualStyle) style = episodeNode.data.scriptVisualStyle;
          // Traverse up to planner if connected to episode
          const parentPlanner = allNodes.find(n => episodeNode.inputs.includes(n.id) && n.type === NodeType.SCRIPT_PLANNER);
          if (parentPlanner) {
              if (parentPlanner.data.scriptVisualStyle) style = parentPlanner.data.scriptVisualStyle;
              genre = parentPlanner.data.scriptGenre || '';
              setting = parentPlanner.data.scriptSetting || '';
          }
      } else if (plannerNode) {
          if (plannerNode.data.scriptVisualStyle) style = plannerNode.data.scriptVisualStyle;
          genre = plannerNode.data.scriptGenre || '';
          setting = plannerNode.data.scriptSetting || '';
      } else {
          // If no direct SCRIPT_EPISODE or SCRIPT_PLANNER found, recursively search upstream
          // This handles cases like: CHARACTER_NODE -> PROMPT_INPUT -> SCRIPT_EPISODE -> SCRIPT_PLANNER
          for (const inputNode of inputs) {
              const foundPlanner = findPlannerRecursive(inputNode);
              if (foundPlanner) {
                  if (foundPlanner.data.scriptVisualStyle) style = foundPlanner.data.scriptVisualStyle;
                  genre = foundPlanner.data.scriptGenre || '';
                  setting = foundPlanner.data.scriptSetting || '';
                  break;
              }
          }
      }

      return { style, genre, setting };
  };

  // Helper to map visual style enum to descriptive prompt string
  const getVisualStylePrompt = (style: string): string => {
      switch (style) {
          case '3D':
              return 'Xianxia 3D animation character, semi-realistic style, Xianxia animation aesthetics, high precision 3D modeling, PBR shading with soft translucency, subsurface scattering, ambient occlusion, delicate and smooth skin texture, flowing fabric clothing, individual hair strands, neutral studio lighting, clear focused gaze, natural demeanor';
          case 'REAL':
              return 'Professional portrait photography, photorealistic human, cinematic photography, professional headshot, DSLR quality, 85mm lens, sharp focus, realistic skin texture, visible pores, natural skin imperfections, subsurface scattering, natural lighting, studio portrait lighting, softbox lighting, rim light, golden hour';
          case 'ANIME':
              return 'Anime character, anime style, 2D anime art, manga illustration style, clean linework, crisp outlines, manga art style, detailed illustration, soft lighting, rim light, vibrant colors, cel shading lighting, flat shading';
          default:
              return 'Cinematic, high quality, consistent style';
      }
  };

  // --- Main Action Handler ---
  const handleNodeAction = useCallback(async (id: string, promptOverride?: string) => {
      const node = nodesRef.current.find(n => n.id === id);
      if (!node) {
          console.error('[handleNodeAction] 未找到节点:', id);
          return;
      }
      handleNodeUpdate(id, { error: undefined });
      setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.WORKING } : n));

      try {
          // Handle PROMPT_INPUT storyboard generation
          if (node.type === NodeType.PROMPT_INPUT && promptOverride === 'generate-storyboard') {
              const episodeContent = node.data.prompt || '';
              if (!episodeContent || episodeContent.length < 50) {
                  throw new Error('剧本内容太短，无法生成分镜');
              }

              // Extract episode title from content (first line or use default)
              const lines = episodeContent.split('\n');
              const episodeTitle = lines[0].replace(/^#+\s*/, '').trim() || '未命名剧集';

              // Find parent SCRIPT_EPISODE node and its connected SCRIPT_PLANNER to get configured duration
              const parentEpisodeNode = nodesRef.current.find(n => n.type === NodeType.SCRIPT_EPISODE && n.id && node.inputs.includes(n.id));
              let configuredDuration = 60; // default 1 minute in seconds
              let visualStyle: 'REAL' | 'ANIME' | '3D' = 'ANIME';

              if (parentEpisodeNode) {
                  // Find SCRIPT_PLANNER connected to the SCRIPT_EPISODE
                  const plannerNode = nodesRef.current.find(n =>
                      n.type === NodeType.SCRIPT_PLANNER &&
                      parentEpisodeNode.inputs.includes(n.id)
                  );

                  if (plannerNode && plannerNode.data.scriptDuration) {
                      // Convert minutes to seconds
                      configuredDuration = plannerNode.data.scriptDuration * 60;
                  }

                  if (plannerNode && plannerNode.data.scriptVisualStyle) {
                      visualStyle = plannerNode.data.scriptVisualStyle;
                  }
              }

              const estimatedDuration = configuredDuration;

              // Generate detailed storyboard
              const { generateDetailedStoryboard } = await import('../services/geminiService');

              const shots = await generateDetailedStoryboard(
                  episodeTitle,
                  episodeContent,
                  estimatedDuration,
                  visualStyle,
                  undefined,  // onShotGenerated callback (not used)
                  getUserDefaultModel('text'),  // 总是使用最新的模型配置
                  { nodeId: node.id, nodeType: node.type }  // context for API logging
              );

              // Update with complete storyboard
              const storyboard: import('../types').EpisodeStoryboard = {
                  episodeTitle,
                  totalDuration: shots.reduce((sum, shot) => sum + shot.duration, 0),
                  totalShots: shots.length,
                  shots,
                  visualStyle
              };

              handleNodeUpdate(id, { episodeStoryboard: storyboard });
              setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));
              return;
          }

          // Handle DRAMA_ANALYZER extract action
          if (node.type === NodeType.DRAMA_ANALYZER && promptOverride === 'extract') {
              const selectedFields = node.data.selectedFields || [];

              if (selectedFields.length === 0) {
                  throw new Error('请先勾选需要提取的分析项');
              }

              // Call AI API to extract refined tags
              const { extractRefinedTags } = await import('../services/geminiService');
              const refinedContent = await extractRefinedTags(node.data, selectedFields);

              // Create new DRAMA_REFINED node
              const newNode: AppNode = {
                  id: `n-refined-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                  type: NodeType.DRAMA_REFINED,
                  x: node.x + (node.width || 420) + 150,
                  y: node.y,
                  width: 420,
                  title: '剧目精炼',
                  status: NodeStatus.SUCCESS,
                  data: {
                      refinedContent,
                      sourceDramaName: node.data.dramaName,
                      sourceNodeId: node.id,
                      selectedFields
                  },
                  inputs: [node.id]
              };

              // Create connection
              const newConnection: Connection = {
                  from: node.id,
                  to: newNode.id
              };

              // Update state
              try { saveHistory(); } catch (e) { }
              setNodes(prev => [...prev, newNode]);
              setConnections(prev => [...prev, newConnection]);

              // Set source node back to SUCCESS
              setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));

              return; // Exit early after extraction
          }

          // Handle SORA_VIDEO_GENERATOR actions
          if (node.type === NodeType.SORA_VIDEO_GENERATOR) {
              const taskGroups = node.data.taskGroups || [];

              // Action: Regenerate prompt for a specific task group
              if (promptOverride?.startsWith('regenerate-prompt:')) {
                  const taskGroupIndex = parseInt(promptOverride.split(':')[1]);
                  const taskGroup = taskGroups[taskGroupIndex];

                  if (!taskGroup) {
                      throw new Error(`未找到任务组 ${taskGroupIndex + 1}`);
                  }


                  // Set node to WORKING status
                  setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.WORKING, data: { ...n.data, progress: '正在优化提示词...' } } : n));

                  try {
                    // Get upstream visual style
                    const { style: styleType } = getUpstreamStyleContext(node, nodesRef.current);
                    const stylePrompt = getVisualStylePrompt(styleType);

                    // Use AI to generate enhanced prompt with Sora2 builder (includes black screen)
                    const { promptBuilderFactory } = await import('../services/promptBuilders');
                    const builder = promptBuilderFactory.getByNodeType(NodeType.SORA_VIDEO_GENERATOR);
                    const newPrompt = await builder.build(taskGroup.splitShots, {
                      includeBlackScreen: true,
                      blackScreenDuration: 0.5,
                      visualStyle: stylePrompt
                    });

                    // Update the task group's prompt
                    const updatedTaskGroups = [...taskGroups];
                    updatedTaskGroups[taskGroupIndex] = {
                        ...taskGroup,
                        soraPrompt: newPrompt,
                        promptModified: true
                    };

                    handleNodeUpdate(id, { taskGroups: updatedTaskGroups });
                    setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));
                  } catch (error: any) {
                    console.error('[SORA_VIDEO_GENERATOR] Failed to regenerate prompt:', error);
                    setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.ERROR, data: { ...n.data, error: error.message } } : n));
                  }
                  return;
              }

              // Action: Edit shots for a specific task group
              if (promptOverride?.startsWith('edit-shots:')) {
                  const taskGroupIndex = parseInt(promptOverride.split(':')[1]);
                  const taskGroup = taskGroups[taskGroupIndex];

                  if (!taskGroup) {
                      throw new Error(`未找到任务组 ${taskGroupIndex + 1}`);
                  }

                  // Store the editing state in a temporary location (could use localStorage or a modal state)
                  // For now, we'll just log it - the actual editing UI will need to be implemented separately
                  alert(`分镜编辑功能即将推出\n\n任务组 ${taskGroup.taskNumber} 包含 ${taskGroup.splitShots?.length || 0} 个分镜\n\n您可以先在分镜图拆解节点中编辑，然后重新生成提示词。`);
                  return;
              }

              // Action: Remove sensitive words from prompt
              if (promptOverride?.startsWith('remove-sensitive-words:')) {
                  const taskGroupIndex = parseInt(promptOverride.split(':')[1]);
                  const taskGroup = taskGroups[taskGroupIndex];

                  if (!taskGroup) {
                      throw new Error(`未找到任务组 ${taskGroupIndex + 1}`);
                  }

                  if (!taskGroup.soraPrompt) {
                      throw new Error('请先生成提示词');
                  }


                  // 设置正在去敏感词状态
                  const updatedTaskGroups = [...taskGroups];
                  updatedTaskGroups[taskGroupIndex] = {
                      ...taskGroup,
                      isRemovingSensitiveWords: true,
                      removeSensitiveWordsProgress: '正在调用AI模型...'
                  };
                  handleNodeUpdate(id, { taskGroups: updatedTaskGroups });

                  try {
                      // Import and call the remove sensitive words function
                      const { removeSensitiveWords } = await import('../services/soraPromptBuilder');
                      const cleanedPrompt = await removeSensitiveWords(taskGroup.soraPrompt);


                      // 计算优化统计
                      const wordCountDiff = taskGroup.soraPrompt.length - cleanedPrompt.length;
                      const successMessage = wordCountDiff > 0
                          ? `✓ 已优化 ${wordCountDiff} 个字符`
                          : `✓ 优化完成`;

                      // Update the task group's prompt
                      updatedTaskGroups[taskGroupIndex] = {
                          ...taskGroup,
                          soraPrompt: cleanedPrompt,
                          promptModified: true,
                          isRemovingSensitiveWords: false,
                          removeSensitiveWordsProgress: undefined,
                          removeSensitiveWordsSuccess: successMessage
                      };

                      handleNodeUpdate(id, { taskGroups: updatedTaskGroups });

                      // 3秒后清除成功消息
                      setTimeout(() => {
                          const currentTaskGroups = nodesRef.current.find(n => n.id === id)?.data?.taskGroups;
                          if (currentTaskGroups) {
                              const tg = currentTaskGroups[taskGroupIndex];
                              if (tg && tg.removeSensitiveWordsSuccess) {
                                  const clearedTaskGroups = [...currentTaskGroups];
                                  clearedTaskGroups[taskGroupIndex] = {
                                      ...tg,
                                      removeSensitiveWordsSuccess: undefined
                                  };
                                  handleNodeUpdate(id, { taskGroups: clearedTaskGroups });
                              }
                          }
                      }, 3000);
                  } catch (error: any) {
                      console.error('[去敏感词] ❌ 处理失败:', error);

                      updatedTaskGroups[taskGroupIndex] = {
                          ...taskGroup,
                          isRemovingSensitiveWords: false,
                          removeSensitiveWordsProgress: undefined,
                          removeSensitiveWordsError: error.message
                      };
                      handleNodeUpdate(id, { taskGroups: updatedTaskGroups });

                      // 5秒后清除错误消息
                      setTimeout(() => {
                          const currentTaskGroups = nodesRef.current.find(n => n.id === id)?.data?.taskGroups;
                          if (currentTaskGroups) {
                              const tg = currentTaskGroups[taskGroupIndex];
                              if (tg && tg.removeSensitiveWordsError) {
                                  const clearedTaskGroups = [...currentTaskGroups];
                                  clearedTaskGroups[taskGroupIndex] = {
                                      ...tg,
                                      removeSensitiveWordsError: undefined
                                  };
                                  handleNodeUpdate(id, { taskGroups: clearedTaskGroups });
                              }
                          }
                      }, 5000);
                  }
                  return;
              }

              // Action: Generate video for a specific task group
              if (promptOverride?.startsWith('generate-video:')) {
                  const taskGroupIndex = parseInt(promptOverride.split(':')[1]);
                  const taskGroup = taskGroups[taskGroupIndex];

                  if (!taskGroup) {
                      throw new Error(`未找到任务组 ${taskGroupIndex + 1}`);
                  }


                  if (!taskGroup.soraPrompt) {
                      throw new Error('请先生成提示词');
                  }

                  // Set to uploading status
                  const updatedTaskGroups = [...taskGroups];
                  updatedTaskGroups[taskGroupIndex] = {
                      ...taskGroup,
                      generationStatus: 'uploading' as const
                  };
                  handleNodeUpdate(id, { taskGroups: updatedTaskGroups });
                  setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.WORKING } : n));

                  try {
                    const { generateSoraVideo } = await import('../services/soraService');

                    const result = await generateSoraVideo(
                        updatedTaskGroups[taskGroupIndex],
                        (message, progress) => {
                        },
                        { nodeId: id, nodeType: node.type }
                    );

                    console.log('[SORA] generateSoraVideo 返回结果:', {
                        status: result.status,
                        taskId: result.taskId,
                        videoUrl: result.videoUrl,
                        hasVideoUrl: !!result.videoUrl,
                        _rawData: result._rawData
                    });

                    if (result.status === 'completed') {
                        // 不保存到IndexedDB，直接使用 Sora URL
                        saveVideoToDatabase(
                            result.videoUrl,
                            result.taskId,
                            taskGroup.taskNumber,
                            taskGroup.soraPrompt
                        );

                        // Create child node for the video
                        const childNodeId = `n-sora-child-${Date.now()}`;
                        const childNode: AppNode = {
                            id: childNodeId,
                            type: NodeType.SORA_VIDEO_CHILD,
                            x: node.x + (node.width || 420) + 50,
                            y: node.y + (taskGroupIndex * 150),
                            title: `任务组 ${taskGroup.taskNumber}`,
                            status: NodeStatus.SUCCESS,
                            data: {
                                taskGroupId: taskGroup.id,
                                taskNumber: taskGroup.taskNumber,
                                soraPrompt: taskGroup.soraPrompt,
                                videoUrl: result.videoUrl,
                                videoUrlWatermarked: result.videoUrlWatermarked,
                                duration: result.duration,
                                quality: result.quality,
                                isCompliant: result.isCompliant,
                                violationReason: result.violationReason,
                                soraTaskId: result.taskId
                            },
                            inputs: [node.id]
                        };

                        const newConnection: Connection = {
                            from: node.id,
                            to: childNodeId
                        };

                        // 添加到历史记录
                        if (result.videoUrl) {
                            handleAssetGenerated('video', result.videoUrl, `Sora 任务组 ${taskGroup.taskNumber}`);
                        }

                        // Update task group with results
                        updatedTaskGroups[taskGroupIndex] = {
                            ...taskGroup,
                            generationStatus: 'completed' as const,
                            progress: 100,
                            videoMetadata: {
                                duration: parseFloat(result.duration || '0'),
                                resolution: '1080p',
                                fileSize: 0,
                                createdAt: new Date()
                            }
                        };

                        saveHistory();
                        setNodes(prev => [...prev, childNode]);
                        setConnections(prev => [...prev, newConnection]);
                    } else {
                        // Generation failed - extract error details from result
                        const rawError = result.violationReason ||
                                          result._rawData?.error ||
                                          result._rawData?.message ||
                                          '视频生成失败';
                        // 确保 errorMessage 是字符串
                        const errorMessage = typeof rawError === 'string' ? rawError : JSON.stringify(rawError);

                        console.error(`[SORA] 任务 ${taskGroup.taskNumber} 失败详情:`, {
                            violationReason: result.violationReason,
                            rawData: result._rawData
                        });

                        updatedTaskGroups[taskGroupIndex] = {
                            ...taskGroup,
                            generationStatus: 'failed' as const,
                            error: errorMessage
                        };
                    }

                    handleNodeUpdate(id, { taskGroups: updatedTaskGroups });
                    setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));

                  } catch (error: any) {
                    console.error('[SORA_VIDEO_GENERATOR] Failed to generate video:', error);
                    const errorMessage = error.message || '生成失败';

                    // 更新任务组状态
                    updatedTaskGroups[taskGroupIndex] = {
                        ...taskGroup,
                        generationStatus: 'failed' as const,
                        error: errorMessage
                    };

                    // 创建失败状态的子节点
                    const childNodeId = `n-sora-child-${Date.now()}`;
                    const childNode: AppNode = {
                        id: childNodeId,
                        type: NodeType.SORA_VIDEO_CHILD,
                        x: node.x + (node.width || 420) + 50,
                        y: node.y + (taskGroupIndex * 150),
                        title: `任务组 ${taskGroup.taskNumber}`,
                        status: NodeStatus.ERROR,
                        data: {
                            taskGroupId: taskGroup.id,
                            taskNumber: taskGroup.taskNumber,
                            soraPrompt: taskGroup.soraPrompt,
                            videoUrl: undefined,
                            error: errorMessage
                        },
                        inputs: [node.id]
                    };

                    const newConnection: Connection = {
                        from: node.id,
                        to: childNodeId
                    };

                    setNodes(prev => [...prev.filter(n => n.id !== childNodeId), childNode]);
                    setConnections(prev => [...prev.filter(c => c.to !== childNodeId), newConnection]);
                    handleNodeUpdate(id, { taskGroups: updatedTaskGroups });
                    setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.ERROR } : n));
                  }
                  return;
              }

              // Action: Fuse reference images for task groups
              if (promptOverride === 'fuse-images') {

                  if (taskGroups.length === 0) {
                      throw new Error('请先生成任务组和提示词');
                  }

                  try {
                      // 导入图片融合工具
                      const { fuseMultipleTaskGroups } = await import('../utils/imageFusion');

                      // 过滤出有splitShots的任务组
                      const taskGroupsToFuse = taskGroups.filter(tg =>
                          tg.splitShots && tg.splitShots.length > 0
                      );

                      if (taskGroupsToFuse.length === 0) {
                          throw new Error('没有可融合的分镜图');
                      }


                      // 执行图片融合
                      const fusionResults = await fuseMultipleTaskGroups(
                          taskGroupsToFuse,
                          (current, total, groupName) => {
                          }
                      );


                      // 导入OSS服务
                      const { getOSSConfig } = await import('../services/soraConfigService');
                      const { uploadFileToOSS } = await import('../services/ossService');

                      // 检查是否配置了OSS
                      const ossConfig = getOSSConfig();
                      if (!ossConfig) {
                          console.warn('[SORA_VIDEO_GENERATOR] OSS未配置，融合图将使用Base64格式，可能导致显示问题');
                      }

                      // 更新任务组数据（如果配置了OSS，先上传）
                      const updatedTaskGroups = await Promise.all(taskGroups.map(async (tg) => {
                          const result = fusionResults.find(r => r.groupId === tg.id);
                          if (result) {
                              let imageUrl = result.fusedImage;

                              // 如果配置了OSS，上传融合图
                              if (ossConfig) {
                                  try {
                                      const fileName = `sora-reference-${tg.id}-${Date.now()}.png`;
                                      imageUrl = await uploadFileToOSS(result.fusedImage, fileName, ossConfig);
                                  } catch (error: any) {
                                      console.error('[SORA_VIDEO_GENERATOR] Failed to upload reference image for task group', tg.taskNumber, ':', error);
                                      // 上传失败，回退到Base64
                                      imageUrl = result.fusedImage;
                                  }
                              }

                              return {
                                  ...tg,
                                  referenceImage: imageUrl,
                                  imageFused: true,
                                  generationStatus: 'image_fused' as const
                              };
                          }
                          return tg;
                      }));

                      handleNodeUpdate(id, { taskGroups: updatedTaskGroups });
                      setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));
                  } catch (error: any) {
                      console.error('[SORA_VIDEO_GENERATOR] Image fusion failed:', error);
                      throw new Error(`图片融合失败: ${error.message}`);
                  }
                  return;
              }

              // Action: Generate Sora videos for all task groups
              if (promptOverride === 'generate-videos') {

                  const taskGroupsToGenerate = taskGroups.filter(tg =>
                      tg.generationStatus === 'prompt_ready' || tg.generationStatus === 'image_fused'
                  );

                  if (taskGroupsToGenerate.length === 0) {
                      throw new Error('没有可生成的任务组，请先完成提示词生成');
                  }

                  // Update all task groups to 'uploading' status
                  const uploadingGroups = taskGroups.map(tg =>
                      taskGroupsToGenerate.find(t => t.id === tg.id)
                          ? { ...tg, generationStatus: 'uploading' as const }
                          : tg
                  );
                  handleNodeUpdate(id, { taskGroups: uploadingGroups });

                  // Generate videos for each task group
                  const { generateMultipleSoraVideos } = await import('../services/soraService');
                  const results = await generateMultipleSoraVideos(
                      taskGroupsToGenerate,
                      (index, message, progress) => {
                          // 实时更新进度到节点状态
                          const tg = taskGroupsToGenerate[index];
                          if (tg) {
                              handleNodeUpdate(id, {
                                  taskGroups: nodesRef.current.find(n => n.id === id)?.data.taskGroups?.map(t =>
                                      t.id === tg.id ? { ...t, progress } : t
                                  )
                              });
                          }
                      },
                      { nodeId: id, nodeType: node.type }
                  );

                  // Create child nodes for completed videos
                  const newChildNodes: AppNode[] = [];
                  const newConnections: Connection[] = [];

                  // 使用 for...of 循环以支持 await
                  // results 是 Map<taskGroupId, SoraVideoResult>，需要用 taskGroupId 查找对应的 taskGroup
                  let childIndex = 0;
                  for (const [taskGroupId, result] of results.entries()) {
                      const taskGroup = taskGroupsToGenerate.find(tg => tg.id === taskGroupId);
                      if (!taskGroup) continue;
                      if (result.status === 'completed' && result.videoUrl) {
                          // 不保存到IndexedDB，直接使用 Sora URL
                          saveVideoToDatabase(result.videoUrl, result.taskId, taskGroup.taskNumber, taskGroup.soraPrompt);

                          // 🚀 保存视频到本地文件系统
                          try {
                              const { getFileStorageService } = await import('../services/storage/index');
                              const service = getFileStorageService();

                              if (service.isEnabled()) {
                                  // 使用 prefix 参数添加任务组 ID，便于后续查找
                                  const saveResult = await service.saveFile(
                                      'default',
                                      id, // 使用父节点 ID
                                      'SORA_VIDEO_GENERATOR',
                                      result.videoUrl,
                                      {
                                          updateMetadata: true,
                                          prefix: `sora-video-${taskGroup.id}` // 文件名前缀
                                      }
                                  );

                                  if (saveResult.success) {
                                  }
                              }
                          } catch (error) {
                              console.error('[Sora2] 保存视频到本地失败:', error);
                          }

                          // Create child node
                          const childNodeId = `n-sora-child-${Date.now()}-${childIndex}`;
                          const childNode: AppNode = {
                              id: childNodeId,
                              type: NodeType.SORA_VIDEO_CHILD,
                              x: node.x + (node.width || 420) + 50,
                              y: node.y + (childIndex * 150),
                              title: `任务组 ${taskGroup.taskNumber}`,
                              status: NodeStatus.SUCCESS,
                              data: {
                                  taskGroupId: taskGroup.id,
                                  taskNumber: taskGroup.taskNumber,
                                  soraPrompt: taskGroup.soraPrompt,
                                  videoUrl: result.videoUrl,
                                  videoUrlWatermarked: result.videoUrlWatermarked,
                                  duration: result.duration,
                                  quality: result.quality,
                                  isCompliant: result.isCompliant,
                                  violationReason: result.violationReason,
                                  soraTaskId: result.taskId
                              },
                              inputs: [node.id]
                          };
                          newChildNodes.push(childNode);
                          newConnections.push({ from: node.id, to: childNodeId });
                          childIndex++;
                      }
                  }

                  // Update task groups with results
                  const finalTaskGroups = taskGroups.map(tg => {
                      const result = results.get(tg.id);
                      if (result) {
                          // 保留实际的进度值
                          const finalProgress = result.status === 'completed' ? 100 : result.progress;

                          // 提取错误信息
                          let errorMessage = undefined;
                          if (result.status === 'error') {
                              const rawError = result.violationReason || result._rawData?.error || result._rawData?.message || '视频生成失败';
                              // 确保 errorMessage 是字符串
                              errorMessage = typeof rawError === 'string' ? rawError : JSON.stringify(rawError);
                              console.error(`[SORA] 任务 ${tg.taskNumber} 失败详情:`, {
                                  violationReason: result.violationReason,
                                  rawData: result._rawData
                              });
                          }

                          return {
                              ...tg,
                              generationStatus: result.status === 'completed' ? 'completed' as const :
                                              result.status === 'error' ? 'failed' as const :
                                              tg.generationStatus,
                              progress: finalProgress,
                              error: errorMessage,
                              // 保存视频URL到taskGroup中
                              videoUrl: result.videoUrl,
                              videoUrlWatermarked: result.videoUrlWatermarked,
                              videoMetadata: result.status === 'completed' ? {
                                  duration: parseFloat(result.duration || '0'),
                                  resolution: '1080p',
                                  fileSize: 0,
                                  createdAt: new Date()
                              } : undefined
                          };
                      }
                      return tg;
                  });

                  // Add child nodes to canvas
                  if (newChildNodes.length > 0) {
                      try { saveHistory(); } catch (e) { }
                      setNodes(prev => [...prev, ...newChildNodes]);
                      setConnections(prev => [...prev, ...newConnections]);
                  }

                  handleNodeUpdate(id, { taskGroups: finalTaskGroups });
                  setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));
                  return;
              }

              // Action: Regenerate all videos
              if (promptOverride === 'regenerate-all') {

                  // Reset all task groups to prompt_ready status
                  const updatedTaskGroups = taskGroups.map(tg => ({
                      ...tg,
                      generationStatus: 'prompt_ready' as const,
                      progress: 0,
                      error: undefined,
                      videoMetadata: undefined
                  }));

                  handleNodeUpdate(id, { taskGroups: updatedTaskGroups });
                  setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.WORKING } : n));

                  // Remove all existing child nodes
                  const childNodes = nodesRef.current.filter(n =>
                      n.type === NodeType.SORA_VIDEO_CHILD && n.inputs.includes(id)
                  );

                  if (childNodes.length > 0) {
                      const childNodeIds = childNodes.map(n => n.id);
                      const connectionsToRemove = connectionsRef.current.filter(c =>
                          childNodeIds.includes(c.from) || childNodeIds.includes(c.to)
                      );

                      setNodes(prev => prev.filter(n => !childNodeIds.includes(n.id)));
                      setConnections(prev => prev.filter(c =>
                          !connectionsToRemove.includes(c)
                      ));
                  }

                  try { saveHistory(); } catch (e) { }

                  // Trigger video generation for all task groups
                  setTimeout(async () => {
                      const { generateMultipleSoraVideos } = await import('../services/soraService');
                      const results = await generateMultipleSoraVideos(
                          updatedTaskGroups,
                          (index, message, progress) => {
                          },
                          { nodeId: id, nodeType: node.type }
                      );

                      const finalTaskGroups = updatedTaskGroups.map((tg, index) => {
                          const result = results.get(tg.id);
                          if (result) {
                              // 保留实际的进度值
                              const finalProgress = result.status === 'completed' ? 100 : result.progress;

                              // 提取错误信息
                              let errorMessage = undefined;
                              if (result.status === 'error') {
                                  const rawError = result.violationReason || result._rawData?.error || result._rawData?.message || '视频生成失败';
                                  // 确保 errorMessage 是字符串
                                  errorMessage = typeof rawError === 'string' ? rawError : JSON.stringify(rawError);
                                  console.error(`[SORA] 重新生成任务 ${tg.taskNumber} 失败详情:`, {
                                      violationReason: result.violationReason,
                                      rawData: result._rawData
                                  });
                              }

                              return {
                                  ...tg,
                                  generationStatus: result.status === 'completed' ? 'completed' as const :
                                                      result.status === 'error' ? 'failed' as const :
                                                      tg.generationStatus,
                                  progress: finalProgress,
                                  error: errorMessage,
                                  videoMetadata: result.status === 'completed' ? {
                                      duration: parseFloat(result.duration || '0'),
                                      resolution: '1080p',
                                      fileSize: 0,
                                      createdAt: new Date()
                                  } : undefined
                              };
                          }
                          return tg;
                      });

                      // Create child nodes for successfully generated videos
                      const newChildNodes: AppNode[] = [];
                      const newConnections: Connection[] = [];

                      // 使用 for...of 循环以支持 await
                      // results 是 Map<taskGroupId, SoraVideoResult>
                      let childIndex = 0;
                      for (const [taskGroupId, result] of results.entries()) {
                          // 只有当状态完成且有有效videoUrl时才创建子节点
                          if (result.status === 'completed' && result.videoUrl) {
                              const childNodeId = `n-sora-child-${Date.now()}-${childIndex}`;
                              const taskGroup = updatedTaskGroups.find(tg => tg.id === taskGroupId);
                              if (!taskGroup) continue;

                              // 不保存到IndexedDB，直接使用 Sora URL
                              saveVideoToDatabase(result.videoUrl, result.taskId, taskGroup.taskNumber, taskGroup.soraPrompt);

                              const childNode: AppNode = {
                                  id: childNodeId,
                                  type: NodeType.SORA_VIDEO_CHILD,
                                  x: node.x + (node.width || 420) + 50,
                                  y: node.y + (childIndex * 150),
                                  title: `任务组 ${taskGroup.taskNumber}`,
                                  status: NodeStatus.SUCCESS,
                                  data: {
                                      taskGroupId: taskGroup.id,
                                      taskNumber: taskGroup.taskNumber,
                                      soraPrompt: taskGroup.soraPrompt,
                                      videoUrl: result.videoUrl,
                                      videoUrlWatermarked: result.videoUrlWatermarked,
                                      duration: result.duration,
                                      quality: result.quality,
                                      isCompliant: result.isCompliant,
                                      violationReason: result.violationReason,
                                      soraTaskId: result.taskId
                                  },
                                  inputs: [node.id]
                              };

                              const newConnection: Connection = {
                                  from: node.id,
                                  to: childNodeId
                              };

                              newChildNodes.push(childNode);
                              newConnections.push(newConnection);
                              childIndex++;
                          }
                      }

                      if (newChildNodes.length > 0) {
                          try { saveHistory(); } catch (e) { }
                          setNodes(prev => [...prev, ...newChildNodes]);
                          setConnections(prev => [...prev, ...newConnections]);
                      }

                      handleNodeUpdate(id, { taskGroups: finalTaskGroups });
                      setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));
                  }, 100);

                  return;
              }
          }

          // Handle SORA_VIDEO_CHILD node actions (refresh status)
          if (node.type === NodeType.SORA_VIDEO_CHILD && promptOverride === 'refresh-status') {
              const soraTaskId = node.data.soraTaskId;
              const provider = node.data.provider || 'yunwu';
              
              if (!soraTaskId) {
                  throw new Error('未找到任务ID');
              }


              try {
                  // Get API key based on provider
                  const getApiKey = () => {
                      if (provider === 'yunwu') {
                          return localStorage.getItem('YUNWU_API_KEY');
                      } else if (provider === 'sutu') {
                          return localStorage.getItem('SUTU_API_KEY');
                      } else if (provider === 'yijiapi') {
                          return localStorage.getItem('YIJIAPI_API_KEY');
                      }
                      return null;
                  };

                  const apiKey = getApiKey();
                  if (!apiKey) {
                      throw new Error('请先配置API Key');
                  }

                  // Call status API based on provider
                  let apiUrl: string;
                  let requestBody: any = { task_id: soraTaskId };

                  if (provider === 'yunwu') {
                      apiUrl = toApiUrl('/yunwuapi/status');
                      requestBody = { task_id: soraTaskId, model: 'sora-2-all' };
                  } else if (provider === 'sutu') {
                      apiUrl = toApiUrl('/sutu/query');
                      requestBody = { id: soraTaskId };
                  } else if (provider === 'yijiapi') {
                      apiUrl = toApiUrl(`/yijiapi/query/${encodeURIComponent(soraTaskId)}`);
                      requestBody = null;
                  } else {
                      throw new Error('不支持的provider');
                  }


                  const response = await fetch(apiUrl, {
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/json',
                          'X-API-Key': apiKey
                      },
                      body: requestBody ? JSON.stringify(requestBody) : undefined
                  });

                  if (!response.ok) {
                      throw new Error(`HTTP ${response.status}`);
                  }

                  const data = await response.json();

                  // Parse response based on provider
                  let newVideoUrl: string | undefined;
                  let newStatus: string;
                  let newProgress: number;
                  let newViolationReason: string | undefined;

                  if (provider === 'yunwu') {
                      newVideoUrl = data.video_url;
                      newStatus = data.status;
                      newProgress = data.progress || 0;
                      if (newStatus === 'error' || newStatus === 'failed') {
                          newViolationReason = data.error || '视频生成失败';
                      }
                  } else if (provider === 'sutu') {
                      newVideoUrl = data.data?.remote_url || data.data?.video_url;
                      newStatus = data.data?.status === 'success' ? 'completed' : 'processing';
                      newProgress = data.data?.status === 'success' ? 100 : 50;
                  } else if (provider === 'yijiapi') {
                      newVideoUrl = data.url;
                      newStatus = data.status === 'completed' ? 'completed' : 'processing';
                      newProgress = data.progress || (data.status === 'completed' ? 100 : 0);
                  }

                  // Update node data
                  const updateData: any = {};
                  
                  if (newVideoUrl) {
                      updateData.videoUrl = newVideoUrl;
                      updateData.status = newStatus === 'completed' ? NodeStatus.SUCCESS : undefined;
                      updateData.progress = newProgress;
                      updateData.violationReason = newViolationReason;
                  } else if (newStatus === 'processing' || newStatus === 'pending') {
                      updateData.progress = newProgress;
                      updateData.violationReason = undefined;
                  } else if (newViolationReason) {
                      updateData.violationReason = newViolationReason;
                      updateData.status = NodeStatus.ERROR;
                  }

                  handleNodeUpdate(id, updateData);
              } catch (error: any) {
                  console.error('[SORA_VIDEO_CHILD] ❌ Refresh failed:', error);
                  throw new Error(`刷新失败: ${error.message}`);
              }
              return;
          }

          // Handle SORA_VIDEO_CHILD node actions (save video locally)
          if (node.type === NodeType.SORA_VIDEO_CHILD && promptOverride === 'save-locally') {
              const videoUrl = node.data.videoUrl;
              if (!videoUrl) {
                  throw new Error('未找到视频URL');
              }


              // Get parent node to retrieve task group info
              const parentNode = nodesRef.current.find(n => n.id === node.inputs[0]);
              if (!parentNode || parentNode.type !== NodeType.SORA_VIDEO_GENERATOR) {
                  throw new Error('未找到父节点');
              }

              const taskGroups = parentNode.data.taskGroups || [];
              const taskGroup = taskGroups.find((tg: any) => tg.id === node.data.taskGroupId);
              if (!taskGroup) {
                  throw new Error('未找到任务组信息');
              }

              // Save video file
              const { saveVideoFile, saveVideoMetadata } = await import('../services/fileSystemService');
              const filePath = await saveVideoFile(videoUrl, taskGroup, false);

              // Save metadata
              const result: any = {
                  taskId: node.data.taskGroupId,
                  status: 'completed',
                  videoUrl: videoUrl,
                  duration: node.data.duration,
                  quality: node.data.quality,
                  isCompliant: node.data.isCompliant
              };
              await saveVideoMetadata(taskGroup, result);

              handleNodeUpdate(id, {
                  videoFilePath: filePath,
                  locallySaved: true
              });
              setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));
              return;
          }

          const inputs = node.inputs.map(i => nodesRef.current.find(n => n.id === i)).filter(Boolean) as AppNode[];

          // Handle STORYBOARD_VIDEO_GENERATOR node actions
          if (node.type === NodeType.STORYBOARD_VIDEO_GENERATOR) {
              if (promptOverride === 'fetch-shots') {

                  // Find upstream STORYBOARD_SPLITTER node
                  const splitterNode = inputs.find(n => n?.type === NodeType.STORYBOARD_SPLITTER);
                  if (!splitterNode) {
                      throw new Error('请连接分镜拆解节点');
                  }

                  const splitShots = splitterNode.data.splitShots || [];
                  if (splitShots.length === 0) {
                      throw new Error('分镜拆解节点中没有分镜数据');
                  }

                  // Find optional CHARACTER_NODE
                  const characterNode = inputs.find(n => n?.type === NodeType.CHARACTER_NODE);
                  const characterData = characterNode?.data?.generatedCharacters || [];

                  // Update node with available shots
                  handleNodeUpdate(id, {
                      availableShots: splitShots,
                      selectedShotIds: [],
                      characterData,
                      status: 'selecting'
                  });
                  setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));
                  return;
              }

              if (promptOverride === 'generate-prompt') {

                  const selectedShotIds = node.data.selectedShotIds || [];
                  if (selectedShotIds.length === 0) {
                      throw new Error('请至少选择一个分镜');
                  }

                  // Get selected shots
                  const availableShots = node.data.availableShots || [];
                  const selectedShots = availableShots.filter((s: any) => selectedShotIds.includes(s.id));

                  // Get upstream visual style
                  const { style: styleType, genre, setting } = getUpstreamStyleContext(node, nodesRef.current);
                  const stylePrompt = getVisualStylePrompt(styleType);

                  // Use Generic prompt builder for storyboard videos (no black screen)
                  const { promptBuilderFactory } = await import('../services/promptBuilders');
                  const builder = promptBuilderFactory.getByNodeType(NodeType.STORYBOARD_VIDEO_GENERATOR);

                  // Generate prompt using Generic format (no black screen for storyboard videos)
                  const generatedPrompt = await builder.build(selectedShots, {
                      visualStyle: stylePrompt,
                      context: genre || setting ? `类型：${genre}，背景：${setting}` : undefined,
                      preserveDialogue: true
                  });


                  handleNodeUpdate(id, {
                      generatedPrompt,
                      status: 'prompting'
                  });
                  setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));
                  return;
              }

              if (promptOverride === 'cancel-generate') {

                  // 获取并触发 AbortController
                  const abortController = abortControllersRef.current.get(id);
                  if (abortController) {
                      abortController.abort();
                      abortControllersRef.current.delete(id);
                  }

                  // 更新节点状态
                  handleNodeUpdate(id, {
                      status: 'prompting',
                      progress: 0,
                      error: undefined
                  });
                  setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));

                  return;
              }

              if (promptOverride === 'generate-video') {

                  const generatedPrompt = node.data.generatedPrompt;
                  if (!generatedPrompt) {
                      throw new Error('请先生成提示词');
                  }

                  // Get model config
                  const selectedPlatform = node.data.selectedPlatform || 'yunwuapi';
                  const selectedModel = node.data.selectedModel || 'luma';
                  const modelConfig = node.data.modelConfig || {
                      aspect_ratio: '16:9',
                      duration: '5',
                      quality: 'standard'
                  };


                  // Set to generating status
                  handleNodeUpdate(id, {
                      status: 'generating',
                      progress: 0
                  });
                  setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.WORKING } : n));

                  try {
                      // Handle image fusion (if exists)
                      let referenceImageUrl: string | undefined;
                      if (node.data.fusedImage) {

                          handleNodeUpdate(id, { progress: 10 });

                          // Import OSS service
                          const { uploadFileToOSS } = await import('../services/ossService');
                          const { getOSSConfig } = await import('../services/soraConfigService');

                          const ossConfig = getOSSConfig();
                          if (ossConfig) {
                              const fileName = `storyboard-fusion-${node.id}-${Date.now()}.png`;
                              referenceImageUrl = await uploadFileToOSS(node.data.fusedImage, fileName, ossConfig);

                              handleNodeUpdate(id, {
                                  fusedImageUrl: referenceImageUrl,
                                  progress: 20
                              });

                          } else {
                              console.warn('[STORYBOARD_VIDEO_GENERATOR] No OSS config, using base64 data URL');
                              referenceImageUrl = node.data.fusedImage;
                          }
                      }

                      // Get API key
                      const { getVideoPlatformApiKey } = await import('../services/soraConfigService');
                      const apiKey = getVideoPlatformApiKey(selectedPlatform);
                      if (!apiKey) {
                          const platformNames: Record<string, string> = {
                              'yunwuapi': '云雾API平台',
                              'official': '官方 Sora',
                              'custom': '自定义'
                          };
                          const platformName = platformNames[selectedPlatform] || selectedPlatform;
                          throw new Error(`请先在设置中配置 ${platformName} 的 API Key\n配置路径: 设置 → API 配置 → 视频平台 API Keys → ${platformName} Key`);
                      }

                      handleNodeUpdate(id, { progress: 30 });

                      // Generate video
                      const { generateVideoFromStoryboard } = await import('../services/videoGenerationService');


                      // 创建 AbortController 用于取消任务
                      const abortController = new AbortController();
                      abortControllersRef.current.set(id, abortController);

                      const result = await generateVideoFromStoryboard(
                          selectedPlatform as any,
                          selectedModel as any,
                          generatedPrompt,
                          referenceImageUrl,
                          modelConfig,
                          apiKey,
                          {
                              onProgress: (message, progress) => {
                                  const adjustedProgress = 30 + Math.round(progress * 0.7);
                                  handleNodeUpdate(id, { progress: adjustedProgress });
                              },
                              signal: abortController.signal,  // 传递取消信号
                              subModel: node.data.subModel  // 传递子模型
                          }
                      );

                      // 任务完成，清理 AbortController
                      abortControllersRef.current.delete(id);


                      // Create child node
                      const childNodeId = `node-storyboard-video-child-${Date.now()}`;
                      const childIndex = (node.data.childNodeIds?.length || 0) + 1;

                      const childNode: AppNode = {
                          id: childNodeId,
                          type: NodeType.STORYBOARD_VIDEO_CHILD,
                          x: node.x + (node.width || 420) + 50,
                          y: node.y + (childIndex - 1) * 150,
                          title: `视频结果 #${childIndex}`,
                          status: NodeStatus.SUCCESS,
                          data: {
                              prompt: generatedPrompt,
                              platformInfo: {
                                  platformCode: selectedPlatform,
                                  modelName: selectedModel
                              },
                              modelConfig,
                              videoUrl: result.videoUrl,
                              videoDuration: result.duration,
                              videoResolution: result.resolution,
                              fusedImageUrl: node.data.fusedImageUrl,
                              promptExpanded: false
                          },
                          inputs: [node.id]
                      };

                      const newConnection: Connection = {
                          from: node.id,
                          to: childNodeId
                      };

                      // Add to asset history
                      if (result.videoUrl) {
                          handleAssetGenerated('video', result.videoUrl, `分镜视频 #${childIndex}`);
                      }

                      // Update node
                      handleNodeUpdate(id, {
                          status: 'completed',
                          progress: 100,
                          currentTaskId: result.taskId,
                          childNodeIds: [...(node.data.childNodeIds || []), childNodeId]
                      });
                      setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));

                      // Add child node and connection
                      saveHistory();
                      setNodes(prev => [...prev, childNode]);
                      setConnections(prev => [...prev, newConnection]);

                  } catch (error: any) {
                      console.error('[STORYBOARD_VIDEO_GENERATOR] Video generation failed:', error);

                      // 清理 AbortController
                      abortControllersRef.current.delete(id);

                      // 如果是取消错误，不显示错误信息
                      if (error.message === '任务已取消') {
                          handleNodeUpdate(id, {
                              status: 'prompting',
                              error: undefined
                          });
                          setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));
                      } else {
                          handleNodeUpdate(id, {
                              status: 'prompting',
                              error: error.message || '视频生成失败'
                          });
                          setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.ERROR } : n));
                      }

                      throw error;
                  }

                  return;
              }

              if (promptOverride === 'regenerate-video') {

                  const generatedPrompt = node.data.generatedPrompt;
                  if (!generatedPrompt) {
                      throw new Error('请先生成提示词');
                  }

                  // Get model config
                  const selectedPlatform = node.data.selectedPlatform || 'yunwuapi';
                  const selectedModel = node.data.selectedModel || 'luma';
                  const modelConfig = node.data.modelConfig || {
                      aspect_ratio: '16:9',
                      duration: '5',
                      quality: 'standard'
                  };


                  // Set to generating status
                  handleNodeUpdate(id, {
                      status: 'generating',
                      progress: 0
                  });
                  setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.WORKING } : n));

                  try {
                      // Handle image fusion (if exists)
                      let referenceImageUrl: string | undefined;
                      if (node.data.fusedImage) {

                          handleNodeUpdate(id, { progress: 10 });

                          // Import OSS service
                          const { uploadFileToOSS } = await import('../services/ossService');
                          const { getOSSConfig } = await import('../services/soraConfigService');

                          const ossConfig = getOSSConfig();
                          if (ossConfig) {
                              // Check if already uploaded
                              if (node.data.fusedImageUrl) {
                                  referenceImageUrl = node.data.fusedImageUrl;
                              } else {
                                  const fileName = `storyboard-fusion-${node.id}-${Date.now()}.png`;
                                  referenceImageUrl = await uploadFileToOSS(node.data.fusedImage, fileName, ossConfig);

                                  handleNodeUpdate(id, {
                                      fusedImageUrl: referenceImageUrl,
                                      progress: 20
                                  });

                              }
                          } else {
                              console.warn('[STORYBOARD_VIDEO_GENERATOR] No OSS config, using base64 data URL');
                              referenceImageUrl = node.data.fusedImage;
                          }
                      }

                      // Get API key
                      const { getVideoPlatformApiKey } = await import('../services/soraConfigService');
                      const apiKey = getVideoPlatformApiKey(selectedPlatform);
                      if (!apiKey) {
                          const platformNames: Record<string, string> = {
                              'yunwuapi': '云雾API平台',
                              'official': '官方 Sora',
                              'custom': '自定义'
                          };
                          const platformName = platformNames[selectedPlatform] || selectedPlatform;
                          throw new Error(`请先在设置中配置 ${platformName} 的 API Key\n配置路径: 设置 → API 配置 → 视频平台 API Keys → ${platformName} Key`);
                      }

                      handleNodeUpdate(id, { progress: 30 });

                      // Generate video
                      const { generateVideoFromStoryboard } = await import('../services/videoGenerationService');


                      const result = await generateVideoFromStoryboard(
                          selectedPlatform as any,
                          selectedModel as any,
                          generatedPrompt,
                          referenceImageUrl,
                          modelConfig,
                          apiKey,
                          {
                              onProgress: (message, progress) => {
                                  const adjustedProgress = 30 + Math.round(progress * 0.7);
                                  handleNodeUpdate(id, { progress: adjustedProgress });
                              },
                              subModel: node.data.subModel  // 传递子模型
                          }
                      );


                      // Create child node
                      const childNodeId = `node-storyboard-video-child-${Date.now()}`;
                      const childIndex = (node.data.childNodeIds?.length || 0) + 1;

                      const childNode: AppNode = {
                          id: childNodeId,
                          type: NodeType.STORYBOARD_VIDEO_CHILD,
                          x: node.x + (node.width || 420) + 50,
                          y: node.y + (childIndex - 1) * 150,
                          title: `视频结果 #${childIndex}`,
                          status: NodeStatus.SUCCESS,
                          data: {
                              prompt: generatedPrompt,
                              platformInfo: {
                                  platformCode: selectedPlatform,
                                  modelName: selectedModel
                              },
                              modelConfig,
                              videoUrl: result.videoUrl,
                              videoDuration: result.duration,
                              videoResolution: result.resolution,
                              fusedImageUrl: node.data.fusedImageUrl,
                              promptExpanded: false
                          },
                          inputs: [node.id]
                      };

                      const newConnection: Connection = {
                          from: node.id,
                          to: childNodeId
                      };

                      // Add to asset history
                      if (result.videoUrl) {
                          handleAssetGenerated('video', result.videoUrl, `分镜视频 #${childIndex}`);
                      }

                      // Update node
                      handleNodeUpdate(id, {
                          status: 'completed',
                          progress: 100,
                          currentTaskId: result.taskId,
                          childNodeIds: [...(node.data.childNodeIds || []), childNodeId]
                      });
                      setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));

                      // Add child node and connection
                      saveHistory();
                      setNodes(prev => [...prev, childNode]);
                      setConnections(prev => [...prev, newConnection]);

                  } catch (error: any) {
                      console.error('[STORYBOARD_VIDEO_GENERATOR] Video regeneration failed:', error);

                      handleNodeUpdate(id, {
                          status: 'prompting',
                          error: error.message || '视频重新生成失败'
                      });
                      setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.ERROR } : n));

                      throw error;
                  }

                  return;
              }
          }

          const upstreamTexts = inputs.map(n => {
              if (n?.type === NodeType.PROMPT_INPUT) return n.data.prompt;
              if (n?.type === NodeType.VIDEO_ANALYZER) return n.data.analysis;
              if (n?.type === NodeType.SCRIPT_EPISODE && n.data.generatedEpisodes) {
                  // 只传递角色列表和标题，不传完整剧本内容
                  return n.data.generatedEpisodes.map(ep => `${ep.title}\n角色: ${ep.characters}`).join('\n');
              }
              if (n?.type === NodeType.SCRIPT_PLANNER) return n.data.scriptOutline;
              if (n?.type === NodeType.DRAMA_ANALYZER) {
                  const selected = n.data.selectedFields || [];
                  if (selected.length === 0) return null;

                  const fieldLabels: Record<string, string> = {
                      dramaIntroduction: '剧集介绍',
                      worldview: '世界观分析',
                      logicalConsistency: '逻辑自洽性',
                      extensibility: '延展性分析',
                      characterTags: '角色标签',
                      protagonistArc: '主角弧光',
                      audienceResonance: '受众共鸣点',
                      artStyle: '画风分析'
                  };

                  const parts = selected.map(fieldKey => {
                      const value = n.data[fieldKey as keyof typeof n.data] as string || '';
                      const label = fieldLabels[fieldKey] || fieldKey;
                      return `【${label}】\n${value}`;
                  });

                  return parts.join('\n\n');
              }
              return null;
          }).filter(t => t && t.trim().length > 0) as string[];

          let prompt = promptOverride || node.data.prompt || '';
          if (upstreamTexts.length > 0) {
              const combinedUpstream = upstreamTexts.join('\n\n');
              prompt = prompt ? `${combinedUpstream}\n\n${prompt}` : combinedUpstream;
          }

          if (node.type === NodeType.DRAMA_ANALYZER) {
              // --- Drama Analyzer Logic ---
              const dramaName = node.data.dramaName?.trim();
              if (!dramaName) {
                  throw new Error("请输入剧名");
              }

              const { analyzeDrama } = await import('../services/geminiService');
              const analysis = await analyzeDrama(dramaName);

              // Spread all analysis fields into node data
              handleNodeUpdate(id, {
                  dramaIntroduction: analysis.dramaIntroduction,
                  worldview: analysis.worldview,
                  logicalConsistency: analysis.logicalConsistency,
                  extensibility: analysis.extensibility,
                  characterTags: analysis.characterTags,
                  protagonistArc: analysis.protagonistArc,
                  audienceResonance: analysis.audienceResonance,
                  artStyle: analysis.artStyle,
                  selectedFields: [] // Initialize empty selection
              });

          } else if (node.type === NodeType.CHARACTER_NODE) {
              // --- Character Node Generation Logic ---


              // For character name extraction: Use ONLY direct inputs (not recursive)
              const directUpstreamTexts = inputs.map(n => {
                  if (n?.type === NodeType.PROMPT_INPUT) return n.data.prompt;
                  if (n?.type === NodeType.VIDEO_ANALYZER) return n.data.analysis;
                  if (n?.type === NodeType.SCRIPT_EPISODE && n.data.generatedEpisodes) {
                      return n.data.generatedEpisodes.map(ep => `${ep.title}\n角色: ${ep.characters}`).join('\n');
                  }
                  if (n?.type === NodeType.SCRIPT_PLANNER) return n.data.scriptOutline;
                  if (n?.type === NodeType.DRAMA_ANALYZER) {
                      const selected = n.data.selectedFields || [];
                      if (selected.length === 0) return null;
                      const fieldLabels: Record<string, string> = {
                          dramaIntroduction: '剧集介绍',
                          worldview: '世界观分析',
                          logicalConsistency: '逻辑自洽性',
                          extensibility: '延展性分析',
                          characterTags: '角色标签',
                          protagonistArc: '主角弧光',
                          audienceResonance: '受众共鸣点',
                          artStyle: '画风分析'
                      };
                      const parts = selected.map(fieldKey => {
                          const value = n.data[fieldKey as keyof typeof n.data] as string || '';
                          const label = fieldLabels[fieldKey] || fieldKey;
                          return `【${label}】\n${value}`;
                      });
                      return parts.join('\n\n');
                  }
                  return null;
              }).filter(t => t && t.trim().length > 0) as string[];

              // For character info generation: Use recursive upstream context (includes SCRIPT_PLANNER, etc.)
              const recursiveUpstreamTexts = getUpstreamContext(node, nodesRef.current);


              if (!node.data.extractedCharacterNames || node.data.extractedCharacterNames.length === 0) {
                  // STEP 1: Extract character names from DIRECT inputs only
                  if (directUpstreamTexts.length > 0) {
                      const allCharacterNames: string[] = [];
                      const { extractCharactersFromText } = await import('../services/geminiService');

                      for (const text of directUpstreamTexts) {
                          const names = await extractCharactersFromText(text);
                          allCharacterNames.push(...names);
                      }

                      const uniqueNames = Array.from(new Set(allCharacterNames.map(name => name.trim()))).filter(name => name.length > 0);


                      handleNodeUpdate(id, { extractedCharacterNames: uniqueNames, characterConfigs: {} });
                      setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));
                      return;
                  } else {
                      throw new Error("请先连接剧本大纲或剧本分集节点");
                  }
              }

              // STEP 2: Generate character info using RECURSIVE context (includes all upstream content)
              const names = node.data.extractedCharacterNames || [];
              const configs = node.data.characterConfigs || {};
              const generatedChars = node.data.generatedCharacters || [];
              const newGeneratedChars = [...generatedChars];

              // 严格检查：只处理真正需要生成的角色
              // 避免直接点击触发时重复生成已完成的角色
              const charactersNeedingGeneration = names.filter(name => {
                  const existingChar = generatedChars.find(c => c.name === name);
                  // 只有以下情况需要处理：
                  // 1. 角色不存在
                  // 2. 角色处于 ERROR 状态（需要重新生成）
                  // 3. 角色没有任何基础信息（profile为空）
                  if (!existingChar) {
                      return true; // 新角色，需要生成
                  }
                  // 对于 SUCCESS、IDLE、GENERATING、PENDING 状态的角色，跳过
                  // 直接点击生成会通过 handleCharacterAction 单独处理，不通过这里
                  return false;
              });

              // 如果没有需要生成的角色，直接返回
              if (charactersNeedingGeneration.length === 0) {
                  // 更新状态为 SUCCESS（如果所有角色都已完成）
                  if (generatedChars.length > 0) {
                      const allDone = generatedChars.every(c => 
                          c.status === 'SUCCESS' || c.status === 'IDLE' || c.status === 'ERROR'
                      );
                      if (allDone) {
                          setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));
                      }
                  }
                  return;
              }

              // Extract style preset from inputs (priority: STYLE_PRESET > upstream context)
              const stylePresetNode = inputs.find(n => n.type === NodeType.STYLE_PRESET);
              let stylePrompt = '';

              if (stylePresetNode?.data.stylePrompt) {
                  // Use style preset if connected
                  stylePrompt = stylePresetNode.data.stylePrompt;
              } else {
                  // Fallback to unified helper
                  const { style, genre, setting } = getUpstreamStyleContext(node, nodesRef.current);
                  stylePrompt = getVisualPromptPrefix(style, genre, setting);
              }

              for (const name of charactersNeedingGeneration) {
                  const config = configs[name] || { method: 'AI_AUTO' };

                  // 设置为生成中状态（不可变更新）
                  const existingIdx = newGeneratedChars.findIndex(c => c.name === name);
                  if (existingIdx >= 0) {
                      newGeneratedChars[existingIdx] = { ...newGeneratedChars[existingIdx], status: 'GENERATING' };
                  } else {
                      newGeneratedChars.push({ id: '', name, status: 'GENERATING' } as any);
                  }
                  handleNodeUpdate(id, { generatedCharacters: [...newGeneratedChars] });

                  if (config.method === 'LIBRARY' && config.libraryId) {
                      const libChar = assetHistory.find(a => a.id === config.libraryId && a.type === 'character');
                      if (libChar) {
                          const idx = newGeneratedChars.findIndex(c => c.name === name);
                          newGeneratedChars[idx] = { ...libChar.data, id: `char-inst-${Date.now()}-${name}`, status: 'SUCCESS' };
                      }
                      // LIBRARY 分支不走 handleCharacterActionNew，需要手动更新
                      handleNodeUpdate(id, { generatedCharacters: [...newGeneratedChars] });
                  } else if (config.method === 'SUPPORTING_ROLE') {
                      // SUPPORTING CHARACTER: 只生成基础信息，不生成图片
                      const context = recursiveUpstreamTexts.join('\n');


                      try {
                          // Import the supporting character generator
                          const { generateSupportingCharacter } = await import('../services/geminiService');

                          // Step 1: Generate simplified profile
                          const profile = await generateSupportingCharacter(
                              name,
                              context,
                              stylePrompt,
                              getUserDefaultModel('text'),
                              { nodeId: id, nodeType: node.type }
                          );

                          const idx = newGeneratedChars.findIndex(c => c.name === name);
                          const existingChar = newGeneratedChars[idx];
                          newGeneratedChars[idx] = {
                              ...profile,
                              expressionSheet: existingChar?.expressionSheet,
                              threeViewSheet: existingChar?.threeViewSheet,
                              status: 'SUCCESS' as const,
                              roleType: 'supporting',
                              isGeneratingExpression: false,
                              isGeneratingThreeView: false
                          };
                      } catch (e: any) {
                          const idx = newGeneratedChars.findIndex(c => c.name === name);
                          newGeneratedChars[idx] = { ...newGeneratedChars[idx], status: 'ERROR', error: e.message };
                      }
                      // SUPPORTING_ROLE 分支不走 handleCharacterActionNew，需要手动更新
                      handleNodeUpdate(id, { generatedCharacters: [...newGeneratedChars] });
                  } else {
                      // 主角：只生成基础信息，不自动生成表情和三视图
                      // 表情和三视图需要用户额外点击生成

                      try {

                          // 只调用 GENERATE_SINGLE，生成基础信息
                          const { handleCharacterAction: handleCharacterActionNew } = await import('../services/characterActionHandler');
                          await handleCharacterActionNew(
                              id,                  // nodeId
                              'GENERATE_SINGLE',   // action ← 只生成基础信息
                              name,                // charName
                              node,                // node
                              nodesRef.current,    // allNodes
                              handleNodeUpdate     // onNodeUpdate
                          );


                          // 从 nodesRef 获取最新的完整角色列表，同步到 newGeneratedChars
                          // 这确保了 handleCharacterActionNew 内部通过 updateNodeUI 更新的所有角色数据都被保留
                          const latestNode = nodesRef.current.find(n => n.id === id);
                          const latestChars = latestNode?.data?.generatedCharacters || [];
                          if (latestChars.length > 0) {
                              // 用最新数据替换 newGeneratedChars 中已有的角色
                              for (const latestChar of latestChars) {
                                  const idx = newGeneratedChars.findIndex(c => c.name === latestChar.name);
                                  if (idx >= 0) {
                                      newGeneratedChars[idx] = { ...latestChar };
                                  }
                              }
                          }

                      } catch (e: any) {
                          console.error('[CHARACTER_NODE] Profile generation failed for:', name, e);
                          console.error('[CHARACTER_NODE] Error stack:', e?.stack);
                          console.error('[CHARACTER_NODE] Error details:', {
                              message: e?.message,
                              name: e?.name,
                              cause: e?.cause
                          });
                          const idx = newGeneratedChars.findIndex(c => c.name === name);
                          if (idx >= 0) {
                              newGeneratedChars[idx] = { ...newGeneratedChars[idx], status: 'ERROR', error: e?.message || String(e) };
                          }
                      }
                  }

                  // handleCharacterActionNew 内部已通过 updateNodeUI 更新了 node.data
                  // 不再在此处重复调用 handleNodeUpdate，避免用过时数据覆盖
              }

              // 从最新的 node state 判断最终状态，避免使用过时的 newGeneratedChars
              setNodes(p => p.map(n => {
                  if (n.id !== id) return n;
                  const chars = n.data.generatedCharacters || [];
                  if (chars.length === 0) return { ...n, status: NodeStatus.IDLE };
                  const allDone = chars.every(c => c.status === 'SUCCESS' || c.status === 'IDLE');
                  const hasError = chars.some(c => c.status === 'ERROR');
                  if (allDone) return { ...n, status: NodeStatus.SUCCESS };
                  if (hasError) return { ...n, status: NodeStatus.ERROR };
                  return { ...n, status: NodeStatus.SUCCESS };
              }));

          } else if (node.type === NodeType.STYLE_PRESET) {
              // --- Style Preset Generation Logic ---

              // Extract upstream style information
              let artStyle = '';
              let visualStyle: 'REAL' | 'ANIME' | '3D' = 'ANIME';
              let genre = '';
              let setting = '';

              // Merge from all upstream nodes
              for (const input of inputs) {
                  if (input.type === NodeType.DRAMA_ANALYZER && input.data.artStyle) {
                      artStyle = input.data.artStyle;
                  }
                  if (input.type === NodeType.SCRIPT_PLANNER) {
                      if (input.data.scriptVisualStyle) visualStyle = input.data.scriptVisualStyle;
                      if (input.data.scriptGenre) genre = input.data.scriptGenre;
                      if (input.data.scriptSetting) setting = input.data.scriptSetting;
                  }
                  if (input.type === NodeType.DRAMA_REFINED && input.data.refinedContent) {
                      // Extract from refined content if available
                      const refined = input.data.refinedContent;
                      if (refined.artStyle && refined.artStyle.length > 0) {
                          artStyle = refined.artStyle.join(', ');
                      }
                  }
              }

              // Get user configuration
              const presetType = node.data.stylePresetType || 'SCENE'; // 'SCENE' or 'CHARACTER'
              const userInput = node.data.styleUserInput || '';

              // Generate style preset
              const { generateStylePreset } = await import('../services/geminiService');
              const result = await generateStylePreset(
                  presetType,
                  visualStyle,
                  { artStyle, genre, setting },
                  userInput
              );

              handleNodeUpdate(id, {
                  stylePrompt: result.stylePrompt,
                  negativePrompt: result.negativePrompt,
                  visualStyle // Store for reference
              });

          } else if (node.type === NodeType.SCRIPT_PLANNER) {
              // 检查是否有连接的 DRAMA_REFINED 节点
              const refinedNode = inputs.find(n => n.type === NodeType.DRAMA_REFINED);
              const refinedInfo = refinedNode?.data.refinedContent;

              const { generateScriptPlanner } = await import('../services/geminiService');
              const outline = await generateScriptPlanner(prompt, {
                  theme: node.data.scriptTheme,
                  genre: node.data.scriptGenre,
                  setting: node.data.scriptSetting,
                  episodes: node.data.scriptEpisodes,
                  duration: node.data.scriptDuration,
                  visualStyle: node.data.scriptVisualStyle // Pass Visual Style
              }, refinedInfo, getUserDefaultModel('text')); // 传入精炼信息作为参考和模型，总是使用最新配置
              handleNodeUpdate(id, { scriptOutline: outline });

          } else if (node.type === NodeType.SCRIPT_EPISODE) {
              const planner = inputs.find(n => n.type === NodeType.SCRIPT_PLANNER);
              if (!planner || !planner.data.scriptOutline) throw new Error("Need connected Script Planner with outline");

              if (!node.data.selectedChapter) throw new Error("Please select a chapter first");

              // Inherit style if not set or updated
              let currentStyle = node.data.scriptVisualStyle;
              if (!currentStyle && planner.data.scriptVisualStyle) {
                  currentStyle = planner.data.scriptVisualStyle;
                  handleNodeUpdate(id, { scriptVisualStyle: currentStyle });
              }

              // Collect previous episodes from all SCRIPT_EPISODE nodes that come before this one
              // This ensures continuity across episodes
              const allScriptEpisodeNodes = nodesRef.current.filter(
                  n => n.type === NodeType.SCRIPT_EPISODE && n.data.generatedEpisodes && n.data.generatedEpisodes.length > 0
              );

              const previousEpisodes = allScriptEpisodeNodes.flatMap(n => n.data.generatedEpisodes);


              const { generateScriptEpisodes } = await import('../services/geminiService');
              const episodes = await generateScriptEpisodes(
                  planner.data.scriptOutline,
                  node.data.selectedChapter,
                  node.data.episodeSplitCount || 3,
                  planner.data.scriptDuration || 1,
                  currentStyle, // Pass Visual Style
                  node.data.episodeModificationSuggestion, // Pass Modification Suggestion
                  getUserDefaultModel('text'), // 总是使用最新的模型配置
                  previousEpisodes // Pass previous episodes for continuity
              );

              // ... (Episode Expansion Logic UNCHANGED) ...
              if (episodes && episodes.length > 0) {
                  const newNodes: AppNode[] = [];
                  const newConnections: Connection[] = [];

                  const startX = node.x + (node.width || 420) + 150;
                  const startY = node.y;
                  const gapY = 40;
                  const nodeHeight = 360;

                  episodes.forEach((ep, index) => {
                      const newNodeId = `n-ep-${Date.now()}-${index}`;

                      // Build formatted content with all episode information
                      let formattedContent = `## ${ep.title}\n\n`;
                      formattedContent += `**角色**: ${ep.characters}\n`;
                      if (ep.keyItems) {
                          formattedContent += `**关键物品**: ${ep.keyItems}\n`;
                      }
                      formattedContent += `\n${ep.content}`;
                      if (ep.continuityNote) {
                          formattedContent += `\n\n**连贯性说明**: ${ep.continuityNote}`;
                      }

                      newNodes.push({
                          id: newNodeId,
                          type: NodeType.PROMPT_INPUT,
                          x: startX,
                          y: startY + index * (nodeHeight + gapY),
                          width: 420,
                          title: ep.title,
                          status: NodeStatus.IDLE,
                          data: {
                              prompt: formattedContent,
                              model: 'gemini-3-pro-preview',
                              isEpisodeChild: true,
                          },
                          inputs: [node.id]
                      });
                      newConnections.push({ from: node.id, to: newNodeId });
                  });

                  saveHistory();
                  setNodes(prev => [...prev, ...newNodes]);
                  setConnections(prev => [...prev, ...newConnections]);
                  
                  handleNodeUpdate(id, { generatedEpisodes: episodes });
              }

          } else if (node.type === NodeType.IMAGE_GENERATOR) {
               // Extract style preset from inputs
               const stylePresetNode = inputs.find(n => n.type === NodeType.STYLE_PRESET);
               const stylePrefix = stylePresetNode?.data.stylePrompt || '';
               const finalPrompt = stylePrefix ? `${stylePrefix}, ${prompt}` : prompt;

               const inputImages: string[] = [];
               inputs.forEach(n => { if (n?.data.image) inputImages.push(n.data.image); });
               const isStoryboard = /分镜|storyboard|sequence|shots|frames|json/i.test(finalPrompt);
               if (isStoryboard) {
                  try {
                      const { planStoryboard } = await import('../services/geminiService');
                      const storyboard = await planStoryboard(finalPrompt, upstreamTexts.join('\n'));
                      if (storyboard.length > 1) {
                          // ... (Storyboard Expansion Logic UNCHANGED) ...
                          const newNodes: AppNode[] = [];
                          const newConnections: Connection[] = [];
                          const COLUMNS = 3;
                          const gapX = 40; const gapY = 40;
                          const childWidth = node.width || 420;
                          const ratio = node.data.aspectRatio || '16:9';
                          const [rw, rh] = ratio.split(':').map(Number);
                          const childHeight = (childWidth * rh / rw); 
                          const startX = node.x + (node.width || 420) + 150;
                          const startY = node.y; 
                          const totalRows = Math.ceil(storyboard.length / COLUMNS);
                          
                          storyboard.forEach((shotPrompt, index) => {
                              const col = index % COLUMNS;
                              const row = Math.floor(index / COLUMNS);
                              const posX = startX + col * (childWidth + gapX);
                              const posY = startY + row * (childHeight + gapY);
                              const newNodeId = `n-${Date.now()}-${index}`;
                              newNodes.push({
                                  id: newNodeId, type: NodeType.IMAGE_GENERATOR, x: posX, y: posY, width: childWidth, height: childHeight,
                                  title: `分镜 ${index + 1}`, status: NodeStatus.WORKING,
                                  data: { ...node.data, aspectRatio: ratio, prompt: shotPrompt, image: undefined, images: undefined, imageCount: 1 },
                                  inputs: [node.id] 
                              });
                              newConnections.push({ from: node.id, to: newNodeId });
                          });
                          
                          const groupPadding = 30;
                          const groupWidth = (Math.min(storyboard.length, COLUMNS) * childWidth) + ((Math.min(storyboard.length, COLUMNS) - 1) * gapX) + (groupPadding * 2);
                          const groupHeight = (totalRows * childHeight) + ((totalRows - 1) * gapY) + (groupPadding * 2);

                          setGroups(prev => [...prev, { id: `g-${Date.now()}`, title: '分镜生成组', x: startX - groupPadding, y: startY - groupPadding, width: groupWidth, height: groupHeight }]);
                          setNodes(prev => [...prev, ...newNodes]);
                          setConnections(prev => [...prev, ...newConnections]);
                          handleNodeUpdate(id, { status: NodeStatus.SUCCESS });

                          newNodes.forEach(async (n) => {
                               try {
                                   const { generateImageFromText } = await import('../services/geminiService');
                                   const res = await generateImageFromText(n.data.prompt!, getUserDefaultModel('image'), inputImages, { aspectRatio: n.data.aspectRatio, resolution: n.data.resolution, count: 1 });
                                   handleNodeUpdate(n.id, { image: res[0], images: res, status: NodeStatus.SUCCESS });
                               } catch (e: any) {
                                   handleNodeUpdate(n.id, { error: e.message, status: NodeStatus.ERROR });
                               }
                          });
                          return; 
                      }
                  } catch (e) { console.warn("Storyboard planning failed", e); }
               }

               // ✅ 检查缓存
               const cachedImages = await checkImageNodeCache(id);
               if (cachedImages && cachedImages.length > 0) {
                   handleNodeUpdate(id, {
                       image: cachedImages[0],
                       images: cachedImages,
                       status: NodeStatus.SUCCESS,
                       isCached: true,
                       cacheLocation: 'filesystem'
                   });
               } else {
                   // ❌ 没有缓存，调用 API
                  const { generateImageFromText } = await import('../services/geminiService');
                  const res = await generateImageFromText(
                      finalPrompt,
                      getUserDefaultModel('image'),
                      inputImages,
                      { aspectRatio: node.data.aspectRatio || '16:9', resolution: node.data.resolution, count: node.data.imageCount },
                      { nodeId: id, nodeType: node.type }
                  );
                  handleNodeUpdate(id, {
                      image: res[0],
                      images: res,
                      isCached: false
                  });
                  // Save to local storage
                  await saveImageNodeOutput(id, res, 'IMAGE_GENERATOR');
               }

          } else if (node.type === NodeType.VIDEO_GENERATOR) {
              // Extract style preset from inputs
              const stylePresetNode = inputs.find(n => n.type === NodeType.STYLE_PRESET);
              const stylePrefix = stylePresetNode?.data.stylePrompt || '';
              const finalPrompt = stylePrefix ? `${stylePrefix}, ${prompt}` : prompt;

              const { getGenerationStrategy } = await import('../services/videoStrategies');
              const strategy = await getGenerationStrategy(node, inputs, finalPrompt);

              // ✅ 检查缓存
              const cachedVideo = await checkVideoNodeCache(id);
              if (cachedVideo) {
                  handleNodeUpdate(id, {
                      videoUri: cachedVideo,
                      videoMetadata: node.data.videoMetadata,
                      videoUris: [cachedVideo],
                      status: NodeStatus.SUCCESS,
                      isCached: true,
                      cacheLocation: 'filesystem'
                  });
              } else {
                  // ❌ 没有缓存，调用 API
                  const { generateVideo } = await import('../services/geminiService');
                  const res = await generateVideo(
                      strategy.finalPrompt,
                      node.data.model,
                      {
                          aspectRatio: node.data.aspectRatio || '16:9',
                          count: node.data.videoCount || 1,
                          generationMode: strategy.generationMode,
                          resolution: node.data.resolution
                      },
                      strategy.inputImageForGeneration,
                      strategy.videoInput,
                      strategy.referenceImages,
                      { nodeId: id, nodeType: node.type }
                  );
                  if (res.isFallbackImage) {
                       handleNodeUpdate(id, {
                           image: res.uri,
                           videoUri: undefined,
                           videoMetadata: undefined,
                           error: "Region restricted: Generated preview image instead.",
                           status: NodeStatus.SUCCESS,
                           isCached: false
                       });
                  } else {
                       handleNodeUpdate(id, {
                           videoUri: res.uri,
                           videoMetadata: res.videoMetadata,
                           videoUris: res.uris,
                           isCached: false
                       });
                       // Save to local storage
                       const videoUris = res.uris || [res.uri];
                       await saveVideoNodeOutput(id, videoUris, 'VIDEO_GENERATOR');
                  }
              }

          } else if (node.type === NodeType.AUDIO_GENERATOR) {
              // Extract style preset from inputs
              const stylePresetNode = inputs.find(n => n.type === NodeType.STYLE_PRESET);
              const stylePrefix = stylePresetNode?.data.stylePrompt || '';
              const finalPrompt = stylePrefix ? `${stylePrefix}, ${prompt}` : prompt;

              // ✅ 检查缓存
              const cachedAudio = await checkAudioNodeCache(id);
              if (cachedAudio) {
                  handleNodeUpdate(id, {
                      audioUri: cachedAudio,
                      status: NodeStatus.SUCCESS,
                      isCached: true,
                      cacheLocation: 'filesystem'
                  });
              } else {
                  // ❌ 没有缓存，调用 API
                  const { generateAudio } = await import('../services/geminiService');
                  const audioUri = await generateAudio(finalPrompt, node.data.model);
                  handleNodeUpdate(id, {
                      audioUri: audioUri,
                      isCached: false
                  });
                  // Save to local storage
                  await saveAudioNodeOutput(id, audioUri, 'AUDIO_GENERATOR');
              }

          } else if (node.type === NodeType.STORYBOARD_GENERATOR) {
              const episodeContent = prompt; 
              if (!episodeContent.trim()) throw new Error("请连接包含剧本内容的节点 (Input Node)");

              const { generateCinematicStoryboard } = await import('../services/geminiService');
              const shots = await generateCinematicStoryboard(
                  episodeContent,
                  node.data.storyboardCount || 6,
                  node.data.storyboardDuration || 4,
                  node.data.storyboardStyle || 'REAL'
              );

              handleNodeUpdate(id, { storyboardShots: shots });

              const updatedShots = [...shots];
              
              const processShotImage = async (shotIndex: number) => {
                  const shot = updatedShots[shotIndex];
                  const stylePrompt = node.data.storyboardStyle === 'ANIME'
                      ? 'Anime style, Japanese animation, Studio Ghibli style, 2D, Cel shaded, vibrant colors.'
                      : node.data.storyboardStyle === '3D'
                      ? 'Xianxia 3D animation character, semi-realistic style, Xianxia animation aesthetics, high precision 3D modeling, PBR shading with soft translucency, subsurface scattering, ambient occlusion, delicate and smooth skin texture (not overly realistic), flowing fabric clothing, individual hair strands, soft ethereal lighting, cinematic rim lighting with cool blue tones, otherworldly gaze, elegant and cold demeanor, 3D animation quality, vibrant colors.'
                      : 'Cinematic Movie Still, Photorealistic, 8k, Live Action, highly detailed.';

                  const visualPrompt = `
                  ${stylePrompt}
                  Subject: ${shot.subject}.
                  Scene: ${shot.scene}.
                  Camera: ${shot.camera}.
                  Lighting: ${shot.lighting}.
                  Style: ${shot.style}.
                  Negative: ${shot.negative}.
                  `;
                  try {
                      const { generateImageFromText } = await import('../services/geminiService');
                      const imgs = await generateImageFromText(visualPrompt, getUserDefaultModel('image'), [], { aspectRatio: node.data.aspectRatio || '16:9', count: 1 });
                      if (imgs && imgs.length > 0) {
                          updatedShots[shotIndex] = { ...shot, imageUrl: imgs[0] };
                          handleNodeUpdate(id, { storyboardShots: [...updatedShots] });
                      }
                  } catch (e) {
                      console.warn(`Failed to gen image for shot ${shotIndex}`, e);
                  }
              };

              await Promise.all(updatedShots.map((_, i) => processShotImage(i)));

          } else if (node.type === NodeType.STORYBOARD_IMAGE) {
              // Check if this is a panel or page regeneration request
              const regeneratePanelIndex = node.data.storyboardRegeneratePanel;
              const regeneratePageIndex = node.data.storyboardRegeneratePanel;
              const isRegeneratingPanel = typeof regeneratePanelIndex === 'number';
              const isRegeneratingPage = typeof regeneratePageIndex === 'number';
              const isRegenerating = isRegeneratingPanel || isRegeneratingPage;

              // Get existing shots data or fetch from input
              let extractedShots: any[] = node.data.storyboardShots || [];

              if (!isRegenerating || extractedShots.length === 0) {
                  // Normal generation or no existing shots - get from input
                  let storyboardContent = prompt.trim();

                  // Check if there's a connected PROMPT_INPUT node with episodeStoryboard data
                  const promptInputNode = inputs.find(n => n.type === NodeType.PROMPT_INPUT);
                  if (promptInputNode?.data.episodeStoryboard) {
                      const storyboard = promptInputNode.data.episodeStoryboard;

                      // Keep the full structured data for detailed prompt generation
                      storyboardContent = JSON.stringify({
                          shots: storyboard.shots.map((shot: any) => ({
                              shotNumber: shot.shotNumber,
                              duration: shot.duration,
                              scene: shot.scene || '',
                              characters: shot.characters || [],
                              shotSize: shot.shotSize || '',
                              cameraAngle: shot.cameraAngle || '',
                              cameraMovement: shot.cameraMovement || '',
                              visualDescription: shot.visualDescription || '',
                              dialogue: shot.dialogue || '无',
                              visualEffects: shot.visualEffects || '',
                              audioEffects: shot.audioEffects || '',
                              startTime: shot.startTime || 0,
                              endTime: shot.endTime || (shot.startTime || 0) + (shot.duration || 3)
                          }))
                      }, null, 2); // 使用格式化输出，便于调试
                  }

                  if (!storyboardContent) {
                      throw new Error("请输入分镜描述或连接剧本分集子节点");
                  }


                  // Extract shots with full structured data
                  // Try to parse as JSON first (from generateDetailedStoryboard)
                  // 直接尝试解析整个字符串作为JSON
                  try {
                      const parsed = JSON.parse(storyboardContent);
                      if (parsed.shots && Array.isArray(parsed.shots) && parsed.shots.length > 0) {
                          extractedShots = parsed.shots;
                      }
                  } catch (e) {
                      console.warn('[STORYBOARD_IMAGE] Failed to parse JSON as whole, trying regex fallback:', e);
                      // 如果整体解析失败，尝试提取shots部分
                      const jsonMatch = storyboardContent.match(/\{[\s\S]*"shots"[\s\S]*\}/);
                      if (jsonMatch) {
                          try {
                              const parsed = JSON.parse(jsonMatch[0]);
                              if (parsed.shots && Array.isArray(parsed.shots)) {
                                  extractedShots = parsed.shots;
                              }
                          } catch (e2) {
                              console.warn('[STORYBOARD_IMAGE] Regex fallback also failed, using text parsing');
                          }
                      }
                  }

                  // Fallback: Parse text descriptions
                  if (extractedShots.length === 0) {
                      const numberedMatches = storyboardContent.match(/^\d+[.、)]\s*(.+)$/gm);
                      if (numberedMatches && numberedMatches.length > 0) {
                          extractedShots = numberedMatches.map(m => ({
                              visualDescription: m.replace(/^\d+[.、)]\s*/, '').trim()
                          }));
                      } else {
                          extractedShots = storyboardContent.split(/\n+/)
                              .map(line => line.trim())
                              .filter(line => line.length > 10)
                              .map(desc => ({ visualDescription: desc }));
                      }
                  }
              }

              if (extractedShots.length === 0) {
                  throw new Error("未能从内容中提取分镜描述，请检查格式");
              }


              // Get grid configuration
              const gridType = node.data.storyboardGridType || '9';
              const panelOrientation = node.data.storyboardPanelOrientation || '16:9';
              const gridConfig = getGridConfig(gridType);
              const shotsPerGrid = gridConfig.shotsPerGrid;
              const gridLayout = gridConfig.gridLayout;

              // Get resolution configuration
              const resolution = node.data.storyboardResolution || '1k';
              const resolutionConfig = STORYBOARD_RESOLUTIONS.find(r => r.quality === resolution) || STORYBOARD_RESOLUTIONS[0];

              // 🔧 修复：计算网格行列（用于后续尺寸计算）
              const cols = gridConfig.cols;
              const rows = gridConfig.rows;

              // 计算整体图片宽高比
              let panelWidthUnits: number;
              let panelHeightUnits: number;

              if (panelOrientation === '16:9') {
                  panelWidthUnits = 16;
                  panelHeightUnits = 9;
              } else {  // '9:16'
                  panelWidthUnits = 9;
                  panelHeightUnits = 16;
              }

              const totalWidthUnits = cols * panelWidthUnits;
              const totalHeightUnits = rows * panelHeightUnits;

              // 简化到最简
              const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
              const divisor = gcd(totalWidthUnits, totalHeightUnits);
              const simplifiedWidth = totalWidthUnits / divisor;
              const simplifiedHeight = totalHeightUnits / divisor;
              const calculatedRatio = `${simplifiedWidth}:${simplifiedHeight}`;

              // 映射到 API 支持的比例
              const supportedRatios = ['1:1', '4:3', '3:4', '16:9', '9:16', '21:9', '9:21'];
              const findClosestRatio = (targetRatio: string, supportedRatios: string[]): string => {
                  const [targetW, targetH] = targetRatio.split(':').map(Number);
                  const targetValue = targetW / targetH;

                  let closestRatio = supportedRatios[0];
                  let minDiff = Math.abs((supportedRatios[0].split(':').map(Number)[0] / supportedRatios[0].split(':').map(Number)[1]) - targetValue);

                  for (const ratio of supportedRatios) {
                      const [w, h] = ratio.split(':').map(Number);
                      const diff = Math.abs((w / h) - targetValue);
                      if (diff < minDiff) {
                          minDiff = diff;
                          closestRatio = ratio;
                      }
                  }
                  return closestRatio;
              };

              const imageAspectRatio = findClosestRatio(calculatedRatio, supportedRatios);

              // 🔧 修复：根据 imageAspectRatio 动态计算输出尺寸
              // 保持分辨率级别的像素总数（约 2K = 5-6M 像素）
              const targetMegapixels = resolutionConfig.width * resolutionConfig.height;  // 总像素数
              const [ratioW, ratioH] = imageAspectRatio.split(':').map(Number);
              const ratioValue = ratioW / ratioH;

              // 计算符合宽高比的尺寸
              let totalWidth: number;
              let totalHeight: number;

              if (ratioValue > 1) {
                  // 横屏 (16:9, 4:3, 21:9)
                  totalWidth = Math.sqrt(targetMegapixels * ratioValue);
                  totalHeight = totalWidth / ratioValue;
              } else if (ratioValue < 1) {
                  // 竖屏 (9:16, 3:4, 9:21)
                  totalHeight = Math.sqrt(targetMegapixels / ratioValue);
                  totalWidth = totalHeight * ratioValue;
              } else {
                  // 正方形 (1:1)
                  totalWidth = Math.sqrt(targetMegapixels);
                  totalHeight = totalWidth;
              }

              // 取整为 8 的倍数（优化编码）
              totalWidth = Math.round(totalWidth / 8) * 8;
              totalHeight = Math.round(totalHeight / 8) * 8;

              // 计算单个面板尺寸
              const panelWidth = Math.floor(totalWidth / cols);
              const panelHeight = Math.floor(totalHeight / rows);


              // Calculate number of pages needed
              const numberOfPages = Math.ceil(extractedShots.length / shotsPerGrid);


              // Get visual style from upstream
              const { style } = getUpstreamStyleContext(node, nodesRef.current);
              const stylePrefix = getVisualPromptPrefix(style);

              // Get user-configured image model priority
              const imageModelPriority = getUserPriority('image' as ModelCategory);
              const primaryImageModel = imageModelPriority[0] || getDefaultModel('image');

              // Extract character reference images from upstream CHARACTER_NODE (for all cases)
              const characterReferenceImages: string[] = [];
              const characterNames: string[] = [];  // Track character names for prompt
              const characterNameMap = new Map<string, string>();  // Chinese name → English code (Character A, B, C...)
              const characterNode = inputs.find(n => n.type === NodeType.CHARACTER_NODE);

              if (characterNode?.data.generatedCharacters) {
                  const characters = characterNode.data.generatedCharacters as CharacterProfile[];
                  const charLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                  characters.forEach((char, idx) => {
                      if (char.threeViewSheet) {
                          characterReferenceImages.push(char.threeViewSheet);
                      } else if (char.expressionSheet) {
                          characterReferenceImages.push(char.expressionSheet);
                      }
                      // Build Chinese name → English code mapping
                      if (char.name) {
                          const code = `Character ${charLabels[idx] || idx + 1}`;
                          characterNameMap.set(char.name, code);
                          characterNames.push(code);
                      }
                  });

              }

              // Helper: Replace Chinese character names with English codes in text
              // Preserves Chinese text inside quotes (e.g. signboard text like "天下第一")
              const sanitizeChineseNames = (text: string): string => {
                  let result = text;
                  for (const [cnName, enCode] of characterNameMap) {
                      // Replace Chinese names outside of quoted strings
                      result = result.replace(new RegExp(cnName, 'g'), enCode);
                  }
                  return result;
              };

              // Helper: Build detailed shot prompt with camera language
              const buildDetailedShotPrompt = (shot: any, index: number, globalIndex: number): string => {
                  const parts: string[] = [];

                  // 1. Visual description (most important) — sanitize Chinese names
                  if (shot.visualDescription) {
                      parts.push(sanitizeChineseNames(shot.visualDescription));
                  }

                  // 2. Shot size mapping (景别)
                  const shotSizeMap: Record<string, string> = {
                      '大远景': 'extreme long shot, vast environment, figures small like ants',
                      '远景': 'long shot, small figure visible, action and environment',
                      '全景': 'full shot, entire body visible, head to toe',
                      '中景': 'medium shot, waist-up composition, social distance',
                      '中近景': 'medium close-up shot, chest-up, focus on emotion',
                      '近景': 'close shot, neck and above, intimate examination',
                      '特写': 'close-up shot, face only, soul window, intense impact',
                      '大特写': 'extreme close-up shot, partial detail, microscopic view'
                  };

                  if (shot.shotSize && shotSizeMap[shot.shotSize]) {
                      parts.push(shotSizeMap[shot.shotSize]);
                  }

                  // 3. Camera angle mapping (拍摄角度)
                  const cameraAngleMap: Record<string, string> = {
                      '视平': 'eye-level angle, neutral and natural perspective',
                      '高位俯拍': 'high angle shot, looking down at subject, makes them appear vulnerable',
                      '低位仰拍': 'low angle shot, looking up at subject, makes them appear powerful',
                      '斜拍': 'dutch angle, tilted horizon, creates psychological unease',
                      '越肩': 'over the shoulder shot, emphasizes relationship and space',
                      '鸟瞰': 'bird\'s eye view, top-down 90-degree, god-like perspective'
                  };

                  if (shot.cameraAngle && cameraAngleMap[shot.cameraAngle]) {
                      parts.push(cameraAngleMap[shot.cameraAngle]);
                  }

                  // 4. Scene context — sanitize Chinese names
                  if (shot.scene) {
                      parts.push(`environment: ${sanitizeChineseNames(shot.scene)}`);
                  }

                  return parts.join('. ');
              };

              // Helper: Generate single grid page
              const generateGridPage = async (pageIndex: number): Promise<string | null> => {
                  const startIdx = pageIndex * shotsPerGrid;
                  const endIdx = Math.min(startIdx + shotsPerGrid, extractedShots.length);
                  const pageShots = extractedShots.slice(startIdx, endIdx);

                  // Pad last page if needed
                  while (pageShots.length < shotsPerGrid) {
                      pageShots.push({
                          visualDescription: '(empty panel - storyboard end)',
                          isEmpty: true
                      });
                  }

                  // 注意：totalWidth, totalHeight, panelWidth, panelHeight, imageAspectRatio 已在函数开头计算

                  // Build detailed panel descriptions with clear numbering and uniqueness
                  // IMPORTANT: Use format that won't be rendered as text in images
                  const panelDescriptions = pageShots.map((shot, idx) => {
                      const globalIndex = startIdx + idx;
                      const panelOrientationText = panelOrientation === '16:9' ? '16:9 landscape (horizontal)' : '9:16 portrait (vertical)';
                      if (shot.isEmpty) {
                          return `---\n${panelOrientationText} - (empty panel, leave blank)`;
                      }
                      const shotPrompt = buildDetailedShotPrompt(shot, idx, globalIndex);
                      return `---\n${panelOrientationText} - ${shotPrompt}`;
                  }).join('\n\n');

                  // Extract unique scenes and build scene consistency guide
                  const sceneGroups = new Map<string, { indices: number[], descriptions: string[] }>();
                  pageShots.forEach((shot, idx) => {
                      if (!shot.isEmpty && shot.scene) {
                          if (!sceneGroups.has(shot.scene)) {
                              sceneGroups.set(shot.scene, { indices: [], descriptions: [] });
                          }
                          const group = sceneGroups.get(shot.scene)!;
                          group.indices.push(idx + 1); // 1-based panel number
                          if (shot.visualDescription) {
                              group.descriptions.push(shot.visualDescription);
                          }
                      }
                  });

                  // Build scene consistency section — use Location N instead of Chinese scene names
                  let sceneConsistencySection = '';
                  if (sceneGroups.size > 0) {
                      let locationIndex = 1;
                      const sceneEntries = Array.from(sceneGroups.entries()).map(([sceneName, data]) => {
                          const panelList = data.indices.join(', ');
                          const combinedDesc = sanitizeChineseNames(data.descriptions.join(' '));
                          const descSummary = combinedDesc.length > 150
                              ? combinedDesc.substring(0, 150) + '...'
                              : combinedDesc;

                          return `- Location ${locationIndex++} (Panels ${panelList}): ${descSummary}`;
                      }).join('\n');

                      sceneConsistencySection = `
SCENE CONSISTENCY REQUIREMENTS:
CRITICAL: Panels belonging to the same scene MUST maintain perfect visual consistency:
${sceneEntries}

For each scene above:
- Environment style, architecture, and props must be IDENTICAL across all panels of that scene
- Lighting quality, color temperature, and shadow direction must be CONSISTENT within the same scene
- Atmosphere, mood, and environmental effects must match across panels of the same scene
- Background elements, textures, and materials must be the same for the same scene
- Time of day and weather conditions must be consistent within each scene

This ensures visual continuity - multiple panels showing the same scene should look like different camera angles of the SAME location, not different places.
`;
                  }

                  // Build comprehensive prompt with configured resolution
                  // 🔧 优化：计算方向关键词
                  const [ratioW, ratioH] = imageAspectRatio.split(':').map(Number);
                  const orientation = ratioW > ratioH ? 'landscape' : 'portrait';

                  // 🔧 优化：基于宽度计算基础分辨率
                  const baseWidth = resolution === '1k' ? 1024 : resolution === '2k' ? 2048 : 4096;

                  const gridPrompt = `
Create a professional cinematic storyboard ${gridLayout} grid layout at ${resolutionConfig.name} resolution.

OVERALL IMAGE SPECS:
- Output Aspect Ratio: ${imageAspectRatio} (${orientation})
- Grid Layout: ${shotsPerGrid} panels arranged in ${gridLayout} formation (${cols} columns × ${rows} rows)
- Each panel: ${panelOrientation} aspect ratio (${panelOrientation === '16:9' ? 'landscape/horizontal' : 'portrait/vertical'})
- CRITICAL: ALL panels must be ${orientation} orientation (${panelOrientation} aspect ratio)
- Panel borders: EXACTLY 4 pixels wide black lines (NOT percentage-based, ABSOLUTE FIXED SIZE)
- CRITICAL: All panel borders must be PERFECTLY UNIFORM - absolutely NO thickness variation allowed
- Every dividing line must have EXACTLY the same 4-pixel width
- NO variation in border thickness - all borders must be identical

QUALITY STANDARDS:
- Professional film industry storyboard quality
- **${resolutionConfig.name} HD resolution (${baseWidth} pixels wide base)**
- High-detail illustration with sharp focus
- Suitable for web and digital display
- Crisp edges, no blurring or artifacts
- Cinematic composition with proper framing
- Expressive character poses and emotions
- Dynamic lighting and shading
- Clear foreground/background separation
- CRITICAL: Maintain 100% visual style consistency across ALL panels
- ALL characters must look identical across all panels (same face, hair, clothes, body type)
- Same color palette, same art style, same lighting quality throughout

CRITICAL NEGATIVE CONSTRAINTS (MUST FOLLOW):
- NO text, NO speech bubbles, NO dialogue boxes
- NO subtitles, NO captions, NO watermarks
- NO letters, NO numbers, NO typography, NO panel numbers
- NO markings or labels of any kind
- NO variation in panel border thickness - all borders must be EXACTLY 4 pixels
- NO inconsistent or varying border widths
- NO style variations between panels
- NO character appearance changes
- Visual narrative without any text or numbers

${stylePrefix ? `ART STYLE: ${stylePrefix}\n` : ''}

${characterReferenceImages.length > 0 ? `CHARACTER CONSISTENCY (CRITICAL):
⚠️ MANDATORY: You MUST use the provided character reference images as the ONLY source of truth for character appearance.

${characterNames.map((code, i) => `${code} = reference image ${i + 1}`).join('\n')}
Number of character references provided: ${characterReferenceImages.length}

REQUIREMENTS:
- ALL characters in EVERY panel must look EXACTLY THE SAME as in the reference images
- Face: SAME facial features, eye shape, nose, mouth, skin tone, expression style
- Hair: IDENTICAL hairstyle, hair color, hair texture, hair length
- Body: SAME body proportions, height, build, posture
- Clothing: EXACT SAME clothes, accessories, shoes, colors, fabrics
- Skin: IDENTICAL skin texture, skin tone, skin quality
- ZERO tolerance for character appearance changes across panels
- DO NOT generate random or different-looking characters
- Treat these reference images as sacred - match them PERFECTLY in every detail

This is NON-NEGOTIABLE: Character consistency across all panels is mandatory.
` : ''}

${sceneConsistencySection}

PANEL BREAKDOWN (each panel MUST be visually distinct, separated by ---):
${panelDescriptions}

COMPOSITION REQUIREMENTS:
- Each panel MUST depict a DIFFERENT scene/angle/moment
- NO repetition of content between panels
- Each panel should have unique visual elements
- Maintain narrative flow across the ${gridLayout} grid
- Professional color grading throughout
- Environmental details and props clearly visible

ABSOLUTE RULE - NO TEXT IN IMAGE:
This is the highest priority rule. The generated image must contain ZERO text, ZERO letters, ZERO numbers, ZERO labels, ZERO captions, ZERO speech bubbles, ZERO watermarks, ZERO panel numbers, ZERO typography of any kind.
The ONLY exception: if a panel description explicitly mentions text on a physical object in the scene (e.g. a signboard, book cover, or banner), that specific in-scene text may be rendered as part of the environment.
Everything else must be purely visual with no text whatsoever.
`.trim();


                  try {
                      // Use user-configured model priority with fallback

                      // Add timeout wrapper (5 minutes per page)
                      const timeoutPromise = new Promise<never>((_, reject) => {
                          setTimeout(() => reject(new Error('页面生成超时（5分钟）')), 5 * 60 * 1000);
                      });

                      const { generateImageWithFallback } = await import('../services/geminiServiceWithFallback');
                      const imgs = await Promise.race([
                          generateImageWithFallback(
                              gridPrompt,
                              primaryImageModel,
                              characterReferenceImages,
                              {
                                  aspectRatio: imageAspectRatio, // 使用基于网格布局计算的整体图片比例
                                  resolution: resolutionConfig.quality.toUpperCase(), // 使用配置的分辨率 (1K/2K/4K)
                                  count: 1
                              },
                              { nodeId: id, nodeType: node.type }
                          ),
                          timeoutPromise
                      ]);

                      if (imgs && imgs.length > 0) {
                          return imgs[0];
                      } else {
                          console.error(`[STORYBOARD_IMAGE] Page ${pageIndex + 1} generation failed - no images returned`);
                          return null;
                      }
                  } catch (error: any) {
                      console.error(`[STORYBOARD_IMAGE] Page ${pageIndex + 1} generation error:`, error.message);
                      return null;
                  }
              };

              // Generate all pages or regenerate specific page
              const generatedGrids: string[] = [];
              let finalCurrentPage = 0;

              if (isRegenerating) {
                  // Regenerate specific page (either single panel or entire page)
                  let targetPageIndex: number;

                  if (isRegeneratingPage) {
                      targetPageIndex = regeneratePageIndex;
                  } else {
                      targetPageIndex = Math.floor(regeneratePanelIndex / shotsPerGrid);
                  }

                  // Keep existing grids, regenerate only the target page
                  const existingGrids = node.data.storyboardGridImages || [];

                  // Generate the target page
                  const regeneratedImage = await generateGridPage(targetPageIndex);

                  if (regeneratedImage) {
                      // Replace the target page in the existing grids
                      const updatedGrids = [...existingGrids];
                      updatedGrids[targetPageIndex] = regeneratedImage;

                      handleNodeUpdate(id, {
                          storyboardGridImages: updatedGrids,
                          storyboardGridImage: updatedGrids[0],
                          storyboardGridType: gridType,
                          storyboardPanelOrientation: panelOrientation,
                          storyboardCurrentPage: targetPageIndex,
                          storyboardTotalPages: updatedGrids.length,
                          storyboardShots: extractedShots,
                          storyboardRegeneratePanel: undefined
                      });

                      // Save to local storage
                      await saveStoryboardGridOutput(id, updatedGrids, 'STORYBOARD_IMAGE');

                  } else {
                      throw new Error("分镜重新生成失败，请重试");
                  }
              } else {
                  // Normal generation - generate all pages
                  const generationPromises: Promise<string | null>[] = [];

                  for (let pageIdx = 0; pageIdx < numberOfPages; pageIdx++) {
                      generationPromises.push(generateGridPage(pageIdx));
                  }

                  // Wait for all pages to generate
                  const results = await Promise.all(generationPromises);

                  // Filter out failed generations
                  results.forEach(result => {
                      if (result) {
                          generatedGrids.push(result);
                      }
                  });


                  // Warn if some pages failed
                  if (generatedGrids.length > 0 && generatedGrids.length < numberOfPages) {
                      const failedPages = numberOfPages - generatedGrids.length;
                      console.warn(`[STORYBOARD_IMAGE] ${failedPages} page(s) failed to generate. ${generatedGrids.length} page(s) succeeded.`);
                      // Note: We still proceed with the successful pages
                  }

                  if (generatedGrids.length === 0) {
                      throw new Error("分镜图生成失败，请重试");
                  }

                  // Save results
                  handleNodeUpdate(id, {
                      storyboardGridImages: generatedGrids,
                      storyboardGridImage: generatedGrids[0], // For backward compatibility
                      storyboardGridType: gridType,
                      storyboardPanelOrientation: panelOrientation,
                      storyboardCurrentPage: 0,
                      storyboardTotalPages: generatedGrids.length,
                      storyboardShots: extractedShots // Save shots data for editing
                  });

                  // Save to local storage
                  await saveStoryboardGridOutput(id, generatedGrids, 'STORYBOARD_IMAGE');

                  // 添加到历史记录
                  generatedGrids.forEach((gridUrl, index) => {
                      handleAssetGenerated('image', gridUrl, `分镜图 第${index + 1}页`);
                  });

              }

          } else if (node.type === NodeType.SORA_VIDEO_GENERATOR) {
              // --- Sora 2 Video Generator Logic ---

              // 1. Get split shots from STORYBOARD_SPLITTER input nodes
              const splitterNodes = inputs.filter(n => n?.type === NodeType.STORYBOARD_SPLITTER) as AppNode[];
              if (splitterNodes.length === 0) {
                  throw new Error('请连接分镜图拆解节点 (STORYBOARD_SPLITTER)');
              }

              // Collect all split shots from all connected splitter nodes
              const allSplitShots: any[] = [];
              splitterNodes.forEach(splitterNode => {
                  if (splitterNode.data.splitShots && splitterNode.data.splitShots.length > 0) {
                      allSplitShots.push(...splitterNode.data.splitShots);
                  }
              });

              if (allSplitShots.length === 0) {
                  throw new Error('未找到任何分镜数据，请确保拆解节点包含分镜');
              }

              const { DEFAULT_SORA2_CONFIG } = await import('../services/soraConfigService');
              // 2. Get Sora2 configuration from node
              const sora2Config = node.data.sora2Config || DEFAULT_SORA2_CONFIG;
              const maxDuration = parseInt(sora2Config.duration); // 5, 10, or 15

              // 3. Group shots into task groups based on selected duration
              const taskGroups: SoraTaskGroup[] = [];
              let currentGroup: any = {
                  id: `tg-${Date.now()}-${taskGroups.length}`,
                  taskNumber: taskGroups.length + 1,
                  totalDuration: 0,
                  shotIds: [] as string[],
                  splitShots: [] as any[],
                  sora2Config: { ...sora2Config },
                  soraPrompt: '',
                  promptGenerated: false,
                  imageFused: false,
                  generationStatus: 'idle' as const
              };

              allSplitShots.forEach(shot => {
                  const shotDuration = shot.duration || 0;

                  // Check if adding this shot would exceed the max duration
                  if (currentGroup.totalDuration + shotDuration > maxDuration && currentGroup.shotIds.length > 0) {
                      // Finalize current group and start a new one
                      taskGroups.push({ ...currentGroup });
                      currentGroup = {
                          id: `tg-${Date.now()}-${taskGroups.length + 1}`,
                          taskNumber: taskGroups.length + 2,
                          totalDuration: 0,
                          shotIds: [],
                          splitShots: [],
                          sora2Config: { ...sora2Config },
                          soraPrompt: '',
                          promptGenerated: false,
                          imageFused: false,
                          generationStatus: 'idle' as const
                      };
                  }

                  // Add shot to current group
                  currentGroup.shotIds.push(shot.id);
                  currentGroup.splitShots.push(shot);
                  currentGroup.totalDuration += shotDuration;
              });

              // Don't forget the last group
              if (currentGroup.shotIds.length > 0) {
                  taskGroups.push(currentGroup);
              }


              // 4. Generate AI-enhanced Sora prompts for each task group using Sora2 builder (includes black screen)
              const { promptBuilderFactory } = await import('../services/promptBuilders');
              const sora2Builder = promptBuilderFactory.getByNodeType(NodeType.SORA_VIDEO_GENERATOR);

              // Generate prompts asynchronously
              for (const tg of taskGroups) {
                  try {
                    tg.soraPrompt = await sora2Builder.build(tg.splitShots, {
                      includeBlackScreen: true,
                      blackScreenDuration: 0.5
                    });
                    tg.promptGenerated = true;
                    // 保留任务组创建时设置的 Sora2 配置（用户选择的时长）
                    if (!tg.sora2Config) {
                        tg.sora2Config = { ...DEFAULT_SORA2_CONFIG };
                    }
                    tg.generationStatus = 'prompt_ready';
                  } catch (error) {
                    console.error(`[SORA_VIDEO_GENERATOR] Failed to generate professional prompt for task group ${tg.taskNumber}:`, error);
                    // Fallback to basic prompt
                    const { buildSoraStoryPrompt } = await import('../services/soraService');
                    tg.soraPrompt = buildSoraStoryPrompt(tg.splitShots);
                    tg.promptGenerated = true;
                    // 保留任务组创建时设置的 Sora2 配置（用户选择的时长）
                    if (!tg.sora2Config) {
                        tg.sora2Config = { ...DEFAULT_SORA2_CONFIG };
                    }
                    tg.generationStatus = 'prompt_ready';
                  }
              }

              // Save task groups to node data
              handleNodeUpdate(id, {
                  taskGroups: taskGroups
              });


          } else if (node.type === NodeType.VIDEO_ANALYZER) {
             const vid = node.data.videoUri || inputs.find(n => n?.data.videoUri)?.data.videoUri;
             if (!vid) throw new Error("未找到视频输入");
             const { urlToBase64, analyzeVideo } = await import('../services/geminiService');
             let vidData = vid;
             if (vid.startsWith('http')) vidData = await urlToBase64(vid);
             const txt = await analyzeVideo(vidData, prompt, node.data.model);
             handleNodeUpdate(id, { analysis: txt });
          } else if (node.type === NodeType.IMAGE_EDITOR) {
             // Extract style preset from inputs
             const stylePresetNode = inputs.find(n => n.type === NodeType.STYLE_PRESET);
             const stylePrefix = stylePresetNode?.data.stylePrompt || '';
             const finalPrompt = stylePrefix ? `${stylePrefix}, ${prompt}` : prompt;

             const inputImages: string[] = [];
             inputs.forEach(n => { if (n?.data.image) inputImages.push(n.data.image); });
             const img = node.data.image || inputImages[0];
             const { editImageWithText } = await import('../services/geminiService');
             const res = await editImageWithText(img, finalPrompt, node.data.model);
             handleNodeUpdate(id, { image: res });
          }
          setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.SUCCESS } : n));
      } catch (e: any) {
          console.error('[handleNodeAction] Error caught:', e);
          console.error('[handleNodeAction] Error message:', e.message);
          console.error('[handleNodeAction] Error stack:', e.stack);
          handleNodeUpdate(id, { error: e.message });
          setNodes(p => p.map(n => n.id === id ? { ...n, status: NodeStatus.ERROR } : n));
      }
  }, [handleNodeUpdate]);

  return { handleNodeAction };
}
