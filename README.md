# Gradient Generator

A browser-based studio for moving gradients, still colour studies, and retro patterns. The artwork fills the viewport, with floating controls for color, light, shape, and motion. Built with React 19, Tailwind CSS 4, TypeScript 7, and Vite 8.

## Create

- 46 curated presets across Flow, Mesh, Still, Retro, Patterns, Light sheets, Aurora, Halos, Edge light, and Silk.
- Flow has its own liquid distortion renderer. Still offers linear, radial, and conic gradients; Retro offers waves, arches, and sunbursts; Patterns offers checks, dots, and stripes. Still, Retro, and Patterns remain static in both the editor and HTML exports.
- A shared WebGL renderer produces broad light fields, fluid meshes, and lit folds. Six-color palettes blend in OKLab, with fine grain to soften banding.
- Adjust the palette, angle, position, diffusion, spread, curvature, detail, motion, and grain. Drag or keyboard-nudge the on-canvas position and rotation handles.
- Pause motion, frame the artwork to its export ratio, preview headline text, or hide the controls for a clean view.
- Search, filter, favorite, undo, redo, and restore your latest draft. Data stays in this browser's local storage; there is no account or cloud sync.
- Reduced-motion preferences start the artwork paused. WebGL is required for procedural rendering; a labeled static fallback is shown if graphics acceleration is unavailable.

## Export

- **PNG:** capture the current frame at widths up to 3840 pixels.
- **HTML:** a self-contained WebGL background (animated for moving styles, static for still styles) using the exact same shader, with no external libraries. It respects reduced-motion preferences.
- **CSS / Tailwind v4:** a captured PNG frame embedded as a background image.
- **SVG:** a still-frame PNG inside an SVG container; procedural artwork is not converted into editable vector paths.
- **JSON:** the editable document parameters for external use. The studio restores its local draft but does not import JSON files.

Exports freeze the current animation phase. The frame toggle previews the selected export aspect ratio; the default immersive view adapts to the viewport. Preview headline text is not exported. The earlier layered renderer remains available internally for legacy documents; its SVG exports retain native vectors. Earlier v1 drafts remain stored separately from the current v2 draft.

## Run locally

Requires Node.js 22.12 or newer.

```bash
npm ci
npm run dev
```

Vite starts at `http://localhost:8080` and chooses the next available port when occupied. For a production build:

```bash
npm run build
npm run preview
```

## Validate

```bash
npm run lint
npm test
npm run build
npm audit
npm outdated
```

The build includes TypeScript validation. Tests cover preset validity, color/parameter sanitization, standalone HTML generation, legacy SVG behavior, dimensions, storage failures, and gesture-aware undo/redo. GPU rendering and downloaded exports are additionally checked in a browser.

The typography plugin's selector parser is overridden to a patched 7.x release because its current package still pins an affected 6.x version. Remove that override when the upstream dependency is updated.
