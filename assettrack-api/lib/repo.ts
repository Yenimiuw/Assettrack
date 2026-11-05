// Repository layer: the ONLY file that knows the data lives in Google Sheets.
import { cached, readTable, Row } from './sheets';
import { CODE_RE } from './util';
import {
  CONDITIONS, EVENT_TYPES, ITEM_STATUSES,
  Condition, EventType, Item, ItemStatus, MovementEvent,
} from './types';

export const TAB = { items: 'Items', movements: 'Movements', errors: 'error report' };
const TTL = Number(process.env.CACHE_TTL_MS ?? 30000);

const pick = (r: Row, ...keys: string[]) => {
  for (const k of keys) if (r[k]) return r[k];
  return '';
};
const oneOf = <T extends string>(v: string, list: readonly T[]): T | undefined =>
  list.find((x) => x.toLowerCase() === v.trim().toLowerCase());
const iso = (v: string) => {
  const t = Date.parse(v);
  return Number.isNaN(t) ? '' : new Date(t).toISOString();
};

/** Accepts Drive share links and converts them to the app-friendly thumbnail URL. */
function normalizePicture(url: string): string {
  if (!/^https:\/\//i.test(url)) return '';
  const m =
    url.match(/drive\.google\.com\/file\/d\/([\w-]+)/) ??
    url.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800` : url;
}

async function loadItems(): Promise<Map<string, Item>> {
  const rows = await readTable(TAB.items);
  const byCode = new Map<string, Item>();
  for (const r of rows) {
    const code = pick(r, 'code').toLowerCase();
    const assetNumber = pick(r, 'asset_number');
    if (!assetNumber || !CODE_RE.test(code)) continue; // blank or malformed rows are ignored
    if (byCode.has(code)) {
      console.warn(`Duplicate code ignored for asset ${assetNumber}`);
      continue;
    }
    byCode.set(code, {
      assetNumber,
      name: pick(r, 'item_name', 'name'),
      description: pick(r, 'description'),
      category: pick(r, 'category'),
      condition: (oneOf(pick(r, 'condition'), CONDITIONS) ?? 'Unknown') as Condition,
      status: (oneOf(pick(r, 'status'), ITEM_STATUSES) ?? 'Unknown') as ItemStatus,
      owner: pick(r, 'owner', 'designated_owner'),
      location: pick(r, 'location'),
      pictureUrl: normalizePicture(pick(r, 'picture_url')),
      updatedAt: iso(pick(r, 'updated_at')),
    });
  }
  return byCode;
}

async function loadMovements(): Promise<Map<string, MovementEvent[]>> {
  const rows = await readTable(TAB.movements);
  const byAsset = new Map<string, MovementEvent[]>();
  rows.forEach((r, i) => {
    const assetNumber = pick(r, 'asset_number');
    const type = oneOf(pick(r, 'event_type').replace(/\s+/g, '_'), EVENT_TYPES) as EventType | undefined;
    if (!assetNumber || !type) return; // unknown event types are skipped, not fatal
    const ev: MovementEvent = {
      eventId: pick(r, 'event_id') || `${assetNumber}-${i}`,
      timestamp: iso(pick(r, 'timestamp')),
      assetNumber,
      type,
      fromLocation: pick(r, 'from_location') || undefined,
      toLocation: pick(r, 'to_location') || undefined,
      fromOwner: pick(r, 'from_owner') || undefined,
      toOwner: pick(r, 'to_owner') || undefined,
      statusAfter: oneOf(pick(r, 'status_after'), ITEM_STATUSES),
      performedBy: pick(r, 'performed_by') || undefined,
      notes: pick(r, 'notes') || undefined,
    };
    const list = byAsset.get(assetNumber) ?? [];
    list.push(ev);
    byAsset.set(assetNumber, list);
  });
  for (const list of byAsset.values()) {
    list.sort((a, b) => Date.parse(b.timestamp || '0') - Date.parse(a.timestamp || '0'));
  }
  return byAsset;
}

export async function getItemByCode(code: string): Promise<Item | null> {
  const items = await cached('items', TTL, loadItems);
  return items.get(code) ?? null;
}

export async function getHistory(assetNumber: string, limit: number): Promise<MovementEvent[]> {
  const all = await cached('movements', TTL, loadMovements);
  return (all.get(assetNumber) ?? []).slice(0, limit);
}
