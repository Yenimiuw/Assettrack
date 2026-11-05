import { API_URL, APP_ID, REQUEST_TIMEOUT_MS } from '../config';
import { useStore } from '../store/useStore';
import type { Item, MovementEvent } from '../types';

export class ApiError extends Error {
  constructor(
    public kind: 'network' | 'http' | 'cancelled',
    message: string,
    public status = 0,
    public code = 'ERROR',
  ) {
    super(message);
  }
}

async function rawFetch(
  path: string,
  init: { method?: string; headers?: Record<string, string>; body?: string },
  external?: AbortSignal,
) {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, REQUEST_TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  if (external?.aborted) ctrl.abort();
  else external?.addEventListener('abort', onAbort);
  try {
    return await fetch(API_URL + path, { ...init, signal: ctrl.signal });
  } catch {
    if (external?.aborted) throw new ApiError('cancelled', 'Cancelled', 0, 'CANCELLED');
    if (timedOut) throw new ApiError('network', 'Request timed out', 0, 'TIMEOUT');
    throw new ApiError('network', 'Cannot reach the server', 0, 'OFFLINE');
  } finally {
    clearTimeout(timer);
    external?.removeEventListener('abort', onAbort);
  }
}

async function readJson(res: Response): Promise<any> {
  try { return await res.json(); } catch { return null; }
}

const httpError = (res: Response, data: any) =>
  new ApiError('http', data?.error?.message ?? `Request failed (${res.status})`, res.status, data?.error?.code ?? 'ERROR');

let tokenPromise: Promise<string> | null = null;

async function fetchGuestToken(): Promise<string> {
  const res = await rawFetch('/v1/auth/guest', { method: 'POST', headers: { 'x-app-id': APP_ID } });
  const data = await readJson(res);
  if (!res.ok || !data?.token) throw httpError(res, data);
  useStore.getState().setToken(data.token);
  return data.token as string;
}

/** Returns the stored guest token, creating one on first use. Concurrent callers share one request. */
export function ensureToken(): Promise<string> {
  const existing = useStore.getState().token;
  if (existing) return Promise.resolve(existing);
  tokenPromise ??= fetchGuestToken().finally(() => { tokenPromise = null; });
  return tokenPromise;
}

async function request<T>(
  path: string,
  init: { method?: string; body?: string } = {},
  retried = false,
  signal?: AbortSignal,
): Promise<T> {
  const token = await ensureToken();
  const res = await rawFetch(
    path,
    { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    signal,
  );
  const data = await readJson(res);
  if (res.status === 401 && !retried) {
    useStore.getState().setToken(null); // expired: silently get a new guest token and retry once
    return request<T>(path, init, true, signal);
  }
  if (!res.ok) throw httpError(res, data);
  return data as T;
}

// Identical GETs made at the same moment (e.g. foreground refresh + opening a Recent item) share one request.
const inflight = new Map<string, Promise<unknown>>();
function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  if (signal) return request<T>(path, {}, false, signal); // cancellable calls are never shared
  const hit = inflight.get(path);
  if (hit) return hit as Promise<T>;
  const p = request<T>(path).finally(() => inflight.delete(path));
  inflight.set(path, p);
  return p;
}

export const api = {
  getItem: (code: string, signal?: AbortSignal) => get<Item>(`/v1/items/${code}`, signal),
  getHistory: (code: string) =>
    get<{ assetNumber: string; events: MovementEvent[] }>(`/v1/items/${code}/history?limit=100`),
  sendErrors: (reports: unknown[]) =>
    request<{ accepted: number }>('/v1/errors', { method: 'POST', body: JSON.stringify({ reports }) }),
};
