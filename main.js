const { Plugin, Notice, setIcon } = require("obsidian");

const STAR_CLASS = "snfo-star";
const STAR_ON = "snfo-on";
const HIDE_CLASS = "snfo-hide";
const BTN_ON = "snfo-btn-on";
const LOG = "[ShowOnlyFolders]";

module.exports = class ShowOnlyFoldersPlugin extends Plugin {
  async onload() {
    try {
      const saved = (await this.loadData()) || {};
      this.selected = new Set(saved.selected || []);
    } catch (e) {
      console.warn(LOG, "Failed to load saved selection, starting empty", e);
      this.selected = new Set();
    }
    this.active = false;
    this._buttons = new WeakSet();
    this._btnByView = new Map();
    this._observed = new WeakSet(); // NOTE: flags must live on the plugin instance,
    this._delegated = new WeakSet(); // not on the view (views survive plugin reloads)

    // Entry 2: ribbon icon (always visible)
    try {
      this._ribbon = this.addRibbonIcon("filter", "Show only: filter file explorer", () =>
        this.toggleActive()
      );
    } catch (e) {
      console.warn(LOG, "Failed to add ribbon icon", e);
    }

    // Entry 3: command palette
    this.addCommand({
      id: "toggle-show-only",
      name: "Toggle show only (display starred folder subtrees)",
      callback: () => this.toggleActive(),
    });

    this.app.workspace.onLayoutReady(() => this.safeRefresh());
    this.registerEvent(
      this.app.workspace.on("layout-change", () => this.safeRefresh())
    );
    for (const evt of ["create", "delete", "rename"]) {
      this.registerEvent(this.app.vault.on(evt, () => this.refreshSoon()));
    }
    console.log(LOG, "Loaded. Starred:", [...this.selected]);
  }

  safeRefresh() {
    try {
      this.refresh();
    } catch (e) {
      console.error(LOG, "refresh error", e);
    }
  }

  /* ---------- explorer plumbing ---------- */

  explorerViews() {
    return this.app.workspace
      .getLeavesOfType("file-explorer")
      .map((l) => l.view)
      .filter((v) => v && v.containerEl);
  }

  refreshSoon() {
    clearTimeout(this._t);
    this._t = setTimeout(() => this.safeRefresh(), 150);
  }

  refresh() {
    for (const view of this.explorerViews()) {
      this.ensureHeaderButton(view);
      this.ensureObserver(view);
      this.ensureDelegation(view);
      this.decorate(view);
      this.syncVisibility(view);
    }
  }

  /** Active → re-apply filter; inactive → sweep away any stale hidden nodes */
  syncVisibility(view) {
    if (this.active) this.applyFilter(view);
    else this.clearFilter(view);
  }

  ensureHeaderButton(view) {
    if (this._buttons.has(view)) return;
    try {
      if (typeof view.addAction !== "function") return;
      const btn = view.addAction("filter", "Show only selected folders", () =>
        this.toggleActive()
      );
      if (btn) btn.classList.toggle(BTN_ON, this.active);
      this._buttons.add(view);
      this._btnByView.set(view, btn);
    } catch (e) {
      console.warn(LOG, "Failed to add header button", e);
    }
  }

  ensureObserver(view) {
    if (this._observed.has(view)) return;
    try {
      const obs = new MutationObserver(() => {
        // Short debounce: long delays let freshly rendered nodes flash visible
        clearTimeout(view.__snfoTimer);
        view.__snfoTimer = setTimeout(() => {
          try {
            this.decorate(view);
            this.syncVisibility(view);
          } catch (e) {
            console.error(LOG, "observer callback error", e);
          }
        }, 30);
      });
      obs.observe(view.containerEl, { childList: true, subtree: true });
      this._observed.add(view);
      this.register(() => obs.disconnect());
    } catch (e) {
      console.warn(LOG, "MutationObserver failed", e);
    }
  }

  /**
   * Event delegation: one click listener per explorer container.
   * Never bind on star elements themselves — stale listeners from a previous
   * plugin instance turn them into zombies after reload.
   */
  ensureDelegation(view) {
    if (this._delegated.has(view)) return;
    this._delegated.add(view);
    this.registerDomEvent(
      view.containerEl,
      "click",
      (e) => {
        const star =
          e.target && e.target.closest
            ? e.target.closest("." + STAR_CLASS)
            : null;
        if (!star || !view.containerEl.contains(star)) return;
        const titleEl = star.closest(".nav-folder-title");
        const path = titleEl && titleEl.getAttribute("data-path");
        if (!path) return;
        e.preventDefault();
        e.stopPropagation();
        this.toggleSelect(path);
      },
      true // capture: run before the folder collapse/expand handler
    );
  }

  /* ---------- hover star ---------- */

  decorate(view) {
    const titles = view.containerEl.querySelectorAll(
      ".nav-folder-title[data-path]:not(.mod-root)"
    );
    titles.forEach((titleEl) => {
      const path = titleEl.getAttribute("data-path");
      if (!path || path === "/") return;

      let star = null;
      for (const child of titleEl.children) {
        if (child.classList && child.classList.contains(STAR_CLASS)) {
          star = child;
          break;
        }
      }
      if (!star) {
        star = document.createElement("span");
        star.className = STAR_CLASS;
        star.setAttribute("aria-label", "Show only this folder (multi-select)");
        try {
          setIcon(star, "star");
        } catch (e) {
          star.textContent = "★";
        }
        titleEl.appendChild(star);
      }
      star.classList.toggle(STAR_ON, this.selected.has(path));
    });
  }

  toggleSelect(path) {
    if (this.selected.has(path)) this.selected.delete(path);
    else this.selected.add(path);
    this.saveData({ selected: [...this.selected] });
    console.log(LOG, "Starred:", [...this.selected]);
    for (const view of this.explorerViews()) {
      this.decorate(view);
      // While the filter is on, star changes re-filter immediately
      if (this.active) this.applyFilter(view);
    }
  }

  /* ---------- filter ---------- */

  toggleActive() {
    this.active = !this.active;
    console.log(LOG, "Filter:", this.active ? "ON" : "OFF");

    // Cancel any pending observer work so nothing re-runs against stale state
    for (const view of this.explorerViews()) clearTimeout(view.__snfoTimer);

    for (const btn of this._btnByView.values()) {
      if (btn) btn.classList.toggle(BTN_ON, this.active);
    }
    if (this._ribbon) this._ribbon.classList.toggle(BTN_ON, this.active);

    if (this.active) {
      const targets = this.currentTargets();
      if (targets.length === 0) {
        new Notice("Show only: no starred folders and no active file");
        this.active = false;
        if (this._ribbon) this._ribbon.classList.remove(BTN_ON);
        for (const btn of this._btnByView.values()) {
          if (btn) btn.classList.remove(BTN_ON);
        }
        return;
      }
      new Notice("Show only: " + targets.join(", "));
      for (const view of this.explorerViews()) this.applyFilter(view);
    } else {
      new Notice("Show only: filter off");
      for (const view of this.explorerViews()) {
        this.clearFilter(view);
        // Second sweep after the explorer settles, catching lazily restored nodes
        setTimeout(() => {
          try {
            if (!this.active) this.clearFilter(view);
          } catch (e) {
            /* ignore */
          }
        }, 120);
      }
    }
  }

  /** Targets: starred folders; fallback = parent folder of the active file */
  currentTargets() {
    if (this.selected.size > 0) return [...this.selected];
    const file = this.app.workspace.getActiveFile();
    if (file && file.parent && file.parent.path && file.parent.path !== "/") {
      return [file.parent.path];
    }
    return [];
  }

  setHidden(el, hidden) {
    el.classList.toggle(HIDE_CLASS, hidden);
    // Inline style as source of truth — works even if styles.css fails to load
    el.style.display = hidden ? "none" : "";
  }

  applyFilter(view) {
    const targets = this.currentTargets();
    if (targets.length === 0) {
      this.clearFilter(view);
      return;
    }

    const titleEls = Array.from(
      view.containerEl.querySelectorAll(
        ".nav-folder-title[data-path]:not(.mod-root), .nav-file-title[data-path]"
      )
    );

    const visible = new Set();
    for (const t of targets) {
      // Target itself + its whole subtree
      for (const el of titleEls) {
        const p = el.getAttribute("data-path");
        if (p === t || p.startsWith(t + "/")) visible.add(p);
      }
      // Ancestor chain must stay visible (hiding it would hide the subtree too)
      let cur = t;
      while (cur.includes("/")) {
        cur = cur.slice(0, cur.lastIndexOf("/"));
        visible.add(cur);
      }
    }

    let hiddenCount = 0;
    for (const el of titleEls) {
      const p = el.getAttribute("data-path");
      const itemEl = el.parentElement; // .nav-folder / .nav-file
      if (!itemEl) continue;
      const hide = !visible.has(p);
      this.setHidden(itemEl, hide);
      if (hide) hiddenCount++;
    }
    console.log(
      LOG,
      "Filtered:",
      titleEls.length,
      "items,",
      hiddenCount,
      "hidden, targets:",
      targets
    );
  }

  clearFilter(view) {
    view.containerEl
      .querySelectorAll(".nav-folder, .nav-file")
      .forEach((el) => this.setHidden(el, false));
  }

  removeAllStars() {
    for (const view of this.explorerViews()) {
      view.containerEl
        .querySelectorAll("." + STAR_CLASS)
        .forEach((el) => el.remove());
    }
  }

  onunload() {
    try {
      for (const view of this.explorerViews()) this.clearFilter(view);
      this.removeAllStars(); // no leftover stars → no zombie elements next load
    } catch (e) {
      /* ignore */
    }
  }
};
