# ClipCrop server API

ClipCrop exposes three endpoints. All run on the Node.js runtime, all responses
are JSON unless noted, and all failures use structured error codes that are safe
to display to users.

## `POST /api/import`

Validates an Instagram URL, downloads the video with yt-dlp, probes metadata
with ffprobe, enforces limits, and stores the media in a temporary workspace.

Request:

```http
POST /api/import
Content-Type: application/json

{ "url": "https://www.instagram.com/reel/C_jGQ9lpsKG/" }
```

The body must be a JSON object with a string `url` (max 2048 characters) and at
most 8 KB. Accepted URL shapes: `instagram.com` or `www.instagram.com` over
http/https with `/reel/<shortcode>/`, `/reels/<shortcode>/`, or
`/p/<shortcode>/` paths. URLs are normalized before use. `sourceId` is the
validated shortcode (character set `[A-Za-z0-9_-]+`), used by the client for
download filenames.

Success — `200`:

```json
{
  "importId": "0d9a1f0e-6d1f-4f3e-9c4e-2b1a7c8d5e6f",
  "media": {
    "kind": "imported",
    "src": "/api/imports/0d9a1f0e-6d1f-4f3e-9c4e-2b1a7c8d5e6f/video",
    "caption": "Post caption text, may be empty",
    "originalUrl": "https://www.instagram.com/reel/C_jGQ9lpsKG/",
    "sourceId": "C_jGQ9lpsKG"
  },
  "metadata": {
    "durationInSeconds": 12.744898,
    "width": 720,
    "height": 1280
  }
}
```

Errors — `{ "error": { "code": "...", "message": "..." } }`:

| Status | Code                  | Meaning                                                                                       |
| ------ | --------------------- | --------------------------------------------------------------------------------------------- |
| 400    | `INVALID_REQUEST`     | Body missing/not JSON/not an object, `url` missing or not a string, or body over 8 KB (`413`) |
| 400    | `INVALID_URL`         | URL too long or not a valid public Instagram post URL                                         |
| 429    | `IMPORT_BUSY`         | More than `CLIPCROP_MAX_CONCURRENT_IMPORTS` imports in flight on this instance                |
| 422    | `UNSUPPORTED_MEDIA`   | Post is private, deleted, login-required, or has no downloadable video                        |
| 422    | `VIDEO_TOO_LONG`      | Duration exceeds `CLIPCROP_MAX_VIDEO_DURATION_SECONDS`                                        |
| 422    | `VIDEO_TOO_LARGE`     | File size exceeds `CLIPCROP_MAX_VIDEO_BYTES`                                                  |
| 502    | `EXTRACTION_FAILED`   | yt-dlp could not download the post                                                            |
| 503    | `YTDLP_UNAVAILABLE`   | yt-dlp is not installed on the server                                                         |
| 503    | `FFPROBE_UNAVAILABLE` | ffprobe is not installed on the server                                                        |
| 504    | `TIMEOUT`             | Extraction exceeded the server timeout                                                        |
| 500    | `INTERNAL_ERROR`      | Unexpected failure                                                                            |

Guarantees:

- Failed and rejected imports always delete their temp workspace.
- The concurrency permit is released on every path (`finally`).
- Responses never include filesystem paths, command output, or stack traces.
- Duration and size are checked with server-side metadata and file stats, never
  client input.

## `GET /api/imports/:id/video`

Streams an imported video. Used by the editor preview and export pipeline.
`HEAD` is handled automatically by the framework with the same headers as `GET`
(no body).

Responses:

| Status | Condition                                                       | Headers                                                                             |
| ------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `200`  | No/invalid `Range` header                                       | `Content-Type`, `Content-Length`, `Accept-Ranges: bytes`, `Cache-Control: no-store` |
| `206`  | Valid `Range: bytes=...`                                        | Same plus `Content-Range: bytes <start>-<end>/<size>` and ranged `Content-Length`   |
| `416`  | Unsatisfiable range                                             | `Content-Range: bytes */<size>`, `Accept-Ranges: bytes`                             |
| `404`  | Unknown/invalid id, missing file, or path outside the workspace | Plain text `Not found`                                                              |

Supported range forms: `bytes=start-`, `bytes=start-end`, and `bytes=-suffix`.
Content types: `mp4`/`m4v` → `video/mp4`, `mov` → `video/quicktime`, `webm` →
`video/webm`, otherwise `application/octet-stream`.

Security: the id must be a UUID, the stored filename is re-validated as a
basename, and the resolved path must stay inside the import workspace.

## `GET /api/health`

Reports whether the required media tools are available. Tool detection is
cached per server process (run once per boot), so install tools and restart
before relying on it.

Healthy — `200`:

```json
{ "status": "ok", "tools": { "ytDlp": true, "ffprobe": true, "ffmpeg": true } }
```

Degraded — `503`:

```json
{
  "status": "degraded",
  "tools": { "ytDlp": false, "ffprobe": true, "ffmpeg": true }
}
```

`ytDlp` and `ffprobe` are required; `ffmpeg` is reported for diagnostics only
and does not affect the status. The route is `dynamic = "force-dynamic"` so it
is never cached.

## Not part of the API

- No authentication or per-user data: every import is anonymous and expires by
  TTL.
- No endpoint returns the raw yt-dlp metadata or the caption separately; the
  caption is included in the import response.
- No deletion endpoint: cleanup is automatic (TTL) and runs before each import.
