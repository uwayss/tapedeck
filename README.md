# @uwayss/tapedeck

A story-style media player for Expo. Pooled `expo-video` players, worklet-driven
progress, and a slot-based UI you can fully replace.

> **Status: pre-release.** Scaffold and engine primitives are in. The public
> component API is landing across M1–M5. Not on npm yet.

## Why another story player?

- **Pooled players.** Three `expo-video` players stay alive for the whole
  session and swap sources. A `VideoView` is never unmounted to change items, so
  a swipe never pays a decode + first-frame cost.
- **Worklet progress.** The progress bar is a Reanimated shared value driven on
  the UI thread. A busy JS thread cannot stutter it, because React only
  re-renders when the item index changes.
- **Slot-based chrome.** TapeDeck owns timing, gestures, and the player pool. You
  own every pixel of the header, reply bar, and reactions.

## Install

```sh
npm install @uwayss/tapedeck
```

Peer dependencies (all standard in an Expo SDK 57 app):

```sh
npx expo install expo-video react-native-reanimated react-native-worklets \
  react-native-gesture-handler react-native-safe-area-context
```

`expo-image` is an optional peer, needed only if you use `image` items.

Reanimated 4 requires the worklets Babel plugin, listed **last**:

```js
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
```

## Usage

_Landing in M4._ See [`SPEC.md`](./SPEC.md) §4.5 for the target API.

## Example app

```sh
npm install
cd example
npx expo run:ios   # or: npx expo run:android
```

## Development

```sh
npm run checks   # format, lint, typecheck, cycles, test
npm run build    # react-native-builder-bob
```

## Prior art

See [`THIRD_PARTY.md`](./THIRD_PARTY.md).

## License

MIT
