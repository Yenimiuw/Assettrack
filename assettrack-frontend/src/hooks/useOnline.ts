import { useNetInfo } from '@react-native-community/netinfo';

/** True unless the device reports no connection (null/unknown counts as online). */
export function useOnline(): boolean {
  const n = useNetInfo();
  return n.isConnected !== false && n.isInternetReachable !== false;
}
