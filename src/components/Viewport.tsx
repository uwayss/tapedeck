import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { VideoView, type VideoContentFit } from 'expo-video';

import { useTapeDeckContext } from '../core/context';
import { slotForItemIndex } from '../core/pool';
import { TapeImage } from './imageLoader';

export interface ViewportProps {
  contentFit?: VideoContentFit;
  style?: StyleProp<ViewStyle>;
}

export const Viewport = ({ contentFit = 'cover', style }: ViewportProps) => {
  const { players, index, item, isBuffering } = useTapeDeckContext();
  const currentSlot = slotForItemIndex(index);

  const isImage = item?.type === 'image';
  // Hold the poster up until the video actually has a frame to show. Without this the
  // surface is black for as long as the first segment takes to load.
  const poster = item?.type === 'video' && isBuffering ? item.poster : undefined;

  return (
    <View style={[styles.container, style]}>
      {players.map((player, slot) => (
        // Every view stays mounted for the session (SPEC §4.1 rule 2). Visibility is
        // opacity only — unmounting is what costs a decode and a black frame.
        <VideoView
          key={slot}
          player={player}
          style={[
            StyleSheet.absoluteFill,
            slot === currentSlot && !isImage ? styles.visible : styles.hidden,
          ]}
          contentFit={contentFit}
          nativeControls={false}
          pointerEvents="none"
        />
      ))}

      {poster ? (
        <TapeImage
          source={poster}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          pointerEvents="none"
        />
      ) : null}

      {isImage ? (
        <TapeImage
          source={item.source}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={150}
          pointerEvents="none"
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
});
