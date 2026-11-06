# Show Only Folders — Version Log

## 1.1.0 (2026-11-06)
- **Fix: flicker** — observer debounce reduced from 80ms to 30ms; newly rendered tree nodes no longer flash visible before being re-hidden while the filter is on.
- **Fix: incomplete restore** — after turning the filter off, some folders occasionally stayed hidden because cleanup only touched the current DOM while Obsidian lazily re-renders tree nodes. Now every DOM change in non-filter mode triggers a sweep that restores any stale hidden node, plus a delayed second sweep on exit.
- **Improvement** — pending observer timers are cancelled when toggling the filter, so no stale work runs against the new state.
- **UX** — all UI text (Notices, tooltips, aria labels, command name) switched to English.
- Behavior: while the filter is on, changing stars re-filters the tree immediately.

## 1.0.6 (2026-11-06)
- **Fix: star clicks dead after plugin reload** — "already registered" flags were stored on the file-explorer view object, which survives plugin reloads. The old instance's listeners were torn down on unload but the flags remained, so the new instance skipped registration. Flags moved into instance-level WeakSets.

## 1.0.5 (2026-11-06)
- **Fix: zombie star elements** — stars created by a previous plugin instance persisted in the explorer DOM with stale listeners bound to the old selection set. Star clicks now use container-level event delegation (capture phase), and all stars are removed on unload.

## 1.0.4 (2026-11-06)
- **Fix: filter appeared to do nothing** — hiding no longer depends on the `.snfo-hide` CSS class (which silently fails if `styles.css` doesn't load); inline `display` is now the source of truth.
- Added Notice feedback on every toggle and diagnostic console logging (`[ShowOnlyFolders]`).

## 1.0.3 (2026-11-06)
- Debounced the MutationObserver to reduce flicker during rapid tree re-renders.

## 1.0.2 (2026-11-06)
- Added ribbon icon entry (pane header actions only appear on hover and were hard to discover).
- Added command palette entry: "Toggle show only".

## 1.0.1 (2026-11-06)
- Hardened loading: full try/catch in `onload`, native DOM APIs instead of Obsidian convenience helpers, guard for `view.addAction` missing on deferred views.

## 1.0.0 (2026-11-06)
- Initial release: hover star on folders (multi-select, persisted), header filter action, "show only starred subtrees" with ancestor chain kept visible, fallback to active file's parent folder when nothing is starred.
