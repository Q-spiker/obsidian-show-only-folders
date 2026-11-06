# Show Only Folders

An [Obsidian](https://obsidian.md) plugin that lets you **star folders** in the file explorer and temporarily show **only the starred subtrees** — everything else is hidden until you toggle the filter off.

Great for large vaults: keep the whole vault on disk, but focus the file explorer on just the projects you care about right now.

## Features

- **Hover star on every folder** (multi-select) — click to star/unstar, selection is persisted.
- **One-click filter** — via the ribbon icon, the file-explorer header action, or the command palette.
- **Smart fallback** — if nothing is starred, the filter shows the parent folder of the currently active file.
- **Ancestor chains stay visible** — hiding a parent would hide its subtree, so the path to each starred folder is kept.
- **Live re-filtering** — while the filter is on, changing stars re-applies immediately; file create/delete/rename events are handled too.
- **Clean unload** — no leftover DOM elements or stale listeners after disabling/reloading the plugin.
- Works on desktop and mobile, adapts to light/dark themes via Obsidian CSS variables.

## Usage

1. Hover a folder in the file explorer → click the **star** icon that appears on the right. Star as many folders as you like.
2. Toggle "show only" in any of three ways:
   - the **filter ribbon icon** (left sidebar),
   - the **filter button** in the file explorer pane header,
   - the command palette: **"Show Only Folders: Toggle show only"**.
3. Only the starred folders (and everything inside them) remain visible. Toggle again to restore the full tree.

## Installation

### From release (manual)

1. Download `show-only-folders.zip` from the [releases page](../../releases).
2. Unzip it into `<vault>/.obsidian/plugins/show-only-folders/`.
3. Reload Obsidian and enable **Show Only Folders** in Settings → Community plugins.

### With BRAT

Add `Q-spiker/obsidian-show-only-folders` as a beta plugin in [BRAT](https://github.com/TfTHacker/obsidian42-brat).

## Compatibility

- Requires Obsidian **1.4.0+**.
- Not desktop-only — works on mobile as well.

## Development

The plugin ships a prebuilt `main.js` (no build step required). Plugin files of interest:

| File | Purpose |
|---|---|
| `main.js` | Plugin entry and all logic |
| `manifest.json` | Obsidian plugin metadata |
| `styles.css` | Star / filter button styling |
| `CHANGELOG.md` | Version history |

Tag a version (e.g. `git tag 1.1.0 && git push --tags`) and the release workflow packages `manifest.json`, `main.js` and `styles.css` into a release zip automatically.

## License

[MIT](LICENSE)
