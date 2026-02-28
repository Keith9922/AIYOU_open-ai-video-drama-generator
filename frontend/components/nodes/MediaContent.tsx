/**
 * AIYOU 漫剧生成平台 - 节点媒体内容渲染
 *
 * 从 nodes/index.tsx 的 renderMediaContent() 提取。
 * 根据节点类型渲染不同的媒体内容区域。
 *
 * @developer 光波 (a@ggbo.com)
 * @copyright Copyright (c) 2025 光波. All rights reserved.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NodeType, NodeStatus, StoryboardShot, CharacterProfile, DetailedStoryboardShot } from '../../types';
import { RefreshCw, Play, Image as ImageIcon, Video as VideoIcon, Type, AlertCircle, CheckCircle, Plus, Maximize2, Download, MoreHorizontal, Wand2, Scaling, FileSearch, Edit, Loader2, Layers, Trash2, X, Upload, Scissors, Film, MousePointerClick, Crop as CropIcon, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, GripHorizontal, Link, Copy, Monitor, Music, Pause, Volume2, Mic2, BookOpen, ScrollText, Clapperboard, LayoutGrid, Box, User, Users, Save, RotateCcw, Eye, List, Sparkles, ZoomIn, ZoomOut, Minus, Circle, Square, Maximize, Move, RotateCw, TrendingUp, TrendingDown, ArrowRight, ArrowUp, ArrowDown, ArrowUpRight, ArrowDownRight, Palette, Grid, Grid3X3, MoveHorizontal, ArrowUpDown, Database, ShieldAlert, ExternalLink, Package } from 'lucide-react';
import { VideoModeSelector, SceneDirectorOverlay } from '../VideoNodeModules';
import { PromptEditor } from '../PromptEditor';
import { StoryboardVideoNode, StoryboardVideoChildNode } from '../StoryboardVideoNode';
import { IMAGE_MODELS, TEXT_MODELS, VIDEO_MODELS, AUDIO_MODELS } from '../../services/modelConfig';
import { promptManager } from '../../services/promptManager';
import { toApiUrl } from '../../services/api/client';
import {
  IMAGE_ASPECT_RATIOS, VIDEO_ASPECT_RATIOS, IMAGE_RESOLUTIONS, VIDEO_RESOLUTIONS,
  SHOT_TYPES, CAMERA_ANGLES, CAMERA_MOVEMENTS,
  IMAGE_COUNTS, VIDEO_COUNTS, GLASS_PANEL,
  STYLE_BLUR_ON, STYLE_BLUR_OFF,
  STYLE_MAX_HEIGHT_180, STYLE_MAX_HEIGHT_200, STYLE_MIN_HEIGHT_80,
  STYLE_HEIGHT_60, STYLE_HEIGHT_80,
  SHORT_DRAMA_GENRES, SHORT_DRAMA_SETTINGS,
} from './constants';
import { SecureVideo, safePlay, safePause, AudioVisualizer, EpisodeViewer, InputThumbnails } from './helpers';
import type { NodeContentContext } from './types';

export const MediaContent: React.FC<NodeContentContext> = (ctx) => {
  const {
    node, onUpdate, onAction, onDelete, onExpand, onCrop, onMediaContextMenu,
    onCharacterAction, onViewCharacter, onOpenVideoEditor,
    nodeQuery, characterLibrary, inputAssets,
    isWorking, isActionDisabled, isHovered, localPrompt, setLocalPrompt,
    commitPrompt, handleActionClick, handleCmdEnter, mediaRef,
    videoBlobUrl, setVideoBlobUrl, isLoadingVideo, setIsLoadingVideo,
    showImageGrid, setShowImageGrid, isPlayingAudio, setIsPlayingAudio,
    generationMode, isInputFocused, setIsInputFocused,
    inputHeight, setInputHeight, handleInputResizeStart, handleExpand,
    isUploading, fileInputRef, handleUploadVideo, handleUploadImage,
    handleAspectRatioSelect,
    localSoraConfigs, setLocalSoraConfigs,
    availableChapters, setAvailableChapters, viewingOutline, setViewingOutline,
    handleRefreshChapters,
    dynamicSubModels, dynamicSubModelNames, configLoaded,
    showExportModal, setShowExportModal, exportSettings, setExportSettings,
    isActionProcessing,
  } = ctx;

  const [editingShot, setEditingShot] = useState<DetailedStoryboardShot | null>(null);
  const [editingShotIndex, setEditingShotIndex] = useState<number>(-1);

      // 分镜视频生成节点（新节点）
      if (node.type === NodeType.STORYBOARD_VIDEO_GENERATOR) {
          return (
              <StoryboardVideoNode
                  node={node}
                  onUpdate={onUpdate}
                  onAction={onAction}
                  onExpand={onExpand}
                  nodeQuery={nodeQuery}
              />
          );
      }

      // 分镜视频子节点（新节点）
      if (node.type === NodeType.STORYBOARD_VIDEO_CHILD) {
          return (
              <StoryboardVideoChildNode
                  node={node}
                  onUpdate={onUpdate}
                  onAction={onAction}
                  onExpand={onExpand}
              />
          );
      }

      if (node.type === NodeType.PROMPT_INPUT) {
          // If episodeStoryboard exists, show storyboard view
          if (node.data.episodeStoryboard && node.data.episodeStoryboard.shots.length > 0) {
              const storyboard = node.data.episodeStoryboard;
              const shots = storyboard.shots;

              return (
                  <div className="w-full h-full flex flex-col overflow-hidden relative bg-[#1c1c1e]">
                      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4" onWheel={(e) => e.stopPropagation()}>
                          {shots.map((shot, idx) => (
                              <div key={shot.id} className="flex gap-3 p-3 rounded-xl bg-black/40 border border-white/5 hover:bg-black/60 transition-colors">
                                  {/* Shot Number Badge */}
                                  <div className="shrink-0 w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                                      <span className="text-sm font-bold text-indigo-300">{shot.shotNumber}</span>
                                  </div>

                                  {/* Shot Details */}
                                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                              <div className="text-[10px] font-bold text-indigo-300 mb-1">{shot.scene}</div>
                                              <div className="text-[9px] text-slate-400">
                                                  {shot.characters.length > 0 && (
                                                      <span className="mr-2">👤 {shot.characters.join(', ')}</span>
                                                  )}
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                              <span className="text-[9px] font-mono text-slate-500">{shot.duration}s</span>
                                              <button
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditingShot({ ...shot });
                                                      setEditingShotIndex(idx);
                                                  }}
                                                  disabled={isActionDisabled}
                                                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                                                  title="编辑分镜"
                                              >
                                                  <Edit size={12} />
                                              </button>
                                          </div>
                                      </div>

                                      <div className="text-[10px] text-slate-300 leading-relaxed">
                                          {shot.visualDescription}
                                      </div>

                                      <div className="flex flex-wrap gap-1.5 mt-1">
                                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] text-slate-500">
                                              📹 {shot.shotSize}
                                          </span>
                                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] text-slate-500">
                                              📐 {shot.cameraAngle}
                                          </span>
                                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] text-slate-500">
                                              🎬 {shot.cameraMovement}
                                          </span>
                                      </div>

                                      {shot.dialogue && shot.dialogue !== '无' && (
                                          <div className="mt-1 px-2 py-1.5 bg-black/40 border border-white/5 rounded text-[9px] text-cyan-300">
                                              💬 {shot.dialogue}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          ))}

                          {/* Show loading indicator if working */}
                          {isWorking && (
                              <div className="flex items-center justify-center gap-2 p-4 text-indigo-400">
                                  <Loader2 size={16} className="animate-spin" />
                                  <span className="text-xs">正在生成更多分镜...</span>
                              </div>
                          )}
                      </div>

                      {/* Summary Bar */}
                      <div className="shrink-0 px-4 py-2 bg-black/60 border-t border-white/5 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">
                              共 {storyboard.totalShots} 个分镜
                          </span>
                          <span className="text-slate-400">
                              总时长 {Math.floor(storyboard.totalDuration / 60)}:{(storyboard.totalDuration % 60).toString().padStart(2, '0')}
                          </span>
                      </div>

                      {/* Edit Shot Modal */}
                      {editingShot && (
                          <div
                              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999]"
                              onClick={() => setEditingShot(null)}
                              onMouseDown={(e) => e.stopPropagation()}
                          >
                              <div
                                  className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto custom-scrollbar m-4"
                                  onClick={(e) => e.stopPropagation()}
                                  onWheel={(e) => e.stopPropagation()}
                              >
                                  <div className="flex items-center justify-between mb-4">
                                      <h3 className="text-lg font-bold text-white">编辑分镜 #{editingShot.shotNumber}</h3>
                                      <button
                                          onClick={() => setEditingShot(null)}
                                          className="p-1 hover:bg-white/10 rounded transition-colors"
                                      >
                                          <X size={20} className="text-slate-400" />
                                      </button>
                                  </div>

                                  <div className="space-y-4">
                                      <div>
                                          <label className="block text-xs text-slate-400 mb-1">场景</label>
                                          <input
                                              type="text"
                                              value={editingShot.scene}
                                              onChange={(e) => setEditingShot({ ...editingShot, scene: e.target.value })}
                                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                          />
                                      </div>

                                      <div>
                                          <label className="block text-xs text-slate-400 mb-1">角色 (逗号分隔)</label>
                                          <input
                                              type="text"
                                              value={editingShot.characters.join(', ')}
                                              onChange={(e) => setEditingShot({
                                                  ...editingShot,
                                                  characters: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                              })}
                                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                          />
                                      </div>

                                      <div>
                                          <label className="block text-xs text-slate-400 mb-1">时长 (秒)</label>
                                          <input
                                              type="number"
                                              min="1"
                                              max="10"
                                              step="0.5"
                                              value={editingShot.duration}
                                              onChange={(e) => setEditingShot({ ...editingShot, duration: parseFloat(e.target.value) || 3 })}
                                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                          />
                                      </div>

                                      <div>
                                          <label className="block text-xs text-slate-400 mb-2">景别</label>
                                          <div className="grid grid-cols-4 gap-2">
                                              {SHOT_TYPES.map((type) => {
                                                  const Icon = type.icon;
                                                  const isSelected = editingShot.shotSize === type.value || editingShot.shotSize.includes(type.label);
                                                  return (
                                                      <button
                                                          key={type.value}
                                                          onClick={() => setEditingShot({ ...editingShot, shotSize: type.value })}
                                                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                                                              isSelected
                                                                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                                                  : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5 hover:border-white/20'
                                                          }`}
                                                          title={type.desc}
                                                      >
                                                          <Icon size={16} />
                                                          <span className="text-[9px] font-medium">{type.label}</span>
                                                      </button>
                                                  );
                                              })}
                                          </div>
                                      </div>

                                      <div>
                                          <label className="block text-xs text-slate-400 mb-2">拍摄角度</label>
                                          <div className="grid grid-cols-4 gap-2">
                                              {CAMERA_ANGLES.map((angle) => {
                                                  const Icon = angle.icon;
                                                  const isSelected = editingShot.cameraAngle === angle.value || editingShot.cameraAngle.includes(angle.label);
                                                  return (
                                                      <button
                                                          key={angle.value}
                                                          onClick={() => setEditingShot({ ...editingShot, cameraAngle: angle.value })}
                                                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                                                              isSelected
                                                                  ? 'bg-violet-500/20 border-violet-500 text-violet-300'
                                                                  : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5 hover:border-white/20'
                                                          }`}
                                                          title={angle.desc}
                                                      >
                                                          <Icon size={16} />
                                                          <span className="text-[9px] font-medium">{angle.label}</span>
                                                      </button>
                                                  );
                                              })}
                                          </div>
                                      </div>

                                      <div>
                                          <label className="block text-xs text-slate-400 mb-2">运镜方式</label>
                                          <div className="grid grid-cols-4 gap-2">
                                              {CAMERA_MOVEMENTS.map((movement) => {
                                                  const Icon = movement.icon;
                                                  const isSelected = editingShot.cameraMovement === movement.value || editingShot.cameraMovement.includes(movement.label);
                                                  return (
                                                      <button
                                                          key={movement.value}
                                                          onClick={() => setEditingShot({ ...editingShot, cameraMovement: movement.value })}
                                                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                                                              isSelected
                                                                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                                                                  : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5 hover:border-white/20'
                                                          }`}
                                                          title={movement.desc}
                                                      >
                                                          <Icon size={16} />
                                                          <span className="text-[9px] font-medium">{movement.label}</span>
                                                      </button>
                                                  );
                                              })}
                                          </div>
                                      </div>

                                      <div>
                                          <label className="block text-xs text-slate-400 mb-1">画面描述</label>
                                          <textarea
                                              value={editingShot.visualDescription}
                                              onChange={(e) => setEditingShot({ ...editingShot, visualDescription: e.target.value })}
                                              rows={4}
                                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none custom-scrollbar"
                                              onWheel={(e) => e.stopPropagation()}
                                          />
                                      </div>

                                      <div>
                                          <label className="block text-xs text-slate-400 mb-1">对白</label>
                                          <textarea
                                              value={editingShot.dialogue}
                                              onChange={(e) => setEditingShot({ ...editingShot, dialogue: e.target.value })}
                                              rows={2}
                                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none custom-scrollbar"
                                              onWheel={(e) => e.stopPropagation()}
                                          />
                                      </div>

                                      <div>
                                          <label className="block text-xs text-slate-400 mb-1">视觉效果</label>
                                          <input
                                              type="text"
                                              value={editingShot.visualEffects}
                                              onChange={(e) => setEditingShot({ ...editingShot, visualEffects: e.target.value })}
                                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                          />
                                      </div>

                                      <div>
                                          <label className="block text-xs text-slate-400 mb-1">音效</label>
                                          <input
                                              type="text"
                                              value={editingShot.audioEffects}
                                              onChange={(e) => setEditingShot({ ...editingShot, audioEffects: e.target.value })}
                                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                          />
                                      </div>
                                  </div>

                                  <div className="flex gap-3 mt-6">
                                      <button
                                          onClick={() => setEditingShot(null)}
                                          className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors"
                                      >
                                          取消
                                      </button>
                                      <button
                                          onClick={() => {
                                              if (editingShotIndex >= 0 && node.data.episodeStoryboard) {
                                                  const updatedShots = [...node.data.episodeStoryboard.shots];
                                                  updatedShots[editingShotIndex] = editingShot;

                                                  // Recalculate start/end times
                                                  let currentTime = 0;
                                                  updatedShots.forEach(shot => {
                                                      shot.startTime = currentTime;
                                                      shot.endTime = currentTime + shot.duration;
                                                      currentTime = shot.endTime;
                                                  });

                                                  const updatedStoryboard = {
                                                      ...node.data.episodeStoryboard,
                                                      shots: updatedShots,
                                                      totalDuration: updatedShots.reduce((sum, shot) => sum + shot.duration, 0),
                                                      totalShots: updatedShots.length
                                                  };

                                                  onUpdate(node.id, { episodeStoryboard: updatedStoryboard });
                                                  setEditingShot(null);
                                                  setEditingShotIndex(-1);
                                              }
                                          }}
                                          className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:shadow-lg hover:shadow-indigo-500/20 rounded-lg text-sm font-bold text-white transition-all"
                                      >
                                          保存
                                      </button>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              );
          }

          // Default text input view
          const isCollapsed = (node.height || 360) < 100;
          return (
            <div className="w-full h-full flex flex-col group/text relative">
                <div className={`flex-1 bg-black/10 relative overflow-hidden backdrop-blur-sm transition-all ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                    {/* 折叠/展开按钮 */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const currentH = node.height || 360;
                            const targetH = currentH < 100 ? 360 : 50;
                            onUpdate(node.id, {}, { height: targetH });
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/40 border border-white/10 backdrop-blur-md rounded-md text-slate-400 hover:text-white hover:border-white/30 transition-colors z-10"
                        title={isCollapsed ? "展开" : "折叠"}
                        onMouseDown={e => e.stopPropagation()}
                    >
                        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                    <textarea
                        className="w-full h-full bg-transparent resize-none focus:outline-none text-sm text-slate-200 placeholder-slate-500 font-medium leading-relaxed custom-scrollbar selection:bg-amber-500/30 p-4"
                        placeholder="输入您的创意构想..."
                        value={localPrompt}
                        onChange={(e) => setLocalPrompt(e.target.value)}
                        onBlur={commitPrompt}
                        onKeyDown={handleCmdEnter}
                        onWheel={(e) => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        maxLength={10000}
                        disabled={isCollapsed}
                    />
                </div>
            </div>
          );
      }
      
      if (node.type === NodeType.SCRIPT_PLANNER) {
          if (!node.data.scriptOutline) {
              return (
                 <div className="w-full h-full p-6 flex flex-col group/script">
                     <div className="flex-1 bg-black/10 rounded-2xl border border-white/5 p-4 relative overflow-hidden backdrop-blur-sm transition-colors group-hover/script:bg-black/20">
                         <textarea 
                            className="w-full h-full bg-transparent resize-none focus:outline-none text-sm text-slate-200 placeholder-slate-500 font-medium leading-relaxed custom-scrollbar selection:bg-orange-500/30 font-mono" 
                            placeholder="描述剧本核心创意..." 
                            value={localPrompt} 
                            onChange={(e) => setLocalPrompt(e.target.value)} 
                            onBlur={commitPrompt}
                            onWheel={(e) => e.stopPropagation()} 
                            onMouseDown={e => e.stopPropagation()}
                         />
                     </div>
                 </div>
              );
          } else {
              return (
                  <div className="w-full h-full flex flex-col bg-[#1c1c1e] overflow-hidden relative rounded-b-2xl">
                      <div className="absolute top-2 right-2 flex gap-1 z-20">
                          <button 
                              onClick={() => setViewingOutline(!viewingOutline)}
                              className="p-1.5 bg-black/40 border border-white/10 rounded-md text-slate-400 hover:text-white backdrop-blur-md transition-colors"
                              title={viewingOutline ? "收起大纲" : "查看完整大纲"}
                          >
                              {viewingOutline ? <List size={14} /> : <FileSearch size={14} />}
                          </button>
                      </div>

                      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-black/20" onWheel={(e) => e.stopPropagation()}>
                          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{node.data.scriptOutline}</pre>
                      </div>
                  </div>
              );
          }
      }

      if (node.type === NodeType.SCRIPT_EPISODE) {
          if (node.data.generatedEpisodes && node.data.generatedEpisodes.length > 0) {
              return <EpisodeViewer episodes={node.data.generatedEpisodes} />;
          }
          
          return (
              <div className="w-full h-full p-6 flex flex-col justify-center items-center gap-4 text-center">
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/5 w-full flex-1 flex flex-col items-center justify-center gap-3">
                      {isWorking ? <Loader2 size={32} className="animate-spin text-teal-500" /> : <ScrollText size={32} className="text-teal-500/50" />}
                      <span className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed">
                          {availableChapters.length > 0
                              ? (node.data.selectedChapter ? `已选择: ${node.data.selectedChapter}` : "请在下方选择章节")
                              : "请先连接已生成大纲的剧本节点 (Planner)"}
                      </span>
                  </div>
              </div>
          );
      }
      if (node.type === NodeType.STORYBOARD_IMAGE) {
          const gridImages = node.data.storyboardGridImages || (node.data.storyboardGridImage ? [node.data.storyboardGridImage] : []);
          const currentPage = node.data.storyboardCurrentPage || 0;
          const totalPages = node.data.storyboardTotalPages || gridImages.length;
          const hasMultiplePages = gridImages.length > 1;
          const currentImage = gridImages[currentPage] || null;
          const gridType = node.data.storyboardGridType || '9';
          const shotsPerGrid = gridType === '9' ? 9 : 6;

          // Get shots data for this page
          const allShots = node.data.storyboardShots || [];
          const startIdx = currentPage * shotsPerGrid;
          const endIdx = Math.min(startIdx + shotsPerGrid, allShots.length);
          const currentPageShots = allShots.slice(startIdx, endIdx);

          // Pagination handlers
          const handlePrevPage = () => {
              if (currentPage > 0) {
                  onUpdate(node.id, { storyboardCurrentPage: currentPage - 1 });
              }
          };

          const handleNextPage = () => {
              if (currentPage < totalPages - 1) {
                  onUpdate(node.id, { storyboardCurrentPage: currentPage + 1 });
              }
          };

          // View mode: 'normal' | 'preview' | 'edit'
          const [viewMode, setViewMode] = useState<'normal' | 'preview' | 'edit'>('normal');
          const [editingShots, setEditingShots] = useState<any[]>([]);
          const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

          const handleOpenPreview = () => {
              setViewMode('preview');
          };

          const handleClosePreview = () => {
              setViewMode('normal');
          };

          const handleOpenEdit = () => {
              setEditingShots(currentPageShots.map(shot => ({
                  ...shot,
                  visualDescription: shot.visualDescription || shot.scene || ''
              })));
              setViewMode('edit');
          };

          const handleSaveEdit = () => {
              // Update all shots and trigger regeneration
              const updatedShots = [...allShots];
              editingShots.forEach((shot, idx) => {
                  updatedShots[startIdx + idx] = {
                      ...updatedShots[startIdx + idx],
                      visualDescription: shot.visualDescription
                  };
              });

              onUpdate(node.id, {
                  storyboardShots: updatedShots,
                  storyboardRegeneratePanel: true // Regenerate entire page
              });

              // 触发节点执行以开始重新生成
              setTimeout(() => {
                  onAction(node.id);
              }, 100);

              setViewMode('normal');
          };

          const handleCancelEdit = () => {
              setViewMode('normal');
          };

          const handleContextMenu = (e: React.MouseEvent) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY });
          };

          const handleCloseContextMenu = () => {
              setContextMenu(null);
          };

          const handleDownloadImage = async () => {
              if (!currentImage) return;

              try {
                  const response = await fetch(currentImage);
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `分镜-第${currentPage + 1}页-${Date.now()}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
              } catch (error) {
                  console.error('下载图片失败:', error);
              }

              setContextMenu(null);
          };

          return (
              <div
                  className="w-full h-full flex flex-col overflow-hidden relative bg-[#1c1c1e]"
                  onClick={handleCloseContextMenu}
              >
                  {currentImage ? (
                      <>
                          {/* Edit Mode */}
                          {viewMode === 'edit' && (
                              <div className="w-full h-full flex flex-col bg-[#1c1c1e]">
                                  {/* Header */}
                                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
                                      <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                              <Edit size={20} className="text-purple-300" />
                                          </div>
                                          <div>
                                              <h3 className="text-base font-bold text-white">编辑分镜描述</h3>
                                              <p className="text-xs text-slate-400">
                                                  第 {currentPage + 1} 页 · 修改后重新生成
                                              </p>
                                          </div>
                                      </div>
                                      <button
                                          onClick={handleCancelEdit}
                                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                      >
                                          <X size={20} className="text-slate-400" />
                                      </button>
                                  </div>

                                  {/* Shots List - Scrollable */}
                                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3" onWheel={(e) => e.stopPropagation()}>
                                      {editingShots.map((shot, idx) => (
                                          <div key={idx} className="bg-black/40 border border-white/10 rounded-lg p-4">
                                              <div className="flex items-start gap-3">
                                                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                                                      <span className="text-sm font-bold text-purple-300">
                                                          {startIdx + idx + 1}
                                                      </span>
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                      <label className="block text-xs font-bold text-slate-400 mb-2">
                                                          分镜 {startIdx + idx + 1}
                                                      </label>
                                                      <textarea
                                                          value={shot.visualDescription}
                                                          onChange={(e) => {
                                                              const newShots = [...editingShots];
                                                              newShots[idx].visualDescription = e.target.value;
                                                              setEditingShots(newShots);
                                                          }}
                                                          className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                                                          rows={3}
                                                          placeholder={`输入分镜 ${startIdx + idx + 1} 的描述...`}
                                                          onWheel={(e) => e.stopPropagation()}
                                                      />
                                                      {shot.scene && (
                                                          <div className="mt-2 text-[10px] text-slate-500">
                                                              场景: {shot.scene}
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                      ))}
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-white/10 flex-shrink-0 bg-black/20">
                                      <button
                                          onClick={handleCancelEdit}
                                          className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                                      >
                                          取消
                                      </button>
                                      <button
                                          onClick={handleSaveEdit}
                                          disabled={isActionDisabled}
                                          className="px-5 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                      >
                                          {isWorking ? (
                                              <>
                                                  <Loader2 size={14} className="animate-spin" />
                                                  生成中...
                                              </>
                                          ) : (
                                              <>
                                                  <Sparkles size={14} />
                                                  重新生成
                                              </>
                                          )}
                                      </button>
                                  </div>
                              </div>
                          )}

                          {/* Preview Mode or Normal Mode */}
                          {viewMode !== 'edit' && (
                              <>
                                  {/* Image Display */}
                                  <div
                                      className={`flex-1 overflow-hidden relative flex items-center justify-center transition-all ${
                                          viewMode === 'preview' ? 'fixed inset-0 bg-black/95 z-[9999] p-8' : 'p-3'
                                      }`}
                                      onMouseDown={(e) => e.stopPropagation()}
                                  >
                                      <img
                                          loading="lazy" ref={mediaRef as any}
                                          src={currentImage}
                                          className="max-w-full max-h-full object-contain cursor-default"
                                          onContextMenu={handleContextMenu}
                                          draggable={false}
                                          alt={`Storyboard Grid - Page ${currentPage + 1}`}
                                      />

                                      {/* Preview Mode Controls */}
                                      {viewMode === 'preview' && (
                                          <>
                                              {/* Close Button - Top Left */}
                                              <button
                                                  onClick={handleClosePreview}
                                                  className="absolute top-6 left-6 p-2 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition-colors border border-white/10"
                                                  title="关闭预览 (ESC)"
                                              >
                                                  <X size={24} className="text-white" />
                                              </button>

                                              {/* Edit Button - Top Right */}
                                              {!isWorking && (
                                                  <button
                                                      onClick={handleOpenEdit}
                                                      className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition-colors border border-white/10"
                                                      title="编辑分镜描述"
                                                  >
                                                      <Edit size={18} className="text-white" />
                                                      <span className="text-sm font-medium text-white">编辑</span>
                                                  </button>
                                              )}
                                          </>
                                      )}

                                      {/* Normal Mode - Preview Button */}
                                      {viewMode === 'normal' && !isWorking && (
                                          <button
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenPreview();
                                              }}
                                              className="absolute top-5 right-5 p-2 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition-colors border border-white/10"
                                              title="查看大图"
                                          >
                                              <Maximize2 size={18} className="text-white" />
                                          </button>
                                      )}

                                      {/* Context Menu */}
                                      {contextMenu && (
                                          <div
                                              className="fixed z-[10000] bg-[#2c2c2e] border border-white/10 rounded-lg shadow-2xl min-w-[180px] overflow-hidden"
                                              style={{
                                                  left: `${contextMenu.x}px`,
                                                  top: `${contextMenu.y}px`,
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                          >
                                              <button
                                                  onClick={handleDownloadImage}
                                                  className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white hover:bg-white/5 transition-colors text-left"
                                              >
                                                  <Download size={16} className="text-slate-400" />
                                                  <span>下载图片</span>
                                              </button>
                                          </div>
                                      )}
                                  </div>

                                  {/* Control Bar - Only show in normal mode */}
                                  {viewMode === 'normal' && (
                                      <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 bg-black/20" onMouseDown={(e) => e.stopPropagation()}>
                                          {/* Pagination Controls */}
                                          <div className="flex items-center gap-2">
                                              {hasMultiplePages && (
                                                  <>
                                                      <button
                                                          onClick={handlePrevPage}
                                                          disabled={currentPage === 0}
                                                          className={`p-1.5 rounded-lg transition-all ${
                                                              currentPage === 0
                                                                  ? 'text-slate-700 cursor-not-allowed'
                                                                  : 'text-slate-400 hover:text-white hover:bg-white/10'
                                                          }`}
                                                      >
                                                          <ChevronLeft size={16} />
                                                      </button>
                                                      <div className="flex items-center gap-1">
                                                          <span className="text-[10px] font-bold text-white">
                                                              {currentPage + 1}
                                                          </span>
                                                          <span className="text-[10px] text-slate-500">/</span>
                                                          <span className="text-[10px] text-slate-400">
                                                              {totalPages}
                                                          </span>
                                                      </div>
                                                      <button
                                                          onClick={handleNextPage}
                                                          disabled={currentPage >= totalPages - 1}
                                                          className={`p-1.5 rounded-lg transition-all ${
                                                              currentPage >= totalPages - 1
                                                                  ? 'text-slate-700 cursor-not-allowed'
                                                                  : 'text-slate-400 hover:text-white hover:bg-white/10'
                                                          }`}
                                                      >
                                                          <ChevronRight size={16} />
                                                      </button>
                                                  </>
                                              )}
                                              {!hasMultiplePages && (
                                                  <span className="text-[10px] text-slate-500">单页分镜</span>
                                              )}
                                          </div>

                                          {/* Edit Button */}
                                          {!isWorking && (
                                              <button
                                                      onClick={handleOpenEdit}
                                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-white/10 hover:border-purple-500/30"
                                              >
                                                  <Edit size={12} />
                                                  编辑描述
                                              </button>
                                          )}
                                      </div>
                                  )}
                              </>
                          )}
                      </>
                  ) : (
                      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600 p-6 text-center">
                          {isWorking ? <Loader2 size={32} className="animate-spin text-purple-500" /> : <LayoutGrid size={32} className="text-purple-500/50" />}
                          <span className="text-xs font-medium">{isWorking ? "正在生成分镜网格图..." : "等待生成分镜图..."}</span>
                          {!isWorking && (
                              <div className="flex flex-col gap-1 text-[10px] text-slate-500 max-w-[220px]">
                                  <span>💡 输入分镜描述或连接剧本分集节点</span>
                                  <span>🎭 可连接角色设计节点保持角色一致性</span>
                                  <span>🎬 选择九宫格/六宫格布局</span>
                                  <span>📄 支持多页自动分页</span>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          );
      }
      if (node.type === NodeType.STORYBOARD_SPLITTER) {
          const splitShots = node.data.splitShots || [];
          const isSplitting = node.data.isSplitting || false;
          const connectedStoryboardNodes = nodeQuery ? nodeQuery.getUpstreamNodes(node.id, NodeType.STORYBOARD_IMAGE) : [];

          // 过滤掉空的分镜：必须同时有画面描述和拆解图片
          const validShots = splitShots.filter((shot) => {
              return shot.visualDescription && shot.splitImage;
          });

          return (
              <div className="w-full h-full flex flex-col overflow-hidden relative bg-[#1c1c1e]">
                  {/* Content Area - Split Results List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar" onWheel={(e) => e.stopPropagation()}>
                      {validShots.length > 0 ? (
                          <div className="p-4 space-y-3">
                              {validShots.map((shot) => (
                                  <div key={shot.id} className="bg-black/40 border border-white/10 rounded-lg p-4">
                                      <div className="flex items-start gap-4">
                                          {/* Left: Image */}
                                          <div className="flex-shrink-0">
                                              <img
                                                  loading="lazy" src={shot.splitImage}
                                                  alt={`分镜 ${shot.shotNumber}`}
                                                  className="w-[200px] rounded-lg border border-white/10 cursor-pointer hover:border-blue-500/50 transition-colors"
                                                  onClick={() => onExpand?.({
                                                      type: 'image',
                                                      src: shot.splitImage,
                                                      rect: new DOMRect(),
                                                      images: splitShots.map(s => s.splitImage),
                                                      initialIndex: shot.shotNumber - 1
                                                  })}
                                              />
                                          </div>

                                          {/* Right: Info */}
                                          <div className="flex-1 min-w-0">
                                              {/* Header */}
                                              <div className="flex items-center gap-2 mb-3">
                                                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                                                      <span className="text-sm font-bold text-blue-300">
                                                          {shot.shotNumber}
                                                      </span>
                                                  </div>
                                                  <h3 className="text-base font-bold text-white">分镜 {shot.shotNumber}</h3>
                                              </div>

                                              {/* Details */}
                                              <div className="space-y-2">
                                                  {shot.scene && (
                                                      <div>
                                                          <span className="text-[10px] font-bold text-slate-500 uppercase">场景</span>
                                                          <p className="text-xs text-slate-300">{shot.scene}</p>
                                                      </div>
                                                  )}

                                                  {shot.characters && shot.characters.length > 0 && (
                                                      <div>
                                                          <span className="text-[10px] font-bold text-slate-500 uppercase">角色</span>
                                                          <p className="text-xs text-slate-300">{shot.characters.join(', ')}</p>
                                                      </div>
                                                  )}

                                                  {shot.visualDescription && (
                                                      <div>
                                                          <span className="text-[10px] font-bold text-slate-500 uppercase">画面</span>
                                                          <p className="text-xs text-slate-300">{shot.visualDescription}</p>
                                                      </div>
                                                  )}

                                                  {shot.dialogue && (
                                                      <div>
                                                          <span className="text-[10px] font-bold text-slate-500 uppercase">对话</span>
                                                          <p className="text-xs text-slate-300">{shot.dialogue}</p>
                                                      </div>
                                                  )}

                                                  <div className="grid grid-cols-2 gap-2">
                                                      {shot.shotSize && (
                                                          <div>
                                                              <span className="text-[10px] font-bold text-slate-500 uppercase">景别</span>
                                                              <p className="text-xs text-slate-300">{shot.shotSize}</p>
                                                          </div>
                                                      )}
                                                      {shot.cameraAngle && (
                                                          <div>
                                                              <span className="text-[10px] font-bold text-slate-500 uppercase">拍摄角度</span>
                                                              <p className="text-xs text-slate-300">{shot.cameraAngle}</p>
                                                          </div>
                                                  )}
                                                  </div>

                                                  <div className="grid grid-cols-2 gap-2">
                                                      {shot.cameraMovement && (
                                                          <div>
                                                              <span className="text-[10px] font-bold text-slate-500 uppercase">运镜方式</span>
                                                              <p className="text-xs text-slate-300">{shot.cameraMovement}</p>
                                                          </div>
                                                      )}
                                                      {shot.duration && (
                                                          <div>
                                                              <span className="text-[10px] font-bold text-slate-500 uppercase">时长</span>
                                                              <p className="text-xs text-slate-300">{shot.duration}s</p>
                                                          </div>
                                                  )}
                                                  </div>

                                                  {shot.visualEffects && (
                                                      <div>
                                                          <span className="text-[10px] font-bold text-slate-500 uppercase">视觉特效</span>
                                                          <p className="text-xs text-slate-300">{shot.visualEffects}</p>
                                                      </div>
                                                  )}

                                                  {shot.audioEffects && (
                                                      <div>
                                                          <span className="text-[10px] font-bold text-slate-500 uppercase">音效</span>
                                                          <p className="text-xs text-slate-300">{shot.audioEffects}</p>
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600 p-6 text-center">
                              {isSplitting ? (
                                  <Loader2 size={32} className="animate-spin text-blue-500" />
                              ) : splitShots.length > 0 && validShots.length === 0 ? (
                                  // 有分镜但全部被过滤（都是空的）
                                  <>
                                      <AlertCircle size={32} className="text-orange-500/50" />
                                      <span className="text-xs font-medium">所有分镜内容为空，无法展示</span>
                                      <div className="flex flex-col gap-1 text-[10px] text-slate-500 max-w-[260px]">
                                          <span>💡 分镜缺少画面描述或拆解图片</span>
                                          <span>✂️ 请重新生成分镜图并确保内容完整</span>
                                      </div>
                                  </>
                              ) : (
                                  <>
                                      <Grid size={32} className="text-blue-500/50" />
                                      <span className="text-xs font-medium">
                                          {isSplitting ? "正在切割分镜图..." : "等待切割分镜图..."}
                                      </span>
                                      {!isSplitting && connectedStoryboardNodes.length === 0 && (
                                          <div className="flex flex-col gap-1 text-[10px] text-slate-500 max-w-[220px]">
                                              <span>💡 连接分镜图设计节点</span>
                                              <span>✂️ 鼠标移入底部面板选择要切割的图片</span>
                                              <span>📦 切割后可导出图片包</span>
                                          </div>
                                      )}
                                  </>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          );
      }
      if (node.type === NodeType.STORYBOARD_GENERATOR) {
          const shots = node.data.storyboardShots || [];
          return (
              <div className="w-full h-full flex flex-col overflow-hidden relative">
                  {shots.length > 0 ? (
                      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4" onWheel={(e) => e.stopPropagation()}>
                          {shots.map((shot, idx) => (
                              <div key={shot.id} className="flex gap-3 p-2 rounded-xl bg-black/20 border border-white/5 group hover:bg-black/40 transition-colors">
                                  {/* Shot Image */}
                                  <div className="w-24 h-24 shrink-0 rounded-lg bg-black/50 overflow-hidden relative border border-white/10">
                                      {shot.imageUrl ? (
                                          <img loading="lazy" src={shot.imageUrl} className="w-full h-full object-cover" onClick={() => onExpand?.({ type: 'image', src: shot.imageUrl!, rect: new DOMRect(), images: shots.filter(s=>s.imageUrl).map(s=>s.imageUrl!), initialIndex: idx })} />
                                      ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                              <Loader2 className="animate-spin text-slate-600" size={16} />
                                          </div>
                                      )}
                                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 backdrop-blur rounded text-[8px] font-bold text-white/80">
                                          Shot {idx + 1}
                                      </div>
                                  </div>
                                  
                                  {/* Shot Details */}
                                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                                      <div className="flex items-start justify-between">
                                          <span className="text-[10px] font-bold text-indigo-300 truncate">{shot.subject}</span>
                                          <span className="text-[9px] font-mono text-slate-500">{shot.duration}s</span>
                                      </div>
                                      <div className="text-[9px] text-slate-400 line-clamp-2 leading-relaxed">
                                          <span className="text-slate-500">运镜: </span>{shot.camera}
                                      </div>
                                      <div className="text-[9px] text-slate-400 line-clamp-2 leading-relaxed">
                                          <span className="text-slate-500">场景: </span>{shot.scene}
                                      </div>
                                      <div className="mt-auto flex gap-2">
                                          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] text-slate-500">{shot.lighting}</span>
                                          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] text-slate-500">{shot.style}</span>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600 p-6 text-center">
                          {isWorking ? <Loader2 size={32} className="animate-spin text-indigo-500" /> : <Clapperboard size={32} className="text-indigo-500/50" />}
                          <span className="text-xs font-medium">{isWorking ? "正在规划分镜并绘制..." : "等待生成分镜..."}</span>
                          {!isWorking && <span className="text-[10px] text-slate-500 max-w-[200px]">连接分集脚本节点，设置数量与时长，点击生成开始创作。</span>}
                      </div>
                  )}
              </div>
          );
      }
      
      // --- CHARACTER NODE CONTENT ---
      if (node.type === NodeType.CHARACTER_NODE) {
          const names = node.data.extractedCharacterNames || [];
          const configs = node.data.characterConfigs || {};
          const generated = node.data.generatedCharacters || [];

          return (
              <div className="w-full h-full flex flex-col overflow-hidden relative">
                  {/* Top: List of Characters */}
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4" onWheel={(e) => e.stopPropagation()}>
                      {names.length === 0 && !isWorking ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                              <User size={32} className="opacity-50" />
                              <span className="text-xs">等待提取角色...</span>
                              <span className="text-[10px]">请连接剧本节点</span>
                              <span className="text-[9px] text-slate-600 mt-2">💡 支持连接多个节点自动去重</span>
                          </div>
                      ) : (
                          <div className="space-y-4">
                              {/* Show input source count */}
                              {node.inputs.length > 1 && (
                                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 flex items-center gap-2">
                                      <div className="flex items-center gap-1.5">
                                          <User size={12} className="text-orange-400" />
                                          <span className="text-[10px] text-orange-300 font-bold">{names.length} 个角色</span>
                                      </div>
                                      <span className="text-[9px] text-slate-400">来自 {node.inputs.length} 个输入节点</span>
                                  </div>
                              )}
                              {names.map((name, idx) => {
                                  const config = configs[name] || { method: 'AI_AUTO' };
                                  const profile = generated.find(p => p.name === name);
                                  const isProcessing = profile?.status === 'GENERATING' || profile?.isGeneratingExpression || profile?.isGeneratingThreeView;
                                  const isFailed = profile?.status === 'ERROR';
                                  const isSaved = profile?.isSaved;

                                  // Debug log
                                  if (profile) {
                                  }

                                  return (
                                      <div key={idx} className="bg-black/20 border border-white/5 rounded-xl p-3 space-y-2 group/char hover:border-white/20 transition-all">
                                          <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                  <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold">{idx + 1}</div>
                                                  <span className="font-bold text-sm text-slate-200">{name}</span>
                                              </div>

                                              <div className="flex items-center gap-2">
                                                  {!profile && !isProcessing && (
                                                      <select
                                                          className="bg-black/40 border border-white/10 rounded-lg text-[10px] text-slate-300 px-2 py-1 outline-none"
                                                          value={config.method}
                                                          onChange={(e) => {
                                                              const newConfigs = { ...configs, [name]: { ...config, method: e.target.value as any } };
                                                              onUpdate(node.id, { characterConfigs: newConfigs });
                                                          }}
                                                          onClick={e => e.stopPropagation()}
                                                      >
                                                          <option value="AI_AUTO">主角 (完整)</option>
                                                          <option value="SUPPORTING_ROLE">配角 (简化)</option>
                                                          <option value="AI_CUSTOM">补充描述</option>
                                                          <option value="LIBRARY">角色库</option>
                                                      </select>
                                                  )}

                                                  {!profile && !isProcessing && (
                                                      <button
                                                          onClick={(e) => { e.stopPropagation(); onCharacterAction?.(node.id, 'GENERATE_SINGLE', name); }}
                                                          className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-[10px] font-bold rounded transition-all"
                                                      >
                                                          <Sparkles size={10} />
                                                          生成
                                                      </button>
                                                  )}

                                                  <button
                                                      onClick={(e) => { e.stopPropagation(); onCharacterAction?.(node.id, 'DELETE', name); }}
                                                      disabled={isProcessing}
                                                      className={`p-1 rounded-full transition-colors ${isProcessing ? 'cursor-not-allowed opacity-50' : 'hover:bg-white/10 text-slate-500 hover:text-red-400'}`}
                                                  >
                                                      <X size={12} />
                                                  </button>
                                              </div>
                                          </div>

                                          {config.method === 'AI_CUSTOM' && !profile && (
                                              <textarea
                                                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] text-slate-300 outline-none resize-none h-16 custom-scrollbar disabled:opacity-50"
                                                  placeholder="输入外貌、性格等补充描述..."
                                                  value={config.customPrompt || ''}
                                                  onChange={(e) => {
                                                      const newConfigs = { ...configs, [name]: { ...config, customPrompt: e.target.value } };
                                                      onUpdate(node.id, { characterConfigs: newConfigs });
                                                  }}
                                                  disabled={isProcessing}
                                                  onWheel={(e) => e.stopPropagation()}
                                              />
                                          )}

                                          {isProcessing && (
                                              <div className="bg-[#18181b] rounded-lg p-3 border border-white/5 flex items-center justify-between gap-2">
                                                  <div className="flex items-center gap-2">
                                                      <Loader2 size={12} className="animate-spin text-orange-400" />
                                                      <span className="text-[10px] text-slate-400">
                                                          {profile?.isGeneratingThreeView ? '正在生成三视图...' :
                                                           profile?.isGeneratingExpression ? '正在生成九宫格表情...' :
                                                           !profile?.expressionSheet ? '正在生成角色档案...' :
                                                           '正在生成中...'}
                                                      </span>
                                                  </div>
                                                  <button
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          // 强制重新生成
                                                          if (profile?.isGeneratingThreeView) {
                                                              onCharacterAction?.(node.id, 'GENERATE_THREE_VIEW', name);
                                                          } else if (profile?.isGeneratingExpression) {
                                                              onCharacterAction?.(node.id, 'GENERATE_EXPRESSION', name);
                                                          } else {
                                                              onCharacterAction?.(node.id, 'RETRY', name);
                                                          }
                                                      }}
                                                      className="flex items-center gap-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-bold rounded transition-all"
                                                  >
                                                      <RotateCcw size={10} />
                                                      重新生成
                                                  </button>
                                              </div>
                                          )}

                                          {isFailed && (
                                              <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/20 flex flex-col gap-2">
                                                  <div className="flex items-center gap-2 text-red-300 text-[10px]">
                                                      <AlertCircle size={12} />
                                                      <span>生成失败</span>
                                                  </div>
                                                  <button 
                                                      onClick={() => onCharacterAction?.(node.id, 'RETRY', name)}
                                                      className="w-full py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[10px] rounded"
                                                  >
                                                      重试
                                                  </button>
                                              </div>
                                          )}

                                          {profile && !isProcessing && !isFailed && (
                                              <div className="bg-[#18181b] rounded-lg p-2 border border-white/5 flex flex-col gap-2 animate-in fade-in cursor-pointer hover:bg-white/5 transition-colors" onClick={() => onViewCharacter?.(profile)}>
                                                  <div className="flex gap-3">
                                                      <div className="w-16 h-16 shrink-0 bg-black rounded-md overflow-hidden relative">
                                                          {profile.threeViewSheet ? (
                                                              <img loading="lazy" src={profile.threeViewSheet} className="w-full h-full object-cover" />
                                                          ) : profile.expressionSheet ? (
                                                              <img loading="lazy" src={profile.expressionSheet} className="w-full h-full object-cover" />
                                                          ) : (
                                                              <div className="w-full h-full bg-black flex items-center justify-center">
                                                                  <User className="w-8 h-8 text-slate-700 opacity-30" />
                                                              </div>
                                                          )}
                                                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/char:opacity-100 transition-opacity">
                                                              <Eye size={16} className="text-white drop-shadow-md" />
                                                          </div>
                                                      </div>
                                                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                                                          <div className="text-[10px] text-orange-300 font-bold">{profile.profession || '未知职业'}</div>
                                                          <div className="text-[9px] text-slate-400 line-clamp-3 leading-relaxed">{profile.personality || '无性格描述'}</div>
                                                      </div>
                                                  </div>

                                                  {/* 根据生成状态显示不同的按钮 */}
                                                  {!profile.expressionSheet && !profile.threeViewSheet && (
                                                      <div className="flex items-center gap-2 mt-1">
                                                          {/* 主角显示九宫格按钮，配角直接显示三视图按钮 */}
                                                          {profile.roleType === 'supporting' ? (
                                                              <button
                                                                  onClick={(e) => { e.stopPropagation(); onCharacterAction?.(node.id, 'GENERATE_THREE_VIEW', name); }}
                                                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-all"
                                                              >
                                                                  <Layers size={10} /> 生成三视图
                                                              </button>
                                                          ) : (
                                                              <>
                                                                  <button
                                                                      onClick={(e) => { e.stopPropagation(); onCharacterAction?.(node.id, 'GENERATE_EXPRESSION', name); }}
                                                                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 transition-all"
                                                                  >
                                                                      <Sparkles size={10} /> 生成九宫格
                                                                  </button>
                                                                  <button
                                                                      onClick={(e) => { e.stopPropagation(); alert('请先生成九宫格表情图'); }}
                                                                      disabled
                                                                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold bg-white/5 text-slate-600 cursor-not-allowed"
                                                                  >
                                                                      <Layers size={10} /> 生成三视图
                                                                  </button>
                                                              </>
                                                          )}
                                                      </div>
                                                  )}

                                                  {/* 有九宫格但没有三视图 - 显示生成三视图按钮 */}
                                                  {profile.expressionSheet && !profile.threeViewSheet && (
                                                      <div className="flex items-center gap-2 mt-1">
                                                          <button
                                                              onClick={(e) => { e.stopPropagation(); onCharacterAction?.(node.id, 'GENERATE_THREE_VIEW', name); }}
                                                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-all"
                                                          >
                                                              <Layers size={10} /> 生成三视图
                                                          </button>
                                                          <button
                                                              onClick={(e) => { e.stopPropagation(); onCharacterAction?.(node.id, 'RETRY', name); }}
                                                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                                          >
                                                              <RotateCcw size={10} /> 重新生成
                                                          </button>
                                                      </div>
                                                  )}

                                                  {/* 配角：没有九宫格但有基础信息，显示生成三视图按钮 */}
                                                  {profile.roleType === 'supporting' && !profile.expressionSheet && profile.threeViewSheet === undefined && profile.profession && (
                                                      <div className="flex items-center gap-2 mt-1">
                                                          <button
                                                              onClick={(e) => { e.stopPropagation(); onCharacterAction?.(node.id, 'GENERATE_THREE_VIEW', name); }}
                                                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-all"
                                                          >
                                                              <Layers size={10} /> 生成三视图
                                                          </button>
                                                          <button
                                                              onClick={(e) => { e.stopPropagation(); onCharacterAction?.(node.id, 'RETRY', name); }}
                                                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                                          >
                                                              <RotateCcw size={10} /> 重新生成
                                                          </button>
                                                      </div>
                                                  )}

                                                  {profile.expressionSheet && profile.threeViewSheet && (
                                                      <div className="flex items-center gap-2 mt-1">
                                                          <button
                                                              onClick={(e) => { e.stopPropagation(); onCharacterAction?.(node.id, 'SAVE', name); }}
                                                              disabled={isSaved}
                                                              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold transition-all ${isSaved ? 'bg-green-500/20 text-green-400 cursor-default' : 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'}`}
                                                          >
                                                              {isSaved ? <CheckCircle size={10} /> : <Save size={10} />}
                                                              {isSaved ? '已保存' : '保存'}
                                                          </button>
                                                          <button
                                                              onClick={(e) => { e.stopPropagation(); onCharacterAction?.(node.id, 'RETRY', name); }}
                                                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                                          >
                                                              <RotateCcw size={10} /> 重新生成
                                                          </button>
                                                      </div>
                                                  )}
                                              </div>
                                          )}

                                          {/* Prompt Editor - only show when profile exists and has prompts */}
                                          {profile && !isProcessing && !isFailed && (
                                              <PromptEditor
                                                  nodeId={node.id}
                                                  charName={name}
                                                  expressionPromptZh={profile.expressionPromptZh || promptManager.getDefaultPrompts().expressionPrompt.zh}
                                                  expressionPromptEn={profile.expressionPromptEn || promptManager.getDefaultPrompts().expressionPrompt.en}
                                                  threeViewPromptZh={profile.threeViewPromptZh || promptManager.getDefaultPrompts().threeViewPrompt.zh}
                                                  threeViewPromptEn={profile.threeViewPromptEn || promptManager.getDefaultPrompts().threeViewPrompt.en}
                                                  hasExpressionSheet={!!profile.expressionSheet}
                                                  hasThreeViewSheet={!!profile.threeViewSheet}
                                                  onRegenerateExpression={(customPrompt) => {
                                                      onCharacterAction?.(node.id, 'GENERATE_EXPRESSION', name, { expressionPrompt: customPrompt });
                                                  }}
                                                  onRegenerateThreeView={(customPrompt) => {
                                                      onCharacterAction?.(node.id, 'GENERATE_THREE_VIEW', name, { threeViewPrompt: customPrompt });
                                                  }}
                                              />
                                          )}
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>
              </div>
          );
      }

      // --- STYLE PRESET NODE CONTENT ---
      if (node.type === NodeType.STYLE_PRESET) {
          const stylePrompt = node.data.stylePrompt || '';
          const negativePrompt = node.data.negativePrompt || '';
          const visualStyle = node.data.visualStyle || 'ANIME';
          const characterCount = stylePrompt.length;

          return (
              <div className="w-full h-full flex flex-col overflow-hidden relative">
                  {/* Top: Generated Style Prompt */}
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3" onWheel={(e) => e.stopPropagation()}>
                      {!stylePrompt && !isWorking ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                              <Palette size={32} className="opacity-50" />
                              <span className="text-xs">等待生成风格提示词...</span>
                              <span className="text-[10px]">配置参数后点击生成</span>
                          </div>
                      ) : (
                          <>
                              {/* Style Prompt Display */}
                              <div className="bg-black/20 border border-white/5 rounded-xl p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                          <Palette size={14} className="text-purple-400" />
                                          <span className="text-xs text-slate-300 font-bold">风格提示词</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                                              visualStyle === 'REAL' ? 'bg-blue-500/20 text-blue-300' :
                                              visualStyle === 'ANIME' ? 'bg-pink-500/20 text-pink-300' :
                                              'bg-green-500/20 text-green-300'
                                          }`}>{visualStyle}</span>
                                          <span className="text-[9px] text-slate-500">{characterCount} 字符</span>
                                          {stylePrompt && (
                                              <button
                                                  onClick={() => navigator.clipboard.writeText(stylePrompt)}
                                                  className="p-1 rounded hover:bg-white/10 transition-colors"
                                                  title="复制"
                                              >
                                                  <Copy size={10} className="text-slate-400" />
                                              </button>
                                          )}
                                      </div>
                                  </div>
                                  <textarea
                                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] text-slate-300 font-mono leading-relaxed resize-none h-32 custom-scrollbar"
                                      placeholder="生成的风格提示词将显示在这里..."
                                      value={stylePrompt}
                                      onChange={(e) => onUpdate(node.id, { stylePrompt: e.target.value })}
                                      onMouseDown={e => e.stopPropagation()}
                                      onWheel={(e) => e.stopPropagation()}
                                      spellCheck={false}
                                  />
                              </div>

                              {/* Negative Prompt Display (Collapsible) */}
                              {negativePrompt && (
                                  <details className="bg-black/10 border border-white/5 rounded-xl overflow-hidden">
                                      <summary className="px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between text-[10px] text-slate-400">
                                          <span>负面提示词 (Negative Prompt)</span>
                                          <ChevronDown size={12} />
                                      </summary>
                                      <div className="p-3 pt-0">
                                          <div className="bg-black/40 border border-white/10 rounded-lg p-2">
                                              <div className="text-[9px] text-slate-400 font-mono leading-relaxed">{negativePrompt}</div>
                                          </div>
                                      </div>
                                  </details>
                              )}
                          </>
                      )}
                  </div>

                  {isWorking && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                          <Loader2 className="animate-spin text-purple-400" />
                      </div>
                  )}
              </div>
          );
      }

      if (node.type === NodeType.VIDEO_ANALYZER) {
          return (
            <div className="w-full h-full p-5 flex flex-col gap-3">
                 <div className="relative w-full h-32 rounded-xl bg-black/20 border border-white/5 overflow-hidden flex items-center justify-center cursor-pointer hover:bg-black/30 transition-colors group/upload" onClick={() => !node.data.videoUri && fileInputRef.current?.click()}>
                    {videoBlobUrl ? <video src={videoBlobUrl} className="w-full h-full object-cover opacity-80" muted onMouseEnter={safePlay} onMouseLeave={safePause} onClick={handleExpand} /> : <div className="flex flex-col items-center gap-2 text-slate-500 group-hover:upload:text-slate-300"><Upload size={20} /><span className="text-[10px] font-bold uppercase tracking-wider">上传视频</span></div>}
                    {node.data.videoUri && <button className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-slate-400 hover:text-white backdrop-blur-md" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}><Edit size={10} /></button>}
                    <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleUploadVideo} />
                 </div>
                 <div className="flex-1 bg-black/10 rounded-xl border border-white/5 overflow-hidden relative group/analysis">
                    <textarea className="w-full h-full bg-transparent p-3 resize-none focus:outline-none text-xs text-slate-300 font-mono leading-relaxed custom-scrollbar select-text placeholder:italic placeholder:text-slate-600" value={node.data.analysis || ''} placeholder="等待分析结果，或在此粘贴文本..." onChange={(e) => onUpdate(node.id, { analysis: e.target.value })} onWheel={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()} spellCheck={false} />
                    {node.data.analysis && <button className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 border border-white/10 rounded-md text-slate-400 hover:text-white transition-all opacity-0 group-hover/analysis:opacity-100 backdrop-blur-md z-10" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(node.data.analysis || ''); }} title="复制全部"><Copy size={12} /></button>}
                 </div>
                 {isWorking && <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10"><Loader2 className="animate-spin text-emerald-400" /></div>}
            </div>
          )
      }
      const toggleAudio = () => {
          const audio = mediaRef.current as HTMLAudioElement | null;
          if (!audio) return;
          if (isPlayingAudio) { audio.pause(); } else { audio.play().catch(() => {}); }
      };

      if (node.type === NodeType.AUDIO_GENERATOR) {
          return (
              <div className="w-full h-full p-6 flex flex-col justify-center items-center relative overflow-hidden group/audio">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-purple-900/10 z-0"></div>
                  {node.data.audioUri ? (
                      <div className="flex flex-col items-center gap-4 w-full z-10">
                          <audio ref={mediaRef as any} src={node.data.audioUri} onEnded={() => setIsPlayingAudio(false)} onPlay={() => setIsPlayingAudio(true)} onPause={() => setIsPlayingAudio(false)} className="hidden" />
                          <div className="w-full px-4"><AudioVisualizer isPlaying={isPlayingAudio} /></div>
                          <div className="flex items-center gap-4"><button onClick={toggleAudio} className="w-12 h-12 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/50 flex items-center justify-center transition-all hover:scale-105">{isPlayingAudio ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white ml-1" />}</button></div>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center gap-3 text-slate-600 z-10 select-none">{isWorking ? <Loader2 size={32} className="animate-spin text-pink-500" /> : <Mic2 size={32} className="text-slate-500" />}<span className="text-[10px] font-bold uppercase tracking-widest">{isWorking ? '生成中...' : '准备生成'}</span></div>
                  )}
                  {node.status === NodeStatus.ERROR && <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20"><AlertCircle className="text-red-500 mb-2" /><span className="text-xs text-red-200">{node.data.error}</span></div>}
              </div>
          )
      }
      
      if (node.type === NodeType.IMAGE_EDITOR) {
          return (
              <div className="w-full h-full p-0 flex flex-col relative group/edit">
                  {node.data.image ? (
                      <div className="relative flex-1 overflow-hidden bg-[#09090b]">
                          <img loading="lazy" src={node.data.image} className="w-full h-full object-contain" onClick={handleExpand} />
                          <button className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-500/80 transition-colors" onClick={() => onUpdate(node.id, { image: undefined })}><X size={14} /></button>
                      </div>
                  ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 bg-[#1c1c1e]" onClick={() => fileInputRef.current?.click()}>
                          <Upload size={24} />
                          <span className="text-xs">上传图片或使用画板</span>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUploadImage} />
                      </div>
                  )}
                  <div className="h-14 border-t border-white/5 bg-[#1c1c1e] p-2 flex items-center gap-2">
                        <input className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none" placeholder="编辑指令..." value={localPrompt} onChange={e => setLocalPrompt(e.target.value)} onKeyDown={handleCmdEnter} onBlur={commitPrompt} />
                        <button className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors shadow-sm" onClick={handleActionClick}><Wand2 size={14} /></button>
                  </div>
              </div>
          )
      }

      if (node.type === NodeType.DRAMA_ANALYZER) {
          const analysisFields = [
              { key: 'dramaIntroduction', label: '剧集介绍', icon: Film },
              { key: 'worldview', label: '世界观分析', icon: LayoutGrid },
              { key: 'logicalConsistency', label: '逻辑自洽性', icon: CheckCircle },
              { key: 'extensibility', label: '延展性分析', icon: Layers },
              { key: 'characterTags', label: '角色标签', icon: Users },
              { key: 'protagonistArc', label: '主角弧光', icon: User },
              { key: 'audienceResonance', label: '受众共鸣点', icon: Eye },
              { key: 'artStyle', label: '画风分析', icon: ImageIcon }
          ];

          const selectedFields = node.data.selectedFields || [];
          const hasAnalysis = node.data.dramaIntroduction || node.data.worldview;

          return (
              <div className="w-full h-full flex flex-col bg-[#1c1c1e] relative overflow-hidden">
                  {/* Analysis results display area */}
                  {hasAnalysis ? (
                      <>
                          {/* Select All Button */}
                          <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
                              <div className="flex items-center gap-2">
                                  <Square size={14} className="text-violet-400" />
                                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                      已选择 {selectedFields.length} / {analysisFields.length} 项
                                  </span>
                              </div>
                              <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      const allKeys = analysisFields.map(f => f.key);
                                      const newSelected = selectedFields.length === analysisFields.length
                                          ? []
                                          : allKeys;
                                      onUpdate(node.id, { selectedFields: newSelected });
                                  }}
                                  className="px-3 py-1.5 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 rounded-lg text-[10px] font-bold text-violet-300 transition-colors flex items-center gap-1.5"
                                  onMouseDown={e => e.stopPropagation()}
                              >
                                  {selectedFields.length === analysisFields.length ? (
                                      <>
                                          <X size={12} />
                                          取消全选
                                      </>
                                  ) : (
                                      <>
                                          <CheckCircle size={12} />
                                          全选
                                      </>
                                  )}
                              </button>
                          </div>

                          {/* Fields list */}
                          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3" onWheel={(e) => e.stopPropagation()}>
                              {analysisFields.map(({ key, label, icon: Icon }) => {
                              const value = node.data[key as keyof typeof node.data] as string || '';
                              const isSelected = selectedFields.includes(key);

                              return (
                                  <div key={key} className="bg-black/20 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors">
                                      {/* Field Header with Checkbox */}
                                      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border-b border-white/5">
                                          <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={(e) => {
                                                  const newSelected = e.target.checked
                                                      ? [...selectedFields, key]
                                                      : selectedFields.filter(f => f !== key);
                                                  onUpdate(node.id, { selectedFields: newSelected });
                                              }}
                                              className="w-3.5 h-3.5 rounded border-white/20 bg-black/20 checked:bg-violet-500 cursor-pointer"
                                              onMouseDown={e => e.stopPropagation()}
                                          />
                                          <Icon size={12} className="text-violet-400" />
                                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{label}</span>
                                          {isSelected && (
                                              <div className="ml-auto px-1.5 py-0.5 bg-violet-500/20 border border-violet-500/30 rounded text-[8px] text-violet-300 font-bold">
                                                  已选择
                                              </div>
                                          )}
                                      </div>

                                      {/* Field Content */}
                                      <textarea
                                          className="w-full bg-transparent p-3 text-[11px] text-slate-300 leading-relaxed resize-none focus:outline-none custom-scrollbar"
                                          style={STYLE_MIN_HEIGHT_80}
                                          value={value}
                                          onChange={(e) => onUpdate(node.id, { [key]: e.target.value })}
                                          placeholder={`等待${label}...`}
                                          onMouseDown={e => e.stopPropagation()}
                                          onWheel={(e) => e.stopPropagation()}
                                      />
                                  </div>
                              );
                          })}
                      </div>
                      </>
                  ) : (
                      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600 p-6 text-center">
                          {isWorking ? (
                              <>
                                  <Loader2 size={32} className="animate-spin text-violet-500" />
                                  <span className="text-xs font-medium">正在分析剧目...</span>
                              </>
                          ) : (
                              <>
                                  <Film size={32} className="text-violet-500/50" />
                                  <span className="text-xs font-medium">输入剧名并点击分析</span>
                                  <span className="text-[10px] text-slate-500 max-w-[280px] leading-relaxed">
                                      AI将从世界观、逻辑自洽性、延展性、角色标签、主角弧光、受众共鸣点和画风等多维度深度分析剧集的IP潜力
                                  </span>
                              </>
                          )}
                      </div>
                  )}

                  {node.status === NodeStatus.ERROR && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
                          <AlertCircle className="text-red-500 mb-2" />
                          <span className="text-xs text-red-200">{node.data.error}</span>
                      </div>
                  )}
              </div>
          );
      }

      // DRAMA_REFINED Node Rendering
      if (node.type === NodeType.DRAMA_REFINED) {
          const refinedData = node.data.refinedContent || {};

          // Helper function to get category labels in Chinese
          const getCategoryLabel = (category: string) => {
              const labels: Record<string, string> = {
                  // 剧目分析的原始字段
                  dramaIntroduction: '剧集介绍',
                  worldview: '世界观分析',
                  logicalConsistency: '逻辑自洽性',
                  extensibility: '延展性分析',
                  characterTags: '角色标签',
                  protagonistArc: '主角弧光',
                  audienceResonance: '受众共鸣点',
                  artStyle: '画风分析',
                  // 兼容旧的固定类别（如果有）
                  audience: '受众与共鸣',
                  theme: '核心主题',
                  tone: '情感基调',
                  characters: '角色特征',
                  visual: '视觉风格'
              };
              return labels[category] || category;
          };

          return (
              <div className="w-full h-full flex flex-col bg-[#1c1c1e] relative overflow-hidden">
                  {/* Tags Grid */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4" onWheel={(e) => e.stopPropagation()}>
                      {Object.keys(refinedData).length > 0 ? (
                          Object.entries(refinedData).map(([category, tags]) => (
                              <div key={category} className="space-y-2">
                                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                                      {getCategoryLabel(category)}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      {(tags as string[]).map((tag, idx) => (
                                          <div
                                              key={idx}
                                              className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-md text-[10px] text-cyan-300 font-medium hover:bg-cyan-500/20 transition-colors"
                                          >
                                              {tag}
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600 p-6 text-center">
                              {isWorking ? (
                                  <>
                                      <Loader2 size={32} className="animate-spin text-cyan-500" />
                                      <span className="text-xs font-medium">正在提取精炼信息...</span>
                                  </>
                              ) : (
                                  <>
                                      <Sparkles size={32} className="text-cyan-500/50" />
                                      <span className="text-xs font-medium">等待精炼数据</span>
                                      <span className="text-[10px] text-slate-500 max-w-[280px] leading-relaxed">
                                          从剧目分析节点提取精炼标签
                                      </span>
                                  </>
                              )}
                          </div>
                      )}
                  </div>

                  {/* Footer Info */}
                  <div className="px-4 py-2 border-t border-white/5 bg-white/5 shrink-0">
                      <div className="text-[9px] text-slate-500">
                          💡 此节点可连接到"剧本大纲"作为创作辅助信息
                      </div>
                  </div>

                  {node.status === NodeStatus.ERROR && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
                          <AlertCircle className="text-red-500 mb-2" />
                          <span className="text-xs text-red-200">{node.data.error}</span>
                      </div>
                  )}
              </div>
          );
      }

      // --- SORA VIDEO GENERATOR (PARENT NODE) CONTENT ---
      if (node.type === NodeType.SORA_VIDEO_GENERATOR) {
          const taskGroups = node.data.taskGroups || [];

          // 🚀 Sora2 视频本地文件缓存 - 优先使用本地文件
          const [soraLocalVideos, setSoraLocalVideos] = useState<Record<string, string>>({});

          // 加载本地 Sora2 视频
          useEffect(() => {
              let mounted = true;
              const blobUrls: string[] = [];

              const loadSoraLocalVideos = async () => {
                  if (!taskGroups.length) return;

                  try {
                      const { getFileStorageService } = await import('../../services/storage/index');
                      const service = getFileStorageService();
                      const localUrls: Record<string, string> = {};

                      // 只在本地存储启用时尝试加载
                      if (service.isEnabled() && mounted) {

                          // 获取父节点下所有视频文件
                          const metadataManager = (service as any).metadataManager;
                          if (metadataManager) {
                              const files = metadataManager.getFilesByNode(node.id);

                              // 过滤出视频文件
                              const videoFiles = files.filter((f: any) =>
                                  f.relativePath.includes('.mp4') ||
                                  f.relativePath.includes('.video') ||
                                  f.mimeType?.startsWith('video/')
                              );


                              // 按任务组 ID 匹配视频文件
                              for (const videoFile of videoFiles) {
                                  if (!mounted) break; // 🔥 防止组件卸载后继续执行

                                  // 从文件路径中提取任务组 ID (格式: sora-video-{taskGroupId}-{timestamp}.mp4)
                                  const match = videoFile.relativePath.match(/sora-video-([^-]+)/);
                                  if (match) {
                                      const taskGroupId = match[1];
                                      const tg = taskGroups.find((t: any) => t.id === taskGroupId);
                                      if (tg) {
                                          const dataUrl = await service.readFileAsDataUrl(videoFile.relativePath);
                                          if (mounted) {
                                              localUrls[tg.id] = dataUrl;
                                              if (dataUrl.startsWith('blob:')) {
                                                  blobUrls.push(dataUrl);
                                              }
                                          }
                                      }
                                  }
                              }
                          }
                      }

                      if (mounted && Object.keys(localUrls).length > 0) {
                          setSoraLocalVideos(localUrls);
                      }
                  } catch (error) {
                      console.error('[Sora2] 加载本地视频失败:', error);
                  }
              };

              loadSoraLocalVideos();

              // 🔥 正确的清理函数
              return () => {
                  mounted = false;
                  blobUrls.forEach(url => {
                      if (url.startsWith('blob:')) {
                          URL.revokeObjectURL(url);
                      }
                  });
              };
          }, [node.id, node.data.taskGroups]); // 🔥 使用稳定的依赖项

          return (
              <div className="w-full h-full flex flex-col bg-zinc-900 overflow-hidden">
                  {/* Task Groups List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3" onWheel={(e) => e.stopPropagation()}>
                      {taskGroups.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-600">
                              <Wand2 size={32} className="opacity-50" />
                              <span className="text-xs font-medium">等待生成分组</span>
                              <span className="text-[10px] text-slate-500 text-center max-w-[280px]">
                                  连接分镜图拆解节点后点击"开始生成"
                              </span>
                          </div>
                      ) : (
                          <div className="flex flex-col gap-3">
                              {taskGroups.map((tg: any, index: number) => (
                                  <div
                                      key={tg.id}
                                      className={`rounded-lg border overflow-hidden transition-all ${
                                          tg.generationStatus === 'completed'
                                              ? 'bg-green-500/10 border-green-500/30'
                                              : tg.generationStatus === 'generating' || tg.generationStatus === 'uploading'
                                              ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-border-glow'
                                              : tg.generationStatus === 'failed'
                                              ? 'bg-red-500/10 border-red-500/30'
                                              : 'bg-white/5 border-white/10'
                                      }`}
                                  >
                                      {/* Header */}
                                      <div className="flex items-center justify-between px-3 py-2 bg-black/20 border-b border-white/5">
                                          <div className="flex items-center gap-2">
                                              <span className="text-xs font-bold text-white">
                                                  任务组 {tg.taskNumber}
                                              </span>
                                              <span className="text-[9px] text-slate-400">
                                                  {tg.totalDuration.toFixed(1)}秒 · {tg.shotIds.length}个镜头
                                              </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              {/* 尺寸选择 */}
                                              <div className="flex items-center gap-1">
                                                  <span className="text-[8px] text-slate-400">尺寸</span>
                                                  <select
                                                      value={localSoraConfigs[tg.id]?.aspect_ratio || tg.sora2Config?.aspect_ratio || '16:9'}
                                                      onChange={(e) => {
                                                          e.stopPropagation();
                                                          if (!tg.id) return;  // 🔥 安全检查
                                                          const newValue = e.target.value as '16:9' | '9:16';
                                                          // 🚀 立即更新本地状态
                                                          setLocalSoraConfigs(prev => ({
                                                            ...prev,
                                                            [tg.id]: { ...prev[tg.id], aspect_ratio: newValue, duration: prev[tg.id]?.duration || '10', hd: prev[tg.id]?.hd ?? true }
                                                          }));
                                                          // 同时更新 node.data
                                                          const baseConfig = { aspect_ratio: '16:9', duration: '10', hd: true };
                                                          const newConfig = { ...baseConfig, ...tg.sora2Config, aspect_ratio: newValue };
                                                          const updatedTaskGroups = taskGroups.map((t: any, i: number) =>
                                                              i === index ? { ...t, sora2Config: newConfig } : t
                                                          );
                                                          onUpdate(node.id, { taskGroups: updatedTaskGroups });
                                                      }}
                                                      onPointerDownCapture={(e) => e.stopPropagation()}
                                                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-[9px] rounded border border-slate-600 cursor-pointer transition-colors min-w-[70px] outline-none focus:ring-1 focus:ring-blue-500"
                                                  >
                                                      <option value="16:9">横屏 16:9</option>
                                                      <option value="9:16">竖屏 9:16</option>
                                                  </select>
                                              </div>

                                              {/* 时长选择 */}
                                              <div className="flex items-center gap-1">
                                                  <span className="text-[8px] text-slate-400">时长</span>
                                                  <select
                                                      value={localSoraConfigs[tg.id]?.duration || tg.sora2Config?.duration || '10'}
                                                      onChange={(e) => {
                                                          e.stopPropagation();
                                                          if (!tg.id) return;  // 🔥 安全检查
                                                          const newValue = e.target.value;
                                                          // 🚀 立即更新本地状态
                                                          setLocalSoraConfigs(prev => ({
                                                            ...prev,
                                                            [tg.id]: { ...prev[tg.id], duration: newValue, aspect_ratio: prev[tg.id]?.aspect_ratio || '16:9', hd: prev[tg.id]?.hd ?? true }
                                                          }));
                                                          // 同时更新 node.data
                                                          const baseConfig = { aspect_ratio: '16:9', duration: '10', hd: true };
                                                          const newConfig = { ...baseConfig, ...tg.sora2Config, duration: newValue };
                                                          const updatedTaskGroups = taskGroups.map((t: any, i: number) =>
                                                              i === index ? { ...t, sora2Config: newConfig } : t
                                                          );
                                                          onUpdate(node.id, { taskGroups: updatedTaskGroups });
                                                      }}
                                                      onPointerDownCapture={(e) => e.stopPropagation()}
                                                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-[9px] rounded border border-slate-600 cursor-pointer transition-colors min-w-[70px] outline-none focus:ring-1 focus:ring-blue-500"
                                                  >
                                                      <option value="10">10秒</option>
                                                      <option value="15">15秒</option>
                                                      <option value="25">25秒</option>
                                                  </select>
                                              </div>

                                              {/* 质量选择 */}
                                              <div className="flex items-center gap-1">
                                                  <span className="text-[8px] text-slate-400">质量</span>
                                                  <select
                                                      value={localSoraConfigs[tg.id]?.hd ?? true ? 'hd' : 'sd'}
                                                      onChange={(e) => {
                                                          e.stopPropagation();
                                                          if (!tg.id) return;  // 🔥 安全检查
                                                          const isHd = e.target.value === 'hd';
                                                          // 🚀 立即更新本地状态
                                                          setLocalSoraConfigs(prev => ({
                                                            ...prev,
                                                            [tg.id]: { ...prev[tg.id], hd: isHd, aspect_ratio: prev[tg.id]?.aspect_ratio || '16:9', duration: prev[tg.id]?.duration || '10' }
                                                          }));
                                                          // 同时更新 node.data
                                                          const baseConfig = { aspect_ratio: '16:9', duration: '10', hd: true };
                                                          const newConfig = { ...baseConfig, ...tg.sora2Config, hd: isHd };
                                                          const updatedTaskGroups = taskGroups.map((t: any, i: number) =>
                                                              i === index ? { ...t, sora2Config: newConfig } : t
                                                          );
                                                          onUpdate(node.id, { taskGroups: updatedTaskGroups });
                                                      }}
                                                      onPointerDownCapture={(e) => e.stopPropagation()}
                                                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-[9px] rounded border border-slate-600 cursor-pointer transition-colors min-w-[70px] outline-none focus:ring-1 focus:ring-blue-500"
                                                  >
                                                      <option value="hd">高清</option>
                                                      <option value="sd">标清</option>
                                                  </select>
                                              </div>

                                              {/* Generate Video Button */}
                                              <button
                                                  onClick={() => onAction?.(node.id, `generate-video:${index}`)}
                                                  disabled={tg.generationStatus === 'generating' || tg.generationStatus === 'uploading'}
                                                  className="px-2 py-0.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-[9px] rounded font-medium transition-colors"
                                                  title="单独生成此任务组的视频"
                                              >
                                                  {tg.generationStatus === 'generating' || tg.generationStatus === 'uploading' ? '生成中...' : '生成视频'}
                                              </button>

                                              {/* Stop Generation Button (only show when generating) */}
                                              {(tg.generationStatus === 'generating' || tg.generationStatus === 'uploading') && (
                                                  <button
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          if (confirm('确定要停止生成吗？任务将被终止。')) {
                                                              onUpdate(node.id, {
                                                                  taskGroups: taskGroups.map((t: any, i: number) =>
                                                                      i === index ? { ...t, generationStatus: 'failed' as const, error: '用户已停止生成' } : t
                                                                  )
                                                              });
                                                          }
                                                      }}
                                                      className="px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white text-[9px] rounded font-medium transition-colors"
                                                      title="停止生成此任务"
                                                  >
                                                      结束
                                                  </button>
                                              )}

                                              {/* Status Badge */}
                                              {tg.generationStatus === 'completed' && (
                                                  <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-[9px] rounded-full font-medium">
                                                      完成
                                                  </span>
                                              )}
                                              {tg.generationStatus === 'generating' && (
                                                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[9px] rounded-full font-medium">
                                                      {tg.progress || 0}%
                                                  </span>
                                              )}
                                              {tg.generationStatus === 'failed' && (
                                                  <div className="flex flex-col gap-1">
                                                      <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-[9px] rounded-full font-medium">
                                                          失败
                                                      </span>
                                                      {tg.error && (
                                                          <span className="text-[8px] text-red-400 max-w-[150px] truncate" title={typeof tg.error === 'object' ? JSON.stringify(tg.error) : String(tg.error)}>
                                                              {typeof tg.error === 'object' ? JSON.stringify(tg.error) : String(tg.error)}
                                                          </span>
                                                      )}
                                                  </div>
                                              )}
                                          </div>
                                      </div>

                                      {/* Two Column Layout */}
                                      <div className="flex gap-3 p-3">
                                          {/* Left: Storyboard Info */}
                                          <div className="flex-1 space-y-2">
                                              <div className="text-[10px] font-bold text-slate-400">分镜信息</div>

                                              {/* Shots Grid */}
                                              {tg.splitShots && tg.splitShots.length > 0 && (
                                                  <div className="grid grid-cols-3 gap-1.5">
                                                      {tg.splitShots.slice(0, 6).map((shot: any) => (
                                                          <div key={shot.id} className="relative group/shot">
                                                              <img
                                                                  loading="lazy" src={shot.splitImage}
                                                                  alt={`Shot ${shot.shotNumber}`}
                                                                  className="w-full aspect-video object-cover rounded border border-white/10 cursor-pointer hover:border-cyan-500/50 transition-all"
                                                                  onClick={(e) => {
                                                                      e.stopPropagation();
                                                                      // 可以添加点击查看大图的功能
                                                                  }}
                                                              />
                                                              <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-gradient-to-t from-black/80 to-transparent">
                                                                  <span className="text-[8px] text-white/90">#{shot.shotNumber}</span>
                                                              </div>
                                                          </div>
                                                      ))}
                                                      {tg.splitShots.length > 6 && (
                                                          <div className="flex items-center justify-center aspect-video bg-black/30 rounded border border-white/10 text-[8px] text-slate-500">
                                                              +{tg.splitShots.length - 6}
                                                          </div>
                                                      )}
                                                  </div>
                                              )}

                                              {/* Overall Description */}
                                              {tg.splitShots && tg.splitShots.length > 0 && (
                                                  <div className="space-y-1">
                                                      <div className="text-[8px] text-slate-500">分镜概述</div>
                                                      <div className="text-[9px] text-slate-300 line-clamp-3">
                                                          {tg.splitShots.map((s: any) => s.visualDescription).join('；')}
                                                      </div>
                                                  </div>
                                              )}

                                              {/* Image Fusion Info */}
                                              {tg.splitShots && tg.splitShots.length > 0 && (
                                                  <div className="mt-3 space-y-1.5 p-2 bg-purple-500/10 rounded border border-purple-500/20">
                                                      <div className="flex items-center justify-between">
                                                          <div className="flex items-center gap-1.5">
                                                              <ImageIcon size={12} className="text-purple-400" />
                                                              <span className="text-[9px] font-bold text-purple-300">图片融合</span>
                                                          </div>
                                                          {tg.imageFused ? (
                                                              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-300 text-[8px] rounded">
                                                                  ✓ 已融合
                                                              </span>
                                                          ) : (
                                                              <span className="text-[8px] text-slate-500">
                                                                  待融合 ({tg.splitShots.length}张)
                                                              </span>
                                                          )}
                                                      </div>
                                                      <div className="text-[8px] text-slate-400 leading-relaxed">
                                                          将当前任务组的 <span className="text-purple-300 font-medium">{tg.splitShots.length}</span> 张分镜图进行拼接并标号，生成一张参考图供 AI 理解镜头顺序和画面内容
                                                      </div>
                                                      {/* Fusion Structure Preview */}
                                                      {!tg.imageFused && (
                                                          <div className="flex items-center gap-1 pt-1">
                                                              {tg.splitShots.slice(0, 6).map((_, idx) => (
                                                                  <div key={idx} className="flex items-center">
                                                                      <div className="w-6 h-4 bg-purple-500/30 rounded border border-purple-500/30 flex items-center justify-center">
                                                                          <span className="text-[6px] text-purple-300">{idx + 1}</span>
                                                                      </div>
                                                                      {idx < Math.min(tg.splitShots.length, 6) - 1 && (
                                                                          <span className="text-purple-500/40">+</span>
                                                                      )}
                                                                  </div>
                                                              ))}
                                                              {tg.splitShots.length > 6 && (
                                                                  <span className="text-[7px] text-purple-400">+{tg.splitShots.length - 6}</span>
                                                              )}
                                                              <span className="text-[7px] text-slate-500">→ 融合图</span>
                                                          </div>
                                                      )}
                                                      {/* Fused Image Display */}
                                                      {tg.imageFused && tg.referenceImage && (
                                                          <div className="mt-2 space-y-2">
                                                              {/* Thumbnail - Collapsed by default */}
                                                              <div className="relative group rounded overflow-hidden border border-purple-500/30 bg-black/40">
                                                                  <img
                                                                      loading="lazy" src={tg.referenceImage}
                                                                      alt={`任务组 ${tg.taskNumber} 融合图`}
                                                                      className="w-full h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                                      onClick={() => onExpand?.(tg.referenceImage)}
                                                                      style={STYLE_MAX_HEIGHT_200}
                                                                  />
                                                                  {/* Action Buttons Overlay */}
                                                                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                      <button
                                                                          onClick={(e) => {
                                                                              e.stopPropagation();
                                                                              onExpand?.(tg.referenceImage);
                                                                          }}
                                                                          className="p-1.5 bg-black/60 rounded hover:bg-black/80 transition-colors"
                                                                          title="查看大图"
                                                                      >
                                                                          <Maximize2 size={12} className="text-white" />
                                                                      </button>
                                                                      <button
                                                                          onClick={async (e) => {
                                                                              e.stopPropagation();
                                                                              try {

                                                                                  // 使用fetch获取图片
                                                                                  const response = await fetch(tg.referenceImage);
                                                                                  if (!response.ok) throw new Error('下载失败');

                                                                                  const blob = await response.blob();
                                                                                  const url = URL.createObjectURL(blob);

                                                                                  // 创建下载链接
                                                                                  const link = document.createElement('a');
                                                                                  link.href = url;
                                                                                  link.download = `sora-reference-${tg.taskNumber}.png`;
                                                                                  document.body.appendChild(link);
                                                                                  link.click();
                                                                                  document.body.removeChild(link);

                                                                                  // 释放URL
                                                                                  setTimeout(() => URL.revokeObjectURL(url), 100);

                                                                              } catch (error) {
                                                                                  console.error('[合成图下载] ❌ 下载失败:', error);
                                                                                  // 回退方案：在新标签页打开
                                                                                  window.open(tg.referenceImage, '_blank');
                                                                              }
                                                                          }}
                                                                          className="p-1.5 bg-black/60 rounded hover:bg-black/80 transition-colors"
                                                                          title="下载融合图"
                                                                      >
                                                                          <Download size={12} className="text-white" />
                                                                      </button>
                                                                  </div>
                                                                  {/* Expand Hint */}
                                                                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[8px] text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                      点击查看大图
                                                                  </div>
                                                              </div>
                                                              {/* Info */}
                                                              <div className="flex items-center justify-between text-[8px] text-slate-400">
                                                                  <span>共 {tg.splitShots.length} 个镜头已融合</span>
                                                                  <span className="text-purple-400">点击缩略图查看完整</span>
                                                              </div>
                                                          </div>
                                                      )}
                                                  </div>
                                              )}
                                          </div>

                                          {/* Right: AI Optimized Sora Prompt */}
                                          <div className="flex-1 space-y-2">
                                              <div className="flex items-center justify-between">
                                                  <div className="text-[10px] font-bold text-slate-400">AI 优化提示词</div>
                                                  <div className="flex items-center gap-1">
                                                      <button
                                                          onClick={() => onAction?.(node.id, `edit-shots:${index}`)}
                                                          className="p-1 hover:bg-white/10 rounded transition-colors"
                                                          title="编辑分镜信息"
                                                      >
                                                          <Edit size={10} className="text-slate-400 hover:text-white" />
                                                      </button>
                                                      <button
                                                          onClick={() => onAction?.(node.id, `regenerate-prompt:${index}`)}
                                                          className="p-1 hover:bg-white/10 rounded transition-colors"
                                                          title="重新生成提示词"
                                                      >
                                                          <RefreshCw size={10} className="text-slate-400 hover:text-white" />
                                                      </button>
                                                      <button
                                                          onClick={() => onAction?.(node.id, `remove-sensitive-words:${index}`)}
                                                          disabled={!tg.soraPrompt}
                                                          className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                          title="去除敏感词（暴力、色情、版权、名人信息）"
                                                      >
                                                          <ShieldAlert size={10} className="text-orange-400 hover:text-white disabled:text-slate-600" />
                                                      </button>
                                                  </div>
                                              </div>

                                              {tg.soraPrompt ? (
                                                  <>
                                                      <div className="px-2 pb-2">
                                                          <textarea
                                                              className="w-full p-2 bg-black/30 rounded border border-white/10 text-[9px] text-slate-300 font-mono resize-y min-h-[300px] max-h-[500px] overflow-y-auto custom-scrollbar focus:outline-none focus:border-cyan-500/30"
                                                              defaultValue={tg.soraPrompt}
                                                              onChange={(e) => {
                                                                  const updatedTaskGroups = [...node.data.taskGroups];
                                                                  const tgIndex = updatedTaskGroups.findIndex(t => t.id === tg.id);
                                                                  if (tgIndex !== -1) {
                                                                      updatedTaskGroups[tgIndex].soraPrompt = e.target.value;
                                                                      onUpdate(node.id, { taskGroups: updatedTaskGroups });
                                                                  }
                                                              }}
                                                              onMouseDown={(e) => e.stopPropagation()}
                                                              onTouchStart={(e) => e.stopPropagation()}
                                                              onPointerDown={(e) => e.stopPropagation()}
                                                              onWheel={(e) => e.stopPropagation()}
                                                              placeholder="Sora 提示词..."
                                                          />
                                                      </div>

                                                      {/* 去敏感词状态提示 */}
                                                      {tg.isRemovingSensitiveWords && (
                                                          <div className="px-2 pb-2">
                                                              <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                                                                  <Loader2 size={12} className="text-blue-400 animate-spin" />
                                                                  <span className="text-[9px] text-blue-300">{tg.removeSensitiveWordsProgress || '正在处理...'}</span>
                                                              </div>
                                                          </div>
                                                      )}

                                                      {tg.removeSensitiveWordsSuccess && (
                                                          <div className="px-2 pb-2">
                                                              <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded">
                                                                  <CheckCircle size={12} className="text-green-400" />
                                                                  <span className="text-[9px] text-green-300">{tg.removeSensitiveWordsSuccess}</span>
                                                              </div>
                                                          </div>
                                                      )}

                                                      {tg.removeSensitiveWordsError && (
                                                          <div className="px-2 pb-2">
                                                              <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded">
                                                                  <AlertCircle size={12} className="text-red-400" />
                                                                  <span className="text-[9px] text-red-300">处理失败: {tg.removeSensitiveWordsError}</span>
                                                              </div>
                                                          </div>
                                                      )}

                                                      {/* 视频预览 - 仅在完成时显示 */}
                                                      {tg.generationStatus === 'completed' && tg.videoUrl && (
                                                          <div className="px-2 pb-2">
                                                              <div className="space-y-1">
                                                                  <div className="flex items-center justify-between">
                                                                      <div className="flex items-center gap-1.5">
                                                                          <Play size={10} className="text-green-400" />
                                                                          <span className="text-[9px] font-bold text-green-300">生成完成</span>
                                                                      </div>
                                                                      {tg.videoMetadata?.duration && (
                                                                          <span className="text-[8px] text-slate-500">
                                                                              {tg.videoMetadata.duration.toFixed(1)}秒
                                                                          </span>
                                                                      )}
                                                                  </div>
                                                                  <div className="relative group/video rounded overflow-hidden border border-green-500/30 bg-black/40">
                                                                      {/* 🚀 优先使用本地文件，降级到 URL */}
                                                                      <video
                                                                          src={soraLocalVideos[tg.id] || tg.videoUrl}
                                                                          className="w-full h-auto object-contain cursor-pointer"
                                                                          controls
                                                                          playsInline
                                                                          preload="metadata"
                                                                      />
                                                                      {/* 本地文件指示器 */}
                                                                      {soraLocalVideos[tg.id] && (
                                                                          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-green-500/80 backdrop-blur-sm rounded text-[8px] font-bold text-white flex items-center gap-1">
                                                                              <Database size={8} />
                                                                              本地
                                                                          </div>
                                                                      )}
                                                                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/video:opacity-100 transition-opacity">
                                                                          <button
                                                                              onClick={(e) => {
                                                                                  e.stopPropagation();
                                                                                  window.open(soraLocalVideos[tg.id] || tg.videoUrl, '_blank');
                                                                              }}
                                                                              className="p-1 bg-black/60 hover:bg-black/80 rounded text-white"
                                                                              title="在新窗口打开"
                                                                          >
                                                                              <ExternalLink size={10} />
                                                                          </button>
                                                                      </div>
                                                                  </div>
                                                              </div>
                                                          </div>
                                                      )}
                                                  </>
                                              ) : (
                                                  <div className="p-2 bg-black/20 rounded border border-dashed border-white/10 text-center">
                                                      <span className="text-[9px] text-slate-500">等待生成提示词</span>
                                                  </div>
                                              )}

                                              {/* Camera Tags */}
                                              {tg.splitShots && tg.splitShots.length > 0 && (
                                                  <div className="flex flex-wrap gap-1">
                                                      {Array.from(new Set(tg.splitShots.map((s: any) => s.shotSize))).slice(0, 3).map((shotSize: string, i: number) => (
                                                          <span key={i} className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-[8px] rounded">
                                                              {shotSize}
                                                          </span>
                                                      ))}
                                                  </div>
                                              )}
                                          </div>
                                      </div>

                                      {/* Error Message */}
                                      {tg.error && (
                                          <div className="px-3 pb-2 text-[9px] text-red-400">
                                              ⚠️ {tg.error}
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  {/* Footer Actions */}
                  {taskGroups.length > 0 && (
                      <div className="px-4 py-3 border-t border-white/10 bg-white/5 shrink-0">
                          <div className="flex items-center justify-between">
                              <div className="text-[9px] text-slate-500">
                                  {taskGroups.filter((tg: any) => tg.generationStatus === 'completed').length} / {taskGroups.length} 个任务已完成
                              </div>
                              <div className="flex items-center gap-2">
                                  <button
                                      onClick={() => onAction?.(node.id, 'regenerate-all')}
                                      disabled={taskGroups.some((tg: any) => tg.generationStatus === 'generating' || tg.generationStatus === 'uploading')}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:bg-slate-600/20 disabled:cursor-not-allowed text-cyan-400 disabled:text-slate-500 text-[10px] rounded font-medium transition-colors"
                                      title="重新生成所有任务"
                                  >
                                      <RotateCcw size={10} />
                                      重新生成全部
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          );
      }

      // --- SORA VIDEO CHILD NODE CONTENT ---
      if (node.type === NodeType.SORA_VIDEO_CHILD) {
          const videoUrl = node.data.videoUrl;
          const duration = node.data.duration;
          const isCompliant = node.data.isCompliant;
          const violationReason = node.data.violationReason;
          const locallySaved = node.data.locallySaved;
          const taskNumber = node.data.taskNumber;
          const soraTaskId = node.data.soraTaskId;
          const provider = node.data.provider || 'yunwu';

          const [isPlaying, setIsPlaying] = useState(false);
          const [currentTime, setCurrentTime] = useState(0);
          const [durationValue, setDurationValue] = useState(0);
          const videoRef = useRef<HTMLVideoElement>(null);
          const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
          const [useLocalServer, setUseLocalServer] = useState(false);
          const [videoError, setVideoError] = useState<string | null>(null);
          const [isRefreshing, setIsRefreshing] = useState(false);

          // 使用videoBlobUrl（从IndexedDB加载的）优先于原始videoUrl
          const displayVideoUrl = videoBlobUrl || videoUrl;

          // 格式化时间显示
          const formatTime = (time: number) => {
              const mins = Math.floor(time / 60);
              const secs = Math.floor(time % 60);
              return `${mins}:${secs.toString().padStart(2, '0')}`;
          };

          // 刷新任务状态
          const handleRefreshStatus = async () => {
              if (!soraTaskId || isRefreshing) return;

              setIsRefreshing(true);

              try {
                  // 获取API Key
                  const getApiKey = async () => {
                      if (provider === 'yunwu') {
                          return localStorage.getItem('YUNWU_API_KEY');
                      } else if (provider === 'sutu') {
                          return localStorage.getItem('SUTU_API_KEY');
                      } else if (provider === 'yijiapi') {
                          return localStorage.getItem('YIJIAPI_API_KEY');
                      }
                      return null;
                  };

                  const apiKey = await getApiKey();
                  if (!apiKey) {
                      alert('请先配置API Key');
                      return;
                  }

                  // 根据不同的provider调用不同的API
                  let apiUrl: string;
                  let requestBody: any = { task_id: soraTaskId };

                  if (provider === 'yunwu') {
                      apiUrl = toApiUrl('/yunwuapi/status');
                      requestBody = { task_id: soraTaskId };
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

                  // 根据provider解析响应
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

                  // 更新节点数据
                  if (newVideoUrl) {
                      onUpdate(node.id, {
                          videoUrl: newVideoUrl,
                          progress: newProgress,
                          violationReason: newViolationReason
                      });
                  } else if (newStatus === 'processing' || newStatus === 'pending') {
                      onUpdate(node.id, {
                          progress: newProgress,
                          violationReason: undefined
                      });
                  } else if (newViolationReason) {
                      onUpdate(node.id, {
                          violationReason: newViolationReason
                      });
                  }
              } catch (error: any) {
                  console.error('[Sora2子节点] ❌ 刷新失败:', error);
                  alert(`刷新失败: ${error.message}`);
              } finally {
                  setIsRefreshing(false);
              }
          };

          // 直接下载视频（从 URL 或浏览器缓存）
          const handleDirectDownload = async () => {
              if (!displayVideoUrl) {
                  alert('视频 URL 不存在');
                  return;
              }

              try {

                  // 尝试使用 fetch 下载
                  const response = await fetch(displayVideoUrl);
                  if (!response.ok) {
                      throw new Error(`HTTP ${response.status}`);
                  }

                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `sora-video-${taskNumber || 'direct'}-${Date.now()}.mp4`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);

              } catch (e) {
                  console.error('[直接下载] ❌ 下载失败:', e);

                  // 如果 fetch 失败，尝试在新标签页打开
                  window.open(displayVideoUrl, '_blank');
                  alert('已在新标签页打开视频，请在视频上右键选择"视频另存为"来下载。');
              }

              setContextMenu(null);
          };

          // 下载视频 - 智能兼容方案
          const handleDownload = async () => {
              if (!displayVideoUrl) {
                  alert('视频 URL 不存在');
                  return;
              }

              try {

                  // 如果有 soraTaskId，先尝试从数据库下载
                  if (soraTaskId) {
                      try {
                          const downloadUrl = toApiUrl(`/videos/download/${soraTaskId}`);
                          const response = await fetch(downloadUrl);

                          if (response.ok) {
                              const contentType = response.headers.get('content-type');

                              // 检查是否是视频文件
                              if (!contentType || !contentType.includes('application/json')) {
                                  const blob = await response.blob();

                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `sora-task-${taskNumber || 'video'}-${Date.now()}.mp4`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                  return;
                              }
                          }
                      } catch (dbError) {
                      }
                  }

                  // 数据库中没有或没有 soraTaskId，提供选项
                  const shouldSaveToDb = confirm(
                      '此视频尚未保存到数据库。\n\n' +
                      '点击"确定"将视频保存到数据库后再下载（推荐，以后可快速下载）\n' +
                      '点击"取消"直接从原始地址下载（可能较慢）'
                  );

                  if (shouldSaveToDb) {
                      // 保存到数据库
                      const taskId = soraTaskId || `video-${Date.now()}`;

                      const saveResponse = await fetch(toApiUrl('/videos/save'), {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                              videoUrl,
                              taskId,
                              taskNumber,
                              soraPrompt: node.data.soraPrompt || ''
                          })
                      });

                      const saveResult = await saveResponse.json();

                      if (saveResult.success) {
                          alert('视频已保存到数据库！现在开始下载...');

                          // 从数据库下载
                          const downloadUrl = toApiUrl(`/videos/download/${taskId}`);
                          const downloadResponse = await fetch(downloadUrl);
                          const blob = await downloadResponse.blob();

                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `sora-task-${taskNumber || 'video'}-${Date.now()}.mp4`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                      } else {
                          throw new Error(saveResult.error || '保存失败');
                      }
                  } else {
                      // 直接从原始 URL 下载
                      alert('正在从原始地址下载，请稍候...');

                      const response = await fetch(videoUrl);
                      if (!response.ok) {
                          throw new Error(`HTTP ${response.status}`);
                      }

                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `sora-task-${taskNumber || 'video'}-${Date.now()}.mp4`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                  }

              } catch (e) {
                  console.error('[视频下载] ❌ 下载失败:', e);
                  alert(`视频下载失败: ${e.message}\n\n您也可以右键点击视频，选择"视频另存为"来下载。`);
              }
          };

          return (
              <div className="w-full h-full flex flex-col bg-zinc-900 overflow-hidden relative">
                  {/* Video Player Area */}
                  {displayVideoUrl ? (
                      <>
                          <video
                              ref={(el) => {
                                  if (el) {
                                      videoRef.current = el;
                                      el.onloadedmetadata = () => {
                                          setDurationValue(el.duration);
                                          setVideoError(null);
                                      };
                                      el.onerror = () => {
                                          console.error('[视频播放] 加载失败:', displayVideoUrl);
                                          setVideoError('视频加载失败');
                                      };
                                  }
                              }}
                              src={useLocalServer && soraTaskId ? toApiUrl(`/videos/download/${soraTaskId}`) : displayVideoUrl}
                              className="w-full h-full object-cover bg-zinc-900"
                              loop
                              playsInline
                              controls
                              onContextMenu={(e) => {
                                  e.preventDefault();
                                  setContextMenu({ x: e.clientX, y: e.clientY });
                              }}
                              onClick={() => setContextMenu(null)}
                              onTimeUpdate={() => {
                                  if (videoRef.current) {
                                      setCurrentTime(videoRef.current.currentTime);
                                  }
                              }}
                              onPlay={() => setIsPlaying(true)}
                              onPause={() => setIsPlaying(false)}
                              onEnded={() => setIsPlaying(false)}
                          />

                          {contextMenu && (
                              <div
                                  className="fixed z-50 bg-zinc-800 border border-white/10 rounded-lg shadow-xl py-1 min-w-[200px]"
                                  style={{ left: contextMenu.x, top: contextMenu.y }}
                                  onClick={(e) => e.stopPropagation()}
                              >
                                  <div className="px-3 py-2 text-xs text-white/50 border-b border-white/10 mb-1">
                                    视频操作
                                  </div>
                                  <button
                                      onClick={handleDirectDownload}
                                      className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                                  >
                                      <Download size={14} />
                                      直接下载视频
                                  </button>
                                  <button
                                      onClick={handleDownload}
                                      className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                                  >
                                      <Database size={14} />
                                      从数据库下载
                                  </button>
                                  <div className="border-t border-white/10 my-1"></div>
                                  <button
                                      onClick={() => setContextMenu(null)}
                                      className="w-full px-3 py-2 text-left text-xs text-white/50 hover:bg-white/10 transition-colors"
                                  >
                                      取消
                                  </button>
                              </div>
                          )}

                          {contextMenu && (
                              <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setContextMenu(null)}
                              />
                          )}
                      </>
                  ) : violationReason || node.data.error ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-400 bg-black/40 p-6 text-center z-10 pointer-events-none">
                          <AlertCircle className="text-red-500 mb-1" size={32} />
                          <span className="text-xs font-medium text-red-200">{violationReason || node.data.error}</span>
                      </div>
                  ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-600 z-10 pointer-events-none">
                          <div className="relative">
                              <VideoIcon size={32} className="opacity-50" />
                              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                  <Loader2 size={16} className="animate-spin text-cyan-500" />
                              </div>
                          </div>
                          <span className="text-xs font-medium mt-2">视频生成中...</span>
                      </div>
                  )}

                  {/* Error overlay - Below bottom panel */}
                  {node.status === NodeStatus.ERROR && !displayVideoUrl && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10">
                          <AlertCircle className="text-red-500 mb-2" />
                          <span className="text-xs text-red-200">{node.data.error}</span>
                      </div>
                  )}
              </div>
          );
      }

      const hasContent = node.data.image || node.data.videoUri;
      return (
        <div className="w-full h-full relative group/media overflow-hidden bg-zinc-900" onMouseEnter={() => {}} onMouseLeave={() => {}}>
            {!hasContent ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-600"><div className="w-20 h-20 rounded-[28px] bg-white/5 border border-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 hover:scale-105 transition-all duration-300 shadow-inner" onClick={() => fileInputRef.current?.click()}>{isWorking ? <Loader2 className="animate-spin text-cyan-500" size={32} /> : <ImageIcon size={32} className="opacity-50" />}</div><span className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-40">{isWorking ? "处理中..." : "拖拽或上传"}</span><input type="file" ref={fileInputRef} className="hidden" accept={node.type.includes('VIDEO') ? "video/*" : "image/*"} onChange={node.type.includes('VIDEO') ? handleUploadVideo : handleUploadImage} /></div>
            ) : (
                <>
                    {node.data.image ? 
                        <img loading="lazy" ref={mediaRef as any} src={node.data.image} className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-105 bg-zinc-900" draggable={false} style={showImageGrid ? STYLE_BLUR_ON : STYLE_BLUR_OFF} onContextMenu={(e) => onMediaContextMenu?.(e, node.id, 'image', node.data.image!)} /> 
                    : 
                        <SecureVideo 
                            videoRef={mediaRef} // Pass Ref to Video
                            src={node.data.videoUri} 
                            className="w-full h-full object-cover bg-zinc-900" 
                            loop 
                            muted 
                            // autoPlay removed to rely on hover logic
                            onContextMenu={(e: React.MouseEvent) => onMediaContextMenu?.(e, node.id, 'video', node.data.videoUri!)} 
                            style={showImageGrid ? STYLE_BLUR_ON : STYLE_BLUR_OFF} // Pass Style
                        />
                    }
                    {node.status === NodeStatus.ERROR && <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20"><AlertCircle className="text-red-500 mb-2" /><span className="text-xs text-red-200">{node.data.error}</span></div>}
                    {showImageGrid && (node.data.images || node.data.videoUris) && (
                        <div className="absolute inset-0 bg-black/40 z-10 grid grid-cols-2 gap-2 p-2 animate-in fade-in duration-200">
                            {node.data.images ? node.data.images.map((img, idx) => (
                                <div key={idx} className={`relative rounded-lg overflow-hidden cursor-pointer border-2 bg-zinc-900 ${img === node.data.image ? 'border-cyan-500' : 'border-transparent hover:border-white/50'}`} onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { image: img }); }}>
                                    <img loading="lazy" src={img} className="w-full h-full object-cover" />
                                </div>
                            )) : node.data.videoUris?.map((uri, idx) => (
                                <div key={idx} className={`relative rounded-lg overflow-hidden cursor-pointer border-2 bg-zinc-900 ${uri === node.data.videoUri ? 'border-cyan-500' : 'border-transparent hover:border-white/50'}`} onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { videoUri: uri }); }}>
                                    {uri ? (
                                        <SecureVideo src={uri} className="w-full h-full object-cover bg-zinc-900" muted loop autoPlay />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-white/5 text-xs text-slate-500">Failed</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {generationMode === 'CUT' && node.data.croppedFrame && <div className="absolute top-4 right-4 w-24 aspect-video bg-black/80 rounded-lg border border-purple-500/50 shadow-xl overflow-hidden z-20 hover:scale-150 transition-transform origin-top-right opacity-0 group-hover:opacity-100 transition-opacity duration-300"><img loading="lazy" src={node.data.croppedFrame} className="w-full h-full object-cover" /></div>}
                    {generationMode === 'CUT' && !node.data.croppedFrame && (inputAssets && inputAssets.length > 0) && inputAssets?.some(a => a.src) && (<div className="absolute top-4 right-4 w-24 aspect-video bg-black/80 rounded-lg border border-purple-500/30 border-dashed shadow-xl overflow-hidden z-20 hover:scale-150 transition-transform origin-top-right flex flex-col items-center justify-center group/preview opacity-0 group-hover:opacity-100 transition-opacity duration-300"><div className="absolute inset-0 bg-purple-500/10 z-10"></div>{(() => { const asset = inputAssets!.find(a => a.src); if (asset?.type === 'video') { return <SecureVideo src={asset.src} className="w-full h-full object-cover opacity-60 bg-zinc-900" muted autoPlay />; } else { return <img loading="lazy" src={asset?.src} className="w-full h-full object-cover opacity-60 bg-zinc-900" />; } })()}<span className="absolute z-20 text-[8px] font-bold text-purple-200 bg-black/50 px-1 rounded">分镜参考</span></div>)}
                </>
            )}
            {node.type === NodeType.VIDEO_GENERATOR && generationMode === 'CUT' && (videoBlobUrl || node.data.videoUri) && 
                <SceneDirectorOverlay 
                    visible={true} 
                    videoRef={mediaRef as React.RefObject<HTMLVideoElement>} 
                    onCrop={() => { 
                        const vid = mediaRef.current as HTMLVideoElement; 
                        if (vid) { 
                            const canvas = document.createElement('canvas'); 
                            canvas.width = vid.videoWidth; 
                            canvas.height = vid.videoHeight; 
                            const ctx = canvas.getContext('2d'); 
                            if (ctx) { 
                                ctx.drawImage(vid, 0, 0); 
                                onCrop?.(node.id, canvas.toDataURL('image/png')); 
                            } 
                        }
                    }} 
                    onTimeHover={() => {}} 
                />
            }
        </div>
      );
};
