/* Where the GIF text fonts come from.
   1. ../fonts/google/fonts.css  (self-hosted copy made by scripts/download-fonts)
   2. Google Fonts, one stylesheet per family, only if the self-hosted copy is missing
      and the script tag does not say data-fallback="none".
   Neither path sends what the visitor types: the browser only asks for the
   font slices it needs, the same way any web font works. */
window.FontSource = (() => {
  "use strict";
  const me = document.currentScript;
  const LOCAL = new URL("../fonts/google/fonts.css", me.src).href;
  const allowGoogle = me.dataset.fallback !== "none";
  const FAMILIES = [
    "Noto+Sans+TC:wght@400;500;700", "Noto+Serif+TC:wght@700", "LXGW+WenKai+TC:wght@700",
    "Chiron+GoRound+TC:wght@700", "Huninn", "Iansui",
    "Press+Start+2P", "Silkscreen", "VT323", "Bungee", "Fredoka:wght@600",
  ];
  let source = "pending";
  const addLink = href => new Promise(res => {
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = href;
    l.onload = () => res(true);
    l.onerror = () => { l.remove(); res(false); };
    document.head.appendChild(l);
  });
  const ready = new Promise(res => {
    let done = false;
    const fin = s => { if (done) return; done = true; source = s; res(s); };
    setTimeout(() => fin("timeout"), 8000);
    addLink(LOCAL).then(ok => {
      if (ok) return fin("local");
      if (!allowGoogle) return fin("none");
      Promise.all(FAMILIES.map(f => addLink("https://fonts.googleapis.com/css2?family=" + f + "&display=swap")))
        .then(r => fin(r.some(Boolean) ? "google" : "none"));
    });
  });
  function load(family, weight, text) {
    return ready.then(() => Promise.race([
      document.fonts.load(weight + ' 40px "' + family + '"', text || "A").catch(() => {}),
      new Promise(r => setTimeout(r, 6000)),
    ]));
  }
  return { ready, load, get source() { return source; } };
})();
