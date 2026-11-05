import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { EventType, MovementEvent } from '../types';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** The backend stores facts; this map turns each event type into the words and icon shown. */
export const EVENT_UI: Record<EventType, { icon: IconName; title: (e: MovementEvent) => string }> = {
  CHECKED_OUT: { icon: 'briefcase-outline', title: (e) => `Checked out to ${e.toLocation ?? 'unknown location'}` },
  CHECKED_IN: { icon: 'log-in-outline', title: (e) => `Checked in to ${e.toLocation ?? 'unknown location'}` },
  TRANSFERRED: { icon: 'swap-horizontal', title: (e) => `Transferred to ${e.toLocation ?? 'unknown location'}` },
  RETURNED: { icon: 'return-up-back', title: (e) => `Returned from ${e.fromLocation ?? 'unknown location'}` },
  OWNER_CHANGED: { icon: 'person-outline', title: (e) => `Reassigned to ${e.toOwner ?? 'a new owner'}` },
  STATUS_CHANGED: { icon: 'pulse-outline', title: (e) => `Marked ${e.statusAfter ?? 'updated'}` },
  MAINTENANCE: { icon: 'build-outline', title: () => 'Sent for maintenance' },
};

export const eventUi = (type: string) => EVENT_UI[type as EventType] ?? {
  icon: 'ellipse-outline' as IconName,
  title: () => 'Item updated',
};
