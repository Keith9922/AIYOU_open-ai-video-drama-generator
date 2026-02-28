/**
 * UI Store - 管理所有 UI 切换/模态框状态
 *
 * @developer 光波 (a@ggbo.com)
 * @description 从 App.tsx 的 42 个 useState 中迁移出 UI 相关状态
 */

import { create } from 'zustand';
import type { ContextMenuState, CharacterProfile } from '../types';
import type { VideoSource } from '../components/VideoEditor';

interface UIState {
  // Modal states
  isChatOpen: boolean;
  isSketchEditorOpen: boolean;
  isMultiFrameOpen: boolean;
  isSonicStudioOpen: boolean;
  isCharacterLibraryOpen: boolean;
  isSettingsOpen: boolean;
  isApiKeyPromptOpen: boolean;
  isDebugOpen: boolean;
  isVideoEditorOpen: boolean;

  // Modal data
  viewingCharacter: { character: CharacterProfile; nodeId: string } | null;
  videoEditorSources: VideoSource[];
  expandedMedia: any;

  // Context menu
  contextMenu: ContextMenuState | null;
  contextMenuTarget: any;

  // Misc UI
  storageReconnectNeeded: boolean;
  croppingNodeId: string | null;
  imageToCrop: string | null;

  // Actions
  setIsChatOpen: (v: boolean) => void;
  setIsSketchEditorOpen: (v: boolean) => void;
  setIsMultiFrameOpen: (v: boolean) => void;
  setIsSonicStudioOpen: (v: boolean) => void;
  setIsCharacterLibraryOpen: (v: boolean) => void;
  setIsSettingsOpen: (v: boolean) => void;
  setIsApiKeyPromptOpen: (v: boolean) => void;
  setIsDebugOpen: (v: boolean) => void;
  setIsVideoEditorOpen: (v: boolean) => void;
  setViewingCharacter: (v: { character: CharacterProfile; nodeId: string } | null) => void;
  setVideoEditorSources: (v: VideoSource[]) => void;
  setExpandedMedia: (v: any) => void;
  setContextMenu: (v: ContextMenuState | null) => void;
  setContextMenuTarget: (v: any) => void;
  setStorageReconnectNeeded: (v: boolean) => void;
  setCroppingNodeId: (v: string | null) => void;
  setImageToCrop: (v: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial values - modals
  isChatOpen: false,
  isSketchEditorOpen: false,
  isMultiFrameOpen: false,
  isSonicStudioOpen: false,
  isCharacterLibraryOpen: false,
  isSettingsOpen: false,
  isApiKeyPromptOpen: false,
  isDebugOpen: false,
  isVideoEditorOpen: false,

  // Initial values - modal data
  viewingCharacter: null,
  videoEditorSources: [],
  expandedMedia: null,

  // Initial values - context menu
  contextMenu: null,
  contextMenuTarget: null,

  // Initial values - misc UI
  storageReconnectNeeded: false,
  croppingNodeId: null,
  imageToCrop: null,

  // Actions - each setter only updates its own field
  setIsChatOpen: (v) => set({ isChatOpen: v }),
  setIsSketchEditorOpen: (v) => set({ isSketchEditorOpen: v }),
  setIsMultiFrameOpen: (v) => set({ isMultiFrameOpen: v }),
  setIsSonicStudioOpen: (v) => set({ isSonicStudioOpen: v }),
  setIsCharacterLibraryOpen: (v) => set({ isCharacterLibraryOpen: v }),
  setIsSettingsOpen: (v) => set({ isSettingsOpen: v }),
  setIsApiKeyPromptOpen: (v) => set({ isApiKeyPromptOpen: v }),
  setIsDebugOpen: (v) => set({ isDebugOpen: v }),
  setIsVideoEditorOpen: (v) => set({ isVideoEditorOpen: v }),
  setViewingCharacter: (v) => set({ viewingCharacter: v }),
  setVideoEditorSources: (v) => set({ videoEditorSources: v }),
  setExpandedMedia: (v) => set({ expandedMedia: v }),
  setContextMenu: (v) => set({ contextMenu: v }),
  setContextMenuTarget: (v) => set({ contextMenuTarget: v }),
  setStorageReconnectNeeded: (v) => set({ storageReconnectNeeded: v }),
  setCroppingNodeId: (v) => set({ croppingNodeId: v }),
  setImageToCrop: (v) => set({ imageToCrop: v }),
}));
