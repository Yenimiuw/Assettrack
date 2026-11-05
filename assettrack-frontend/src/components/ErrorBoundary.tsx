import { Component, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { reportError } from '../services/reporter';
import { colors } from '../theme';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) {
    reportError({ errorType: 'RENDER', message: error.message, stack: error.stack });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.box}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.sub}>The problem has been reported.</Text>
        <Pressable style={styles.btn} onPress={() => this.setState({ failed: false })}>
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F5E9FF' },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  sub: { marginTop: 6, color: colors.muted },
  btn: { marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '700' },
});
