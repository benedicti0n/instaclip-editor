# Deployment

This document covers continuous integration (implemented) and automated
production deployment (planned, currently pending production server
verification — see [Status](#status)).

## Architecture

Target pipeline:

```text
developer
  → push to main
  → GitHub Actions CI (install, typecheck, lint, format:check, build)
  → deploy job (only if CI passed, only from main)
  → SSH to the production server
  → checkout the exact commit that passed CI
  → pnpm install --frozen-lockfile
  → pnpm build
  → restart the production process (mechanism confirmed per server)
  → health check GET /api/health → {"status":"ok"}
  → report success or roll back
```

The application is a single long-running Next.js server (`pnpm start`) that
needs `yt-dlp`, `ffprobe`, and (recommended) `ffmpeg` on its `PATH`, plus a
writable `.tmp/imports` directory. There is no database, so there is no
migration step.

## Status

**CI is implemented** in `.github/workflows/ci.yml`.

**Automated deployment is not implemented yet.** The production server could
not be identified or reached from the development machine, so the restart
mechanism must not be guessed. Before the deploy workflow can be written, the
following facts must be verified (read-only) on the server:

1. How the app runs today (systemd, PM2, Docker, or another supervisor), the
   exact service/container name, the exact restart command, and whether it
   requires `sudo`.
2. SSH details: host, port, username, and application directory
   (`DEPLOY_PATH`), including whether the deploy user owns it.
3. The Node.js and pnpm versions actually installed on the server and whether
   `corepack` is available.
4. Where `yt-dlp`/`ffprobe`/`ffmpeg` are installed and whether they are on the
   service's `PATH`.
5. The reverse proxy in front of the app (if any) and the public health URL.

Do not add server-specific commands to this repository until they are
confirmed.

## Continuous integration

`.github/workflows/ci.yml` runs on:

- pull requests targeting `main`
- pushes to `main`

It uses Node.js 22 and pnpm 11.1.3 (via `pnpm/setup@v3`, which reads the
pinned `packageManager` version when not given explicitly) and runs:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

CI has read-only repository permissions and uses no secrets. Pull-request runs
cancel superseded runs; `main` runs are not cancelled so that a future deploy
trigger always has a complete CI result.

## Required GitHub secrets and variables

Configure these once the server details are verified. Use repository secrets
(or environment secrets on the `production` environment) for secrets, and
repository variables for non-sensitive values.

| Name             | Kind     | Purpose                                     | Example format                     |
| ---------------- | -------- | ------------------------------------------- | ---------------------------------- |
| `DEPLOY_HOST`    | Secret   | Server hostname or IP for SSH               | `server.example.com`               |
| `DEPLOY_USER`    | Secret   | Dedicated least-privilege deploy user       | `deploy`                           |
| `DEPLOY_PORT`    | Secret   | SSH port (defaults to 22 when omitted)      | `22`                               |
| `DEPLOY_PATH`    | Secret   | Absolute path of the production checkout    | `/srv/instaclip-editor`            |
| `DEPLOY_SSH_KEY` | Secret   | Private key of the dedicated deploy keypair | OpenSSH ed25519 private key        |
| `KNOWN_HOSTS`    | Secret   | Pinned server host key line(s)              | Output of `ssh-keyscan`, verified  |
| `SERVICE_NAME`   | Variable | Service/app/container name (only if needed) | `clipcrop`                         |
| `HEALTH_URL`     | Variable | Internal health endpoint                    | `http://127.0.0.1:3000/api/health` |

Never commit private keys, passwords, tokens, or the production environment
file. The `CLIPCROP_*` runtime variables stay on the server (for example in a
systemd `EnvironmentFile` or the process manager's environment) and are never
copied into GitHub.

## Dedicated SSH key setup

Create a dedicated key for GitHub Actions only:

```bash
ssh-keygen -t ed25519 -C "github-actions-instaclip-deploy" -f ~/.ssh/instaclip_deploy
```

- Private key (`~/.ssh/instaclip_deploy`) → GitHub secret `DEPLOY_SSH_KEY`.
- Public key (`~/.ssh/instaclip_deploy.pub`) → the deploy user's
  `~/.ssh/authorized_keys` on the server.

Restrict the key to deployment if the server supports it, and never reuse a
personal SSH key.

## known_hosts setup

Obtain the server's host key and verify its fingerprint out-of-band before
trusting it:

```bash
ssh-keyscan -p <port> <host>
```

Compare the fingerprint against the value reported by the server provider or
the server console, then store the verified line as the `KNOWN_HOSTS` secret.
The deploy workflow must fail when the host key does not match; do not disable
host verification.

## Server prerequisites

Based on this repository, the production server needs:

- Node.js 22 (Next.js 16 requires >= 20.9)
- pnpm 11.1.3 (the pinned `packageManager` version)
- `yt-dlp`, `ffprobe`, and preferably `ffmpeg` available on the service's
  `PATH`
- a writable `.tmp/imports` directory inside the application path that
  survives restarts
- a long-running process manager (mechanism to be confirmed)
- HTTP Range support through the reverse proxy, if one is used

The exact versions, install locations, and restart mechanism are confirmed
during the server verification step above.

## Automatic deployment (planned)

Once the deploy workflow exists, pushing to `main` will run CI, and only if CI
passes will the exact tested commit be deployed over SSH:

- deployment runs only from `main`
- deployments are serialized (`concurrency: production-deploy`,
  `cancel-in-progress: false`)
- the workflow uses the `production` GitHub environment
- manual approval can be added later with environment protection rules; the
  default is automatic deployment after a successful `main` push

## Manual deployment (planned)

The deploy workflow will support `workflow_dispatch` with an optional
`target_sha` input so a previous known-good commit can be redeployed
intentionally. Only commits present in the repository may be deployed.

## Rollback (planned)

If a deployment fails after production has been restarted, the workflow will
check out the previous commit, rebuild, restart, and re-run the health check,
reporting whether the rollback succeeded. If the failure happens before the
restart (install or build), production keeps serving the old process and no
rollback restart is needed. Manual rollback uses `workflow_dispatch` with the
previous `target_sha`.

The production checkout is expected to be in a detached HEAD state at the
deployed commit; this is intentional, not an error.

## Operational notes

- `.tmp/imports` must survive deployments; deploy steps must not run
  destructive repository cleanup (`git reset --hard`, `git clean`) and must
  abort if the working tree has unexpected tracked-file modifications.
- Restarting the process can interrupt in-flight imports and requests;
  already-downloaded temporary files remain on disk.
- `CLIPCROP_*` variables are read at server start; changing them requires a
  restart.
- Tool availability (`yt-dlp`, `ffprobe`) is cached per server process;
  installing a missing tool requires a restart before `/api/health` reports
  healthy again.

## Troubleshooting

- **SSH failure**: verify `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PORT`,
  `DEPLOY_SSH_KEY`, and that the deploy public key is in `authorized_keys`.
- **Host key mismatch**: re-verify the server fingerprint and update
  `KNOWN_HOSTS`; never bypass verification.
- **Dirty production working tree**: the deploy aborts and reports the changed
  files. Inspect them manually; do not reset or clean blindly.
- **Build failure or out-of-memory**: the server may lack memory for
  `next build`. Check available memory/swap; if needed, move the build to CI
  and deploy build artifacts instead.
- **Service restart failure**: confirm the verified restart mechanism, service
  name, and permissions.
- **`/api/health` failure**: check the process logs; a `503` with
  `{"status":"degraded"}` means `yt-dlp` or `ffprobe` is missing from the
  service's `PATH`. Restart after installing tools.
- **Missing `yt-dlp`/`ffprobe`**: install them for the service user's `PATH`
  (container images include them).
