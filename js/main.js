/* ════════════════════════════════════════════════════════
   HUMAN'S DUTY · main.js
   The Descent of the Phoenix: scrub film, journey palette,
   ember field, cursor light, bilingual EN/AR engine.
   ════════════════════════════════════════════════════════ */
(() => {
"use strict";

const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TOUCH = matchMedia("(hover: none)").matches;
const MOBILE = () => innerWidth < 721;
const $ = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ─── UI strings (chrome labels; org content lives in content.json) ─── */
const UI = {
  en: {
    skip: "Skip to content", nav_story: "Our story", nav_work: "What we do",
    nav_projects: "Projects", nav_contact: "Contact us",
    story_title: "The road from 2004",
    donate_how: "Donate by bank transfer", donate_hint: "Details beside, tap any line to copy",
    foot_est: "EST 2011 · NOTIFICATION 137 · LEBANON",
    copy: "COPY", copied: "COPIED",
    phones: "Phone", emails: "Email", addresses: "Where we are",
    note: "From Bint Jbeil to all of Lebanon. Write to us in Arabic, English or French.",
    title: "Human's Duty | Together, we make a difference.",
    desc: "Human's Duty is a Lebanese NGO in Bint Jbeil, founded 2011 with roots since 2004. Vocational training, health, relief and awareness. Destroyed in 2024, rising again.",
    alt_archive: "Archive photograph", meters: "m", ground: "GROUND"
  },
  ar: {
    skip: "تجاوز إلى المحتوى", nav_story: "قصّتنا", nav_work: "ما نقوم به",
    nav_projects: "مشاريعنا", nav_contact: "تواصلوا معنا",
    story_title: "الطريق من 2004",
    donate_how: "تبرّعوا عبر التحويل المصرفي", donate_hint: "التفاصيل جانباً، اضغطوا أي سطر للنسخ",
    foot_est: "تأسست 2011 · علم وخبر 137 · لبنان",
    copy: "نسخ", copied: "تم النسخ",
    phones: "الهاتف", emails: "البريد", addresses: "أين نحن",
    note: "من بنت جبيل إلى كل لبنان. راسلونا بالعربية أو الإنكليزية أو الفرنسية.",
    title: "واجب الإنسان | معاً نصنع الفرق",
    desc: "«واجب الإنسان» جمعية لبنانية غير حكومية في بنت جبيل، تأسست عام 2011 وتمتد جذورها إلى 2004. تدريب مهني وصحة وإغاثة وتوعية. دُمّر مركزها عام 2024 وهي تنهض من جديد.",
    alt_archive: "صورة من الأرشيف", meters: "م", ground: "الأرض"
  }
};

let LANG = "en", C = null;
try { LANG = new URLSearchParams(location.search).get("lang") || localStorage.getItem("hd_lang") || "en"; } catch (e) {}
if (!["en", "ar"].includes(LANG)) LANG = "en";

const t = p => {
  if (p.startsWith("ui.")) return UI[LANG][p.slice(3)] ?? "";
  let o = C; for (const k of p.split(".")) { if (o == null) return null; o = o[k]; }
  if (o == null) return null;
  if (typeof o === "object") return o[LANG] ?? o.en ?? null;
  return o;
};

/* ═══ CONTENT LOAD ═══ */
async function loadContent() {
  try {
    const r = await fetch("content/content.json", { cache: "no-cache" });
    C = await r.json();
  } catch (e) { C = null; console.warn("content load failed", e); }
}

/* ═══ I18N APPLY ═══ */
function applyLang() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === "ar" ? "rtl" : "ltr";
  document.body.dataset.lang = LANG;
  document.title = UI[LANG].title;
  $('meta[name="description"]').setAttribute("content", UI[LANG].desc);
  $$("[data-t]").forEach(el => {
    const v = t(el.dataset.t);
    if (v != null) el.textContent = v;
  });
  const meta = C?.meta;
  if (meta) {
    $$('[data-t="meta.site_name_alt"]').forEach(el => el.textContent = LANG === "ar" ? meta.site_name.en : meta.site_name.ar);
    $$('[data-t="meta.tagline"]').forEach(el => { el.textContent = LANG === "ar" ? meta.tagline.en : meta.tagline.ar; el.setAttribute("lang", LANG === "ar" ? "en" : "ar"); el.setAttribute("dir", LANG === "ar" ? "ltr" : "rtl"); });
    $$('[data-t="meta.tagline_en"]').forEach(el => el.textContent = meta.tagline[LANG]);
  }
  $("#langBtn").setAttribute("aria-label", LANG === "en" ? "التبديل إلى العربية" : "Switch to English");
  buildDynamic();
}

/* ═══ DYNAMIC BUILDERS ═══ */
const ICONS = {
  coop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 21v-4a2 2 0 012-2h4a2 2 0 012 2v4M3 10l9-7 9 7M5 8.5V17a1 1 0 001 1h1M19 8.5V17a1 1 0 01-1 1h-1"/></svg>',
  health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3.5 12h4l2-5 3 9 2-6 1.5 2h4.5M12 21c-5-3.5-8-6.5-8-10a4.5 4.5 0 018-3 4.5 4.5 0 018 3c0 3.5-3 6.5-8 10z" stroke-linejoin="round"/></svg>',
  heritage: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 21h16M5 21V10M9 21V10M15 21V10M19 21V10M3 10h18L12 3z" stroke-linejoin="round"/></svg>',
  social: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="7.5" cy="8" r="2.5"/><circle cx="16.5" cy="8" r="2.5"/><path d="M2.5 19c.5-3.5 2.6-5 5-5s4.5 1.5 5 5M11.5 19c.5-3.5 2.6-5 5-5s4.5 1.5 5 5"/></svg>',
  education: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 8l10-4.5L22 8l-10 4.5zM6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5M22 8v5"/></svg>',
  relief: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 21s-7-4.2-7-9.5C5 8 7 6 9.3 6c1.2 0 2.2.5 2.7 1.4C12.5 6.5 13.5 6 14.7 6 17 6 19 8 19 11.5c0 5.3-7 9.5-7 9.5z" stroke-linejoin="round"/><path d="M8 12h2.2l1-2 1.6 4 1-2H16"/></svg>'
};
const TINTS = ["#14342B", "#1c2f3a", "#3a2a20", "#2A211C", "#1f3629", "#3a1f1c"];

function buildDynamic() {
  if (!C) return;
  /* about archive photos */
  const ap = $("#aboutPhotos");
  ap.innerHTML = "";
  (C.about.photos.length ? C.about.photos.slice(0, 3) : []).forEach(ph => {
    const f = document.createElement("figure");
    f.innerHTML = `<img src="${ph.src}" alt="${ph.caption?.[LANG] || UI[LANG].alt_archive}" loading="lazy"><figcaption>${ph.caption?.[LANG] || ""}</figcaption>`;
    ap.appendChild(f);
  });

  /* timeline rail */
  const rt = $("#railTrack");
  rt.innerHTML = "";
  C.timeline.forEach(w => {
    const li = document.createElement("li");
    li.className = "wp"; li.dataset.year = w.year;
    li.innerHTML = `
      <span class="wp-year">${w.year}</span>
      <div class="wp-card">
        ${w.image ? `<div class="wp-img"><img src="${w.image}" alt="" loading="lazy"></div>` : ""}
        <h3 class="wp-t">${w.title[LANG]}</h3>
        <p class="wp-b">${w.body[LANG]}</p>
      </div>`;
    rt.appendChild(li);
  });

  /* pillars bento */
  const bn = $("#bento");
  bn.innerHTML = "";
  C.pillars.forEach((p, i) => {
    const d = document.createElement("div");
    d.className = "cell" + (i === 0 || i === 5 ? " lg" : ""); d.tabIndex = 0;
    d.style.setProperty("--cell-tint", TINTS[i % TINTS.length]);
    d.innerHTML = `
      <div class="cell-bg${p.image ? " has-img" : ""}"${p.image ? ` style="background-image:url('${p.image}')"` : ""}></div>
      <span class="cell-ico" aria-hidden="true">${ICONS[p.icon] || ICONS.relief}</span>
      <h3 class="cell-t">${p.title[LANG]}</h3>
      <div class="cell-ar">${p.title[LANG === "en" ? "ar" : "en"]}</div>
      <p class="cell-b">${p.body[LANG]}</p>`;
    bn.appendChild(d);
  });

  /* projects accordion */
  const ac = $("#acc");
  ac.innerHTML = "";
  C.projects.forEach((p, i) => {
    const li = document.createElement("li");
    li.className = "slice";
    li.innerHTML = `
      <button class="slice-head" aria-expanded="false" id="ph${i}" aria-controls="pb${i}">
        <span class="slice-num">${String(i + 1).padStart(2, "0")}</span>
        <span class="slice-t">${p.title[LANG]}<i>${p.title[LANG === "en" ? "ar" : "en"]}</i></span>
        <span class="slice-tag">${p.tag[LANG]}</span>
        <span class="slice-x" aria-hidden="true"></span>
      </button>
      <div class="slice-body" id="pb${i}" role="region" aria-labelledby="ph${i}">
        <div class="slice-inner"><div class="slice-flex">
          <p class="slice-desc">${p.desc[LANG]}</p>
          ${p.image ? `<img class="slice-img" src="${p.image}" alt="${p.title[LANG]}" loading="lazy">` : ""}
        </div></div>
      </div>`;
    ac.appendChild(li);
  });
  wireAccordion();

  /* gallery */
  const mas = $("#mas"), gal = $("#gallery");
  mas.innerHTML = "";
  if (!C.gallery.length) gal.classList.add("empty");
  else {
    gal.classList.remove("empty");
    C.gallery.forEach(g => {
      const f = document.createElement("figure");
      f.innerHTML = `<img src="${g.src}" alt="${g.caption?.[LANG] || ""}" loading="lazy">${g.caption?.[LANG] ? `<figcaption>${g.caption[LANG]}</figcaption>` : ""}`;
      f.addEventListener("click", () => openLB(g));
      mas.appendChild(f);
    });
  }

  /* donation programs + bank */
  const dp = $("#donPrograms");
  dp.innerHTML = "";
  C.donation.programs.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p[LANG];
    dp.appendChild(li);
  });
  const bank = $("#bank");
  bank.innerHTML = "";
  C.donation.bank.forEach(r => {
    const row = document.createElement("div");
    row.className = "bank-row";
    row.innerHTML = `<dt>${r.label[LANG]}</dt><dd>${r.value}</dd>`;
    if (r.copy) {
      const b = document.createElement("button");
      b.className = "bank-copy"; b.textContent = UI[LANG].copy;
      b.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(r.value); } catch (e) {}
        b.textContent = UI[LANG].copied; b.classList.add("done");
        setTimeout(() => { b.textContent = UI[LANG].copy; b.classList.remove("done"); }, 1600);
      });
      row.appendChild(b);
    }
    bank.appendChild(row);
  });

  /* contact */
  const cg = $("#conGrid");
  cg.innerHTML = "";
  const mk = (h, inner) => { const d = document.createElement("div"); d.className = "con-block"; d.innerHTML = `<h3>${h}</h3>${inner}`; return d; };
  cg.appendChild(mk(UI[LANG].phones, C.contact.phones.map(p => `<a href="tel:${p.replace(/\s/g, "")}" dir="ltr">${p}</a>`).join("")));
  cg.appendChild(mk(UI[LANG].emails, C.contact.emails.map(e => `<a href="mailto:${e}">${e}</a>`).join("")));
  cg.appendChild(mk(UI[LANG].addresses, C.contact.addresses.map(a => `<p>${a[LANG]}</p>`).join("") + `<p class="con-note">${UI[LANG].note}</p>`));
}

