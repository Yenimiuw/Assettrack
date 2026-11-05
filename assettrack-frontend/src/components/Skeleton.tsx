import { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme';

/** A softly pulsing placeholder block. */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={[styles.block, { opacity: a }, style]} />;
}

/** Placeholder shaped like the item detail screen. */
export function DetailSkeleton() {
  return (
    <View>
      <Skeleton style={styles.hero} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.row}>
          <Skeleton style={styles.rowIcon} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton style={{ height: 12, width: '30%' }} />
            <Skeleton style={{ height: 18, width: i === 2 ? '35%' : '60%' }} />
          </View>
        </View>
      ))}
      <Skeleton style={styles.button} />
    </View>
  );
}

/** Placeholder rows shaped like the movement timeline. */
export function HistorySkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.tRow}>
          <Skeleton style={styles.tIcon} />
          <View style={styles.tCard}>
            <Skeleton style={{ height: 12, width: '45%' }} />
            <Skeleton style={{ height: 18, width: '75%' }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: '#DCCFF5', borderRadius: 12 },
  hero: { height: 240, borderRadius: 28, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: 20, padding: 14, marginBottom: 10 },
  rowIcon: { width: 44, height: 44, borderRadius: 14 },
  button: { height: 54, borderRadius: 18, marginTop: 10 },
  tRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  tIcon: { width: 44, height: 44, borderRadius: 22 },
  tCard: { flex: 1, gap: 10, backgroundColor: colors.card, borderRadius: 18, padding: 14 },
});
