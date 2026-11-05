import type { ItemStatus } from './types';

export const colors = {
  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  text: '#1F1B3A',
  muted: '#6B6785',
  card: 'rgba(255,255,255,0.78)',
  border: 'rgba(124,58,237,0.14)',
  danger: '#DC2626',
  gradient: ['#F5E9FF', '#E9DDFF', '#FDDDF1'] as const,
};

export const statusStyle: Record<ItemStatus, { fg: string; bg: string }> = {
  Available: { fg: '#15803D', bg: '#DCFCE7' },
  'In Use': { fg: '#1D4ED8', bg: '#DBEAFE' },
  Maintenance: { fg: '#C2410C', bg: '#FFEDD5' },
  Unknown: { fg: '#475569', bg: '#E2E8F0' },
};
