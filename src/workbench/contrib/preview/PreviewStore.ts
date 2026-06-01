/**
 * PreviewStore — Zustand store for preview panel state.
 *
 * Manages:
 *   - Preview running/paused state
 *   - Current scene info
 *   - Asset cache (image elements)
 *   - Error messages
 */

import { create } from 'zustand';

interface ImageCache {
  [src: string]: HTMLImageElement;
}

interface PreviewStore {
  // UI state
  isRunning: boolean;
  isPaused: boolean;
  sceneName: string;
  sceneIndex: number;

  // Asset cache
  imageCache: ImageCache;

  // Error
  lastError: string | null;

  // Actions
  setRunning: (v: boolean) => void;
  setPaused: (v: boolean) => void;
  setScene: (name: string, index: number) => void;
  cacheImage: (src: string, img: HTMLImageElement) => void;
  clearCache: () => void;
  setError: (err: string | null) => void;
  reset: () => void;
}

export const usePreviewStore = create<PreviewStore>((set) => ({
  isRunning: false,
  isPaused: false,
  sceneName: '',
  sceneIndex: 0,
  imageCache: {},
  lastError: null,

  setRunning: (v) => set({ isRunning: v }),
  setPaused: (v) => set({ isPaused: v }),
  setScene: (name, index) => set({ sceneName: name, sceneIndex: index }),
  cacheImage: (src, img) => set((s) => ({
    imageCache: { ...s.imageCache, [src]: img },
  })),
  clearCache: () => set({ imageCache: {} }),
  setError: (err) => set({ lastError: err }),
  reset: () => set({
    isRunning: false,
    isPaused: false,
    sceneName: '',
    sceneIndex: 0,
    lastError: null,
  }),
}));