/* accordion */
function wireAccordion() {
  $$(".slice-head").forEach(h => {
    h.addEventListener("click", () => {
      const li = h.closest(".slice");
      const open = li.classList.contains("open");
      $$(".slice.open").forEach(s => { s.classList.remove("open"); $(".slice-head", s).setAttribute("aria-expanded", "false"); });
      if (!open) { li.classList.add("open"); h.setAttribute("aria-expanded", "true"); }
    });
  });
}

/* lightbox */
let lbIndex = -1;
function openLB(g) {
  lbIndex = C ? C.gallery.indexOf(g) : -1;
  const lb = $("#lightbox");
  $("#lbImg").src = g.src;
  $("#lbImg").alt = g.caption?.[LANG] || "";
  $("#lbCap").textContent = g.caption?.[LANG] || "";
  lb.hidden = false;
  document.body.style.overflow = "hidden";
}
function stepLB(d) {
  if (!C || !C.gallery.length || lbIndex < 0) return;
  lbIndex = (lbIndex + d + C.gallery.length) % C.gallery.length;
  openLB(C.gallery[lbIndex]);
}
$("#lbX").addEventListener("click", closeLB);
$("#lbPrev").addEventListener("click", () => stepLB(-1));
$("#lbNext").addEventListener("click", () => stepLB(1));
$("#lightbox").addEventListener("click", e => { if (e.target.id === "lightbox") closeLB(); });
addEventListener("keydown", e => {
  if ($("#lightbox").hidden) return;
  if (e.key === "Escape") closeLB();
  if (e.key === "ArrowRight") stepLB(1);
  if (e.key === "ArrowLeft") stepLB(-1);
});
function closeLB() { $("#lightbox").hidden = true; document.body.style.overflow = ""; }

