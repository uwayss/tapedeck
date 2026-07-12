import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DEFAULT_DURATION } from '@uwayss/tapedeck';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <View style={styles.container}>
          <Text style={styles.title}>TapeDeck</Text>
          <Text style={styles.subtitle}>scaffold boots · defaultDuration {DEFAULT_DURATION}ms</Text>
          <StatusBar style="light" />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  title: { color: '#fff', fontSize: 32, fontWeight: '700' },
  subtitle: { color: '#888', fontSize: 14, marginTop: 8 },
});
