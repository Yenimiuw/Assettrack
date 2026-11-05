import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { GradientScreen } from '../components/GradientScreen';
import { ItemImage } from '../components/ItemImage';
import { StatusPill } from '../components/StatusPill';
import { Banner } from '../components/Banner';
import { DetailSkeleton } from '../components/Skeleton';
import { SlowNotice, Updating } from '../components/SlowNotice';
import { api, ApiError } from '../api/client';
import { CODE_RE } from '../config';
import { describeError } from '../lib/errors';
import { timeAgo } from '../lib/format';
import { useOnline } from '../hooks/useOnline';
import { useSlowLevel } from '../hooks/useSlowLevel';
import { refreshItem } from '../services/items';
import { prefetchImage } from '../services/images';
import { reportApiError } from '../services/reporter';
import { useCurrent, useStore } from '../store/useStore';
import { useSync } from '../store/useSync';
import { colors } from '../theme';
import type { RecentEntry } from '../types';
import type { TabParams } from './types';

type Nav = BottomTabNavigationProp<TabParams>;

export function ScanTab() {
  const mode = useStore((s) => s.scanMode);
  const current = useCurrent();
  return mode === 'detail' && current ? <DetailView entry={current} /> : <ScannerView />;
}

/* ---------------------------------- Scanner ---------------------------------- */

type ScanState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string; retry?: () => void };

function ScannerView() {
  const navigation = useNavigation<Nav>();
  const focused = useIsFocused();
  const online = useOnline();
  const [permission, requestPermission] = useCameraPermissions();
  const recordScan = useStore((s) => s.recordScan);
  const rescan = useStore((s) => s.rescan);
  const [torch, setTorch] = useState(false);
  const [state, setState] = useState<ScanState>({ kind: 'idle' });
  const [startedAt, setStartedAt] = useState<number | undefined>();
  const slow = useSlowLevel(startedAt);
  const lock = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const dismiss = () => { lock.current = false; setStartedAt(undefined); setState({ kind: 'idle' }); };
  const cancel = () => abortRef.current?.abort();

  async function lookup(code: string) {
    // Already saved on this device? Show it instantly; refreshItem only hits the network if it's stale.
    const saved = useStore.getState().recents.find((r) => r.code === code);
    if (saved && !saved.unavailable) {
      rescan(code);
      void refreshItem(code);
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ kind: 'loading' });
    setStartedAt(Date.now());
    try {
      const item = await api.getItem(code, ctrl.signal);
      prefetchImage(item.pictureUrl);
      recordScan(code, item); // switches this tab to the detail view
    } catch (e) {
      if (e instanceof ApiError && e.kind === 'cancelled') { dismiss(); return; }
      const info = describeError(e);
      if (info.report) reportApiError(e, '/v1/items/:code', 'Scan');
      setStartedAt(undefined);
      setState({ kind: 'error', message: info.message, retry: info.retryable ? () => lookup(code) : undefined });
    }
  }

  function onScanned({ data }: { data: string }) {
    if (lock.current) return;
    lock.current = true;
    const code = data.trim().toLowerCase();
    if (!CODE_RE.test(code)) {
      setState({ kind: 'error', message: "This isn't an AssetTrack code." });
      setTimeout(dismiss, 2000);
      return;
    }
    void lookup(code);
  }

  if (!permission) return <GradientScreen><View style={{ flex: 1 }} /></GradientScreen>;

  if (!permission.granted) {
    return (
      <GradientScreen>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={56} color={colors.primary} />
          <Text style={styles.bigTitle}>Camera access needed</Text>
          <Text style={styles.sub}>AssetTrack uses the camera only to scan QR codes on items.</Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          >
            <Text style={styles.primaryBtnText}>{permission.canAskAgain ? 'Allow camera' : 'Open settings'}</Text>
          </Pressable>
        </View>
      </GradientScreen>
    );
  }

  const canScan = online && state.kind === 'idle';

  return (
    <View style={styles.scanner}>
      {focused && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={canScan ? onScanned : undefined}
        />
      )}
      <View style={styles.dim} pointerEvents="none" />

      <View style={styles.scanTop}>
        <Pressable style={styles.roundBtn} onPress={() => setTorch((t) => !t)} accessibilityLabel="Toggle flashlight">
          <Ionicons name={torch ? 'flash' : 'flash-outline'} size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.frameWrap} pointerEvents="none">
        <View style={styles.frame}>
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => <View key={c} style={[styles.corner, cornerStyle[c]]} />)}
        </View>
        <View style={styles.hint}><Text style={styles.hintText}>Align the QR code within the frame</Text></View>
      </View>

      <View style={styles.scanBottom}>
        {!online && (
          <View style={styles.card}>
            <Ionicons name="cloud-offline-outline" size={28} color={colors.primary} />
            <Text style={styles.cardTitle}>You're offline</Text>
            <Text style={styles.cardSub}>Scanning is disabled. You can still view saved items.</Text>
            <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('Recent')}>
              <Text style={styles.primaryBtnText}>View recent items</Text>
            </Pressable>
          </View>
        )}
        {online && state.kind === 'error' && (
          <View style={styles.card}>
            <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
            <Text style={styles.cardSub}>{state.message}</Text>
            <View style={styles.row}>
              {state.retry && (
                <Pressable style={styles.primaryBtn} onPress={state.retry}>
                  <Text style={styles.primaryBtnText}>Retry</Text>
                </Pressable>
              )}
              <Pressable style={styles.secondaryBtn} onPress={dismiss}>
                <Text style={styles.secondaryBtnText}>Scan again</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {state.kind === 'loading' && (
        <View style={StyleSheet.absoluteFill}>
          <GradientScreen>
            <View style={styles.detailTop}>
              <Pressable style={styles.lightBtn} onPress={cancel} accessibilityLabel="Cancel lookup">
                <Ionicons name="chevron-back" size={22} color={colors.primary} />
              </Pressable>
            </View>
            <ScrollView scrollEnabled={false} contentContainerStyle={{ padding: 16 }}>
              <SlowNotice level={slow} onCancel={cancel} />
              <DetailSkeleton />
            </ScrollView>
          </GradientScreen>
        </View>
      )}
    </View>
  );
}

