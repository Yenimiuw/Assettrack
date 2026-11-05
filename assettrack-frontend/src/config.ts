export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ??
  'https://assettrack-assettrack-api.vercel.app'
).replace(/\/+$/, '');
export const APP_ID = 'assettrack';
export const CODE_RE = /^[0-9a-f]{32}$/;
export const REQUEST_TIMEOUT_MS = 15_000;
// How long saved data counts as fresh. Within this window we skip the network entirely.
export const ITEM_FRESH_MS = 30_000;
export const HISTORY_FRESH_MS = 60_000;
// Escalating "taking too long" warnings: first notice, then a stronger one (with Cancel on scans).
export const SLOW_AFTER_MS = [3_000, 8_000] as const;
export const MAX_RECENTS = 30;
export const MAX_HISTORY_CACHE = 20;
