import { create } from 'zustand';

/**
 * Zustand Scene Store
 * Tracks 3D background scene assembly animation completion status globally.
 */
export const useSceneStore = create((set) => ({
  isAssembled: false,
  setAssembled: (status) => set({ isAssembled: status }),
}));
