# ClipCrop architecture

This document describes the architecture as implemented. It intentionally omits
future plans.

## 1. High-level system

```
Instagram URL
    │
    ▼
POST /api/import                     (Node runtime route handler)
    ├─ validate Instagram URL
    ├─ check tool availability (yt-dlp, ffprobe; cached per process)
    ├─ acquire a per-instance concurrency permit
    ├─ create .tmp/imports/<uuid>/
    ├─ yt-dlp download + metadata JSON
    ├─ ffprobe duration/dimensions + file size
    ├─ enforce duration and size limits
    └─ write metadata.json, return media + caption
    │
    ▼
GET /api/imports/<id>/video          (Range-capable streaming)
    │
    ▼
Browser
    ├─ Zustand store: setMedia(media, metadata)
    ├─ router.push("/editor")
    ├─ Remotion Player renders ClipComposition
    ├─ @remotion/web-renderer renders the same composition for export
    ├─ client-zip packages the rendered blob with the caption
    └─ downloads <shortcode>.mp4 / <shortcode>.zip / <shortcode>.txt
```

## 2. Client state architecture

The editor separates document state from runtime mechanics.

**Zustand store** (`src/store/editor-store.ts`) — the canonical editor document:

- `media` (`kind`, `src`, `caption`, optional `originalUrl`)
- `sourceMetadata` (duration, width, height)
- `aspectRatio`
- `videoTransform` (`x`, `y`, `scale`)
- `textLayers`
- `selectedTextLayerId` (UI state kept in the same store, outside the
  renderable document)

Actions are named and immutable: `setMedia`, `loadSourceMetadata`,
`setSourceMetadata`, `setAspectRatio`, `setVideoTransform`, `setVideoScale`,
`resetVideoTransform`, `addTextLayer`, `updateTextLayer`, `deleteTextLayer`,
`selectTextLayer`, `resetEditor`. Geometry is clamped inside the actions using
the shared helpers in `src/lib/editor.ts`.

**Local runtime state** (not in the store):

- `PlayerRef` (imperative Remotion handle) — owned by `EditorShell`
- Preview surface measurements (ResizeObserver) and pointer drag sessions
- Playback frame/play state in `PlaybackBar`, synchronized from Player events
- Export status/progress/error in `useVideoExport`
- Source-availability check in `PreviewPanel`

Selectors (`src/store/editor-selectors.ts`) keep subscriptions scoped:
`selectEditorDocument` (shallow-compared), `selectSelectedTextLayer`,
`selectHasTextLayers`, `selectClampedVideoScale`, `selectDurationInFrames`,
`selectIsDocumentDirty`.

## 3. Media ingestion

`POST /api/import` performs, in order:

1. **Request validation** — body limited to 8 KB, must be a JSON object with a
   string `url` of at most 2048 characters.
2. **URL validation** — `validateInstagramUrl` parses the URL, allows only
   `instagram.com`/`www.instagram.com` over http/https with `/reel/`,
   `/reels/`, or `/p/` paths, and normalizes to
   `https://www.instagram.com/<type>/<shortcode>/`.
3. **Tool checks** — `getToolAvailability()` runs `yt-dlp --version` and
   `ffprobe -version` once per process and caches the result.
4. **Concurrency** — `tryAcquireImportSlot()` allows up to
   `CLIPCROP_MAX_CONCURRENT_IMPORTS` (default 2) in-flight imports per process;
   otherwise `429 IMPORT_BUSY`. The permit is released in a `finally`.
5. **Workspace** — a UUID directory under `.tmp/imports` is created after stale
   cleanup.
6. **Extraction** — `extractInstagramMedia` runs yt-dlp with a fixed argument
   list (no shell), writes `video.info.json`, prefers browser-compatible H.264
   formats, and finds the downloaded media file.
7. **Metadata** — ffprobe provides duration/dimensions; the downloaded file
   size is read with `fs.stat`.
8. **Limits** — duration and size are enforced; violations delete the workspace
   and return `422`.
9. **Response** — `metadata.json` is written and the API returns the import id,
   media source (`kind: "imported"`), caption, and metadata.

Failures always delete the workspace and return structured, user-readable
errors. yt-dlp stderr is classified into `UNSUPPORTED_MEDIA`,
`EXTRACTION_FAILED`, or `TIMEOUT`.

## 4. Temp storage

```
.tmp/imports/<uuid>/
  video.mp4            downloaded media (extension varies)
  video.info.json      raw yt-dlp metadata
  metadata.json        sourceUrl, caption, title, duration, size, filename, createdAt
```

- Directory is gitignored.
- Only UUID-named directories are considered by cleanup.
- `resolveImportedVideoPath` validates the id, re-validates the stored filename
  (basename, no `..`), and checks the resolved path stays inside the workspace.
- Cleanup runs before each new import and removes directories older than
  `CLIPCROP_IMPORT_TTL_HOURS` (default 6). The active workspace is created after
  cleanup, so it can never be removed by the same request.
- Cleanup failures are ignored per entry so imports never fail because of them.
- Local temp storage is not durable across instances; see section 8.

## 5. Editor coordinate systems

All persisted positions use **composition pixels**, independent of the rendered
preview size. The crop rectangle is the one exception: it is stored in
normalized source coordinates (0–1), because it describes a region of the
source rather than a position on the canvas.

