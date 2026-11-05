import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QueuedReport {
  id: string;
  timestamp: string;
  errorType: string;
  message: string;
  stack: string;
  httpStatus: string;
  endpoint: string;
  screen: string;
  appVersion: string;
  platform: string;
  osVersion: string;
  count: number;
}

const MAX_QUEUE = 50;

interface QueueState {
  queue: QueuedReport[];
  add: (r: Omit<QueuedReport, 'id' | 'count'>) => void;
  remove: (ids: string[]) => void;
}

export const useErrorQueue = create<QueueState>()(
  persist(
    (set) => ({
      queue: [],
      add: (r) =>
        set((s) => {
          // Identical errors collapse into one entry with a count.
          const same = s.queue.find(
            (q) => q.errorType === r.errorType && q.message === r.message && q.endpoint === r.endpoint,
          );
          if (same) {
            return { queue: s.queue.map((q) => (q === same ? { ...q, count: q.count + 1 } : q)) };
          }
          const entry: QueuedReport = { ...r, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, count: 1 };
          return { queue: [...s.queue, entry].slice(-MAX_QUEUE) };
        }),
      remove: (ids) => set((s) => ({ queue: s.queue.filter((q) => !ids.includes(q.id)) })),
    }),
    { name: 'assettrack-errors-v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
