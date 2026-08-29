# Contributing

Thanks for your interest! This is a small, buildless static site — contributing is easy.

## Project layout

| Path | Purpose |
| --- | --- |
| `index.html` | Page markup only (no logic, no strings that need translating hard-coded in JS) |
| `css/style.css` | All styling, including dark mode and the mobile layout |
| `js/command-builder.js` | **Pure** logic: state → `docker run` / compose / systemd outputs, validation, import parser. No DOM access — this is what the tests cover. |
| `js/i18n.js` | English/Turkish UI strings |
| `js/app.js` | DOM wiring: reads the form into a state object, calls the builder, renders results |
| `tests/` | `node --test` unit tests for the builder |

## Rules of thumb

- Anything that changes a generated command belongs in `js/command-builder.js`, with a test.
- New UI text goes into `js/i18n.js` (both `en` and `tr`) and is referenced with `data-i18n` attributes.
- Never build DOM rows with `innerHTML` and user input — use `createElement` like the existing code.
- Values placed into shell commands must go through `shellEscape`.

## Running checks locally

```bash
npm test                          # unit tests (Node 20+)
npx --yes html-validate index.html  # HTML lint
```

Open `index.html` directly in a browser (or `npx http-server .`) to test the UI. Both checks also run in CI on every push and pull request.