/* ----------------------------------- Detail ---------------------------------- */

function DetailView({ entry }: { entry: RecentEntry }) {
  const navigation = useNavigation<Nav>();
  const online = useOnline();
  const closeDetail = useStore((s) => s.closeDetail);
  const [refreshing, setRefreshing] = useState(false);
  const { item } = entry;
  const syncStart = useSync((s) => s.active[`item:${entry.code}`]);
  const slow = useSlowLevel(syncStart);

  async function onRefresh() {
    setRefreshing(true);
    await refreshItem(entry.code, { force: true });
    setRefreshing(false);
  }

  return (
    <GradientScreen>
      <View style={styles.detailTop}>
        <Pressable style={styles.lightBtn} onPress={closeDetail} accessibilityLabel="Back to scanner">
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Pressable style={styles.lightBtn} onPress={closeDetail} accessibilityLabel="Scan another item">
          <Ionicons name="scan-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {syncStart !== undefined && slow === 0 && <Updating />}
        <SlowNotice level={slow} />
        {entry.unavailable && <Banner icon="alert-circle-outline" tone="danger" text="This item is no longer available in the system." />}
        {!online && <Banner text={`Offline. Showing saved data from ${timeAgo(entry.refreshedAt)}.`} />}

        <View style={styles.hero}>
          <ItemImage uri={item.pictureUrl} style={StyleSheet.absoluteFill} />
          <View style={styles.heroPill}><StatusPill status={item.status} small /></View>
        </View>

        <InfoRow icon="person-outline" label="Owner" value={item.owner || '—'} />
        <InfoRow icon="cube-outline" label="Item Name" value={item.name || '—'} />
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}><Ionicons name="pulse-outline" size={22} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Status</Text>
            <StatusPill status={item.status} />
          </View>
        </View>

        <Pressable style={styles.logBtn} onPress={() => navigation.navigate('History')}>
          <Ionicons name="git-branch-outline" size={20} color="#fff" />
          <Text style={styles.logBtnText}>View Movement Log</Text>
        </Pressable>
      </ScrollView>
    </GradientScreen>
  );
}

function InfoRow({ icon, label, value }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={22} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

/* ----------------------------------- Styles ---------------------------------- */

const CORNER = 36;
const cornerStyle = {
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 },
} as const;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  bigTitle: { marginTop: 14, fontSize: 20, fontWeight: '700', color: colors.text },
  sub: { marginTop: 6, color: colors.muted, textAlign: 'center' },
  primaryBtn: { marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { marginTop: 16, backgroundColor: '#EDE4FB', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  secondaryBtnText: { color: colors.primaryDark, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },

  scanner: { flex: 1, backgroundColor: '#000' },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(30,10,60,0.25)' },
  scanTop: { position: 'absolute', top: 56, left: 20 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  frameWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 250, height: 250 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#A78BFA' },
  hint: { marginTop: 28, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  hintText: { color: '#fff', fontSize: 13 },
  scanBottom: { position: 'absolute', left: 16, right: 16, bottom: 24 },
  card: { backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 20, padding: 18, alignItems: 'center' },
  cardTitle: { marginTop: 6, fontSize: 17, fontWeight: '700', color: colors.text },
  cardSub: { marginTop: 6, color: colors.muted, textAlign: 'center' },

  detailTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  lightBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  hero: { height: 240, borderRadius: 28, overflow: 'hidden', marginBottom: 14 },
  heroPill: { position: 'absolute', top: 14, right: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: 20, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  infoIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EDE4FB', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 13, color: colors.muted, marginBottom: 2 },
  infoValue: { fontSize: 17, fontWeight: '700', color: colors.text },
  logBtn: { marginTop: 10, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 16 },
  logBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
