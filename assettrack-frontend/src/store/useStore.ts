import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAX_HISTORY_CACHE, MAX_RECENTS } from '../config';
import type { Item, MovementEvent, RecentEntry } from '../types';

interface HistoryEntry { events: MovementEvent[]; fetchedAt: number }

interface State {
  token: string | null;
  recents: RecentEntry[];
  currentCode: string | null;
  scanMode: 'scan' | 'detail'; // not persisted: the app always opens on the scanner
  history: Record<string, HistoryEntry>;

  setToken: (t: string | null) => void;
  recordScan: (code: string, item: Item) => void;
  rescan: (code: string) => void;
  updateItem: (code: string, item: Item) => void;
  markUnavailable: (code: string) => void;
  openItem: (code: string) => void;
  closeDetail: () => void;
  clearRecents: () => void;
  setHistory: (code: string, events: MovementEvent[]) => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      token: null,
      recents: [],
      currentCode: null,
      scanMode: 'scan',
      history: {},

      setToken: (token) => set({ token }),

      recordScan: (code, item) =>
        set((s) => {
          const now = Date.now();
          const entry: RecentEntry = { code, item, scannedAt: now, refreshedAt: now };
          const recents = [entry, ...s.recents.filter((r) => r.code !== code)].slice(0, MAX_RECENTS);
          return { recents, currentCode: code, scanMode: 'detail' };
        }),

      // Scanning an item we already have: show the saved snapshot instantly, keep its freshness timestamp.
      rescan: (code) =>
        set((s) => {
          const e = s.recents.find((r) => r.code === code);
          if (!e) return {};
          return {
            recents: [{ ...e, scannedAt: Date.now() }, ...s.recents.filter((r) => r.code !== code)],
            currentCode: code,
            scanMode: 'detail',
          };
        }),

      updateItem: (code, item) =>
        set((s) => ({
          recents: s.recents.map((r) =>
            r.code === code ? { ...r, item, refreshedAt: Date.now(), unavailable: false } : r,
          ),
        })),

      markUnavailable: (code) =>
        set((s) => ({
          recents: s.recents.map((r) => (r.code === code ? { ...r, unavailable: true } : r)),
        })),

      openItem: (code) => set({ currentCode: code, scanMode: 'detail' }),
      closeDetail: () => set({ scanMode: 'scan' }),

      clearRecents: () => set({ recents: [], currentCode: null, scanMode: 'scan', history: {} }),

      setHistory: (code, events) =>
        set((s) => {
          const next = { ...s.history, [code]: { events, fetchedAt: Date.now() } };
          const keys = Object.keys(next);
          if (keys.length > MAX_HISTORY_CACHE) {
            keys.sort((a, b) => next[a].fetchedAt - next[b].fetchedAt);
            keys.slice(0, keys.length - MAX_HISTORY_CACHE).forEach((k) => delete next[k]);
          }
          return { history: next };
        }),
    }),
    {
      name: 'assettrack-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        token: s.token,
        recents: s.recents,
        currentCode: s.currentCode,
        history: s.history,
      }),
    },
  ),
);

/** The entry currently shown on the Scan/History tabs (always one of the saved recents). */
export const useCurrent = () =>
  useStore((s) => s.recents.find((r) => r.code === s.currentCode) ?? null);
