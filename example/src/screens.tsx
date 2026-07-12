import { useCallback } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { TapeDeck, useTapeDeck, useTapeDeckProgress, type TapeItem } from '@uwayss/tapedeck';

import { MIXED_ITEMS, VIDEO_ITEMS } from './items';

/**
 * Blocks the JS thread solid for 2s. Progress, hold-to-pause and the dismiss drag all
 * run on the UI thread, so they must stay perfectly smooth while this is stuck.
 */
const jamJsThread = () => {
  const until = Date.now() + 2000;
  // eslint-disable-next-line no-empty
  while (Date.now() < until) {}
};

const HINT = 'tap sides · hold to pause · swipe down to dismiss';

/** Screen 1 — the defaults, straight out of the box. */
export const DefaultChrome = ({ onClose }: { onClose: () => void }) => (
  <TapeDeck.Root items={VIDEO_ITEMS} defaultMuted onRequestClose={onClose} onComplete={onClose}>
    <TapeDeck.Viewport contentFit="cover" />
    <TapeDeck.Header style={styles.header}>
      <TapeDeck.Progress />
      <View style={styles.headerRow}>
        <Caption />
        <TapeDeck.MuteButton />
      </View>
    </TapeDeck.Header>
    <TapeDeck.Footer style={styles.footer}>
      <Pressable style={styles.jam} onPress={jamJsThread}>
        <Text style={styles.jamLabel}>Jam JS thread 2s</Text>
      </Pressable>
      <Text style={styles.hint}>{HINT}</Text>
    </TapeDeck.Footer>
  </TapeDeck.Root>
);

const Caption = () => {
  const { index, item, isBuffering, isPaused } = useTapeDeck();
  return (
    <Text style={styles.caption}>
      {index + 1} · {item?.id}
      {isBuffering ? ' · buffering' : ''}
      {isPaused ? ' · held' : ''}
    </Text>
  );
};

/**
 * Screen 2 — every pixel of chrome replaced. A custom progress bar driven straight off
 * the shared value, and a reply bar TapeDeck knows nothing about.
 */
const RingProgress = () => {
  const progress = useTapeDeckProgress();

  // Reads the shared value on the UI thread: this never re-renders while it fills.
  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={styles.ringTrack}>
      <Animated.View style={[styles.ringFill, bar]} />
    </View>
  );
};

const ReplyBar = () => {
  const { item, pause, play } = useTapeDeck();

  return (
    <View style={styles.glass}>
      <TextInput
        style={styles.input}
        placeholder={`Reply to ${item?.id}…`}
        placeholderTextColor="rgba(255,255,255,0.5)"
        // The consumer decides that typing should hold playback. TapeDeck does not.
        onFocus={pause}
        onBlur={play}
      />
      <Text style={styles.send}>➤</Text>
    </View>
  );
};

export const CustomChrome = ({ onClose }: { onClose: () => void }) => {
  const onDoubleTap = useCallback((item: TapeItem) => {
    Alert.alert('❤️', `reacted to ${item.id}`);
  }, []);

  return (
    <TapeDeck.Root
      items={VIDEO_ITEMS}
      defaultMuted
      onRequestClose={onClose}
      onComplete={onClose}
      onDoubleTap={onDoubleTap}
      tapZones={{ left: 0.25, right: 0.75 }}
      holdDelay={120}>
      <TapeDeck.Viewport contentFit="cover" />
      <TapeDeck.Header style={styles.header}>
        <RingProgress />
        <View style={styles.headerRow}>
          <Text style={styles.brand}>custom chrome · double-tap to react</Text>
          <TapeDeck.MuteButton>
            {({ isMuted }) => (
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>{isMuted ? 'sound off' : 'sound on'}</Text>
              </View>
            )}
          </TapeDeck.MuteButton>
        </View>
      </TapeDeck.Header>
      <TapeDeck.Footer style={styles.footer}>
        <ReplyBar />
      </TapeDeck.Footer>
    </TapeDeck.Root>
  );
};

/** Screen 3 — images and videos in one list. */
export const MixedItems = ({ onClose }: { onClose: () => void }) => (
  <TapeDeck.Root
    items={MIXED_ITEMS}
    defaultMuted
    defaultDuration={4000}
    onRequestClose={onClose}
    onComplete={onClose}
    onItemSeen={(item, index) => console.warn('seen', index, item.type, item.id)}>
    <TapeDeck.Viewport contentFit="cover" />
    <TapeDeck.Header style={styles.header}>
      <TapeDeck.Progress />
      <View style={styles.headerRow}>
        <Caption />
        <TapeDeck.MuteButton />
      </View>
    </TapeDeck.Header>
    <TapeDeck.Footer style={styles.footer}>
      <Text style={styles.hint}>images hold for their duration · videos run to the end</Text>
    </TapeDeck.Footer>
  </TapeDeck.Root>
);

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, gap: 10 },
  footer: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caption: { color: '#fff', fontSize: 13, fontVariant: ['tabular-nums'] },
  brand: { color: '#fff', fontSize: 13, fontWeight: '600' },
  hint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center' },

  jam: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  jamLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },

  ringTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  ringFill: { height: '100%', borderRadius: 999, backgroundColor: '#7dd3fc' },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  pillLabel: { color: '#fff', fontSize: 11, fontWeight: '600' },

  glass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  input: { flex: 1, color: '#fff', fontSize: 14 },
  send: { color: '#fff', fontSize: 16 },
});
