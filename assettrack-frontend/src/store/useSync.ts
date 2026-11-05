import { create } from 'zustand';

/** In-memory record of which background requests are running and when they started (not persisted). */
interface SyncState {
  active: Record<string, number>;
  begin: (key: string) => void;
  end: (key: string) => void;
}

export const useSync = create<SyncState>((set) => ({
  active: {},
  begin: (key) => set((s) => ({ active: { ...s.active, [key]: Date.now() } })),
  end: (key) =>
    set((s) => {
      const { [key]: _gone, ...rest } = s.active;
      return { active: rest };
    }),
}));
