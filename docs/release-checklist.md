# ClipCrop release checklist

Repeat this procedure before publishing a release. Items marked **unverified**
have not been executed in this environment and must be completed by the
releaser.

## 0. Preconditions

- [ ] Node.js 20.9+ and the pinned pnpm version installed
- [ ] `yt-dlp`, `ffprobe` on `PATH` (`ffmpeg` recommended)
- [ ] For Docker verification: a container runtime with network access

## 1. Static validation

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm format:check`
- [ ] `pnpm build` — route table contains `/`, `/editor`, `/api/import`,
      `/api/imports/[id]/video`, `/api/health`

## 2. Secrets and repository hygiene

- [ ] No `.env*` files, credentials, API keys, or tokens tracked
- [ ] No absolute developer paths in tracked files
- [ ] `git status` clean; `.tmp/`, `.next/`, `node_modules/` ignored
- [ ] Commit history is focused; no stray artifacts

## 3. Production smoke

Start `pnpm start` on a spare port with the real tools on `PATH`:

- [ ] `GET /api/health` → `200`, `{"status":"ok"}`
- [ ] Security headers present: `X-Content-Type-Options: nosniff`,
      `Referrer-Policy: strict-origin-when-cross-origin`,
      `X-Frame-Options: DENY`
- [ ] `/editor` directly → "No video imported" empty state (sample guard)
- [ ] Import a public Reel → editor loads, metadata correct, caption enabled
- [ ] Delete the import workspace, reload → "Source video is no longer
      available" overlay with a working Import video button
- [ ] `GET /api/imports/<id>/video` → `200` with `Accept-Ranges: bytes`
- [ ] `Range: bytes=0-99` → `206` with correct `Content-Range`
- [ ] `Range: bytes=-100` → `206` last 100 bytes
- [ ] `Range: bytes=<size>-` → `416`
- [ ] Malformed id → `404`
- [ ] `HEAD` → same headers as `GET`, no body

## 4. Import failure paths

- [ ] Private/deleted post → `422` with a readable message
- [ ] Invalid URL → `400 INVALID_URL`, no process spawned
- [ ] yt-dlp missing from `PATH` → `503 YTDLP_UNAVAILABLE`
- [ ] ffprobe missing from `PATH` → `503 FFPROBE_UNAVAILABLE`
- [ ] Limits (temporarily lowered via env) → `422 VIDEO_TOO_LONG` /
      `VIDEO_TOO_LARGE`, workspace removed
- [ ] Concurrency limit 1, two simultaneous imports → one `429 IMPORT_BUSY`

## 5. Editor and export

- [ ] Sample editor (development): drag, zoom clamp, reset, aspect ratio,
      text add/edit/delete, keyboard shortcuts, deselect, New video confirm
- [ ] Precise crop: edge/corner handles, move, 5% minimum, boundary clamp,
      keyboard resize, Escape exits, Reset crop, crop mode disables pan/text
- [ ] Crop composes with aspect ratios, zoom, pan, and text without empty edges
- [ ] Text opacity slider updates the canvas live and appears in the export
- [ ] Presets: save, apply on a second import (media stays loaded, crop applies
      proportionally, text positions/sizes scale), duplicate names allowed,
      delete only removes the template, presets survive reload
- [ ] Corrupt or wrong-version preset localStorage does not crash the editor
- [ ] Real media: import → crop → text/opacity → save preset → export
- [ ] Export downloads `<shortcode>.mp4` with progress and success status
- [ ] Export ZIP downloads `<shortcode>.zip` containing `<shortcode>.mp4` and
      `<shortcode>.txt` (empty caption still included); packaging shows
      "Packaging…"
- [ ] Cancel aborts a render without a download; export after cancel works
- [ ] Download source saves the original fetched video as `<shortcode>.mp4`
- [ ] Exported file (ffprobe): MP4, H.264, expected dimensions for the chosen
      aspect ratio, expected duration, one video track, audio only when the
      source has audio
- [ ] Preview/export visual parity checked on an exported frame (crop + zoom +
      pan + text)
- [ ] Caption downloads as `<shortcode>.txt`, byte-identical to the import
      response; empty caption disables the button
- [ ] ZIP verified programmatically: valid archive, exact filenames, nonzero
      MP4, caption bytes correct, no folder nesting

## 6. Responsive and accessibility

- [ ] 1440×900, 834×1112, 390×844, 320×568: no horizontal overflow on `/` and
      `/editor`; canvas keeps aspect ratio; toolbar usable while exporting
- [ ] Crop handles draggable at every viewport; crop mode toggle reachable
- [ ] Preset controls, opacity slider, and download/export buttons usable at
      every viewport
- [ ] One `h1` per page; preview/inspector landmarks present; every visible
      button and input has an accessible name; first Tab reaches the URL field
- [ ] Crop handles have accessible names; focused handles resize with arrows
- [ ] Keyboard-only editing works (arrows, Shift+arrows, Delete, Escape)

## 7. Docker (**unverified**)

- [ ] `docker build -t clipcrop .`
- [ ] `docker run --rm -p 3000:3000 clipcrop`
- [ ] `curl http://localhost:3000/api/health` → `200`
- [ ] Import a real Reel inside the container and export in the browser
- [ ] Confirm the yt-dlp binary matches the build architecture

Docker has not been verified in the development environment (no container
runtime available). Do not claim Docker support until these pass.

## 8. Release metadata

- [ ] Decide whether to bump `package.json` version (currently `0.1.0`; no
      release version has been chosen)
- [ ] Tag the release if a version is chosen
- [ ] Update this checklist if any step changed
