import { type ReactNode } from 'react';
import { Pressable, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useTapeDeckContext } from '../core/context';

export interface MuteButtonProps {
  /** Given the current state, render whatever you like. Falls back to a plain glyph. */
  children?: ReactNode | ((state: { isMuted: boolean }) => ReactNode);
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
}

/** Headless: it owns the press and the state, you own the pixels (SPEC §4.5). */
export const MuteButton = ({ children, style, hitSlop = 12 }: MuteButtonProps) => {
  const { isMuted, toggleMute } = useTapeDeckContext();

  return (
    <Pressable onPress={toggleMute} style={style} hitSlop={hitSlop} accessibilityRole="button">
      {typeof children === 'function' ? (
        children({ isMuted })
      ) : children !== undefined ? (
        children
      ) : (
        <Text style={styles.glyph}>{isMuted ? '🔇' : '🔊'}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  glyph: { fontSize: 20 },
});
