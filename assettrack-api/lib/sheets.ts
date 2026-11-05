import { google, sheets_v4 } from 'googleapis';

export type Row = Record<string, string>;

let client: sheets_v4.Sheets | null = null;

function getClient(): sheets_v4.Sheets {
  if (!client) {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    client = google.sheets({ version: 'v4', auth });
  }
  return client;
}

/** "Designated Owner " -> "designated_owner". Columns are matched by name, never by position. */
const normHeader = (h: unknown) =>
  String(h ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

export async function readTable(tab: string): Promise<Row[]> {
  const res = await getClient().spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID!,
    range: `'${tab}'`,
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const [header = [], ...rows] = res.data.values ?? [];
  const keys = header.map(normHeader);
  return rows.map((row) => {
    const out: Row = {};
    keys.forEach((k, i) => {
      if (k) out[k] = String(row[i] ?? '').trim();
    });
    return out;
  });
}

/** RAW input means a value like "=HYPERLINK(...)" is stored as text, not executed. */
export async function appendRows(tab: string, rows: (string | number)[][]): Promise<void> {
  if (!rows.length) return;
  await getClient().spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID!,
    range: `'${tab}'!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
}

// Best-effort per-instance cache: dedupes in-flight loads and serves stale data if Sheets fails.
interface Entry { at: number; value?: unknown; pending?: Promise<unknown> }
const cache = new Map<string, Entry>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit?.pending) return hit.pending as Promise<T>;
  if (hit && hit.value !== undefined && Date.now() - hit.at < ttlMs) return hit.value as T;

  const pending = load();
  cache.set(key, { at: hit?.at ?? 0, value: hit?.value, pending });
  try {
    const value = await pending;
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch (err) {
    if (hit && hit.value !== undefined) {
      cache.set(key, { at: Date.now() - ttlMs + 5000, value: hit.value }); // serve stale, retry in ~5s
      return hit.value as T;
    }
    cache.delete(key);
    throw err;
  }
}