**Crop** (`CropRect`): `x`/`y`/`width`/`height` are fractions of the source
dimensions, clamped so the rect stays inside the source with a 5% minimum per
dimension and never inverts. With a fixed output preset the crop is additionally
constrained so its pixel aspect equals the canvas aspect
(`normalizeCropRectToAspect` on every update, `resizeCropRect` with a
constraint during drags), which makes the selected region map exactly onto the
canvas. With the `"free"` preset the crop is unconstrained and the canvas is
derived from it: `getCanvasSize("free", source, crop)` returns the crop's pixel
dimensions, rounded to even numbers for H.264.

**Video** (`VideoTransform`): `x`/`y` are the offset of the **crop region's
center** from the canvas center; `scale` is a multiplier on the cover baseline
of the crop region (`1` = the crop region exactly covers the canvas).

```
cropWidth     = sourceWidth * crop.width        (same for height)
coverScale    = max(canvasWidth / cropWidth, canvasHeight / cropHeight)
renderedWidth = cropWidth * coverScale * scale
maxX          = max(0, (renderedWidth - canvasWidth) / 2)
x ∈ [-maxX, maxX]   (same for y)
```

The full video element is positioned so that the crop region lands at
`canvasCenter + (x, y)`:

```
renderedScale = coverScale * scale
videoCenter   = canvasCenter + (x, y)
                - (cropCenter - sourceCenter) * renderedScale
videoSize     = sourceSize * renderedScale
```

At the default crop rect this reduces exactly to the pre-crop behavior. When
the crop is locked to the canvas aspect and `scale = 1`, `renderedCropSize`
equals the canvas, so the pan bounds are zero: the crop region is exactly the
output frame and panning only becomes possible after zooming in.

**Text layers**: `x`/`y` are the offset of the layer center from the canvas
center in composition pixels; `fontSize` is in composition pixels. Layers are
clamped so their center stays inside the canvas.

**Preview conversion**: the preview surface always matches the canvas aspect
ratio, so drag deltas convert as
`deltaComposition = deltaClient * (canvasWidth / previewWidth)`. The text
interaction overlay renders a composition-sized container scaled by
`previewScale = previewWidth / canvasWidth`, which makes hit targets and
selection outlines line up with the composition exactly. Crop mode instead maps
the source into the preview's contain box: the overlay computes the box from the
surface and source aspect ratios and places the crop rectangle at
`boxOrigin + crop * boxSize`.

## 6. Remotion rendering

- `createClipRenderInput(document)` (`src/remotion/clip-render-input.ts`) is the
  single deterministic boundary: it clamps the crop rect, the transform (against
  the cropped source size), and text layers, and returns
  `{ src, sourceWidth, sourceHeight, cropRect, transform, textLayers }`.
- `ClipComposition` (`src/remotion/compositions/clip-composition.tsx`) renders
  the video through `getClipVideoLayout` (section 5) plus text layers using
  `@remotion/media`'s `<Video>` (required for the web renderer; the classic
  `remotion` `<Video>` is unsupported).
- The **Player** in `PreviewPanel` consumes the render input for the editor
  preview.
- `createExportConfiguration(document)` (`src/remotion/export-config.ts`) adds
  `width`, `height`, `fps`, and `durationInFrames` for export.
- **Export** calls `canRenderMediaOnWeb` then `renderMediaOnWeb` with the same
  composition and render input, encoding MP4 (H.264/AAC) via WebCodecs, with
  real progress and `AbortSignal` cancellation. The resulting blob downloads as
  `<sourceId>.mp4`, or is packaged with the caption into `<sourceId>.zip` using
  `client-zip` (stored, uncompressed, streamed from the blob).
- Preview and export share the composition and render input, so crop, framing,
  typography, and text positions are identical; parity was verified with
  exported-frame comparisons (SSIM ≈ 0.94 full-frame; ≈ 0.86 for a
  crop+zoom+pan+text frame, where the loss is H.264 chroma subsampling and
  preview downscaling rather than geometry).

## 7. Security boundaries

- **Client**: never constructs shell commands, never sees filesystem paths, and
  only receives import ids and `/api/...` URLs. Exports are produced and
  downloaded entirely in the browser.
- **Server**: validates every request, enforces limits, and maps failures to
  structured error codes. No raw exceptions, paths, or command output are
  returned.
- **Child process**: yt-dlp and ffprobe are spawned with fixed argument arrays,
  `shell: false`, timeouts, and process-group kills; user input only appears as
  a validated URL argument.
- **Filesystem**: all file access is derived from validated UUIDs and
  metadata-validated basenames inside `.tmp/imports`.
- **External Instagram**: only public content; no cookies, credentials, or
  login automation.

## 8. Deployment assumptions

- Node.js runtime for all API routes (no Edge runtime).
- `yt-dlp` and `ffprobe` installed and on `PATH`; `ffmpeg` recommended.
- Writable local filesystem with enough space for the configured size limit and
  TTL.
- Long-lived Node process (in-process tool cache and concurrency limiter assume
  a persistent instance; state is not shared across replicas).
- HTTP streaming with Range support between the browser and the server.

Suitable hosts are VPSs, Docker hosts, and persistent Node container
platforms. Ephemeral serverless platforms are not supported without moving
media storage to a shared service and installing the binaries another way.
