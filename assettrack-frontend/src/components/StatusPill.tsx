import { StyleSheet, Text, View } from 'react-native';
import { statusStyle } from '../theme';
import type { ItemStatus } from '../types';

export function StatusPill({ status, small }: { status: ItemStatus; small?: boolean }) {
  const s = statusStyle[status] ?? statusStyle.Unknown;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }, small && styles.small]}>
      <View style={[styles.dot, { backgroundColor: s.fg }]} />
      <Text style={[styles.text, { color: s.fg }, small && { fontSize: 12 }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  small: { paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  text: { fontSize: 14, fontWeight: '600' },
});
