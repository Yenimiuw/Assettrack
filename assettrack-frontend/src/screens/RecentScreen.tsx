import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { GradientScreen } from '../components/GradientScreen';
import { ItemImage } from '../components/ItemImage';
import { StatusPill } from '../components/StatusPill';
import { EmptyState } from '../components/EmptyState';
import { timeAgo } from '../lib/format';
import { refreshItem } from '../services/items';
import { useStore } from '../store/useStore';
import { colors } from '../theme';
import NetInfo from '@react-native-community/netinfo';
import type { TabParams } from './types';

export function RecentScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParams>>();
  const recents = useStore((s) => s.recents);
  const openItem = useStore((s) => s.openItem);
  const clearRecents = useStore((s) => s.clearRecents);

  function open(code: string) {
    openItem(code); // show the saved snapshot immediately...
    navigation.navigate('Scan');
    NetInfo.fetch().then((n) => { if (n.isConnected !== false) void refreshItem(code); }); // ...then update it
  }

  function confirmClear() {
    Alert.alert('Clear recent items?', 'This removes saved items and their history from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearRecents },
    ]);
  }

  return (
    <GradientScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Recently Scanned</Text>
        {recents.length > 0 && (
          <Pressable style={styles.trash} onPress={confirmClear} accessibilityLabel="Clear recent items">
            <Ionicons name="trash-outline" size={22} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {recents.length === 0 ? (
        <EmptyState icon="bookmark-outline" title="Nothing scanned yet" subtitle="Items you scan will show up here so you can reopen them without scanning again." />
      ) : (
        <FlatList
          data={recents}
          keyExtractor={(r) => r.code}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          renderItem={({ item: r }) => (
            <Pressable style={styles.card} onPress={() => open(r.code)}>
              <ItemImage uri={r.item.pictureUrl} compact style={styles.thumb} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.name} numberOfLines={1}>{r.item.name || '—'}</Text>
                {r.unavailable ? (
                  <Text style={styles.gone}>No longer available</Text>
                ) : (
                  <StatusPill status={r.item.status} small />
                )}
                <Text style={styles.ago}>{timeAgo(r.scannedAt)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          )}
        />
      )}
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 26, fontWeight: '800', color: colors.primaryDark },
  trash: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: 22, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  thumb: { width: 76, height: 76, borderRadius: 16 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  ago: { fontSize: 13, color: colors.muted },
  gone: { fontSize: 13, fontWeight: '600', color: colors.danger },
});
