# Decisions

Findings recorded at scaffold time so we don't drift back to stale assumptions.
Verified against live docs + npm on 2026-07-12, not from memory.

## Target: Expo SDK 57

`expo@57.0.4` is `latest`. Its `bundledNativeModules.json` pins:

| Package                          | SDK 57 pin | npm latest | We use                       |
| -------------------------------- | ---------- | ---------- | ---------------------------- |
| `react-native`                   | `0.86.0`   | —          | 0.86.0                       |
| `react`                          | `19.2.3`   | —          | 19.2.3                       |
| `expo-video`                     | `~57.0.0`  | 57.0.0     | peer `>=57.0.0`              |
| `react-native-reanimated`        | `4.5.0`    | 4.5.1      | peer `>=4.0.0`               |
| `react-native-worklets`          | `0.10.0`   | 0.10.2     | peer `>=0.10.0`              |
| `react-native-gesture-handler`   | `~2.32.0`  | 3.0.2      | peer `>=2.28.0` (SDK pin: 2) |
| `expo-image`                     | `~57.0.0`  | 57.0.0     | optional peer                |
| `react-native-safe-area-context` | `~5.7.0`   | 5.8.0      | peer `>=5.0.0`               |

Gesture Handler v3 exists on npm but SDK 57 pins v2.32. We target the SDK pin.
The v2 gesture-composition API (`Gesture.Race` / `Exclusive` / `Simultaneous`,
`.requireExternalGestureToFail()`) is what §4.4 is written against.

## Reanimated 4 — the big one

Reanimated 4 split worklets into a **separate package**, `react-native-worklets`.
Consequences:

- Babel plugin is **`react-native-worklets/plugin`**, not `react-native-reanimated/plugin`.
  It must be listed **last**. The Reanimated docs claim Expo's template includes
  it by default — for SDK 57's `blank-typescript` template that is **false**, and
  `babel-preset-expo` does not add it either. See "Example app" below.
- `runOnJS` → **`scheduleOnRN`**, imported from `react-native-worklets`.
  Arguments are passed directly, not curried:
  `runOnJS(fn)(a, b)` becomes `scheduleOnRN(fn, a, b)`.
- `runOnUI` → `scheduleOnUI`, `executeOnUIRuntimeSync` → `runOnUISync`.
- `useSharedValue` / `useAnimatedStyle` / `withTiming` / `cancelAnimation` are
  unchanged and still come from `react-native-reanimated`.
- Reanimated 4 also adds a CSS-style animation API. We don't need it; the
  imperative shared-value API is what §4.1 requires.

`react-native-worklets` is therefore a **peer dependency** of this library, since
we call `scheduleOnRN` directly. It is not an optional extra — Reanimated 4 does
not work without it.

## expo-video — API facts that shape the design

- **Time is in SECONDS, not milliseconds.** `player.currentTime` and
  `player.duration` are floats in seconds. Our public API (`duration`,
  `defaultDuration`, `seek(ms)`) is in **milliseconds** per SPEC §4.6, so the
  engine converts at the player boundary. This is a real footgun; keep the
  conversion in one place.
- `createVideoPlayer(source, options?)` creates a player **outside** React. We
  need this for the pool: `useVideoPlayer` ties a player's lifetime to a
  component, and we want exactly 3 players owned by Root. With
  `createVideoPlayer` **we own `release()`** — Root must release all 3 on unmount
  or we leak native decoders.
- **Use `replaceAsync`, not `replace`.** `replace()` loads the asset synchronously
  on the iOS main thread (it warns at runtime, and is documented as
  deprecated-in-future). `replaceAsync` offloads the load; on Android and Web it's
  equivalent. Swapping the source on a live player is the whole basis of the pool
  (§4.2) — no `<VideoView>` ever unmounts.

  Going async opens two races, which `core/pooledPlayer.ts` exists to close:
  a slow load landing _after_ a newer one and leaving a slot on a stale source,
  and `play()` firing while a load is still in flight, which would start the
  _previous_ asset. Every replace takes a token; stale ones are dropped, and
  playback/seeks queue behind the load they belong to. Pause applies immediately
  as well as queued — stopping audio must never wait on the network.

- Events (via `useEventListener` from the `expo` package, or
  `player.addListener`):
  - `statusChange` → `{ status, error?, oldStatus? }`,
    `status: 'idle' | 'loading' | 'readyToPlay' | 'error'`
  - `playingChange` → `{ isPlaying, oldIsPlaying? }`
  - `playToEnd` → no payload
  - `timeUpdate` → `{ currentTime, bufferedPosition, ... }`
  - `sourceChange`, `mutedChange`, `volumeChange`, `playbackRateChange`
