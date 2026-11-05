import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ensureToken } from './src/api/client';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { RecentScreen } from './src/screens/RecentScreen';
import { ScanTab } from './src/screens/ScanTab';
import type { TabParams } from './src/screens/types';
import { refreshRecent } from './src/services/items';
import { flushErrors, reportError } from './src/services/reporter';
import { useStore } from './src/store/useStore';
import { colors } from './src/theme';

const Tab = createBottomTabNavigator<TabParams>();

// Capture uncaught JS errors into the report queue, then let React Native handle them as usual.
const previousHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  reportError({ errorType: isFatal ? 'FATAL' : 'UNHANDLED', message: error?.message, stack: error?.stack });
  previousHandler?.(error, isFatal);
});

function useHydrated() {
  const [done, setDone] = useState(useStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setDone(true));
    setDone(useStore.persist.hasHydrated());
    return unsub;
  }, []);
  return done;
}

function Splash() {
  return (
    <LinearGradient colors={colors.gradient} style={styles.splash}>
      <View style={styles.logo}><Ionicons name="qr-code-outline" size={64} color="#fff" /></View>
      <Text style={styles.splashTitle}>AssetTrack</Text>
      <Text style={styles.splashSub}>Scan. Track. Know.</Text>
      <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      <Text style={styles.splashInit}>Initializing...</Text>
    </LinearGradient>
  );
}

export default function App() {
  const hydrated = useHydrated();
  const [ready, setReady] = useState(false);

  // Startup: get a guest token if we don't have one (offline is fine: we just open with saved data).
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    Promise.all([ensureToken().catch(() => {}), new Promise((r) => setTimeout(r, 700))]).then(() => {
      if (cancelled) return;
      setReady(true);
      void refreshRecent();
      void flushErrors();
    });
    return () => { cancelled = true; };
  }, [hydrated]);

  // Refresh saved items and send queued error reports whenever the app returns to the foreground.
  useEffect(() => {
    if (!ready) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') { void refreshRecent(); void flushErrors(); }
    });
    return () => sub.remove();
  }, [ready]);

  if (!ready) return <Splash />;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: colors.primary,
              tabBarInactiveTintColor: colors.muted,
              tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 0, height: 64, paddingTop: 6, paddingBottom: 8 },
              tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
              tabBarIcon: ({ color, size }) => (
                <Ionicons
                  name={route.name === 'Scan' ? 'scan-outline' : route.name === 'History' ? 'time-outline' : 'bookmark-outline'}
                  size={size}
                  color={color}
                />
              ),
            })}
          >
            <Tab.Screen name="Scan" component={ScanTab} />
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Recent" component={RecentScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 120, height: 120, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  splashTitle: { marginTop: 20, fontSize: 34, fontWeight: '800', color: colors.primaryDark },
  splashSub: { marginTop: 4, fontSize: 16, color: colors.muted },
  splashInit: { marginTop: 8, fontSize: 13, color: colors.muted },
});
