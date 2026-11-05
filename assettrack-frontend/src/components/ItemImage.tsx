import { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Skeleton } from './Skeleton';

/**
 * Item photo with disk caching (expo-image) and a skeleton shimmer while it loads.
 * Shows a crate icon and "image didn't load" when the URL is missing or fails.
 */
export function ItemImage({ uri, style, compact }: { uri?: string; style?: StyleProp<ViewStyle>; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setFailed(false); setLoaded(false); }, [uri]);

  if (!uri || failed) {
    return (
      <View style={[styles.fallback, style]}>
        <Ionicons name="cube-outline" size={compact ? 26 : 44} color={colors.primary} />
        {!compact && <Text style={styles.fallbackText}>image didn't load</Text>}
      </View>
    );
  }
  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
      {!loaded && <Skeleton style={[StyleSheet.absoluteFill, { borderRadius: 0 }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#EDE4FB' },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDE4FB' },
  fallbackText: { marginTop: 6, color: colors.muted, fontSize: 13 },
});
