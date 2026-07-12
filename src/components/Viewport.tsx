import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { VideoView, type VideoContentFit } from 'expo-video';

import { useTapeDeckContext } from '../core/context';
import { slotForItemIndex } from '../core/pool';

export interface ViewportProps {
  contentFit?: VideoContentFit;
  style?: StyleProp<ViewStyle>;
}

export const Viewport = ({ contentFit = 'cover', style }: ViewportProps) => {
  const { players, index } = useTapeDeckContext();
  const currentSlot = slotForItemIndex(index);

  return (
    <View style={[styles.container, style]}>
      {players.map((player, slot) => (
        // Every view stays mounted for the session (SPEC §4.1 rule 2). Visibility is
        // opacity only — unmounting is what costs a decode and a black frame.
        <VideoView
          key={slot}
          player={player}
          style={[StyleSheet.absoluteFill, slot === currentSlot ? styles.visible : styles.hidden]}
          contentFit={contentFit}
          nativeControls={false}
          pointerEvents="none"
        />
      ))}
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
