# PixelLensToggle

Interactive tactile day/night pill switch housing a procedural `175 × 91` pixel-art world refracted through a draggable convex glass lens.

## Features

- **Procedural Pixel-Art World (`sceneRenderer.ts` + `sprites.ts`)**: Banded sky using 4×4 Bayer ordered dithering, drifting clouds, distant hills, swaying wildflowers, cottage with clapboard siding and shutters, multi-lobed tree with autumn dusk transition, and an animated character (typing under the tree at day, startled `!` on quick click, walking along the path on slow dusk scrub, peeking from the morning window on return).
- **Bayer 4×4 Ordered Dither Transitions (`dither.ts`)**: Day → Dusk (saturated orange sky band + autumn tree) → Night (twinkling stars, rising moon, lit yellow window + dithered ground light pool), and Night → Dawn grey intermediate → sunrise flash → Day.
- **Real-time Convex Lens Refraction (`lensRenderer.ts`)**: Barrel fisheye magnification (`~1.28×` center), rim chromatic aberration, specular crescent highlights, night amber rim bounce from the lit house window, and velocity-based liquid horizontal stretch.
- **Zero-dependency Spring + Drag Physics (`physics.ts`)**: Click (`Space`/`Enter`/tap), press-and-drag dusk scrubbing with snap threshold at `p = 0.5`, rubber-band edge elasticity, and `prefers-reduced-motion` crossfade support. Zero React re-renders during animation frames.

## Usage

```tsx
import { PixelLensToggle, getPageBgColor } from "./components/PixelLensToggle";

<PixelLensToggle
  checked={isDark}
  onChange={setIsDark}
  onProgress={(_, bgColor) => {
    containerRef.current.style.backgroundColor = bgColor;
  }}
  size={736}
/>
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `checked` | `boolean` | — | Controlled night state (`false` = day, `true` = night). |
| `defaultChecked` | `boolean` | `false` | Initial state when uncontrolled. |
| `onChange` | `(isNight: boolean) => void` | — | Fired when a click, drag release, or keypress commits a new state. |
| `onProgress` | `(p: number, pageBgColor: string) => void` | — | Fired each animation frame with continuous progress `[0..1]` and synced page background color. |
| `size` | `number` | `736` | Width in CSS pixels; height (`size / 1.84`) and internal geometry scale proportionally. |
| `ariaLabel` | `string` | `"Toggle day and night world"` | Screen-reader label for `role="switch"`. |
| `className` | `string` | `""` | Optional extra class name on the outer pill shell. |
