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

| Preset   | Canvas                               |
| -------- | ------------------------------------ |
| Original | Source dimensions (e.g. 720×1280)    |
| 9:16     | 1080×1920                            |
| 4:5      | 1080×1350                            |
| 1:1      | 1080×1080                            |
| 16:9     | 1920×1080                            |
| Free     | Crop pixel dimensions (even-rounded) |

The preview surface always matches the canvas aspect ratio, so what you see is
proportional to what is exported. Changing the preset re-clamps the video
transform and every text layer to the new canvas, and reshapes the crop
rectangle to the new aspect (see below).

## Precise crop

Crop mode is an explicit editing mode, toggled from the Canvas inspector section
("Edit crop" / "Done cropping"):

- While active, the preview shows the **full source video** (contain-fitted,
  frame-synced to the playback position) with a dark mask outside the crop
  rectangle, a bright border, and eight resize handles.
- Drag an edge or corner handle to resize; drag inside the rectangle to move the
  whole crop region. Dragging the mask does nothing; video panning and text
  interaction are disabled while crop mode is active.
- `Escape` exits crop mode (including when a handle has focus).
- A focused handle also resizes with the arrow keys (1% steps, `Shift` = 5%).
- The crop rectangle is stored in normalized source coordinates (0–1), never
  browser pixels, and is clamped to a 5% minimum size and to the source bounds;
  it can never invert or become empty.
- "Reset crop" restores the largest full-frame region for the current aspect
  ratio. "Reset framing" only resets the video transform, and the two controls
  stay independent.

### Crop and output aspect ratio

**What you select in crop mode is exactly what you get in the output.**

- With a fixed preset (Original, 9:16, 4:5, 1:1, 16:9), the crop rectangle is
  locked to that output aspect ratio: resizing any handle keeps the shape, and
  the selected region maps 1:1 onto the canvas. Switching presets reshapes the
  crop to the new aspect, keeping the current center and staying inside the
  previous selection.
- With **Free**, the crop rectangle can be any shape and the output canvas
  adopts the crop region's pixel dimensions. The preview surface switches back
  to the source aspect while cropping so the whole frame stays visible, then
  shows the free-cropped result after "Done cropping".
- Because a locked crop at 100% zoom exactly equals the output frame, there is
  no pan room: reposition by moving the crop box in crop mode, or zoom in
  (100–300%) and drag the video. This guarantees no empty edges can ever be
  exported.
- The video transform still applies on top: `x`/`y` offset the crop region's
  center from the canvas center and `scale` zooms, with bounds derived from the
  crop size.

