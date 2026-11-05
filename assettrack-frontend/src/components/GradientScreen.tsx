import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

export function GradientScreen({ children }: { children: ReactNode }) {
  return (
    <LinearGradient colors={colors.gradient} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}
