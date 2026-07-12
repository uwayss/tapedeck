# @uwayss/tapedeck — SPEC

A story-style media player for Expo. Pooled `expo-video` players, worklet-driven progress, and a slot-based UI you can fully replace.

---

## 1. Goals

- **Feel native.** Zero JS-thread work on the hot path. Progress bars, hold-to-pause, and swipe-to-dismiss must never wait on a React render.
- **Full feature parity with Instagram Stories**, not a subset. Hold-to-pause, mute, tap zones, scrub, dismiss gesture, seen-state.
- **Unopinionated chrome.** The consumer owns every pixel of the reply bar, header, and reactions. TapeDeck owns timing, gestures, and the player pool.
- **Drop-in for Huddle**, but useful to anyone shipping a reel/story viewer on Expo.

## 2. Non-goals

- No native module, no config plugin, no prebuild requirement.
- No story _tray_ / rings / avatar row. That's the caller's screen.
- No upload, no capture, no editing.
- No caching layer. `expo-video` handles buffering; caching is the app's problem.
- No web support in v1. RN + Expo only. (Revisit later; don't design against it.)

## 3. Stack

| Concern   | Choice                                                                | Why                                                                                                                                         |
| --------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Video     | `expo-video` (peer)                                                   | Modern replacement for `expo-av` / `react-native-video`. Native surface, imperative player objects, supports multiple simultaneous players. |
| Animation | `react-native-reanimated` v3+ (peer)                                  | Shared values + worklets. Progress never touches JS.                                                                                        |
| Gestures  | `react-native-gesture-handler` v2 (peer)                              | Worklet callbacks (`onBegin`/`onStart`) so hold-to-pause fires on the UI thread.                                                            |
| Images    | `expo-image` (optional peer)                                          | Only if the consumer uses image items. Lazy-required.                                                                                       |
| Language  | TypeScript, `strict: true`                                            |                                                                                                                                             |
| Build     | `react-native-builder-bob`                                            | Emits `module` + `commonjs` + `typescript` + the `react-native` field Metro resolves.                                                       |
| Package   | `@uwayss/tapedeck`, published to npm **and** installable as a git URL |                                                                                                                                             |

**All heavy deps are `peerDependencies`,** not `dependencies`. The lib ships zero runtime deps of its own.

**No native code.** There is no OS-level story-player component worth wrapping. The video surface is already native and gestures already run on the UI thread — an Expo module would add prebuild/autolinking pain for no measurable win, and would break git-URL installs.

---

## 4. Architecture

### 4.1 The three rules (non-negotiable)

Every implementation decision defers to these. If a feature can't be built without breaking one, the feature loses.

1. **Progress is a shared value, never React state.** A segmented progress bar driven by `setState` re-renders the tree 60×/sec. `progress` lives in a `SharedValue<number>` (0→1 for the current item) consumed via `useAnimatedStyle`. React re-renders **only** when the item index changes.
2. **Players are pooled, never remounted.** Mounting a fresh `<VideoView>` per slide costs a decode + first-frame delay on every swipe. Keep exactly 3 players (prev / current / next) and swap sources.
3. **Gestures resolve in worklets.** Hold-to-pause, tap zones, and swipe-to-dismiss handle on the UI thread. Only side effects that must touch the player (`pause()`, `play()`) hop to JS via `runOnJS`.

### 4.2 Player pool

Three `expo-video` players created once at the root, addressed by role:

```
roles: 'prev' | 'current' | 'next'
```

On index change `i → i+1`:

- `next` becomes `current` (already buffered — instant first frame)
- `prev` becomes `next`; call `player.replace(items[i+2].source)` to preload
- old `current` becomes `prev`; `replace(items[i].source)` and `pause()`

Rotate the role map instead of moving sources through slots. `VideoView` instances stay mounted for the whole session; only `player` props swap.

Rules:

- Off-screen players are **paused**, never released.
- `preload` count is configurable (`preloadAhead`, default `1`). Behind is always `1`.
- On mount, seed `current` and `next` in parallel.

### 4.3 Progress: optimistic animation + drift correction

`expo-video` gives no worklet-safe progress callback, and polling `player.currentTime` from JS is exactly the re-render problem we're avoiding.

Approach:

1. When an item becomes current and its player reports `readyToPlay`, start a Reanimated `withTiming(1, { duration, easing: linear })` on `progress`.
2. Subscribe to the player's `statusChange` / `playingChange` events (JS side, low frequency — fires on buffering, stall, end).
3. On stall/buffer → `cancelAnimation(progress)`. On resume → restart timing from the current shared value with the remaining duration.
4. Every ~1s, compare `player.currentTime / duration` against `progress.value`. If drift > 150ms, snap the animation. (Low-frequency correction, not a hot loop.)

For `image` items, the timing animation _is_ the source of truth — no correction needed.

Advance to the next item from the animation's completion callback (`runOnJS(goNext)`), **not** from a `setTimeout`.

Duration source, in order: item's declared `duration` → `player.duration` once `readyToPlay` → fallback `defaultDuration` (5s).

### 4.4 Gesture map

Single `Gesture.Race` / `Gesture.Simultaneous` composition at the viewport.

| Gesture             | Behavior                                                                                                                               | Config                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Tap, left zone      | Previous item (or previous thread at index 0)                                                                                          | `tapZones: { left: 0.3 }`       |
| Tap, right zone     | Next item                                                                                                                              | `tapZones: { right: 0.7 }`      |
| Long press (150ms)  | Pause playback, fade out chrome, freeze progress. Resume on release.                                                                   | `holdDelay`, `hideChromeOnHold` |
| Pan down            | Dismiss. Rubber-band translate + scale, spring back if velocity/distance below threshold, else `onRequestClose()`.                     | `dismissThreshold`              |
| Pan horizontal      | Thread switching (paged). **Phase 2.**                                                                                                 | `onNextThread` / `onPrevThread` |
| Pan on progress bar | Scrub within the current item. **Phase 2.**                                                                                            | `scrubbable`                    |
| Double tap          | Consumer-defined (typically a reaction). Must not conflict with tap zones — `Gesture.Exclusive` with a `requireExternalGestureToFail`. | `onDoubleTap`                   |

Long-press must win over tap; tap must wait for double-tap to fail _only if_ `onDoubleTap` is provided (otherwise tap fires immediately — no 250ms lag on next/prev).

### 4.5 Slot system

Compound components. Every visual piece has a default, and every default can be replaced.

```tsx
<TapeDeck.Root
  items={items}
  initialIndex={0}
  onIndexChange={setIndex}
  onComplete={closeThread}
  onRequestClose={closeThread}
>
  <TapeDeck.Viewport contentFit="cover" />
  <TapeDeck.Progress /> {/* or bring your own, see useTapeDeckProgress */}
  <TapeDeck.Header>
    <MyAvatarRow />
    <TapeDeck.MuteButton /> {/* headless: renders children, wires onPress */}
  </TapeDeck.Header>
  <TapeDeck.Footer>
    <MyLiquidGlassReplyBar /> {/* expo-ui Host + glassEffect, or anything */}
  </TapeDeck.Footer>
</TapeDeck.Root>
```

`Header` and `Footer` are positioned, safe-area-aware, and auto-hidden during hold — but render arbitrary children. They do **not** own the reply input, reaction picker, or avatar. That's the whole point.

### 4.6 Public API

```ts
type TapeItem =
  | {
      id: string;
      type: "video";
      source: VideoSource;
      duration?: number;
      poster?: string;
    }
  | { id: string; type: "image"; source: ImageSource; duration?: number };

interface TapeDeckRootProps {
  items: TapeItem[];
  initialIndex?: number;

  // playback
  muted?: boolean; // controlled
  defaultMuted?: boolean; // uncontrolled
  onMutedChange?: (muted: boolean) => void;
  defaultDuration?: number; // ms, fallback for unknown durations
  preloadAhead?: number; // default 1

  // navigation
  onIndexChange?: (index: number) => void;
  onComplete?: () => void; // ran off the end
  onRequestClose?: () => void; // dismiss gesture or back
  onPrevThread?: () => void; // tap-prev at index 0
  onNextThread?: () => void; // phase 2

  // interaction
  tapZones?: { left: number; right: number };
  holdDelay?: number; // default 150ms
  hideChromeOnHold?: boolean; // default true
  dismissThreshold?: number;
  onDoubleTap?: (item: TapeItem, index: number) => void;
  onItemSeen?: (item: TapeItem, index: number) => void; // fires once, at 50% watched
  scrubbable?: boolean; // phase 2

  children: React.ReactNode;
}
```

Hooks (must be called inside `Root`):

```ts
useTapeDeck(): {
  index: number;
  item: TapeItem;
  isPaused: boolean;
  isMuted: boolean;
  isBuffering: boolean;
  next(): void;
  prev(): void;
  pause(): void;
  play(): void;
  toggleMute(): void;
  seek(ms: number): void;
  close(): void;
}

// For custom progress bars. Returns the raw shared value — never re-renders.
useTapeDeckProgress(): SharedValue<number>;
```

`useTapeDeck()` returns **no** high-frequency values. If a field would update more than a few times per second, it belongs in a shared value, not this object.

---

## 5. Feature checklist

**Must ship in v1 (parity):**

- [ ] Segmented progress bar, one segment per item, correct fill on the active one
- [ ] Tap left / right to navigate
- [ ] Hold to pause + hide chrome, release to resume
- [ ] Mute toggle, persisted across items within a session
- [ ] Swipe down to dismiss, with rubber-band + scale
- [ ] Auto-advance on end, `onComplete` at the end of the list
- [ ] Loading/buffering state (pauses the progress animation, exposes `isBuffering`)
- [ ] Poster/first-frame while buffering — no black flash
- [ ] Safe-area handling
- [ ] Back button (Android) → `onRequestClose`
- [ ] Pause when the app backgrounds / screen loses focus
- [ ] `onItemSeen` for read receipts

**Phase 2:**

- [ ] Scrub by dragging the progress bar
- [ ] Horizontal pan for thread switching (with the cube/depth transform if it's cheap)
- [ ] Reaction burst helper (animated, but consumer-supplied node)
- [ ] Configurable transitions between items

---

## 6. Package structure

```
src/
  core/
    TapeDeckRoot.tsx        # context provider, orchestration
    usePlayerPool.ts        # the 3-player ring
    useProgressEngine.ts    # timing animation + drift correction
    useTapeGestures.ts      # gesture composition (worklets)
    context.ts
    types.ts
  components/
    Viewport.tsx
    Progress.tsx
    Header.tsx
    Footer.tsx
    MuteButton.tsx
  hooks/
    useTapeDeck.ts
    useTapeDeckProgress.ts
  index.ts

example/                    # Expo dev-client app — 3 screens:
                            #   1. default chrome
                            #   2. fully custom (glass reply bar via expo-ui)
                            #   3. mixed image + video items
```

Ship a single entry point. Keep `core/` importable separately (`@uwayss/tapedeck/core`) for people who want the engine with zero components.

---

## 7. Legal / attribution

Two existing libraries are the reference. Both are MIT.

- **Reimplement, do not port.** Read them to understand the problem, then close the tab and write the solution against this spec. Different structure, different names, different approach (they don't pool players or use worklets — you do).
- If any file _is_ derived from theirs, MIT requires the copyright notice and license text be preserved. Note it in `THIRD_PARTY.md` and keep the header in that file.
- Add `THIRD_PARTY.md` regardless, crediting both as prior art. Costs nothing, and it's the correct thing to do.
- License TapeDeck **MIT**.

---

## 8. Repo quality bar

The repo is a portfolio artifact, not just a dependency. A great lib with a bad README reads as generated slop.

- [ ] **README with GIFs.** Screen recordings of hold-to-pause, dismiss, and mute, above the fold. Then install → 20-line usage → props table → recipes (custom reply bar, custom progress, image items).
- [ ] **A working `example/` app.** Reviewers clone and run it. If it doesn't run, nothing else matters.
- [ ] **CI:** GitHub Actions running typecheck, lint, test, build on PR.
- [ ] **Tests:** engine logic (pool rotation, index math, duration resolution, seen-fires-once) under Jest. Skip render tests for the gesture layer — low value, high maintenance.
- [ ] **Changesets** for versioning; publish `@uwayss/tapedeck` to npm as public.
- [ ] Conventional commits, a real CHANGELOG, an issue template.
- [ ] A short **"Why another story player?"** section in the README: pooled players, worklet progress, slot-based chrome. Three bullets. This is the section people read.

---

## 9. Milestones

| #   | Deliverable                                                  | Done when                                                                                 |
| --- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| M0  | Repo scaffold: bob, TS strict, ESLint, CI, empty example app | `npm run checks` passes; example app boots                                                |
| M1  | Player pool + viewport. Manual next/prev via buttons.        | Swiping between 5 videos shows no black frame                                             |
| M2  | Progress engine. Auto-advance.                               | Bar is smooth under a JS-thread stress test (spin a busy loop — the bar must not stutter) |
| M3  | Gestures: tap zones, hold-to-pause, swipe-to-dismiss         | Hold-to-pause feels instant (<1 frame)                                                    |
| M4  | Slots + default chrome + mute. Full v1 API.                  | Example app screen 2 (custom glass reply bar) works                                       |
| M5  | README, GIFs, tests, npm publish                             | `npm i @uwayss/tapedeck` works in a fresh app                                             |
| M6  | Swap into Huddle, delete the old player                      |                                                                                           |

---

## 10. Agent guardrails

For whoever/whatever is implementing this:

- **Never** put playback progress, `currentTime`, or gesture translation in React state.
- **Never** unmount a `VideoView` to change items. Swap the source on a pooled player.
- **Never** use `setTimeout`/`setInterval` for advancing items or driving the bar.
- Reimplement from this spec. Do not copy code from the reference libraries.
- Every heavy import is a `peerDependency`. The lib's own `dependencies` stay empty.
- Minimal comments — comment the _why_ (drift correction, gesture precedence), never the _what_.
- Run `npm run checks` after every milestone. Don't move on with a red build.
- If a feature can't be built without breaking §4.1, stop and flag it instead of working around it.
