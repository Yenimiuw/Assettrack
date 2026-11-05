import NetInfo from '@react-native-community/netinfo';
import { api, ApiError } from '../api/client';
import { HISTORY_FRESH_MS, ITEM_FRESH_MS } from '../config';
import { useStore } from '../store/useStore';
import { useSync } from '../store/useSync';
import { prefetchImage } from './images';
import { reportApiError } from './reporter';

export type RefreshResult = 'ok' | 'gone' | 'network' | 'error';

// One request per key at a time; every caller shares the result. The key also drives the UI's
// "Updating…" and slow-loading notices via useSync.
const running = new Map<string, Promise<RefreshResult>>();
function once(key: string, fn: () => Promise<RefreshResult>): Promise<RefreshResult> {
  const hit = running.get(key);
  if (hit) return hit;
  useSync.getState().begin(key);
  const p = fn().finally(() => { running.delete(key); useSync.getState().end(key); });
  running.set(key, p);
  return p;
}

/**
 * Re-fetch one saved item. Skipped when the saved copy is still fresh (unless force).
 * A 404 marks it "no longer available" but keeps the snapshot.
 */
export function refreshItem(code: string, opts: { force?: boolean } = {}): Promise<RefreshResult> {
  if (!opts.force) {
    const e = useStore.getState().recents.find((r) => r.code === code);
    if (e && !e.unavailable && Date.now() - e.refreshedAt < ITEM_FRESH_MS) return Promise.resolve('ok');
  }
  return once(`item:${code}`, async () => {
    try {
      const item = await api.getItem(code);
      useStore.getState().updateItem(code, item);
      prefetchImage(item.pictureUrl);
      return 'ok';
    } catch (e) {
      return classify(e, code, '/v1/items/:code', 'Refresh');
    }
  });
}

/** Fetch history and cache it locally for offline reading. Skipped when fresh (unless force). */
export function loadHistory(code: string, opts: { force?: boolean } = {}): Promise<RefreshResult> {
  if (!opts.force) {
    const h = useStore.getState().history[code];
    if (h && Date.now() - h.fetchedAt < HISTORY_FRESH_MS) return Promise.resolve('ok');
  }
  return once(`history:${code}`, async () => {
    try {
      const res = await api.getHistory(code);
      useStore.getState().setHistory(code, res.events);
      return 'ok';
    } catch (e) {
      return classify(e, code, '/v1/items/:code/history', 'History');
    }
  });
}

function classify(e: unknown, code: string, endpoint: string, screen: string): RefreshResult {
  if (e instanceof ApiError) {
    if (e.status === 404) { useStore.getState().markUnavailable(code); return 'gone'; }
    if (e.kind === 'network' || e.kind === 'cancelled') return 'network';
  }
  reportApiError(e, endpoint, screen);
  return 'error';
}

/** On app foreground: refresh the open item and the few most recent ones (stale ones only). */
export async function refreshRecent(limit = 5): Promise<void> {
  const net = await NetInfo.fetch();
  if (net.isConnected === false) return;
  const { recents, currentCode } = useStore.getState();
  const codes = new Set<string>();
  if (currentCode) codes.add(currentCode);
  recents.slice(0, limit).forEach((r) => codes.add(r.code));
  for (const code of codes) {
    const r = await refreshItem(code);
    if (r === 'network') break;
  }
}