- `timeUpdate` exists but fires on the JS thread. We use it **only** for §4.3
  drift correction (writing straight into a shared value, zero setState), never
  to drive the bar.
- **Android limitation:** mounting multiple `VideoView`s bound to the _same_
  `VideoPlayer` does not work. Our pool is 3 players ↔ 3 views, 1:1, so we're
  fine — but it forbids ever pointing two views at one player.

## Tooling

Flat config (`eslint.config.mjs`) only; `.eslintrc` is dead. Things that bit us,
recorded so we don't re-litigate them:

- **ESLint 9, not 10.** `eslint-plugin-react@7.37.5` still caps its peer at
  `^9.7`. ESLint 10 is out but unusable until that plugin catches up. SPEC
  requires `eslint-plugin-react`, so ESLint wins the downgrade.
- **`@eslint/js` must match ESLint's major** (9.x here, not the 10.x `latest`).
- **`eslint-plugin-react-hooks@7`**: the flat configs live under
  `configs.flat['recommended-latest']`. Plain `configs['recommended-latest']` is
  the **eslintrc** one and throws "plugins key defined as an array of strings"
  under flat config. v7 also bundles the React Compiler rules, and ships
  `exhaustive-deps` as `warn` — we force both it and `rules-of-hooks` to `error`.
- **TypeScript is pinned to `~5.9.3` via a root `overrides`.** Expo SDK 57's
  toolchain (`@expo/require-utils`) happily pulls TS 6, but `madge@8` caps its
  peer at `^5.4.4`, and `typescript-eslint@8` at `<6.1.0`. 5.9.3 is the one
  version every consumer accepts. Remove the override only when madge supports
  TS 6.
- **TS 6 requires an explicit `rootDir`** (error TS5011). It's set, so the
  tsconfig survives a future TS 6 bump.
- `react-native-builder-bob` 0.43 with `esm: true` emits types to
  `lib/typescript/{module,commonjs}/` — _not_ `lib/typescript/src/`. The
  `exports` map must use nested `import.types` / `require.types`; bob errors if
  `types` sits next to `import`/`require`.
- Node 24 / npm 11 locally; CI runs Node 20 + 22.

## Example app

- **`babel-preset-expo` does NOT include the worklets plugin**, and the
  `blank-typescript` template ships no `babel.config.js` at all. We add one with
  `react-native-worklets/plugin` last. Verified by exporting a bundle with
  `--no-bytecode` and grepping for `__workletHash` — without the plugin, worklets
  fail silently at runtime, which is a miserable way to find out.
- `babel-preset-expo` must be an explicit devDependency of `example`: npm nests
  it under `node_modules/expo/node_modules/`, where a hand-written
  `babel.config.js` cannot resolve it.
- Metro keeps **hierarchical lookup ON**. npm nests some of Expo's own deps
  (`expo-asset`) inside `node_modules/expo/node_modules/`, which
  `disableHierarchicalLookup = true` (the usual monorepo advice) makes invisible.

## Progress engine (§4.3)

- `VideoPlayer extends SharedObject`, so `player.addListener(event, cb)` works
  directly and returns a subscription with `.remove()`. We do **not** need `expo`
  itself as a peer for `useEvent`/`useEventListener`.
- Drift correction rides the `timeUpdate` event, whose frequency is set by
  `player.timeUpdateEventInterval` (**seconds**). We set it to 1 while an item is
  current and back to 0 when it isn't, so no player emits time we don't read.
- Player status is read with `useSyncExternalStore`, not `useState` + an effect.
  The pool re-points `current` at a different player on every index change, and
  `useSyncExternalStore`'s snapshot re-reads `player.status` for whichever player
  is current — with `useState` we'd need a `setState` in an effect, which
  `react-hooks/set-state-in-effect` (correctly) forbids.
- `runOnJS` **is** still exported by Reanimated 4 (closes the open item below),
  but `scheduleOnRN` from `react-native-worklets` is the documented path and is
  what we use.

### `react-hooks/immutability` is off, deliberately

`eslint-plugin-react-hooks@7` bundles the React Compiler rules. `immutability`
forbids mutating anything reached through a hook argument — which is precisely
what Reanimated shared values (`progress.value = withTiming(...)`) and expo-video
players (`player.timeUpdateEventInterval = 1`) exist for. Those mutations are how
progress stays off the JS thread; the rule cannot tell them apart from an
accidental prop mutation, and this library is built out of them.

`rules-of-hooks` and `exhaustive-deps` remain **errors** per the brief, and
`refs`, `purity`, and `set-state-in-effect` stay on — they caught two real bugs
here (a ref written during render, and a would-be `setState` in an effect).
