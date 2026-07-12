import { type TapeItem } from '@uwayss/tapedeck';

const BUCKET = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample';
const POSTER = `${BUCKET}/images`;

export const VIDEO_ITEMS: TapeItem[] = [
  {
    id: 'bunny',
    type: 'video',
    source: `${BUCKET}/BigBuckBunny.mp4`,
    poster: `${POSTER}/BigBuckBunny.jpg`,
  },
  {
    id: 'elephants',
    type: 'video',
    source: `${BUCKET}/ElephantsDream.mp4`,
    poster: `${POSTER}/ElephantsDream.jpg`,
  },
  {
    id: 'blazes',
    type: 'video',
    source: `${BUCKET}/ForBiggerBlazes.mp4`,
    poster: `${POSTER}/ForBiggerBlazes.jpg`,
  },
  {
    id: 'escapes',
    type: 'video',
    source: `${BUCKET}/ForBiggerEscapes.mp4`,
    poster: `${POSTER}/ForBiggerEscapes.jpg`,
  },
  {
    id: 'joyrides',
    type: 'video',
    source: `${BUCKET}/ForBiggerJoyrides.mp4`,
    poster: `${POSTER}/ForBiggerJoyrides.jpg`,
  },
];

/** Images hold for their declared duration; videos run for as long as they run. */
export const MIXED_ITEMS: TapeItem[] = [
  { id: 'img-1', type: 'image', source: 'https://picsum.photos/id/1015/1080/1920', duration: 3000 },
  { id: 'bunny', type: 'video', source: `${BUCKET}/BigBuckBunny.mp4`, duration: 6000 },
  { id: 'img-2', type: 'image', source: 'https://picsum.photos/id/1025/1080/1920', duration: 2000 },
  { id: 'blazes', type: 'video', source: `${BUCKET}/ForBiggerBlazes.mp4` },
  { id: 'img-3', type: 'image', source: 'https://picsum.photos/id/1039/1080/1920' },
];
