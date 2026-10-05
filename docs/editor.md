# ClipCrop editor

This document describes the editor's user-visible behavior and the rules behind
it.

## Entry and empty states

- `/` is the import screen. A successful import stores the media in the editor
  store and navigates to `/editor`.
- `/editor` in **development** loads the synthetic sample fixture
  (`public/sample-video.mp4`) so the editor can be exercised without network
  access.
- `/editor` in **production** never edits the sample. If no imported media is
  present it shows a "No video imported" screen with an Import video button.

## Canvas and aspect ratio

Every composition is rendered on a canvas whose size is derived from the
selected aspect ratio preset:

| Preset | Canvas |
| --- | --- |
| Original | Source dimensions (e.g. 720×1280) |
| 9:16 | 1080×1920 |
| 4:5 | 1080×1350 |
| 1:1 | 1080×1080 |
| 16:9 | 1920×1080 |

The preview surface always matches the canvas aspect ratio, so what you see is
proportional to what is exported. Changing the preset re-clamps the video
transform and every text layer to the new canvas.

## Video framing

- The video always covers the canvas at minimum: scale `1` means the source
  exactly covers the canvas (the smaller dimension fills it, the larger one
  overflows).
- Zoom range: 100%–300%.
- Drag the video directly on the canvas to reposition it. Panning is clamped so
  the video always covers the canvas — no empty edges can be exported.
- "Reset" restores position and 100% zoom.
- Clamping is recomputed whenever zoom or aspect ratio changes, so zooming out
  at an edge pulls the video back inside the canvas.

## Text layers

- "Add text" creates a layer at the canvas center with defaults: text
  "Add your text", 72 px, Geist, bold (700), white, centered, shadow on.
- Drag a text layer on the canvas to move it; click it to select; click the
  background to deselect. Selection shows an outline and the inspector switches
  to that layer's controls.
- Inspector controls: text content, font (Geist, Arial, Georgia, Courier New),
  weight (Regular 400 / Semibold 600 / Bold 700), size (24–200 px), color,
  alignment (left/center/right), and shadow toggle.
- Text is clamped so the layer center stays inside the canvas; the text itself
  may extend beyond the canvas edge, matching export behavior.
- Any number of text layers can be added.

## Keyboard shortcuts

Active only when a text layer is selected and focus is not in an input, select,
textarea, or contenteditable element:

| Key | Action |
| --- | --- |
| `Delete` / `Backspace` | Delete the selected layer |
| `Escape` | Deselect |
| Arrow keys | Nudge 1 composition pixel |
| `Shift` + arrows | Nudge 10 composition pixels |

Delete ignores modifier keys and key repeats. Arrow nudges ignore modifier
keys. There are no single-letter shortcuts, so typing in the inspector is
never intercepted.

## Playback

The playback bar is driven by the Remotion Player through an imperative ref:
play/pause, a frame scrubber, elapsed/total time, and frame readout. Playback
state is runtime state, not part of the editor document.

## Export

- "Export" renders the current document with `@remotion/web-renderer` to an
  MP4 (H.264 video, AAC audio) at the canvas size and source duration, then
  downloads it as `edited-video.mp4`.
- Capability is checked with `canRenderMediaOnWeb` first; unsupported browsers
  get a clear error instead of a broken render.
- Progress is shown in the button ("Exporting N%"); the Cancel button aborts
  the render via `AbortSignal`. After a successful export the button reads
  "Export again".
- The export uses the same composition and render input as the preview, so
  framing and text match what was on screen.
- Export is disabled while rendering; New video is also disabled while
  rendering.

## Caption download

- The import response carries the post caption. "Download caption" saves it as
  `caption.txt` (UTF-8).
- With an empty caption the button reads "No caption" and is disabled.

## Unsaved edits and leaving

A document counts as dirty when the aspect ratio changed from Original, the
video transform moved/zoomed, or any text layer exists.

- "New video" asks for confirmation when the document is dirty, then resets
  the editor and returns to `/`.
- A `beforeunload` handler warns on refresh/close while the document is dirty.
- Selection and playback position are not edits and never trigger warnings.

## Coordinate model (why it feels consistent)

Positions and font sizes are stored in composition pixels and converted to the
preview with a single scale factor. This keeps drag speed, selection outlines,
and export output aligned at every window size and aspect ratio. See
[architecture.md](architecture.md#5-editor-coordinate-systems) for the math.

## Responsive behavior

- Desktop (lg and up): preview and inspector side by side, playback bar fixed
  below, toolbar in a single row.
- Below lg: preview on top, inspector and playback below; the toolbar wraps.
- The canvas scales to the available width while preserving aspect ratio; all
  drag math uses measured preview dimensions, so interaction stays correct at
  any size.
