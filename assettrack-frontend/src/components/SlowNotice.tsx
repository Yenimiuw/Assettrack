import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { Banner } from './Banner';

/** Escalating notice for slow requests. Level 1 is gentle; level 2 is stronger and can offer Cancel. */
export function SlowNotice({ level, onCancel }: { level: number; onCancel?: () => void }) {
  if (level < 1) return null;
  return (
    <View>
      <Banner
        icon="hourglass-outline"
        text={level === 1 ? 'Taking longer than usual…' : 'Still working. Your connection may be slow.'}
      />
      {level >= 2 && onCancel && (
        <Pressable onPress={onCancel} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Small "Updating…" indicator for background refreshes of data that's already on screen. */
export function Updating() {
  return (
    <View style={styles.chip}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.chipText}>Updating…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cancel: { alignSelf: 'center', marginTop: -2, marginBottom: 12, paddingHorizontal: 16, paddingVertical: 8 },
  cancelText: { color: colors.primaryDark, fontWeight: '700' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', marginBottom: 12 },
  chipText: { color: colors.muted, fontSize: 13 },
});