/* ═══ JOURNEY PALETTE ═══ */
const STOPS = [
  { at: 0.00, bg: [11, 9, 8],    cur: "#F2A33C" },
  { at: 0.13, bg: [20, 14, 12],  cur: "#F2A33C" },
  { at: 0.30, bg: [16, 30, 24],  cur: "#E2483D" },
  { at: 0.44, bg: [5, 4, 3],     cur: "#F2A33C" },
  { at: 0.58, bg: [20, 52, 43],  cur: "#2AA187" },
  { at: 0.72, bg: [31, 47, 38],  cur: "#F2A33C" },
  { at: 0.84, bg: [58, 47, 36],  cur: "#F2A33C" },
  { at: 1.00, bg: [58, 47, 36],  cur: "#1B7FA6" }
];
let journeyRGB = [11, 9, 8];
function journey(p) {
  let a = STOPS[0], b = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++)
    if (p >= STOPS[i].at && p <= STOPS[i + 1].at) { a = STOPS[i]; b = STOPS[i + 1]; break; }
  const tt = b.at === a.at ? 0 : (p - a.at) / (b.at - a.at);
  journeyRGB = a.bg.map((v, i) => Math.round(lerp(v, b.bg[i], tt)));
  document.body.style.background = `rgb(${journeyRGB})`;
  document.documentElement.style.setProperty("--cur-hue", tt > .5 ? b.cur : a.cur);
}

