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

/**
 * M2 acceptance test. Blocks the JS thread solid for 2s. The progress bar runs on
 * the UI thread, so it must keep filling perfectly smoothly while this is stuck —
 * any stutter means progress leaked back into React.
 */
const jamJsThread = () => {
  const until = Date.now() + 2000;
  // eslint-disable-next-line no-empty
  while (Date.now() < until) {}
};

const Chrome = () => {
  const { index, item, next, prev, isPaused, pause, play, isMuted, toggleMute, isBuffering } =
    useTapeDeck();
  const insets = useSafeAreaInsets();

  return (
    <>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TapeDeck.Progress />
        <Text style={styles.readout}>
          {index + 1} / {VIDEO_ITEMS.length} · {item?.id}
          {isBuffering ? ' · buffering' : ''}
        </Text>
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
        <Button label="Jam JS 2s" onPress={jamJsThread} />
        <View style={styles.row}>
          <Button label="Prev" onPress={prev} />
          <Button label={isPaused ? 'Play' : 'Pause'} onPress={isPaused ? play : pause} />
          <Button label={isMuted ? 'Unmute' : 'Mute'} onPress={toggleMute} />
          <Button label="Next" onPress={next} />
        </View>
      </View>
    </>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <View style={styles.fill}>
          <TapeDeck.Root items={VIDEO_ITEMS} defaultMuted>
            <TapeDeck.Viewport contentFit="cover" />
            <Chrome />
          </TapeDeck.Root>
          <StatusBar style="light" />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    gap: 8,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    gap: 8,
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
