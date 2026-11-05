import { waitUntil } from '@vercel/functions';
import { appendRows } from './sheets';
import { TAB } from './repo';
import { redact, trunc } from './util';

// Column order of the "error report" sheet (row 1 must contain these headers).
export const ERROR_HEADERS = [
  'timestamp', 'guest_id', 'app_version', 'platform', 'os_version', 'screen',
  'error_type', 'http_status', 'endpoint', 'message', 'stack', 'count',
] as const;

export interface ErrorReport {
  timestamp: string; guestId: string; appVersion: string; platform: string; osVersion: string;
  screen: string; errorType: string; httpStatus: string; endpoint: string;
  message: string; stack: string; count: number;
}

// "No network" is expected, not a bug, so it is never stored.
const IGNORED_TYPES = new Set(['NETWORK', 'OFFLINE']);

export function sanitizeReport(raw: any, guestId: string): ErrorReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const errorType = trunc(raw.errorType, 40).toUpperCase();
  if (!errorType || IGNORED_TYPES.has(errorType)) return null;
  const ts = Date.parse(raw.timestamp);
  return {
    timestamp: new Date(Number.isNaN(ts) ? Date.now() : ts).toISOString(),
    guestId,
    appVersion: trunc(raw.appVersion, 20),
    platform: trunc(raw.platform, 20),
    osVersion: trunc(raw.osVersion, 20),
    screen: trunc(raw.screen, 20),
    errorType,
    httpStatus: trunc(raw.httpStatus, 5),
    endpoint: redact(trunc(raw.endpoint, 120)),
    message: redact(trunc(raw.message, 300)),
    stack: redact(trunc(raw.stack, 1000)),
    count: Math.max(1, Math.min(9999, Number(raw.count) || 1)),
  };
}

/** Collapse identical errors in one batch into a single row with a count. */
export function collapse(reports: ErrorReport[]): ErrorReport[] {
  const map = new Map<string, ErrorReport>();
  for (const r of reports) {
    const key = [r.guestId, r.errorType, r.endpoint, r.message].join('|');
    const hit = map.get(key);
    if (hit) hit.count += r.count;
    else map.set(key, { ...r });
  }
  return [...map.values()];
}

export async function appendErrorReports(reports: ErrorReport[]): Promise<void> {
  const rows = reports.map((r) => [
    r.timestamp, r.guestId, r.appVersion, r.platform, r.osVersion, r.screen,
    r.errorType, r.httpStatus, r.endpoint, r.message, r.stack, r.count,
  ]);
  await appendRows(TAB.errors, rows);
}

// Server-side reporting: fire-and-forget, throttled, and it can never throw or loop.
const lastSent = new Map<string, number>();
let windowStart = 0;
let windowCount = 0;

export function reportServerError(err: unknown, endpoint: string): void {
  try {
    const now = Date.now();
    if (now - windowStart > 60_000) { windowStart = now; windowCount = 0; }
    if (windowCount >= 10) return;
    const message = redact(trunc(err instanceof Error ? err.message : err, 300));
    const key = endpoint + message;
    if (now - (lastSent.get(key) ?? 0) < 60_000) return;
    lastSent.set(key, now);
    windowCount++;
    const report: ErrorReport = {
      timestamp: new Date(now).toISOString(), guestId: 'server', appVersion: '', platform: 'server',
      osVersion: process.version, screen: '', errorType: 'SERVER_ERROR', httpStatus: '500',
      endpoint: redact(trunc(endpoint, 120)), message,
      stack: redact(trunc(err instanceof Error ? err.stack : '', 1000)), count: 1,
    };
    waitUntil(appendErrorReports([report]).catch(() => {}));
  } catch {
    /* reporting must never cause errors */
  }
}
