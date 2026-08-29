# Improvement Roadmap

A prioritized list of suggested improvements for Docker NAS Container Creator, based on a review of the current code (`index.html`).

## 1. High priority — correctness & security

### 1.1 Shell escaping for user input
Usernames, passwords, share names and paths are inserted into the generated command without any escaping. A password containing `"`, `;`, `$`, a space or a backtick produces a broken (or dangerous) shell command. Escape all values (e.g. wrap in single quotes and escape embedded single quotes) before building `-u`, `-s`, `-v`, `--name` flags.

### 1.2 Safe DOM construction instead of `innerHTML` templates
`userRowTemplate` / `shareRowTemplate` interpolate raw values into HTML strings. A value containing `"` or `<` breaks the row markup (and is an XSS vector when applying an imported `.env`). Build rows with `createElement`/`value =` assignments instead.

### 1.3 Warn about the unmaintained base image
`dperson/samba` has not been updated for years. Either:
- switch the default to a maintained image (e.g. `ghcr.io/servercontainers/samba`), keeping `dperson/samba` as a selectable legacy option, or
- at minimum show a notice with the trade-offs.
An image selector would also allow adapting the flag syntax per image.

### 1.4 Plaintext password warning
In "No .env" mode passwords end up in shell history and `docker inspect`. Show a visible warning and recommend the `.env` modes for anything beyond testing.

### 1.5 Real `.env` validation
The "Validate .env" button currently always reports success. Implement actual checks: known keys, `USERS` format, `SHARE_n`/`MOUNT_n` consistency with `SHARE_COUNT`, numeric UID/GID, valid restart policy, port ranges.

### 1.6 Input validation
- Host ports: integer 1–65535, warn on duplicates across rows.
- Host path: warn when not absolute (`/…`), since relative bind mounts behave differently.
- Share name: restrict to characters Samba accepts; warn on spaces.
- Username: basic charset validation.

## 2. High value — new features

### 2.1 Docker Compose output
Generate a `docker-compose.yml` alongside the `docker run` command (tabbed output: *docker run* / *compose*). Compose is what most NAS users actually deploy with, pairs naturally with the existing `.env` support, and is easy to derive from the same internal model. A "Download compose file" button completes it.

### 2.2 Save/load configurations
- Persist the current form to `localStorage` (auto-restore on load).
- Named profiles (e.g. "home NAS", "media box").
- Shareable links: serialize the config (minus passwords) into the URL hash.

### 2.3 Network mode selector
Add `bridge` (current) / `host` / `macvlan` options. `host` networking is the common fix for SMB discovery issues; `macvlan` gives the container its own LAN IP. Hide the port grid when it does not apply.

### 2.4 Windows discovery (WSDD)
NetBIOS (`-n`) only helps legacy clients; modern Windows uses WS-Discovery. Offer a "Windows network discovery" toggle that adds a companion `wsdd` container (or documents it), so shares appear in Windows Explorer.

### 2.5 More Samba options
- `-w WORKGROUP` (workgroup name)
- `-e TZ=…` (timezone)
- `-r` (recycle bin), veto files
- `-g` global smb.conf options (advanced free-text)
- SMB protocol min version toggle (disable SMB1)

### 2.6 Password tooling
Generate-random-password button, show/hide toggle per password field, simple strength hint.

### 2.7 Import an existing command
Paste a `docker run … dperson/samba …` command and populate the form from it — makes the tool useful for editing existing setups, not only creating new ones.

### 2.8 Presets
One-click starting points: "Single public guest share", "Family multi-user", "Read-only media share", "Time Machine backup target".

## 3. UX & polish

- **Dark mode** (respect `prefers-color-scheme`, plus a manual toggle).
- **i18n**: English/Turkish language switch; strings are few enough to keep in a small dictionary.
- **Mobile layout**: the ports/shares/users grids overflow on narrow screens; collapse to stacked cards under ~700px.
- **Accessibility**: associate every input with a `<label>`/`aria-label`, keyboard focus states, `aria-live` for the error/status areas.
- **Copy feedback** without `alert()` (inline "Copied ✔" that fades).
- **Explain flags**: tooltip/help icon per option describing the underlying Samba/Docker flag.

## 4. Project & repo hygiene

- **Split the single file** into `index.html` + `css/style.css` + `js/app.js` (still buildless, still GitHub Pages friendly).
- **Tests**: the command generator is pure logic — extract `buildCommand(state)` and unit-test it (Node + a tiny test runner or Vitest); add a Playwright smoke test for the form.
- **CI**: GitHub Action running the tests + `html-validate`/ESLint on PRs (the repo currently only has the Pages deploy workflow).
- **README**: add the live demo link (GitHub Pages URL), screenshots, a usage example, generated-command sample, supported options table, badges, and a Turkish section.
- **Meta**: favicon, Open Graph tags, `description` meta for link previews.
- **PWA**: a small manifest + service worker makes the tool installable/offline-capable — a good fit for a zero-backend page.
- **Contributing/License notes**: short CONTRIBUTING.md; the LICENSE file already exists — reference it in the README.

## 5. Stretch ideas

- **Multi-protocol NAS**: extend beyond SMB — NFS (`erichough/nfs-server`), WebDAV, FTP — behind a "protocol" selector sharing the same shares/users model.
- **Portainer/systemd output**: additional output tabs (Portainer stack, systemd unit with `docker run`).
- **Config diff**: show what changed in the command as the user edits the form (live preview instead of a Generate button).
- **Healthcheck & resource limits**: optional `--health-cmd`, `--memory`, `--cpus` fields.
