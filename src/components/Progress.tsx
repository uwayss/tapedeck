import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { useTapeDeckContext } from '../core/context';

export interface ProgressProps {
  style?: StyleProp<ViewStyle>;
  trackColor?: string;
  fillColor?: string;
  height?: number;
  gap?: number;
}

interface SegmentProps {
  progress: SharedValue<number>;
  state: 'past' | 'current' | 'future';
  trackColor: string;
  fillColor: string;
  height: number;
}

const Segment = ({ progress, state, trackColor, fillColor, height }: SegmentProps) => {
  const fill = useAnimatedStyle(() => {
    const scale = state === 'past' ? 1 : state === 'future' ? 0 : progress.value;
    return { transform: [{ scaleX: scale }] };
  });

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }]}>
      <Animated.View style={[styles.fill, { backgroundColor: fillColor }, fill]} />
    </View>
  );
};

/**
 * One segment per item. Only the active segment is animated, and it reads the
 * shared value directly — the bar never re-renders while it fills, only when the
 * index changes.
 */
export const Progress = ({
  style,
  trackColor = 'rgba(255,255,255,0.3)',
  fillColor = '#fff',
  height = 2,
  gap = 4,
}: ProgressProps) => {
  const { items, index, progress } = useTapeDeckContext();

  return (
    <View style={[styles.row, { gap }, style]}>
      {items.map((item, i) => (
        <Segment
          key={item.id}
          progress={progress}
          state={i < index ? 'past' : i > index ? 'future' : 'current'}
          trackColor={trackColor}
          fillColor={fillColor}
          height={height}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    // Grow from the left edge rather than the centre.
    transformOrigin: 'left',
  },
});
