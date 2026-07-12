import { createElement, type ComponentType } from 'react';
import { Image as RNImage, type ImageProps as RNImageProps } from 'react-native';

export type AnyImageProps = Omit<RNImageProps, 'source'> & {
  source: unknown;
  contentFit?: string;
  transition?: number;
  /** The image layers sit over the gesture surface and must never swallow a touch. */
  pointerEvents?: 'none' | 'auto' | 'box-none' | 'box-only';
};

let cached: ComponentType<AnyImageProps> | null = null;

/**
 * expo-image is an optional peer (SPEC §3): only consumers with image items need it.
 * A static import would make Metro fail to resolve it for everyone else, so it is
 * required lazily, falling back to React Native's own Image — which covers the
 * uri-string and required-asset sources that most image items use.
 */
const resolveImageComponent = (): ComponentType<AnyImageProps> => {
  if (cached) return cached;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const expoImage = require('expo-image') as { Image: ComponentType<AnyImageProps> };
    cached = expoImage.Image;
  } catch {
    cached = RNImage as unknown as ComponentType<AnyImageProps>;
  }

  return cached;
};

/** The resolved component is cached at module scope — this does not create one per render. */
export const TapeImage = (props: AnyImageProps) => createElement(resolveImageComponent(), props);
