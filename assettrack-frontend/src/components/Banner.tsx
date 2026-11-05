import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export function Banner({ text, icon = 'cloud-offline-outline', tone = 'warn' }: {
  text: string; icon?: ComponentProps<typeof Ionicons>['name']; tone?: 'warn' | 'danger';
}) {
  const c = tone === 'warn' ? { bg: '#FEF3C7', fg: '#92400E' } : { bg: '#FEE2E2', fg: '#991B1B' };
  return (
    <View style={[styles.box, { backgroundColor: c.bg }]}>
      <Ionicons name={icon} size={18} color={c.fg} />
      <Text style={[styles.text, { color: c.fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, marginBottom: 12 },
  text: { flex: 1, fontSize: 13, fontWeight: '500' },
});
