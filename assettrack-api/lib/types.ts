export const ITEM_STATUSES = ['Available', 'In Use', 'Maintenance'] as const;
export const CONDITIONS = ['Good', 'Bad'] as const;
export const EVENT_TYPES = [
  'CHECKED_OUT', 'CHECKED_IN', 'TRANSFERRED', 'RETURNED',
  'OWNER_CHANGED', 'STATUS_CHANGED', 'MAINTENANCE',
] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number] | 'Unknown';
export type Condition = (typeof CONDITIONS)[number] | 'Unknown';
export type EventType = (typeof EVENT_TYPES)[number];

export interface Item {
  assetNumber: string;
  name: string;
  description: string;
  category: string;
  condition: Condition;
  status: ItemStatus;
  owner: string;
  location: string;
  pictureUrl: string; // '' when missing; the app shows the crate icon
  updatedAt: string;  // ISO 8601 or ''
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
