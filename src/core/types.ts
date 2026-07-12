import { type ImageSource } from 'expo-image';
import { type VideoSource } from 'expo-video';

export type TapeItemBase = {
  id: string;
  /** Milliseconds. Overrides anything the player reports. */
  duration?: number;
};

export type TapeVideoItem = TapeItemBase & {
  type: 'video';
  source: VideoSource;
  poster?: string;
};

/** Mirrors what `<Image source>` actually accepts — a remote URI string and a
 * `require()`d asset are both far more common than the object form. */
export type TapeImageSource = ImageSource | string | number;

export type TapeImageItem = TapeItemBase & {
  type: 'image';
  source: TapeImageSource;
};

export type TapeItem = TapeVideoItem | TapeImageItem;

export type TapZones = {
  left: number;
  right: number;
};

export interface TapeDeckRootProps {
  items: TapeItem[];
  initialIndex?: number;

  muted?: boolean;
  defaultMuted?: boolean;
  onMutedChange?: (muted: boolean) => void;
  /** Milliseconds. Fallback when neither the item nor the player knows. */
  defaultDuration?: number;
  preloadAhead?: number;

  onIndexChange?: (index: number) => void;
  onComplete?: () => void;
  onRequestClose?: () => void;
  onPrevThread?: () => void;
  onNextThread?: () => void;

  tapZones?: TapZones;
  holdDelay?: number;
  hideChromeOnHold?: boolean;
  dismissThreshold?: number;
  onDoubleTap?: (item: TapeItem, index: number) => void;
  onItemSeen?: (item: TapeItem, index: number) => void;
  scrubbable?: boolean;

  children: React.ReactNode;
}