The same crop feeds the preview and the export through the shared render input
(see [architecture.md](architecture.md#5-editor-coordinate-systems)).

## Video framing

- The video always covers the canvas at minimum: scale `1` means the crop
  region exactly covers the canvas.
- Zoom range: 100%–300%.
- Drag the video directly on the canvas to reposition it when zoomed in;
  panning is clamped so the video always covers the canvas — no empty edges can
  be exported. At 100% there is no pan room (the crop region equals the output
  frame); move the crop box instead.
- "Reset framing" restores position and 100% zoom.
- Clamping is recomputed whenever zoom, crop, or aspect ratio changes, so
  zooming out at an edge pulls the video back inside the canvas.

## Text layers

- "Add text" creates a layer at the canvas center with defaults: text
  "Add your text", 72 px, Geist, bold (700), white, centered, shadow on, 100%
  opacity.
- Drag a text layer on the canvas to move it; click it to select; click the
  background to deselect. Selection shows an outline and the inspector switches
  to that layer's controls.
- Inspector controls: text content, font (Geist, Arial, Georgia, Courier New),
  weight (Regular 400 / Semibold 600 / Bold 700), size (24–200 px), opacity
  (0–100%), color, alignment (left/center/right), and shadow toggle.
- Opacity applies to the whole layer, including its shadow, and is rendered
  identically in the editor and the export.
- Text is clamped so the layer center stays inside the canvas; the text itself
  may extend beyond the canvas edge, matching export behavior.
- Any number of text layers can be added.

## Presets

Presets save the editing configuration — aspect ratio, crop, framing, and text
styling — without any source media, so they can be reused on other videos.

- Save: type a name in the Presets section and click "Save current". Names may
  repeat; every preset has a unique id.
- Apply: select a preset and click "Apply". It replaces the aspect ratio, crop,
  framing, and text layers, selecting the first restored text layer. The
  imported media, caption, and source id are never touched.
- Delete removes only the saved template; it never changes the current document.
- Geometry is stored normalized (positions relative to the canvas, font size
  relative to canvas height), so a preset reproduces the same relative layout
  and typography on sources of different dimensions. Crop is already normalized
  to the source, so it applies proportionally.
- Text content is saved with the preset and restored, then remains fully
  editable.
- Presets live in `localStorage` under `clipcrop.editor-presets.v1` in a
  versioned format. Corrupt or outdated data is ignored safely; presets never
  make the document dirty by themselves.

## Keyboard shortcuts

Active only when a text layer is selected and focus is not in an input, select,
textarea, or contenteditable element:

| Key                    | Action                      |
| ---------------------- | --------------------------- |
| `Delete` / `Backspace` | Delete the selected layer   |
| `Escape`               | Deselect                    |
| Arrow keys             | Nudge 1 composition pixel   |
| `Shift` + arrows       | Nudge 10 composition pixels |

Delete ignores modifier keys and key repeats. Arrow nudges ignore modifier
keys. There are no single-letter shortcuts, so typing in the inspector is
never intercepted.

## Playback

The playback bar is driven by the Remotion Player through an imperative ref:
play/pause, a frame scrubber, elapsed/total time, and frame readout. Playback
state is runtime state, not part of the editor document.

## Downloads and export

All download filenames derive from the media's canonical source identifier: the
Instagram shortcode for imported posts (e.g. `DbhOdVpKygF.mp4`,
`DbhOdVpKygF.txt`, `DbhOdVpKygF.zip`), or `clipcrop-*` fallbacks when no valid
identifier exists. The identifier is sanitized to `[A-Za-z0-9_-]+` before use.

- **Download source** saves the exact fetched video via a direct browser
  download (no re-download through yt-dlp, no render, no JavaScript memory
  copy).
- **Download caption** saves the original caption as `<shortcode>.txt` in
  UTF-8, byte-identical to the import response. With an empty caption the
  button reads "No caption" and is disabled.
- **Export** renders the current document with `@remotion/web-renderer` to an
  MP4 (H.264 video, AAC audio) at the canvas size and source duration, then
  downloads it as `<shortcode>.mp4`.
- **Export ZIP** renders the same video once and packages it with the caption
  into `<shortcode>.zip` containing `<shortcode>.mp4` and `<shortcode>.txt`.
  The caption file is always included, even when empty. Packaging uses
  `client-zip` with no compression (MP4 is already compressed).
- Capability is checked with `canRenderMediaOnWeb` first; unsupported browsers
  get a clear error instead of a broken render.
- Progress is shown on the active export button ("Exporting N%"); while the ZIP
  is assembled the button shows "Packaging…". Cancel aborts the render via
  `AbortSignal`; ZIP packaging itself is not interruptible, so no Cancel button
  is shown during it.
- The export uses the same composition and render input as the preview, so
  crop, framing, and text match what was on screen.
- Export buttons and New video are disabled while an export is running.

## Unsaved edits and leaving

A document counts as dirty when the crop rectangle changed from full-frame, the
aspect ratio changed from Original, the video transform moved/zoomed, or any
text layer exists.

- "New video" asks for confirmation when the document is dirty, then resets
  the editor (including crop and crop mode) and returns to `/`.
- A `beforeunload` handler warns on refresh/close while the document is dirty.
- Selection, playback position, and saving/applying presets are not edits and
  never trigger warnings by themselves.

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
