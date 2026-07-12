import { type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTapeDeckContext } from '../core/context';

export interface ChromeSlotProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Opt out of the safe-area padding if you want to place things yourself. */
  safeArea?: boolean;
  /** Opt out of fading away while the deck is held. */
  hideOnHold?: boolean;
}

/**
 * Header and Footer are positioned, safe-area aware, and fade out during a hold —
 * and render whatever you give them. They deliberately own no reply bar, no avatar,
 * and no reactions (SPEC §4.5).
 */
const ChromeSlot = ({
  children,
  style,
  safeArea = true,
  hideOnHold = true,
  edge,
}: ChromeSlotProps & { edge: 'top' | 'bottom' }) => {
  const { chromeOpacity } = useTapeDeckContext();
  const insets = useSafeAreaInsets();

  const fade = useAnimatedStyle(() => ({
    opacity: hideOnHold ? chromeOpacity.value : 1,
  }));

  const padding = safeArea
    ? edge === 'top'
      ? { paddingTop: insets.top }
      : { paddingBottom: insets.bottom }
    : null;

  return (
    <Animated.View
      style={[styles.base, edge === 'top' ? styles.top : styles.bottom, padding, fade, style]}
      pointerEvents="box-none">
      {children}
    </Animated.View>
  );
};

export const Header = (props: ChromeSlotProps) => <ChromeSlot {...props} edge="top" />;

export const Footer = (props: ChromeSlotProps) => <ChromeSlot {...props} edge="bottom" />;

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  top: { top: 0 },
  bottom: { bottom: 0 },
});
