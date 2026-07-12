import { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TapeDeck, useTapeDeck, type TapeItem } from '@uwayss/tapedeck';

import { VIDEO_ITEMS } from './src/items';

/**
 * M2 acceptance test. Blocks the JS thread solid for 2s. Progress, hold-to-pause and
 * the dismiss drag all run on the UI thread, so they must stay perfectly smooth while
 * this is stuck — any stutter means something leaked back into React.
 */
const jamJsThread = () => {
  const until = Date.now() + 2000;
  // eslint-disable-next-line no-empty
  while (Date.now() < until) {}
};

const Chrome = () => {
  const { index, item, isMuted, toggleMute, isBuffering, isPaused } = useTapeDeck();

  return (
    <>
      <TapeDeck.Header style={styles.header}>
        <TapeDeck.Progress />
        <View style={styles.headerRow}>
          <Text style={styles.readout}>
            {index + 1} / {VIDEO_ITEMS.length} · {item?.id}
            {isBuffering ? ' · buffering' : ''}
            {isPaused ? ' · held' : ''}
          </Text>
          <Pressable onPress={toggleMute} hitSlop={12}>
            <Text style={styles.mute}>{isMuted ? '🔇' : '🔊'}</Text>
          </Pressable>
        </View>
      </TapeDeck.Header>

      <TapeDeck.Footer style={styles.footer}>
        <Pressable style={styles.button} onPress={jamJsThread}>
          <Text style={styles.buttonLabel}>Jam JS thread 2s</Text>
        </Pressable>
        <Text style={styles.hint}>
          tap sides · hold to pause · swipe down to dismiss · double-tap to react
        </Text>
      </TapeDeck.Footer>
    </>
  );
};

export default function App() {
  const [closed, setClosed] = useState(false);

  const onDoubleTap = useCallback((item: TapeItem) => {
    Alert.alert('❤️', `reacted to ${item.id}`);
  }, []);

  if (closed) {
    return (
      <View style={styles.closed}>
        <Pressable onPress={() => setClosed(false)}>
          <Text style={styles.reopen}>dismissed — tap to reopen</Text>
        </Pressable>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <TapeDeck.Root
          items={VIDEO_ITEMS}
          defaultMuted
          onRequestClose={() => setClosed(true)}
          onComplete={() => setClosed(true)}
          onDoubleTap={onDoubleTap}
          onItemSeen={(item) => console.log('seen', item.id)}>
          <TapeDeck.Viewport contentFit="cover" />
          <Chrome />
        </TapeDeck.Root>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  closed: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  reopen: { color: '#fff', fontSize: 16 },
  header: { paddingHorizontal: 12, gap: 10 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  readout: {
    color: '#fff',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  mute: { fontSize: 20 },
  hint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  buttonLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
