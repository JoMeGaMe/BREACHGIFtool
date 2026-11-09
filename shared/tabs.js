/* Tabs for the settings panel.
   Markup: <div class="tabbar" data-tabs="name"></div> followed by sibling
   <div class="pane" data-label="標籤">…</div> elements. Anything else in the
   same parent (the generate button) stays visible on every tab. */
(() => {
  "use strict";
  const st = document.createElement("style");
  st.textContent =
    ".tabbar{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;border-bottom:1px solid var(--line);" +
    "position:sticky;top:env(safe-area-inset-top,0px);z-index:3;background:var(--panel);border-radius:6px 6px 0 0}" +
    ".tabbar button{background:none;border:0;border-bottom:2px solid transparent;margin-bottom:-1px;color:var(--muted);" +
    "padding:11px 2px 9px;font:inherit;font-size:13.5px;cursor:pointer;white-space:nowrap}" +
    ".tabbar button:hover{color:var(--fg)}" +
    ".tabbar button[aria-selected=true]{color:var(--fg);border-bottom-color:var(--accent);font-weight:700}" +
    ".tabbar button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}" +
    ".pane>.group:last-child{border-bottom:1px solid var(--line)}";
  document.head.appendChild(st);

  document.querySelectorAll(".tabbar[data-tabs]").forEach(bar => {
    const name = bar.dataset.tabs, key = "gif-tools-tab:" + name;
    const panes = Array.from(bar.parentElement.children).filter(el => el.classList.contains("pane"));
    bar.setAttribute("role", "tablist");
    bar.setAttribute("aria-label", "設定分類");
    const btns = panes.map((p, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.id = name + "-tab-" + i; b.textContent = p.dataset.label;
      b.setAttribute("role", "tab");
      p.id = p.id || name + "-pane-" + i;
      b.setAttribute("aria-controls", p.id);
      p.setAttribute("role", "tabpanel"); p.setAttribute("aria-labelledby", b.id);
      bar.appendChild(b);
      return b;
    });
    const show = i => {
      panes.forEach((p, j) => { p.hidden = j !== i; });
      btns.forEach((b, j) => { b.setAttribute("aria-selected", String(j === i)); b.tabIndex = j === i ? 0 : -1; });
      try { localStorage.setItem(key, String(i)); } catch (e) {}
    };
    btns.forEach((b, i) => {
      b.addEventListener("click", () => show(i));
      b.addEventListener("keydown", e => {
        const k = e.key === "ArrowRight" ? (i + 1) % btns.length : e.key === "ArrowLeft" ? (i - 1 + btns.length) % btns.length : -1;
        if (k >= 0) { e.preventDefault(); show(k); btns[k].focus(); }
      });
    });
    let start = 0;
    try { const v = parseInt(localStorage.getItem(key), 10); if (v >= 0 && v < panes.length) start = v; } catch (e) {}
    show(start);
  });
})();
