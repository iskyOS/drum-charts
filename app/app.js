// Drum Charts – stage view. Data comes from window.CHARTS, built from songs/ and sets/.
(() => {
  const { songs: SONGS, sets: SETS } = window.CHARTS;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const fmtDate = (d, opts = { weekday: "short", month: "short", day: "numeric" }) =>
    new Date(d + "T12:00:00").toLocaleDateString("en-US", opts);
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  const setsByDate = [...SETS].sort((a, b) => a.date.localeCompare(b.date));
  const upcomingSet = () => setsByDate.find((s) => s.date >= today()) || setsByDate[setsByDate.length - 1];

  // ---------- resolving what to show ----------
  function resolve(item) {
    const base = SONGS[item.song];
    if (!base) return null;
    const v = (item.variant && base.variants && base.variants[item.variant]) || {};
    const song = { ...base, ...v, s: v.s || base.s };
    song.title = v.title || base.title + (item.variant ? "\u00a0· " + cap(item.variant) : "");
    song.leader = item.leader;
    song.week = item.note;
    song.keyChanged = !!(item.key && item.key !== song.key);
    if (item.key) song.key = item.key;
    return song;
  }

  function parseRoute(hash) {
    const p = new URLSearchParams(hash.replace(/^#/, ""));
    let route = null;
    if (p.get("set")) {
      const set = SETS.find((s) => s.id === p.get("set"));
      if (set) route = { kind: "set", set };
    } else if (p.get("songs")) {
      const items = p.get("songs").split(",").filter(Boolean).map((t) => {
        const [song, variant] = t.split(":");
        return { song, ...(variant ? { variant } : {}) };
      });
      if (items.some((it) => SONGS[it.song])) route = { kind: "custom", items };
    }
    return route && { ...route, i: +p.get("i") || 0 };
  }

  const routeHash = (r, i) =>
    r.kind === "set"
      ? `#set=${encodeURIComponent(r.set.id)}&i=${i}`
      : `#songs=${r.items.map((it) => it.song + (it.variant ? ":" + it.variant : "")).join(",")}&i=${i}`;

  // ---------- state ----------
  let route = null, list = [], i = 0, now = -1, rehearse = false, metro = null;

  function open(r, idx = 0) {
    route = r;
    const items = r.kind === "set" ? r.set.items : r.items;
    list = items.map(resolve).filter(Boolean);
    i = Math.min(Math.max(idx, 0), Math.max(list.length - 1, 0));
    now = -1;
    render();
  }

  function go(d) {
    const n = i + d;
    if (n < 0 || n >= list.length) return;
    i = n;
    now = -1;
    render();
  }

  // ---------- rendering ----------
  const lvlBar = (r) => {
    if (r.l === 0 && !r.l2) return `<div class="lvl out">OUT</div>`;
    const a = r.l * 20, b = (r.l2 ?? r.l) * 20;
    const ca = `var(--l${r.l})`, cb = `var(--l${r.l2 ?? r.l})`;
    let style = `width:${Math.max(a, b)}%;background:${ca}`;
    if (r.l2 != null) {
      // a crescendo / decrescendo hairpin: solid to the lower level, wedge out to the higher one
      const lo = Math.min(a, b), hi = Math.max(a, b);
      const at = (x) => `${(x / hi) * 100}%`;
      const clip = b > a
        ? `0 0,${at(lo)} 0,${at(lo)} 30%,100% 0,100% 100%,${at(lo)} 70%,${at(lo)} 100%,0 100%`
        : `0 0,${at(lo)} 0,100% 30%,100% 70%,${at(lo)} 100%,0 100%`;
      style = `width:${hi}%;background:linear-gradient(90deg,${ca} ${at(Math.min(a, lo))},${cb});clip-path:polygon(${clip})`;
    }
    return `<div class="lvl"><i style="${style}"></i></div>`;
  };

  // Keep a number with the word before it, and keep a kick count ("kick 1 · 2a · 3&") together so a
  // wrap moves the whole count to the next line; a count too long for a line breaks only after a "·".
  const KICK = /kick \d[ea&]?(?: · \d[ea&]?)*/gi;
  const glue = (t) => esc(t).replace(/ · /g, "\u00a0· ").replace(/([^·\s]) (\d)/g, "$1\u00a0$2");
  const cueHtml = (c) => {
    let out = "", last = 0;
    for (const m of c.matchAll(KICK)) {
      out += glue(c.slice(last, m.index)) + `<span class="kc">${glue(m[0])}</span>`;
      last = m.index + m[0].length;
    }
    return out + glue(c.slice(last));
  };

  // marks a section played with quarter crashes (`crashes: true`), in a fixed spot at the end of the row
  const CYMBAL = `<svg viewBox="1 5 22 18" aria-label="Quarter crashes"><ellipse cx="12" cy="9" rx="10" ry="3.2"/><ellipse cx="12" cy="7.6" rx="2.4" ry="1.2" class="bell"/><path d="M12 12.2V22M8.5 22h7"/></svg>`;

  function renderStage() {
    const s = list[i];
    const stage = $("stage");
    if (!s) {
      stage.innerHTML = `<p class="empty">No songs here.<br>Open the menu to pick a set.</p>`;
      return;
    }
    const notes = [
      s.week && `<div class="note week"><b>THIS WEEK</b>${esc(s.week)}</div>`,
      s.note && `<div class="note notes-only">${esc(s.note)}</div>`,
    ].filter(Boolean).join("");
    const sub = [
      s.leader && `<span class="lead">${esc(s.leader)}</span>`,
      s.artist && `<span>${esc(s.artist)}</span>`,
      s.length && `<span>${esc(s.length)}</span>`,
      s.time && `<span>${esc(s.time)}</span>`,
      s.status === "draft" && `<span class="tag draft">DRAFT</span>`,
    ].filter(Boolean).join("");
    // a section with `part` starts a new labelled block (e.g. "Act 2 · Big build"); row striping restarts per block
    let stripe = 0;
    const hasQ = s.s.some((r) => r.q);
    const rows = s.s.map((r, k) => {
      if (r.p) stripe = 0;
      const cls = [`row`, `l${Math.max(r.l, r.l2 ?? 0)}`, stripe++ % 2 && "alt", r.hot && "hot", now >= 0 && k < now && "past", k === now && "now"];
      const part = r.p ? `<li class="part${now >= 0 && k <= now ? " reached" : ""}"><span>${esc(r.p)}</span></li>` : "";
      return `${part}<li class="${cls.filter(Boolean).join(" ")}" data-k="${k}">
        ${lvlBar(r)}
        <div class="nm">${esc(r.n)}${r.x ? `<span class="x">×${r.x}</span>` : ""}</div>
        <div class="cue">${cueHtml(r.c || "")}</div>
        ${hasQ ? `<div class="qc">${r.q ? CYMBAL : ""}</div>` : ""}
        ${r.d ? `<div class="d">${esc(r.d)}</div>` : ""}
      </li>`;
    }).join("");
    stage.style.setProperty("--half", Math.ceil((s.s.length + s.s.filter((r) => r.p).length) / 2));
    stage.innerHTML = `
      <div class="head">
        <div class="t"><h1>${esc(s.title)}</h1>${sub ? `<div class="sub notes-only">${sub}</div>` : ""}</div>
        <div class="chips notes-only">
          ${s.key ? `<div class="chip${s.keyChanged ? " changed" : ""}"><small>KEY</small>${esc(s.key)}</div>` : ""}
          ${s.bpm ? `<button class="chip" id="bpm" aria-label="Flash tempo"><small>BPM</small>${esc(s.bpm)}</button>` : ""}
        </div>
      </div>
      ${notes ? `<div class="notes">${notes}</div>` : ""}
      <ol class="rows${hasQ ? " has-q" : ""}">${rows}</ol>`;
  }

  function renderChrome() {
    $("setname").textContent = route.kind === "set" ? fmtDate(route.set.date, { month: "short", day: "numeric" }) : "Custom";
    $("strip").innerHTML = list.map((s, k) =>
      `<button class="${k === i ? "on" : k < i ? "done" : ""}" data-k="${k}" aria-label="${esc(s.title)}">${k + 1}</button>`
    ).join("");
    const prev = list[i - 1], next = list[i + 1];
    $("prev").disabled = !prev;
    $("prev").innerHTML = prev ? `<small>‹ Prev</small><span>${esc(prev.title)}</span>` : `<small>Start</small><span>—</span>`;
    $("next").disabled = !next;
    $("next").innerHTML = next
      ? `<small>Next ›</small><span>${esc(next.title)}</span>`
      : `<small>End of set</small><span>—</span>`;
  }

  function render() {
    stopMetro();
    renderChrome();
    renderStage();
    fit();
    history.replaceState(null, "", routeHash(route, i));
    store.set("last", { hash: routeHash(route, i), at: Date.now() });
  }

  // Scale everything in the stage so the whole song map fits on one screen – never scroll.
  function fit() {
    const stage = $("stage");
    if (rehearse) { stage.style.setProperty("--k", 1.05); return; }
    const fits = () => stage.scrollHeight <= stage.clientHeight + 1 && stage.scrollWidth <= stage.clientWidth + 1;
    let lo = 0.45, hi = 1.35;
    for (let n = 0; n < 16; n++) {
      const mid = (lo + hi) / 2;
      stage.style.setProperty("--k", mid);
      fits() ? (lo = mid) : (hi = mid);
    }
    stage.style.setProperty("--k", lo);
  }

  // ---------- tempo flash (tap BPM) ----------
  function stopMetro() {
    clearInterval(metro);
    metro = null;
    document.getElementById("bpm")?.classList.remove("beat");
  }
  function toggleMetro() {
    const s = list[i];
    if (metro) return stopMetro();
    const el = $("bpm");
    const beat = () => { el.classList.add("beat"); setTimeout(() => el.classList.remove("beat"), 110); };
    beat();
    metro = setInterval(beat, 60000 / s.bpm);
  }

  // ---------- "you are here" marker ----------
  function mark(k) {
    const n = list[i]?.s.length || 0;
    now = k < 0 || k >= n ? -1 : k;
    renderStage();
    fit();
  }

  // ---------- menu ----------
  let picks = [];
  const pickId = (song, variant) => song + (variant ? ":" + variant : "");

  function renderMenu() {
    const up = upcomingSet();
    $("set-list").innerHTML = [...setsByDate].reverse().map((s) => {
      const titles = s.items.map((it) => resolve(it)?.title).filter(Boolean).join(" · ");
      const isCur = route?.kind === "set" && route.set.id === s.id;
      const side = isCur ? "OPEN" : s === up && s.date >= today() ? "NEXT UP" : "";
      return `<li><button class="${s === up ? "upcoming" : ""} ${isCur ? "current" : ""}" data-set="${esc(s.id)}">
        <span class="big">${esc(s.title || fmtDate(s.date))}</span><span class="meta">${esc(titles)}</span>
        <span class="side">${side}</span></button></li>`;
    }).join("") || `<li class="status">No sets yet – add one in sets/.</li>`;

    const all = [];
    Object.values(SONGS).sort((a, b) => a.title.localeCompare(b.title)).forEach((s) => {
      all.push({ id: pickId(s.id), song: resolve({ song: s.id }) });
      Object.keys(s.variants || {}).forEach((v) => all.push({ id: pickId(s.id, v), song: resolve({ song: s.id, variant: v }) }));
    });
    $("song-list").innerHTML = all.map(({ id, song }) => {
      const n = picks.indexOf(id);
      const meta = [song.key, song.bpm && song.bpm + " bpm", song.artist].filter(Boolean).join(" · ");
      return `<li><button class="${n >= 0 ? "picked" : ""}" data-pick="${esc(id)}">
        <span class="num">${n >= 0 ? n + 1 : ""}</span>
        <span class="big">${esc(song.title)}</span><span class="meta">${esc(meta)}</span></button></li>`;
    }).join("");
    $("build-go").disabled = !picks.length;
    $("build-go").textContent = picks.length ? `Open ${picks.length} song${picks.length > 1 ? "s" : ""}` : "Open set";
    $("status").innerHTML = statusText();
  }

  const openMenu = () => { renderMenu(); $("menu").hidden = false; };
  const closeMenu = () => { $("menu").hidden = true; };

  // ---------- keep the screen awake ----------
  let wake = null, wakeState = "unsupported";
  async function keepAwake() {
    if (!("wakeLock" in navigator) || document.visibilityState !== "visible" || (wake && !wake.released)) return;
    try {
      wake = await navigator.wakeLock.request("screen");
      wakeState = "on";
    } catch {
      wakeState = "blocked";
    }
  }
  function statusText() {
    const awake = {
      on: "Screen is being kept awake while the app is open.",
      blocked: "Couldn't keep the screen awake here – tap anywhere on the chart to retry, or set Settings › Display &amp; Brightness › Auto-Lock to Never for the service.",
      unsupported: "This browser can't keep the screen awake – set Settings › Display &amp; Brightness › Auto-Lock to Never for the service.",
    }[wakeState];
    return `${awake}<br><br>Tip: in Safari, Share › Add to Home Screen gives a full-screen app with more room for the chart.
      Tap a section to mark where you are; a Bluetooth page-turner works too (←/→ songs, ↑/↓ sections).`;
  }

  // ---------- events ----------
  $("strip").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-k]");
    if (b) { i = +b.dataset.k; now = -1; render(); }
  });
  $("prev").onclick = () => go(-1);
  $("next").onclick = () => go(1);
  $("mode-btn").onclick = () => {
    rehearse = !rehearse;
    document.body.classList.toggle("rehearse", rehearse);
    $("mode-btn").setAttribute("aria-pressed", rehearse);
    $("stage").scrollTop = 0;
    fit();
  };
  $("stage").addEventListener("click", (e) => {
    if (e.target.closest("#bpm")) return toggleMetro();
    const row = e.target.closest(".row");
    if (row) mark(+row.dataset.k === now ? -1 : +row.dataset.k);
  });
  $("menu-btn").onclick = openMenu;
  $("menu-close").onclick = closeMenu;
  $("set-list").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-set]");
    if (!b) return;
    open({ kind: "set", set: SETS.find((s) => s.id === b.dataset.set) });
    closeMenu();
  });
  $("song-list").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-pick]");
    if (!b) return;
    const id = b.dataset.pick, n = picks.indexOf(id);
    n >= 0 ? picks.splice(n, 1) : picks.push(id);
    renderMenu();
  });
  $("build-clear").onclick = () => { picks = []; renderMenu(); };
  $("build-go").onclick = () => {
    open({ kind: "custom", items: picks.map((p) => { const [song, variant] = p.split(":"); return { song, ...(variant ? { variant } : {}) }; }) });
    picks = [];
    closeMenu();
  };

  // swipe left/right on the chart to change songs
  let t0 = null;
  $("stage").addEventListener("touchstart", (e) => { t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
  $("stage").addEventListener("touchend", (e) => {
    if (!t0) return;
    const dx = e.changedTouches[0].clientX - t0.x, dy = e.changedTouches[0].clientY - t0.y;
    t0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  }, { passive: true });

  // keyboard and Bluetooth page-turner pedals
  document.addEventListener("keydown", (e) => {
    if (!$("menu").hidden) { if (e.key === "Escape") closeMenu(); return; }
    const k = e.key;
    if (k === "ArrowRight" || k === "PageDown" || k === " ") { e.preventDefault(); go(1); }
    else if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); go(-1); }
    else if (k === "ArrowDown") { e.preventDefault(); mark(now + 1 < (list[i]?.s.length || 0) ? now + 1 : now); }
    else if (k === "ArrowUp") { e.preventDefault(); mark(now - 1); }
  });

  addEventListener("resize", fit);
  addEventListener("orientationchange", () => setTimeout(fit, 250));
  document.fonts?.ready.then(fit);
  document.addEventListener("visibilitychange", keepAwake);
  document.addEventListener("pointerdown", keepAwake);
  addEventListener("hashchange", () => {
    const r = parseRoute(location.hash);
    if (r && location.hash !== routeHash(route, i)) open(r, r.i);
  });

  // ---------- start: link > where you left off (same day) > next upcoming set ----------
  let start = parseRoute(location.hash);
  const last = store.get("last");
  if (!start && last && Date.now() - last.at < 6 * 3600e3) start = parseRoute(last.hash);
  if (!start && upcomingSet()) start = { kind: "set", set: upcomingSet(), i: 0 };
  if (start) open(start, start.i);
  else { route = { kind: "custom", items: [] }; list = []; renderChrome(); renderStage(); openMenu(); }
  keepAwake();

  if ("serviceWorker" in navigator && location.protocol === "https:" && !/claude/.test(location.hostname)) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
