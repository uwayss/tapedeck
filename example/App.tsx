import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomChrome, DefaultChrome, MixedItems } from './src/screens';

const SCREENS = {
  default: { label: 'Default chrome', Component: DefaultChrome },
  custom: { label: 'Custom chrome', Component: CustomChrome },
  mixed: { label: 'Image + video', Component: MixedItems },
} as const;

type ScreenKey = keyof typeof SCREENS;

const Menu = ({ onPick }: { onPick: (key: ScreenKey) => void }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.menu, { paddingTop: insets.top + 32, paddingBottom: insets.bottom }]}>
      <Text style={styles.title}>TapeDeck</Text>
      <Text style={styles.subtitle}>pooled players · worklet progress · slot-based chrome</Text>

      <View style={styles.list}>
        {(Object.keys(SCREENS) as ScreenKey[]).map((key) => (
          <Pressable key={key} style={styles.row} onPress={() => onPick(key)}>
            <Text style={styles.rowLabel}>{SCREENS[key].label}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

export default function App() {
  const [screen, setScreen] = useState<ScreenKey | null>(null);
  const Active = screen ? SCREENS[screen].Component : null;

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <View style={styles.fill}>
          {Active ? <Active onClose={() => setScreen(null)} /> : <Menu onPick={setScreen} />}
        </View>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  menu: { flex: 1, paddingHorizontal: 20, gap: 6 },
  title: { color: '#fff', fontSize: 34, fontWeight: '700' },
  subtitle: { color: '#8a8a8e', fontSize: 14 },
  list: { marginTop: 28, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: '#1c1c1e',
  },
  rowLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  chevron: { color: '#8a8a8e', fontSize: 22 },
});
