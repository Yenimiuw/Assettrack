import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { GradientScreen } from '../components/GradientScreen';
import { ItemImage } from '../components/ItemImage';
import { StatusPill } from '../components/StatusPill';
import { Banner } from '../components/Banner';
import { EmptyState } from '../components/EmptyState';
import { HistorySkeleton } from '../components/Skeleton';
import { SlowNotice, Updating } from '../components/SlowNotice';
import { eventUi } from '../lib/eventUi';
import { formatDateTime, timeAgo } from '../lib/format';
import { useOnline } from '../hooks/useOnline';
import { useSlowLevel } from '../hooks/useSlowLevel';
import { loadHistory, RefreshResult } from '../services/items';
import { useCurrent, useStore } from '../store/useStore';
import { useSync } from '../store/useSync';
import { colors } from '../theme';
import type { MovementEvent } from '../types';

export function HistoryScreen() {
  const focused = useIsFocused();
  const online = useOnline();
  const current = useCurrent();
  const code = current?.code;
  const cached = useStore((s) => (code ? s.history[code] : undefined));
  const syncStart = useSync((s) => (code ? s.active[`history:${code}`] : undefined));
  const slow = useSlowLevel(syncStart);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<RefreshResult | null>(null);

  async function load(force = false) {
    if (!code) return;
    setResult(await loadHistory(code, { force }));
  }

  // Load when the tab is opened. Fresh cached history is reused without a network call.
  useEffect(() => { setResult(null); }, [code]);
  useEffect(() => {
    if (focused && code && online) void load();
  }, [focused, code, online]);

  async function onRefresh() {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }

  if (!current) {
    return (
      <GradientScreen>
        <Title />
        <EmptyState icon="time-outline" title="No item selected" subtitle="Scan an item or open one from Recent to see its movement history." />
      </GradientScreen>
    );
  }

  const events = cached?.events ?? [];
  const { item } = current;
  const loadingFirst = !cached && online && (syncStart !== undefined || result === null);

  return (
    <GradientScreen>
      <Title />
      <FlatList
        data={events}
        keyExtractor={(e) => e.eventId}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            {!online && <Banner text={cached ? `Offline. Showing history saved ${timeAgo(cached.fetchedAt)}.` : 'Offline. No saved history for this item yet.'} />}
            {online && result === 'error' && <Banner tone="danger" icon="alert-circle-outline" text="Couldn't refresh history. Pull down to try again." />}
            {online && result === 'network' && <Banner text="Can't reach the server. Pull down to try again." />}
            {current.unavailable && <Banner tone="danger" icon="alert-circle-outline" text="This item is no longer available in the system." />}
            {cached && syncStart !== undefined && slow === 0 && <Updating />}
            <SlowNotice level={slow} />
            <View style={styles.itemCard}>
              <ItemImage uri={item.pictureUrl} compact style={styles.thumb} />
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name || '—'}</Text>
                <StatusPill status={item.status} small />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          loadingFirst ? (
            <HistorySkeleton />
          ) : (
            <Text style={styles.empty}>
              {cached || result === 'ok' ? 'No movements recorded for this item yet.' : ''}
            </Text>
          )
        }
        renderItem={({ item: ev, index }) => <TimelineRow ev={ev} last={index === events.length - 1} />}
      />
    </GradientScreen>
  );
}

function Title() {
  return <Text style={styles.title}>Item Movement History</Text>;
}

function TimelineRow({ ev, last }: { ev: MovementEvent; last: boolean }) {
  const ui = eventUi(ev.type);
  return (
    <View style={styles.tRow}>
      <View style={styles.tRail}>
        <View style={styles.tIcon}><Ionicons name={ui.icon} size={20} color={colors.primary} /></View>
        {!last && <View style={styles.tLine} />}
      </View>
      <View style={styles.tCard}>
        <Text style={styles.tDate}>{formatDateTime(ev.timestamp)}</Text>
        <Text style={styles.tTitle}>{ui.title(ev)}</Text>
        {!!ev.notes && <Text style={styles.tNotes}>{ev.notes}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', paddingVertical: 14 },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: 22, padding: 12, marginBottom: 18, borderWidth: 1, borderColor: colors.border },
  thumb: { width: 76, height: 76, borderRadius: 16 },
  itemName: { fontSize: 18, fontWeight: '700', color: colors.text },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 24 },
  tRow: { flexDirection: 'row', gap: 12 },
  tRail: { alignItems: 'center', width: 44 },
  tIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E9DDFF', alignItems: 'center', justifyContent: 'center' },
  tLine: { flex: 1, width: 2, backgroundColor: 'rgba(124,58,237,0.25)', marginVertical: 4 },
  tCard: { flex: 1, backgroundColor: colors.card, borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  tDate: { fontSize: 12, color: colors.muted },
  tTitle: { marginTop: 4, fontSize: 16, fontWeight: '700', color: colors.text },
  tNotes: { marginTop: 4, fontSize: 13, color: colors.muted },
});
