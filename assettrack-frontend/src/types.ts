export type ItemStatus = 'Available' | 'In Use' | 'Maintenance' | 'Unknown';

export type EventType =
  | 'CHECKED_OUT' | 'CHECKED_IN' | 'TRANSFERRED' | 'RETURNED'
  | 'OWNER_CHANGED' | 'STATUS_CHANGED' | 'MAINTENANCE';

export interface Item {
  assetNumber: string;
  name: string;
  description: string;
  category: string;
  condition: 'Good' | 'Bad' | 'Unknown';
  status: ItemStatus;
  owner: string;
  location: string;
  pictureUrl: string;
  updatedAt: string;
}

export interface MovementEvent {
  eventId: string;
  timestamp: string;
  assetNumber: string;
  type: EventType;
  fromLocation?: string;
  toLocation?: string;
  fromOwner?: string;
  toOwner?: string;
  statusAfter?: ItemStatus;
  performedBy?: string;
  notes?: string;
}

/** A locally saved snapshot of a scanned item. Powers the Recent tab and offline reads. */
export interface RecentEntry {
  code: string;
  item: Item;
  scannedAt: number;
  refreshedAt: number;
  unavailable?: boolean;
}
