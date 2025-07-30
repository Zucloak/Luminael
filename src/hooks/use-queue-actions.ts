import { create } from 'zustand';

interface QueueActionsState {
  handleImportQueue: (() => void) | null;
  handleExportQueue: (() => void) | null;
  setHandleImportQueue: (fn: () => void) => void;
  setHandleExportQueue: (fn: () => void) => void;
}

export const useQueueActions = create<QueueActionsState>((set) => ({
  handleImportQueue: null,
  handleExportQueue: null,
  setHandleImportQueue: (fn) => set({ handleImportQueue: fn }),
  setHandleExportQueue: (fn) => set({ handleExportQueue: fn }),
}));
