# ClipCrop testing

ClipCrop has no committed automated test suite. Verification is a combination
of static checks that run in CI-like fashion and browser-driven scenario checks
that were executed during development with Playwright (Chromium on macOS) from
outside the repository. This document describes both so the same verification
can be repeated.

## 1. Static checks

```bash
pnpm install
pnpm typecheck     # tsc --noEmit
pnpm lint          # ESLint (eslint-config-next)
pnpm format:check  # Prettier
pnpm build         # production build (also type-checks and lints)
```

All four must pass before a release. The build must complete with no errors and
the route table must include `/`, `/editor`, `/api/import`,
`/api/imports/[id]/video`, and `/api/health`.

## 2. Browser checks

The editor and API were exercised with one-off Playwright scripts against a
real server. A reproducible procedure:

1. Start the app:
   - production: `pnpm build && pnpm start -p 3200`
   - development (sample fixture): `pnpm dev -p 3100`
2. Drive Chromium with Playwright, using a fixed viewport and
   `--autoplay-policy=no-user-gesture-required` so playback checks are not
   blocked.
3. Assert on DOM state, store state (via UI), video element properties, and
   downloaded files.

Because these scripts live outside the repository, treat the scenario lists
below as the checklist to re-implement rather than an existing suite.

## 3. Import scenarios

| Scenario | Setup | Expected |
| --- | --- | --- |
| Happy path (fake) | `yt-dlp` shim that copies a local MP4 and prints metadata JSON | `200`, editor opens with media, metadata set |
| Happy path (real) | real yt-dlp, public Instagram Reel | `200`, correct duration/dimensions/caption |
| Captionless post | real square Reel without caption | `200`, "No caption" disabled button |
| Private/deleted post | fake yt-dlp exiting with an error | `422 UNSUPPORTED_MEDIA`, readable message |
| Slow extraction | fake yt-dlp sleeping past timeout | `504 TIMEOUT` |
| Missing yt-dlp | server started without yt-dlp on `PATH` | `503 YTDLP_UNAVAILABLE`, form shows message |
| Missing ffprobe | server started without ffprobe on `PATH` | `503 FFPROBE_UNAVAILABLE` |
| Invalid URL | `not-a-url`, `https://example.com/reel/x` | `400 INVALID_URL`, no process spawned |
| Oversized body | > 8 KB JSON | `413 INVALID_REQUEST` |
| Too long / too large | limits set very low via env | `422 VIDEO_TOO_LONG` / `422 VIDEO_TOO_LARGE`, workspace removed |
| Concurrency | two simultaneous imports, limit 1 | second gets `429 IMPORT_BUSY` |

Server-side checks after each failure: the temp workspace is deleted and no
partial import remains.

## 4. Media route scenarios

| Request | Expected |
| --- | --- |
| `GET /api/imports/<id>/video` | `200`, `Accept-Ranges: bytes`, correct `Content-Type`/`Content-Length` |
| `Range: bytes=0-99` | `206`, `Content-Range: bytes 0-99/<size>`, 100 bytes |
| `Range: bytes=-100` | `206`, last 100 bytes |
| `Range: bytes=<size>-` | `416`, `Content-Range: bytes */<size>` |
| Unknown UUID | `404` |
| Malformed id / traversal attempt | `404` |
| `HEAD` | Same headers as `GET`, no body |

## 5. Editor regression scenarios

Run against the development server (sample fixture):

- Import → editor loads media; play/pause works; scrubber tracks frames.
- Drag video: position changes and is clamped at all edges.
- Zoom in/out: 100–300% enforced; zooming out at an edge pulls back inside.
- Reset: position and zoom return to defaults.
- Aspect ratio switch: canvas changes, transform re-clamps, no empty edges.
- Add text: appears centered with defaults; select, drag, clamp at canvas
  edges; delete via button and via `Delete` key.
- Inspector: text content, font, weight, size (24–200), color, alignment, and
  shadow all update the canvas live.
- Keyboard: `Escape` deselects; arrows nudge 1 px; `Shift`+arrows nudge 10 px;
  shortcuts are ignored while typing in inputs; `Delete` ignores modifiers and
  repeats.
- Click background deselects; selection outline aligns with the layer at all
  preview sizes.
- New video: confirm dialog only when dirty; reset returns to `/`.
- `beforeunload` fires only when dirty.

## 6. Export scenarios

- Capability check passes on Chromium; export produces a downloadable
  `edited-video.mp4`.
- Progress is monotonic and the button updates.
- Cancel aborts without downloading and returns to idle.
- Exported file inspection (ffprobe): MP4 container, H.264 video, expected
  dimensions for the selected aspect ratio, expected duration, one video track
  (and audio only when the source has audio).
- Visual parity: an exported frame compared against a screenshot of the
  preview at the same frame; differences limited to codec compression.
- Export disabled while rendering; New video disabled while rendering.

## 7. Production-specific scenarios

Run against `pnpm start`:

- `/editor` with no import shows "No video imported" (sample is never edited).
- `/api/health` returns `200` with tools present and `503` when a required tool
  is missing from `PATH`.
- Security headers present on HTML responses.
- Expired import (TTL passed): media route `404`, editor shows the
  source-unavailable state with a route back to import.
- Direct `/editor` navigation after restart (no store state) shows the empty
  state instead of crashing.

## 8. Responsive viewports

Checked at:

| Viewport | Purpose |
| --- | --- |
| 1440×900 | Desktop layout |
| 834×1112 | Tablet / narrow desktop |
| 390×844 | Phone |
| 320×568 | Small phone |

At each size: no horizontal overflow, toolbar wraps without clipping, canvas
keeps its aspect ratio, drag and selection stay aligned, playback bar remains
usable.

## 9. Known gaps

- No committed automated tests; scenario checks must be re-implemented.
- Browser checks were run on Chromium/macOS only; Safari and Firefox export
  paths are unverified.
- Docker build and runtime are unverified in this environment (no container
  runtime available).
- No load or soak testing beyond the concurrency limiter checks.
