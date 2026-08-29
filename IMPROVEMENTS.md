# Improvement Roadmap

Status of the improvements identified for Docker NAS Container Creator.
**Everything below has been implemented** (a few stretch items in a pragmatic first version — noted inline).

## 1. High priority — correctness & security

- [x] **Shell escaping for user input** — every value goes through `shellEscape()` in `js/command-builder.js`; covered by unit tests.
- [x] **Safe DOM construction instead of `innerHTML` templates** — user/share rows are built with `createElement` in `js/app.js`.
- [x] **Warn about the unmaintained base image** — image selector (`dperson/samba` / `ghcr.io/servercontainers/samba`) with a visible warning callout; the maintained image is generated via its env-var config.
- [x] **Plaintext password warning** — a warning callout is shown in "No .env" mode; also emitted as a note next to the output.
- [x] **Real `.env` validation** — `validateEnvText()` checks keys, `USERS` format, `SHARE_n`/`MOUNT_n` vs `SHARE_COUNT`, numeric UID/GID, restart policy, port lists.
- [x] **Input validation** — host port range and duplicates, absolute-path warning, share-name charset/`;` checks, username charset, weak-password hints.

## 2. High value — new features

- [x] **Docker Compose output** — tabbed output (`docker run` / compose / systemd unit) with a "Download docker-compose.yml" button.
- [x] **Save/load configurations** — autosave to `localStorage`, named profiles, and a shareable URL (passwords stripped).
- [x] **Network mode selector** — bridge / host / macvlan (network name + optional static IP); port grid hidden when not applicable.
- [x] **Windows discovery (WSDD)** — toggle adds a companion `wsdd` container (host network) for `dperson/samba`; notes that `servercontainers/samba` ships avahi + wsdd2 built in.
- [x] **More Samba options** — workgroup (`-w`), timezone (`TZ`), recycle-bin toggle (`-r`), free-form global options (`-g`, one per line — also how SMB1/SMB-min-version can be set).
- [x] **Password tooling** — per-user generate button, show/hide toggle, strength hint.
- [x] **Import an existing command** — paste a `dperson/samba` `docker run` command; tokenizer handles quotes, `--flag=value` and line continuations.
- [x] **Presets** — public guest share, family multi-user, read-only media, Time Machine target (fruit global options).

## 3. UX & polish

- [x] **Dark mode** — follows `prefers-color-scheme`, manual toggle persisted.
- [x] **i18n** — English/Turkish dictionary (`js/i18n.js`), including translated validation messages.
- [x] **Mobile layout** — grids collapse to stacked cards under 700px.
- [x] **Accessibility** — labels/aria-labels on all inputs and icon buttons, `aria-live` status areas, focus styles, real tab semantics on the output switcher.
- [x] **Copy feedback without `alert()`** — inline "Copied ✔" status that fades.
- [x] **Explain flags** — help text/notes per option; contextual notes rendered under the output.

## 4. Project & repo hygiene

- [x] **Split the single file** — `index.html` + `css/style.css` + `js/command-builder.js` + `js/i18n.js` + `js/app.js`; still buildless.
- [x] **Tests** — pure `buildOutputs(state)` builder with a `node --test` suite (`tests/`), plus a Playwright smoke script used during development.
- [x] **CI** — `.github/workflows/ci.yml` runs unit tests and `html-validate` on every push/PR.
- [x] **README** — live demo link, screenshots (light/dark), features, example outputs, badges, Turkish section.
- [x] **Meta** — SVG favicon, Open Graph tags, description meta, theme-color.
- [x] **PWA** — `manifest.webmanifest` + `sw.js` (cache-first app shell) + icons; installable and offline-capable.
- [x] **Contributing/License notes** — `CONTRIBUTING.md` added; LICENSE referenced from the README.

## 5. Stretch ideas

- [x] **Multi-protocol NAS** — protocol selector with basic NFS (`erichough/nfs-server`), WebDAV (`bytemark/webdav`) and FTP (`delfer/alpine-ftp-server`) generation sharing the same shares/users model. *(First version: sensible defaults with per-protocol notes; SMB remains the most complete.)*
- [x] **Portainer/systemd output** — systemd unit tab with download; the compose output is paste-able into a Portainer stack (noted in the UI).
- [x] **Config diff / live preview** — the output regenerates on every edit; no Generate button needed.
- [x] **Healthcheck & resource limits** — optional smbclient healthcheck, `--memory`, `--cpus` fields (also emitted in compose).

## Future ideas (next round)

- Per-protocol port editing for NFS/WebDAV/FTP (currently sensible fixed defaults).
- Import support for compose files and for the `servercontainers/samba` env format.
- Playwright E2E suite in CI (the smoke script exists; wiring it into CI needs a browser cache step).
- More presets (Time Machine on `servercontainers/samba`, scanner drop-box, camera backup).
- Optional password hashing / secrets-file output instead of plaintext env values.
