import { Platform } from 'react-native';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';
import { api, ApiError } from '../api/client';
import { useErrorQueue } from '../store/errorQueue';

const FLUSH_MIN_GAP_MS = 30_000;
let lastFlush = 0;
let flushing = false;
let timer: ReturnType<typeof setTimeout> | null = null;

interface ReportInput {
  errorType: string;
  message?: string;
  stack?: string;
  httpStatus?: number;
  endpoint?: string;
  screen?: string;
}

/** Queue an error report. Never throws, and never reports "no network" (that's expected, not a bug). */
export function reportError(input: ReportInput): void {
  try {
    if (input.errorType === 'NETWORK' || input.errorType === 'OFFLINE') return;
    useErrorQueue.getState().add({
      timestamp: new Date().toISOString(),
      errorType: input.errorType,
      message: (input.message ?? '').slice(0, 300),
      stack: (input.stack ?? '').slice(0, 1000),
      httpStatus: input.httpStatus ? String(input.httpStatus) : '',
      endpoint: input.endpoint ?? '',
      screen: input.screen ?? '',
      appVersion: Constants.expoConfig?.version ?? '',
      platform: Platform.OS,
      osVersion: String(Platform.Version),
    });
    scheduleFlush();
  } catch {
    /* reporting must never cause errors */
  }
}

export function reportApiError(e: unknown, endpoint: string, screen: string): void {
  if (e instanceof ApiError) {
    if (e.kind === 'network') return;
    reportError({
      errorType: e.status >= 500 ? 'HTTP_5XX' : 'HTTP_4XX',
      message: e.message, httpStatus: e.status, endpoint, screen,
    });
  } else {
    reportError({
      errorType: 'UNHANDLED',
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
      endpoint, screen,
    });
  }
}

function scheduleFlush(): void {
  if (timer) return;
  const wait = Math.max(5_000, FLUSH_MIN_GAP_MS - (Date.now() - lastFlush));
  timer = setTimeout(() => { timer = null; void flushErrors(); }, wait);
}

/** Send queued reports in one batch. A failure leaves them queued and is never itself reported. */
export async function flushErrors(): Promise<void> {
  if (flushing) return;
  const batch = useErrorQueue.getState().queue.slice(0, 20);
  if (!batch.length) return;
  try {
    const net = await NetInfo.fetch();
    if (net.isConnected === false) return;
    flushing = true;
    lastFlush = Date.now();
    await api.sendErrors(batch.map(({ id, ...rest }) => rest));
    useErrorQueue.getState().remove(batch.map((b) => b.id));
  } catch {
    /* keep the queue; try again on the next trigger */
  } finally {
    flushing = false;
  }
}
