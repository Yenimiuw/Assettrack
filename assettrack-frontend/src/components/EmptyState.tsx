import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export function EmptyState({ icon, title, subtitle }: {
  icon: ComponentProps<typeof Ionicons>['name']; title: string; subtitle: string;
}) {
  return (
    <View style={styles.box}>
      <Ionicons name={icon} size={52} color={colors.primary} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { marginTop: 14, fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  sub: { marginTop: 6, fontSize: 14, color: colors.muted, textAlign: 'center' },
});
