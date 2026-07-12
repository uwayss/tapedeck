import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { TapeDeck, useTapeDeck } from '@uwayss/tapedeck';

import { VIDEO_ITEMS } from './src/items';

const Button = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable style={styles.button} onPress={onPress}>
    <Text style={styles.buttonLabel}>{label}</Text>
  </Pressable>
);

/** M1 harness: manual next/prev. Gestures land in M3. */
const Controls = () => {
  const { index, item, next, prev, isPaused, pause, play, isMuted, toggleMute } = useTapeDeck();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
      <Text style={styles.readout}>
        {index + 1} / {VIDEO_ITEMS.length} · {item?.id}
      </Text>
      <View style={styles.row}>
        <Button label="Prev" onPress={prev} />
        <Button label={isPaused ? 'Play' : 'Pause'} onPress={isPaused ? play : pause} />
        <Button label={isMuted ? 'Unmute' : 'Mute'} onPress={toggleMute} />
        <Button label="Next" onPress={next} />
      </View>
    </View>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <View style={styles.fill}>
          <TapeDeck.Root items={VIDEO_ITEMS} defaultMuted>
            <TapeDeck.Viewport contentFit="cover" />
            <Controls />
          </TapeDeck.Root>
          <StatusBar style="light" />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    gap: 12,
  },
  readout: {
    color: '#fff',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  row: { flexDirection: 'row', gap: 8 },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  buttonLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
