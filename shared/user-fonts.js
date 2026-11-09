/* User-supplied fonts, shared by every tool on this site.
   Fonts are loaded with the FontFace API inside the visitor's own browser.
   Nothing is uploaded anywhere. "Remember" keeps the file in this browser's
   IndexedDB so the other tools on the same site can use it too. */
window.UserFonts = (() => {
  "use strict";
  const DB = "gif-tools", STORE = "fonts";
  const fonts = [];            // {id, name, family, remembered}
  const subs = new Set();
  const faces = new Map();     // id -> FontFace

  function openDB() {
    return new Promise((res, rej) => {
      if (!("indexedDB" in window)) return rej(new Error("no indexedDB"));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function tx(mode, fn) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const t = db.transaction(STORE, mode), req = fn(t.objectStore(STORE));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  }
  async function register(rec, remembered) {
    const family = "UF-" + rec.id;
    const face = new FontFace(family, rec.data);
    await face.load();
    document.fonts.add(face);
    faces.set(rec.id, face);
    const f = { id: rec.id, name: rec.name, family, remembered };
    fonts.push(f);
    return f;
  }
  const emit = () => subs.forEach(cb => { try { cb(fonts.slice()); } catch (e) { console.error(e); } });

  async function init() {
    try {
      const all = await tx("readonly", s => s.getAll());
      for (const r of all || []) { try { await register(r, true); } catch (e) { /* skip broken entry */ } }
    } catch (e) { /* storage unavailable: fonts stay for this visit only */ }
    emit();
  }

  async function add(file, remember) {
    if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) throw new Error("請選擇 TTF、OTF、WOFF 或 WOFF2 字體檔。");
    if (file.size > 60 * 1024 * 1024) throw new Error("字體檔超過 60 MB，請改用較小的檔案。");
    const data = await file.arrayBuffer();
    const rec = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
                  name: file.name.replace(/\.(ttf|otf|woff2?)$/i, ""), data };
    let f;
    try { f = await register(rec, false); }
    catch (e) { throw new Error("「" + file.name + "」無法讀取，檔案可能損壞或格式不支援。"); }
    if (remember) {
      try { await tx("readwrite", s => s.put(rec)); f.remembered = true; }
      catch (e) { f.remembered = false; }
    }
    emit();
    return f;
  }

  async function remove(id) {
    const i = fonts.findIndex(f => f.id === id);
    if (i < 0) return;
    fonts.splice(i, 1);
    const face = faces.get(id);
    if (face) { document.fonts.delete(face); faces.delete(id); }
    try { await tx("readwrite", s => s.delete(id)); } catch (e) {}
    emit();
  }

  function onChange(cb) { subs.add(cb); try { cb(fonts.slice()); } catch (e) { console.error(e); } return () => subs.delete(cb); }

  /* A small upload panel. Uses the host page's .btn / .check / .hint classes and color tokens. */
  function mount(el) {
    if (!document.getElementById("uf-style")) {
      const st = document.createElement("style"); st.id = "uf-style";
      st.textContent = ".uf{display:flex;flex-direction:column;gap:8px}.uf-row{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center}" +
        ".uf-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}" +
        ".uf-list li{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:4px;padding:6px 8px;background:var(--raise,var(--soft))}" +
        ".uf-list .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}" +
        ".uf-list .tg{font-size:11px;color:var(--muted)}" +
        ".uf-list button{border:0;background:none;color:var(--danger);font-size:12px;cursor:pointer;padding:2px 4px}" +
        ".uf-msg.err{color:var(--danger)}";
      document.head.appendChild(st);
    }
    el.innerHTML =
      '<div class="uf">' +
      '<div class="uf-row"><button type="button" class="btn uf-add">上傳字體檔</button>' +
      '<label class="check"><input type="checkbox" class="uf-rem" checked>記住在這個瀏覽器（其他工具也能用）</label></div>' +
      '<input type="file" class="uf-file" accept=".ttf,.otf,.woff,.woff2" multiple hidden>' +
      '<ul class="uf-list"></ul><p class="hint uf-msg"></p>' +
      '<p class="hint">支援 TTF、OTF、WOFF、WOFF2。字體只在你的瀏覽器裡使用，不會上傳。輸出 GIF 前，請確認字體授權允許用在圖片或動畫上。</p>' +
      '</div>';
    const q = s => el.querySelector(s), file = q(".uf-file"), msg = q(".uf-msg");
    const say = (t, err) => { msg.textContent = t; msg.classList.toggle("err", !!err); };
    q(".uf-add").onclick = () => file.click();
    file.onchange = async () => {
      const list = Array.from(file.files); file.value = "";
      for (const f of list) {
        try { const r = await add(f, q(".uf-rem").checked); say("已加入「" + r.name + "」，可以在字體選單最下面找到。"); }
        catch (e) { say(e.message || String(e), true); }
      }
    };
    onChange(list => {
      const ul = q(".uf-list"); ul.innerHTML = "";
      list.forEach(f => {
        const li = document.createElement("li");
        const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = f.name; nm.style.fontFamily = '"' + f.family + '",sans-serif';
        const tg = document.createElement("span"); tg.className = "tg"; tg.textContent = f.remembered ? "已記住" : "僅本次";
        const del = document.createElement("button"); del.type = "button"; del.textContent = "移除"; del.setAttribute("aria-label", "移除字體 " + f.name);
        del.onclick = () => { remove(f.id); say("已移除「" + f.name + "」。"); };
        li.append(nm, tg, del); ul.append(li);
      });
    });
  }

  const ready = init();
  return { ready, list: () => fonts.slice(), add, remove, onChange, mount };
})();
