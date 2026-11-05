import { Image } from 'expo-image';

/** Warm the disk cache so thumbnails in Recent and the detail hero appear instantly next time. */
export function prefetchImage(url?: string): void {
  if (!url) return;
  Image.prefetch(url, 'memory-disk').catch(() => {});
}
