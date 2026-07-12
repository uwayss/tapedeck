import { type TapeItem } from '@uwayss/tapedeck';

const BUCKET = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample';

export const VIDEO_ITEMS: TapeItem[] = [
  { id: 'bunny', type: 'video', source: `${BUCKET}/BigBuckBunny.mp4` },
  { id: 'elephants', type: 'video', source: `${BUCKET}/ElephantsDream.mp4` },
  { id: 'blazes', type: 'video', source: `${BUCKET}/ForBiggerBlazes.mp4` },
  { id: 'escapes', type: 'video', source: `${BUCKET}/ForBiggerEscapes.mp4` },
  { id: 'joyrides', type: 'video', source: `${BUCKET}/ForBiggerJoyrides.mp4` },
];
