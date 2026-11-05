export const CODE_RE = /^[0-9a-f]{32}$/;

export const trunc = (v: unknown, n: number): string => String(v ?? '').slice(0, n);

/** Never let a full lookup code reach logs or the error sheet. */
export const redact = (s: string): string =>
  s.replace(/\b[0-9a-f]{32}\b/gi, (m) => m.slice(0, 6) + '…');
