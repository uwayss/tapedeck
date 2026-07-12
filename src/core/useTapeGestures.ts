import { useMemo } from 'react';
import { Gesture, type ComposedGesture, type GestureType } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  DEFAULT_DISMISS_THRESHOLD,
  DEFAULT_HOLD_DELAY,
  DEFAULT_TAP_ZONES,
  DISMISS_VELOCITY,
  resolveTapZone,
  rubberBand,
  scaleForDismiss,
  shouldDismiss,
} from './gestures';
import { type TapeItem, type TapZones } from './types';

interface GestureOptions {
  progress: SharedValue<number>;
  item: TapeItem | undefined;
  index: number;
  tapZones?: TapZones | undefined;
  holdDelay?: number | undefined;
  hideChromeOnHold?: boolean | undefined;
  dismissThreshold?: number | undefined;
  onNext: () => void;
  onPrev: () => void;
  onPause: () => void;
  onPlay: () => void;
  onClose: () => void;
  onDoubleTap?: ((item: TapeItem, index: number) => void) | undefined;
}

export interface TapeGestures {
  gesture: ComposedGesture | GestureType;
  /** Width of the gesture surface. Written from onLayout, read inside worklets. */
  width: SharedValue<number>;
  height: SharedValue<number>;
  chromeOpacity: SharedValue<number>;
  containerStyle: ReturnType<typeof useAnimatedStyle>;
}

export const useTapeGestures = ({
  progress,
  item,
  index,
  tapZones = DEFAULT_TAP_ZONES,
  holdDelay = DEFAULT_HOLD_DELAY,
  hideChromeOnHold = true,
  dismissThreshold = DEFAULT_DISMISS_THRESHOLD,
  onNext,
  onPrev,
  onPause,
  onPlay,
  onClose,
  onDoubleTap,
}: GestureOptions): TapeGestures => {
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const translateY = useSharedValue(0);
  const chromeOpacity = useSharedValue(1);
  const isHolding = useSharedValue(false);

  const gesture = useMemo(() => {
    const longPress = Gesture.LongPress()
      .minDuration(holdDelay)
      // Without this, the tiny finger drift during a hold cancels it.
      .maxDistance(10_000)
      .shouldCancelWhenOutside(false)
      .onStart(() => {
        'worklet';
        // Freeze the bar here, on the UI thread. Hopping to JS to set `isPaused` and
        // waiting for an effect would keep the bar filling for a frame or more, which
        // is exactly the lag this design exists to avoid.
        isHolding.value = true;
        cancelAnimation(progress);
        if (hideChromeOnHold) chromeOpacity.value = withTiming(0, { duration: 150 });
        scheduleOnRN(onPause);
      })
      .onFinalize(() => {
        'worklet';
        // onFinalize also fires when the press never became a hold (a quick tap makes
        // it fail). Resuming there would un-pause a deck the consumer paused itself.
        if (!isHolding.value) return;
        isHolding.value = false;
        if (hideChromeOnHold) chromeOpacity.value = withTiming(1, { duration: 150 });
        scheduleOnRN(onPlay);
      });

    const singleTap = Gesture.Tap()
      .maxDistance(20)
      .onEnd((event) => {
        'worklet';
        const zone = resolveTapZone(event.x, width.value, tapZones);
        if (zone === 'prev') scheduleOnRN(onPrev);
        else if (zone === 'next') scheduleOnRN(onNext);
      });

    // Only make the single tap wait for a double tap to fail when there is actually a
    // double-tap handler. Otherwise every next/prev would eat the double-tap timeout.
    const taps = onDoubleTap
      ? Gesture.Exclusive(
          Gesture.Tap()
            .numberOfTaps(2)
            .maxDistance(20)
            .onEnd(() => {
              'worklet';
              if (item) scheduleOnRN(onDoubleTap, item, index);
            }),
          singleTap,
        )
      : singleTap;

    const pan = Gesture.Pan()
      // Claim the gesture only once it is clearly a vertical drag, so a tap or a hold
      // is never stolen by a few pixels of finger noise.
      .activeOffsetY(12)
      .failOffsetX([-24, 24])
      .onUpdate((event) => {
        'worklet';
        translateY.value = rubberBand(event.translationY);
      })
      .onEnd((event) => {
        'worklet';
        if (
          shouldDismiss(event.translationY, event.velocityY, dismissThreshold, DISMISS_VELOCITY)
        ) {
          scheduleOnRN(onClose);
          return;
        }
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      });

    // Long press beats tap. Pan runs alongside both, so you can still drag away to
    // dismiss after a hold has already paused playback.
    return Gesture.Simultaneous(Gesture.Race(longPress, taps), pan);
  }, [
    progress,
    chromeOpacity,
    translateY,
    isHolding,
    width,
    tapZones,
    holdDelay,
    hideChromeOnHold,
    dismissThreshold,
    onNext,
    onPrev,
    onPause,
    onPlay,
    onClose,
    onDoubleTap,
    item,
    index,
  ]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scaleForDismiss(translateY.value, height.value) },
    ],
  }));

  return { gesture, width, height, chromeOpacity, containerStyle };
};