/* ═══ ATMOSPHERE (embers) ═══ */
function atmo() {
  if (RM) return;
  const cv = $("#atmo"), ctx = cv.getContext("2d");
  let W, H, P = [], mx = -1e3, my = -1e3, wind = 0;
  const N = () => (MOBILE() ? 46 : 110);
  const rs = () => { W = cv.width = innerWidth * devicePixelRatio; H = cv.height = innerHeight * devicePixelRatio; cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px"; };
  rs(); addEventListener("resize", rs);
  addEventListener("pointermove", e => { wind = (e.clientX * devicePixelRatio - mx) * .02; mx = e.clientX * devicePixelRatio; my = e.clientY * devicePixelRatio; }, { passive: true });
  const spawn = () => ({
    x: Math.random() * W, y: H + Math.random() * H * .2,
    r: (Math.random() * 1.6 + .5) * devicePixelRatio,
    vy: (Math.random() * .5 + .18) * devicePixelRatio,
    vx: (Math.random() - .5) * .25 * devicePixelRatio,
    tw: Math.random() * Math.PI * 2, life: 1
  });
  for (let i = 0; i < N(); i++) { const p = spawn(); p.y = Math.random() * H; P.push(p); }
  let last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (document.hidden || ts - last < 1000 / 45) return;
    last = ts;
    ctx.clearRect(0, 0, W, H);
    const warm = journeyRGB[0] > journeyRGB[2] + 8;
    const cool = journeyRGB[1] > journeyRGB[0];
    while (P.length < N()) P.push(spawn());
    if (P.length > N()) P.length = N();
    for (const p of P) {
      p.tw += .045;
      const d = Math.hypot(p.x - mx, p.y - my);
      const push = d < 160 * devicePixelRatio ? (1 - d / (160 * devicePixelRatio)) * 1.6 : 0;
      p.x += p.vx + wind * .4 + (p.x - mx) / (d || 1) * push;
      p.y += -p.vy + (p.y - my) / (d || 1) * push * .5;
      if (p.y < -20 || p.x < -20 || p.x > W + 20) Object.assign(p, spawn());
      const a = (Math.sin(p.tw) * .35 + .5) * .8;
      const col = cool && Math.random() < .4 ? `42,161,135` : warm ? `242,163,60` : `226,114,61`;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${col},${a})`;
      ctx.shadowBlur = 8 * devicePixelRatio;
      ctx.shadowColor = `rgba(${col},.8)`;
      ctx.arc(p.x, p.y, p.r * (0.8 + Math.sin(p.tw) * .25), 0, 7);
      ctx.fill();
    }
    wind *= .9;
  }
  requestAnimationFrame(frame);
}

/* ═══ CURSOR ═══ */
function cursor() {
  if (TOUCH || RM) return;
  const c = $("#cur");
  const trail = [0, 1].map(i => {
    const d = document.createElement("span");
    d.className = "cur-t";
    document.body.appendChild(d);
    return { el: d, x: -100, y: -100, k: .12 - i * .05 };
  });
  let x = -100, y = -100, tx = x, ty = y, shown = false;
  addEventListener("pointermove", e => {
    tx = e.clientX; ty = e.clientY;
    if (!shown) { shown = true; c.classList.add("on"); x = tx; y = ty; }
  }, { passive: true });
  document.addEventListener("mouseleave", () => { c.classList.remove("on"); trail.forEach(t => t.el.style.opacity = 0); shown = false; });
  (function loop() {
    x = lerp(x, tx, .22); y = lerp(y, ty, .22);
    c.style.transform = `translate(${x}px,${y}px)`;
    const speed = Math.hypot(tx - x, ty - y);
    trail.forEach((t, i) => {
      t.x = lerp(t.x, x, t.k * 2); t.y = lerp(t.y, y, t.k * 2);
      t.el.style.transform = `translate(${t.x - 2}px,${t.y - 2}px)`;
      t.el.style.opacity = shown ? Math.min(.55, speed * .02) * (1 - i * .4) : 0;
    });
    requestAnimationFrame(loop);
  })();
  const grow = e => c.classList.toggle("grow", !!e.target.closest("a,button,.slice-head,.mas figure,[data-cur]"));
  addEventListener("pointerover", grow, { passive: true });
  addEventListener("pointerout", grow, { passive: true });
}

/* ═══ MAGNETIC ═══ */
function magnetic() {
  if (TOUCH || RM) return;
  $$(".donate-nav,.cta-story,.don-cta").forEach(el => {
    let raf;
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => el.style.transform = `translate(${dx * .18}px,${dy * .3}px)`);
    });
    el.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      el.style.transition = "transform .5s cubic-bezier(.34,1.56,.5,1)";
      el.style.transform = "";
      setTimeout(() => el.style.transition = "", 500);
    });
  });
}

/* ═══ HERO FILM ═══ */
const film = { mode: "none", frames: [], count: 0, img: null, ready: 0 };
async function initFilm() {
  const cv = $("#film"), ctx = cv.getContext("2d");
  const fit = () => { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; };
  fit(); addEventListener("resize", () => { fit(); draw(lastP); });
  let manifest = null;
  try { manifest = await (await fetch("assets/video/frames.json", { cache: "force-cache" })).json(); } catch (e) {}
  if (manifest && manifest.count) {
    film.mode = "frames";
    const mob = MOBILE() && manifest.mobile;
    film.count = mob ? manifest.mobile.count : manifest.count;
    film.base = mob ? manifest.mobile.base : manifest.base;
    film.ext = manifest.ext || ".webp"; film.pad = manifest.pad || 4;
    film.frames = new Array(film.count).fill(null);
    const load = i => {
      if (i < 0 || i >= film.count || film.frames[i]) return;
      const im = new Image();
      im.src = film.base + String(i + 1).padStart(film.pad, "0") + film.ext;
      im.decode?.().catch(() => {});
      film.frames[i] = im;
    };
    film.load = load;
    for (let i = 0; i < film.count; i += 6) load(i);
    load(0); load(film.count - 1);
  } else {
    const im = new Image();
    im.src = "assets/img/hero-still.webp";
    try { await im.decode(); film.mode = "still"; film.img = im; } catch (e) { film.mode = "proc"; }
  }
  let lastP = 0;
  function cover(im, scale = 1, ox = 0, oy = 0) {
    const cw = cv.width, ch = cv.height, iw = im.naturalWidth, ih = im.naturalHeight;
    if (!iw) return;
    const s = Math.max(cw / iw, ch / ih) * scale;
    const w = iw * s, h = ih * s;
    ctx.drawImage(im, (cw - w) / 2 + ox * cw, (ch - h) / 2 + oy * ch, w, h);
  }
  function draw(p) {
    lastP = p;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (film.mode === "frames") {
      let i = Math.round(p * (film.count - 1));
      film.load(i); film.load(i + 1); film.load(i + 2); film.load(i - 1);
      let im = null;
      for (let k = 0; k < film.count; k++) {
        const a = film.frames[i - k], b = film.frames[i + k];
        if (a && a.complete && a.naturalWidth) { im = a; break; }
        if (b && b.complete && b.naturalWidth) { im = b; break; }
      }
      if (im) cover(im);
    } else if (film.mode === "still") {
      cover(film.img, 1 + p * .22, 0, p * .06);
      ctx.fillStyle = `rgba(11,9,8,${p * .35})`;
      ctx.fillRect(0, 0, cv.width, cv.height);
    } else {
      /* procedural fire sky */
      const g = ctx.createLinearGradient(0, 0, 0, cv.height);
      g.addColorStop(0, "#0B0908");
      g.addColorStop(.55, `rgb(${Math.round(40 + p * 80)},${Math.round(18 + p * 50)},12)`);
      g.addColorStop(1, `rgb(${Math.round(120 + p * 100)},${Math.round(60 + p * 80)},${Math.round(30 + p * 40)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
    }
  }
  film.draw = draw;
  draw(0);
}

/* ═══ SCENES (GSAP) ═══ */
function scenes() {
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

  /* Lenis bridge */
  if (!RM) {
    const lenis = new Lenis({ autoRaf: false, lerp: .1, wheelMultiplier: 1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(ts => lenis.raf(ts * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
      const id = a.getAttribute("href");
      if (id.length > 1 && $(id)) { e.preventDefault(); lenis.scrollTo(id, { offset: 0, duration: 1.6 }); $("#mnav").classList.remove("open"); $("#burger").setAttribute("aria-expanded", "false"); }
    }));
  }

  /* journey progress across whole page */
  ScrollTrigger.create({
    start: 0, end: () => document.documentElement.scrollHeight - innerHeight,
    onUpdate: st => journey(st.progress)
  });

  /* nav */
  const nav = $("#nav");
  ScrollTrigger.create({ start: 40, onToggle: st => nav.classList.toggle("solid", st.isActive) });
  const lightZones = new Set();
  ["#donate", "#contact"].forEach(sel => {
    ScrollTrigger.create({
      trigger: sel, start: "top 64px", end: "bottom 64px",
      onToggle: st => {
        st.isActive ? lightZones.add(sel) : lightZones.delete(sel);
        nav.classList.toggle("lightzone", lightZones.size > 0);
      }
    });
  });

  const chapters = $$(".chapter");
  const lock = $("#heroLockup");
  const altiFill = $("#altiFill"), altiRead = $("#altiRead");

  if (!RM) {
    /* HERO scrub pin */
    gsap.timeline({
      scrollTrigger: {
        trigger: "#hero", start: "top top",
        end: () => "+=" + (MOBILE() ? innerHeight * 2.2 : innerHeight * 3.6),
        pin: "#heroPin", pinSpacing: true, scrub: .6,
        onUpdate: st => {
          const p = st.progress;
          film.draw?.(p);
          altiFill.style.height = (p * 100) + "%";
          const m = Math.round(2100 * (1 - p));
          altiRead.textContent = m > 12 ? m + UI[LANG].meters : UI[LANG].ground;
          /* lockup */
          const lp = clamp(p / .14, 0, 1);
          lock.style.opacity = 1 - lp;
          lock.style.transform = `translateY(${lp * -60}px) scale(${1 - lp * .06})`;
          lock.style.visibility = lp >= 1 ? "hidden" : "visible";
          /* chapters */
          const R = [[.16, .40], [.42, .66], [.68, .92]];
          chapters.forEach((ch, i) => {
            const [a, b] = R[i];
            const vis = p > a && p < b;
            const cp = clamp((p - a) / (b - a), 0, 1);
            const eIn = clamp(cp / .22, 0, 1), eOut = clamp((1 - cp) / .22, 0, 1);
            const o = Math.min(eIn, eOut);
            ch.style.visibility = vis ? "visible" : "hidden";
            ch.style.opacity = o;
            ch.style.transform = `translateY(${(1 - eIn) * 44 + (1 - eOut) * -30}px)`;
          });
        }
      }
    });
  } else { film.draw?.(0); }

  /* chapters content */
  function fillChapters() {
    if (!C) return;
    chapters.forEach((ch, i) => {
      $(".ch-t", ch).textContent = C.hero.chapters[i].title[LANG];
      $(".ch-s", ch).textContent = C.hero.chapters[i].sub[LANG];
    });
  }
  fillChapters();
  document.addEventListener("hd:lang", fillChapters);

  /* ABOUT photo drift + headline slide */
  if (!RM) {
    gsap.utils.toArray(".about-photos figure").forEach((f, i) => {
      gsap.to(f, { yPercent: -14 - i * 8, scrollTrigger: { trigger: "#about", start: "top bottom", end: "bottom top", scrub: 1 } });
    });
    slideWords(".about .sec-title");
    slideWords(".pillars .sec-title"); slideWords(".projects .sec-title");
    slideWords(".gallery .sec-title"); slideWords(".contact .sec-title");
  }

  /* STORY RAIL */
  const track = $("#railTrack"), ghost = $("#storyGhost"), spark = $("#railSpark");
  if (!RM && !MOBILE()) {
    const RTL = () => document.documentElement.dir === "rtl";
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + innerWidth * .1);
    gsap.to(track, {
      x: () => (RTL() ? dist() : -dist()), ease: "none",
      scrollTrigger: {
        trigger: "#story", start: "top top", end: () => "+=" + (dist() + innerHeight * .4),
        pin: "#storyPin", scrub: .7, invalidateOnRefresh: true,
        onUpdate: st => {
          const p = st.progress;
          ghost.style.transform = `translateY(-50%) translateX(${(RTL() ? 1 : -1) * p * 30}%)`;
          spark.style.left = (RTL() ? 100 - p * 100 : p * 100) + "%";
          const yrs = C ? C.timeline.map(w => w.year) : ["2004"];
          const yi = Math.min(yrs.length - 1, Math.floor(p * yrs.length));
          if (ghost.textContent !== yrs[yi]) ghost.textContent = yrs[yi];
        }
      }
    });
  } else {
    /* mobile / RM: native horizontal scroll */
    $("#storyPin").style.height = "auto";
    $("#storyPin").style.padding = "5rem 0";
    const rail = $("#rail");
    rail.style.overflowX = "auto";
    rail.style.scrollSnapType = "x proximity";
    track.style.width = "max-content";
    $$(".wp").forEach(w => w.style.scrollSnapAlign = "center");
    ghost.style.fontSize = "9rem"; ghost.style.opacity = ".6";
  }

  /* MEMORIAL spotlight */
  const mem = $("#memorial");
  if (!TOUCH && !RM) {
    mem.addEventListener("pointermove", e => {
      const r = mem.getBoundingClientRect();
      mem.style.setProperty("--sx", ((e.clientX - r.left) / r.width * 100) + "%");
      mem.style.setProperty("--sy", ((e.clientY - r.top) / r.height * 100) + "%");
    }, { passive: true });
  } else if (!RM) {
    let tt = 0;
    setInterval(() => {
      tt += .016;
      mem.style.setProperty("--sx", (50 + Math.sin(tt * .7) * 26) + "%");
      mem.style.setProperty("--sy", (52 + Math.cos(tt * .5) * 18) + "%");
    }, 40);
  }
  if (!RM) {
    gsap.from(".mem-line", { y: 70, scrollTrigger: { trigger: mem, start: "top 70%", end: "top 25%", scrub: 1 } });
    gsap.from(".mem-body", { y: 50, scrollTrigger: { trigger: mem, start: "top 55%", end: "top 15%", scrub: 1 } });
  }

  /* bento cells slide in */
  if (!RM) {
    ScrollTrigger.batch(".cell", {
      start: "top 88%",
      onEnter: els => gsap.fromTo(els, { y: 46 }, { y: 0, duration: .9, ease: "power3.out", stagger: .08 })
    });
    ScrollTrigger.batch(".slice", {
      start: "top 92%",
      onEnter: els => gsap.fromTo(els, { x: innerWidth * .04 }, { x: 0, duration: .8, ease: "power3.out", stagger: .05 })
    });
    ScrollTrigger.batch(".mas figure", {
      start: "top 92%",
      onEnter: els => gsap.fromTo(els, { y: 40, scale: .98 }, { y: 0, scale: 1, duration: .9, ease: "power3.out", stagger: .06 })
    });
  }
}

/* word-slide headline (transform only; AR splits by word, shaping safe) */
function slideWords(sel) {
  const el = $(sel);
  if (!el || el.dataset.split) return;
  el.dataset.split = "1";
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map(w => `<span style="display:inline-block;overflow:hidden;vertical-align:top"><span style="display:inline-block">${w}</span></span>`).join(" ");
  const inner = $$("span > span", el);
  gsap.fromTo(inner, { yPercent: 108 }, {
    yPercent: 0, duration: 1, ease: "power4.out", stagger: .07,
    scrollTrigger: { trigger: el, start: "top 86%" }
  });
}

/* ═══ NAV / MENU / LANG ═══ */
function chrome() {
  const burger = $("#burger"), mnav = $("#mnav");
  burger.addEventListener("click", () => {
    const open = mnav.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
    mnav.setAttribute("aria-hidden", !open);
  });
  $("#langBtn").addEventListener("click", () => {
    LANG = LANG === "en" ? "ar" : "en";
    try { localStorage.setItem("hd_lang", LANG); } catch (e) {}
    applyLang();
    document.dispatchEvent(new Event("hd:lang"));
    ScrollTrigger.refresh();
  });
}

/* ═══ BOOT ═══ */
async function boot() {
  const t0 = performance.now();
  await loadContent();
  applyLang();
  await initFilm();
  scenes();
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  chrome();
  cursor();
  magnetic();
  atmo();
  document.dispatchEvent(new Event("hd:lang"));
  const wait = Math.max(0, 900 - (performance.now() - t0));
  setTimeout(() => $("#ignite").classList.add("out"), wait);
  setTimeout(() => ScrollTrigger.refresh(), wait + 400);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

})();
