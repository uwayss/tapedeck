# Third-party / prior art

TapeDeck contains **no code** from any other project. Every file here was written
against `SPEC.md`. This file exists to credit the libraries that mapped out the
problem space first.

## Prior art

- **[@birdwingo/react-native-instagram-stories](https://github.com/birdwingo/react-native-instagram-stories)** — MIT
- **[react-native-story-view](https://github.com/SimformSolutionsPvtLtd/react-native-story-view)** (Simform Solutions) — MIT

Both are worth your time if you're building in this space. TapeDeck deliberately
diverges from them on three points:

1. **Pooled players.** They mount and unmount a video component per slide.
   TapeDeck keeps exactly three `expo-video` players alive for the session and
   swaps sources on them, so a swipe never pays a decode + first-frame cost.
2. **Worklet-driven progress.** They advance the progress bar from JS timers and
   React state. TapeDeck drives it from a Reanimated shared value on the UI
   thread, so a busy JS thread cannot stutter the bar.
3. **Slot-based chrome.** They own the header/reply/reaction UI. TapeDeck owns
   timing, gestures, and the pool — and hands every pixel of chrome to you.

None of the above is a criticism; those libraries predate `expo-video` and
Reanimated worklets being the obvious tools for the job.

## If a file ever _is_ derived

MIT requires the copyright notice and license text be preserved. If any file in
this repo ever becomes a derivative of the above, it gets the original copyright
header and is listed here explicitly. As of now, none is.
