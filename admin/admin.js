/* ═══════════════════════════════════════════════════
   HUMAN'S DUTY · Admin (GitHub-backed CMS, no server)
   Content lives in content/content.json in the repo.
   Images are committed under assets/gallery/.
   ═══════════════════════════════════════════════════ */
(() => {
"use strict";
const $ = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
const API = "https://api.github.com";

let TOKEN = "", CFG = { ...window.HD_REPO }, DATA = null, SHA = null;
let dirty = false, uploads = []; /* {path, blobB64, previewUrl} */
const MODE = CFG.mode === "php" ? "php" : "github"; /* "github" = GitHub Pages · "php" = self-hosted (Hostinger etc.) */

const enc = s => btoa(unescape(encodeURIComponent(s)));
const dec = s => decodeURIComponent(escape(atob(s.replace(/\n/g, ""))));

/* ── GitHub client ── */
async function gh(path, opts = {}) {
  const r = await fetch(API + path, {
    ...opts,
    headers: {
      "Authorization": "Bearer " + TOKEN,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers || {})
    }
  });
  if (!r.ok) {
    const tx = await r.text();
    throw new Error(r.status + " " + tx.slice(0, 180));
  }
  return r.status === 204 ? null : r.json();
}
const repoPath = p => `/repos/${CFG.owner}/${CFG.repo}/contents/${p}`;

/* ── PHP backend client (self-hosted variant) ── */
async function php(action, payload) {
  const opts = payload
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) }
    : {};
  const r = await fetch("api.php" + (payload ? "" : "?action=" + action), opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.status);
  return j;
}

async function fetchContent() {
  if (MODE === "php") {
    const j = await php("content");
    DATA = j.content; SHA = null;
    return;
  }
  const j = await gh(repoPath("content/content.json") + `?ref=${CFG.branch}`);
  SHA = j.sha;
  DATA = JSON.parse(dec(j.content));
}
async function putFile(path, b64, msg, sha) {
  const body = { message: msg, content: b64, branch: CFG.branch };
  if (sha) body.sha = sha;
  return gh(repoPath(path), { method: "PUT", body: JSON.stringify(body) });
}

/* ── state helpers ── */
const get = p => p.split(".").reduce((o, k) => o?.[k], DATA);
const set = (p, v) => {
  const ks = p.split("."), last = ks.pop();
  let o = DATA; for (const k of ks) o = o[k];
  o[last] = v;
  markDirty();
};
function markDirty() {
  dirty = true;
  $("#publish").disabled = false;
  setState("Unpublished changes", "");
}
function setState(msg, cls) {
  const el = $("#pubState");
  el.textContent = msg;
  el.className = "pub-state " + (cls || "");
}

/* ── login ── */
async function init() {
  if (MODE === "php") {
    $("#repoDet").hidden = true;
    $("#remember").closest("label").hidden = true;
    const lab = $("#tok").closest("label");
    lab.firstChild.textContent = "Password";
    $("#tok").placeholder = "";
    $(".hint").textContent = "Enter the admin password to manage the website content.";
    try {
      const st = await php("status");
      if (!st.setup) {
        lab.firstChild.textContent = "Choose an admin password (min 8 characters)";
        $(".hint").textContent = "First time here: set the admin password for this website.";
        $("#loginBtn").textContent = "Set password and open";
        $("#loginBtn").dataset.setup = "1";
      } else if (st.authed) {
        await enter();
        return;
      }
    } catch (e) { $("#loginErr").textContent = "Backend not reachable: " + e.message; }
  } else {
    try {
      const saved = JSON.parse(localStorage.getItem("hd_admin") || "null");
      if (saved) { $("#tok").value = saved.token || ""; CFG = { ...CFG, ...saved.cfg }; }
    } catch (e) {}
    $("#owner").value = CFG.owner || "";
    $("#repo").value = CFG.repo || "humansduty";
    $("#branch").value = CFG.branch || "main";
    if (!CFG.owner) $("#repoDet").open = true;
  }
  $("#loginBtn").addEventListener("click", login);
  $("#tok").addEventListener("keydown", e => e.key === "Enter" && login());
}
async function enter() {
  await fetchContent();
  $("#login").hidden = true;
  $("#dash").hidden = false;
  buildAll();
  setState(MODE === "php" ? "Loaded" : "Loaded · " + CFG.owner + "/" + CFG.repo, "ok");
}
async function login() {
  const err = $("#loginErr");
  err.textContent = "";
  $("#loginBtn").textContent = "Connecting...";
  try {
    if (MODE === "php") {
      const pw = $("#tok").value;
      if ($("#loginBtn").dataset.setup) await php("setup", { password: pw });
      else await php("login", { password: pw });
      await enter();
      return;
    }
    TOKEN = $("#tok").value.trim();
    CFG.owner = $("#owner").value.trim();
    CFG.repo = $("#repo").value.trim();
    CFG.branch = $("#branch").value.trim() || "main";
    if (!TOKEN || !CFG.owner || !CFG.repo) { err.textContent = "Token, owner and repository are required."; $("#loginBtn").textContent = "Open dashboard"; return; }
    await enter();
    if ($("#remember").checked) {
      try { localStorage.setItem("hd_admin", JSON.stringify({ token: TOKEN, cfg: CFG })); } catch (e) {}
    }
  } catch (e) {
    err.textContent = "Could not load content: " + e.message;
  }
  $("#loginBtn").textContent = $("#loginBtn").dataset.setup ? "Set password and open" : "Open dashboard";
}
$("#logout")?.addEventListener("click", async () => {
  if (MODE === "php") { try { await php("logout", {}); } catch (e) {} }
  try { localStorage.removeItem("hd_admin"); } catch (e) {}
  location.reload();
});

/* ── tabs ── */
$("#tabs").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  $$("#tabs button").forEach(x => x.classList.toggle("on", x === b));
  $$(".pane").forEach(p => p.classList.toggle("on", p.dataset.pane === b.dataset.tab));
});

/* ── generic field factories ── */
function fDuo(label, path, kind = "input") {
  const w = document.createElement("div");
  w.innerHTML = `<label>${label}</label>`;
  const duo = document.createElement("div");
  duo.className = "duo";
  ["en", "ar"].forEach(l => {
    const el = document.createElement(kind === "area" ? "textarea" : "input");
    if (kind !== "area") el.type = "text";
    el.value = get(path)?.[l] ?? "";
    el.dir = l === "ar" ? "rtl" : "ltr";
    el.placeholder = l.toUpperCase();
    el.addEventListener("input", () => set(path + "." + l, el.value));
    duo.appendChild(el);
  });
  w.appendChild(duo);
  return w;
}
function fOne(label, path, kind = "input") {
  const w = document.createElement("div");
  const el = document.createElement(kind === "area" ? "textarea" : "input");
  if (kind !== "area") el.type = "text";
  el.value = get(path) ?? "";
  el.addEventListener("input", () => set(path, el.value));
  w.innerHTML = `<label>${label}</label>`;
  w.appendChild(el);
  return w;
}
function grp(title, ...fields) {
  const g = document.createElement("div");
  g.className = "grp";
  g.innerHTML = `<h2>${title}</h2>`;
  const b = document.createElement("div");
  b.className = "grp-body";
  fields.forEach(f => b.appendChild(f));
  g.appendChild(b);
  return g;
}
function imgField(label, path) {
  const w = document.createElement("div");
  w.innerHTML = `<label>${label}</label>`;
  const row = document.createElement("div");
  row.className = "imgrow";
  const render = () => {
    row.innerHTML = "";
    const src = get(path);
    row.insertAdjacentHTML("afterbegin", src ? `<img src="${src.startsWith("data:") ? src : "../" + src}" alt="">` : `<span class="noimg">no image</span>`);
    const pick = document.createElement("label");
    pick.className = "linklike";
    pick.innerHTML = `choose image<input type="file" accept="image/*" hidden>`;
    pick.querySelector("input").addEventListener("change", async e => {
      const f = e.target.files[0]; if (!f) return;
      const { b64, preview, name } = await processImage(f, 1200);
      const path2 = "assets/gallery/" + name;
      uploads.push({ path: path2, b64 });
      set(path, path2);
      row.querySelector("img,.noimg").outerHTML = `<img src="${preview}" alt="">`;
    });
    const clear = document.createElement("button");
    clear.className = "mini del"; clear.type = "button"; clear.textContent = "remove";
    clear.style.cssText = "border:1px solid var(--line);background:none;color:var(--dim);padding:.3rem .6rem;cursor:pointer;font-size:.7rem";
    clear.addEventListener("click", () => { set(path, ""); render(); });
    row.append(pick, clear);
  };
  render();
  w.appendChild(row);
  return w;
}

/* ── image processing: resize + webp ── */
let seq = 0;
async function processImage(file, maxW = 1600) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i); i.onerror = rej;
    i.src = URL.createObjectURL(file);
  });
  const scale = Math.min(1, maxW / img.naturalWidth);
  const cv = document.createElement("canvas");
  cv.width = Math.round(img.naturalWidth * scale);
  cv.height = Math.round(img.naturalHeight * scale);
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  const blob = await new Promise(r => cv.toBlob(r, "image/webp", .82));
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = ""; const CH = 0x8000;
  for (let i = 0; i < buf.length; i += CH) bin += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
  const name = Date.now().toString(36) + (seq++) + "-" + file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]/gi, "").slice(0, 40).toLowerCase() + ".webp";
  return { b64: btoa(bin), preview: cv.toDataURL("image/webp", .82), name };
}

/* ── list editors ── */
const LISTS = {
  timeline: {
    holder: "#listTimeline", title: it => (it.year || "?") + " · " + (it.title?.en || ""),
    blank: () => ({ year: "", title: { en: "", ar: "" }, body: { en: "", ar: "" }, image: "" }),
    fields: (base, i) => [fOne("Year", `${base}.year`), fDuo("Title", `${base}.title`), fDuo("Text", `${base}.body`, "area"), imgField("Photo", `${base}.image`)]
  },
  projects: {
    holder: "#listProjects", title: it => it.title?.en || "New project",
    blank: () => ({ id: "p" + Date.now().toString(36), title: { en: "", ar: "" }, desc: { en: "", ar: "" }, image: "", tag: { en: "", ar: "" } }),
    fields: base => [fDuo("Title", `${base}.title`), fDuo("Description", `${base}.desc`, "area"), fDuo("Tag", `${base}.tag`), imgField("Photo", `${base}.image`)]
  },
  photos: {
    holder: "#listPhotos", root: "about.photos", title: it => it.caption?.en || "Photo",
    blank: () => ({ src: "", caption: { en: "", ar: "" } }),
    fields: base => [imgField("Photo", `${base}.src`), fDuo("Caption", `${base}.caption`)]
  },
  videos: {
    holder: "#listVideos", title: it => (it.title?.en || it.id || "New video"),
    blank: () => ({ id: "", title: { en: "", ar: "" }, thumb: "" }),
    fields: base => {
      const idw = document.createElement("div");
      idw.innerHTML = "<label>YouTube link or video ID</label>";
      const inp = document.createElement("input"); inp.type = "text";
      inp.value = get(base + ".id") || "";
      inp.placeholder = "https://youtu.be/XXXXXXXXXXX";
      const prev = document.createElement("div");
      prev.className = "imgrow"; prev.style.marginTop = ".6rem";
      const draw = () => {
        const v = get(base + ".id");
        prev.innerHTML = v
          ? `<img src="https://i.ytimg.com/vi/${v}/mqdefault.jpg" alt=""><span style="font-size:.75rem;color:var(--dim)">ID: ${v}</span>`
          : `<span class="noimg">no video</span>`;
      };
      inp.addEventListener("input", () => {
        const m = inp.value.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || inp.value.match(/^([\w-]{11})$/);
        set(base + ".id", m ? m[1] : inp.value.trim());
        draw();
      });
      idw.appendChild(inp); idw.appendChild(prev); draw();
      return [idw, fDuo("Title", `${base}.title`)];
    }
  },
  bank: {
    holder: "#listBank", root: "donation.bank", title: it => (it.label?.en || "") + " · " + (it.value || ""),
    blank: () => ({ label: { en: "", ar: "" }, value: "", copy: true }),
    fields: base => {
      const copyChk = document.createElement("label");
      copyChk.className = "chk";
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!get(base + ".copy");
      cb.addEventListener("change", () => set(base + ".copy", cb.checked));
      copyChk.append(cb, document.createTextNode(" Show copy button"));
      return [fDuo("Label", `${base}.label`), fOne("Value", `${base}.value`), copyChk];
    }
  }
};
function renderList(key) {
  const L = LISTS[key], root = L.root || key, arr = get(root);
  const holder = $(L.holder);
  holder.innerHTML = "";
  arr.forEach((it, i) => {
    const base = `${root}.${i}`;
    const item = document.createElement("div");
    item.className = "item";
    const head = document.createElement("div");
    head.className = "item-head";
    head.innerHTML = `<b>${L.title(it)}</b>`;
    const mk = (txt, fn, cls = "") => { const b = document.createElement("button"); b.className = "mini " + cls; b.type = "button"; b.textContent = txt; b.addEventListener("click", fn); return b; };
    head.append(
      mk("↑", () => { if (i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; markDirty(); renderList(key); } }),
      mk("↓", () => { if (i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; markDirty(); renderList(key); } }),
      mk("✕", () => { if (confirm("Remove this item?")) { arr.splice(i, 1); markDirty(); renderList(key); } }, "del")
    );
    const body = document.createElement("div");
    body.className = "item-body";
    L.fields(base, i).forEach(f => body.appendChild(f));
    item.append(head, body);
    holder.appendChild(item);
  });
}
$$("[data-add]").forEach(b => b.addEventListener("click", () => {
  const key = b.dataset.add, L = LISTS[key], root = L.root || key;
  get(root).push(L.blank());
  markDirty();
  renderList(key);
}));

/* ── gallery ── */
function renderGallery() {
  const grid = $("#galGrid");
  grid.innerHTML = "";
  DATA.gallery.forEach((g, i) => {
    const card = document.createElement("div");
    card.className = "gal-card";
    const src = g.src.startsWith("data:") ? g.src : "../" + g.src;
    const isNew = uploads.some(u => u.path === g.src);
    card.innerHTML = `<img src="${src}" alt="" loading="lazy">
      <div class="gc-body">
        <input type="text" placeholder="Caption EN" value="${(g.caption?.en || "").replace(/"/g, "&quot;")}">
        <input type="text" dir="rtl" placeholder="AR تعليق" value="${(g.caption?.ar || "").replace(/"/g, "&quot;")}">
      </div>
      <div class="gc-foot"><span class="badge ${isNew ? "new" : ""}">${isNew ? "NEW" : "LIVE"}</span><button class="mini del" type="button">Remove</button></div>`;
    const [en, ar] = $$("input", card);
    en.addEventListener("input", () => { g.caption = g.caption || {}; g.caption.en = en.value; markDirty(); });
    ar.addEventListener("input", () => { g.caption = g.caption || {}; g.caption.ar = ar.value; markDirty(); });
    $(".del", card).addEventListener("click", () => {
      if (!confirm("Remove this photo from the gallery?")) return;
      uploads = uploads.filter(u => u.path !== g.src);
      DATA.gallery.splice(i, 1);
      markDirty(); renderGallery();
    });
    grid.appendChild(card);
  });
}
async function addGalleryFiles(files) {
  for (const f of files) {
    if (!f.type.startsWith("image/")) continue;
    const { b64, preview, name } = await processImage(f, 1600);
    const path = "assets/gallery/" + name;
    uploads.push({ path, b64 });
    DATA.gallery.push({ src: path, caption: { en: "", ar: "" }, _preview: preview });
    /* store preview via data uri on card render */
    DATA.gallery[DATA.gallery.length - 1].src = path;
  }
  markDirty();
  /* show previews for new items */
  renderGallery();
  $$(".gal-card").forEach((card, i) => {
    const g = DATA.gallery[i];
    const up = uploads.find(u => u.path === g.src);
    if (up) $("img", card).src = "data:image/webp;base64," + up.b64;
  });
}
const drop = $("#drop");
["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => addGalleryFiles(e.dataTransfer.files));
$("#galFiles").addEventListener("change", e => addGalleryFiles(e.target.files));

/* ── texts pane ── */
function buildTexts() {
  const pane = $("#paneTexts");
  pane.innerHTML = "";
  pane.append(
    grp("Identity",
      fDuo("Site name", "meta.site_name"),
      fDuo("Slogan", "meta.tagline"),
      fDuo("Subtitle", "meta.subtitle")),
    grp("Hero film chapters",
      fDuo("Chapter 1 title", "hero.chapters.0.title"), fDuo("Chapter 1 line", "hero.chapters.0.sub"),
      fDuo("Chapter 2 title", "hero.chapters.1.title"), fDuo("Chapter 2 line", "hero.chapters.1.sub"),
      fDuo("Chapter 3 title", "hero.chapters.2.title"), fDuo("Chapter 3 line", "hero.chapters.2.sub")),
    grp("About",
      fDuo("Heading", "about.heading"),
      fDuo("Paragraph 1", "about.paragraphs.0", "area"),
      fDuo("Paragraph 2", "about.paragraphs.1", "area"),
      fDuo("Paragraph 3", "about.paragraphs.2", "area")),
    grp("2024 Memorial",
      fDuo("Line 1", "memorial.line1"),
      fDuo("Line 2 (gold)", "memorial.line2"),
      fDuo("Body", "memorial.body", "area"),
      imgField("Background photo", "memorial.image")),
    grp("Donation",
      fDuo("Heading", "donation.heading"),
      fDuo("Body", "donation.body", "area"),
      fDuo("Programs heading", "donation.programs_heading"),
      progList()),
    grp("Contact",
      strList("Phones", "contact.phones"),
      strList("Emails", "contact.emails"),
      fDuo("Address 1", "contact.addresses.0"),
      fDuo("Address 2", "contact.addresses.1"))
  );
}
function progList() {
  const w = document.createElement("div");
  w.innerHTML = "<label>Programs open for support</label>";
  const render = () => {
    $$(".prow", w).forEach(x => x.remove());
    DATA.donation.programs.forEach((p, i) => {
      const row = document.createElement("div");
      row.className = "prow duo";
      row.style.marginBottom = ".5rem";
      const en = document.createElement("input"); en.type = "text"; en.value = p.en; en.addEventListener("input", () => { p.en = en.value; markDirty(); });
      const arw = document.createElement("div"); arw.style.display = "flex"; arw.style.gap = ".4rem";
      const ar = document.createElement("input"); ar.type = "text"; ar.dir = "rtl"; ar.value = p.ar; ar.addEventListener("input", () => { p.ar = ar.value; markDirty(); });
      const del = document.createElement("button"); del.type = "button"; del.textContent = "✕"; del.className = "mini del";
      del.style.cssText = "border:1px solid var(--line);background:none;color:var(--dim);width:34px;cursor:pointer";
      del.addEventListener("click", () => { DATA.donation.programs.splice(i, 1); markDirty(); render(); });
      arw.append(ar, del);
      row.append(en, arw);
      w.appendChild(row);
    });
  };
  render();
  const add = document.createElement("button");
  add.className = "btn"; add.type = "button"; add.textContent = "+ Add program";
  add.addEventListener("click", () => { DATA.donation.programs.push({ en: "", ar: "" }); markDirty(); render(); });
  w.appendChild(add);
  return w;
}
function strList(label, path) {
  const w = document.createElement("div");
  w.innerHTML = `<label>${label}</label>`;
  const render = () => {
    $$(".srow", w).forEach(x => x.remove());
    get(path).forEach((v, i) => {
      const row = document.createElement("div");
      row.className = "srow";
      row.style.cssText = "display:flex;gap:.4rem;margin-bottom:.5rem";
      const inp = document.createElement("input"); inp.type = "text"; inp.value = v;
      inp.addEventListener("input", () => { get(path)[i] = inp.value; markDirty(); });
      const del = document.createElement("button"); del.type = "button"; del.textContent = "✕";
      del.style.cssText = "border:1px solid var(--line);background:none;color:var(--dim);width:34px;cursor:pointer";
      del.addEventListener("click", () => { get(path).splice(i, 1); markDirty(); render(); });
      row.append(inp, del);
      w.insertBefore(row, w.lastElementChild);
    });
  };
  const add = document.createElement("button");
  add.className = "btn"; add.type = "button"; add.textContent = "+ Add";
  add.addEventListener("click", () => { get(path).push(""); markDirty(); render(); });
  w.appendChild(add);
  render();
  return w;
}

function buildCenterPane() {
  const pane = $("#paneCenter");
  if (!pane || !DATA.center) return;
  pane.innerHTML = "";
  const K = DATA.center;
  pane.append(
    grp("Section text",
      fDuo("Eyebrow", "center.eyebrow"),
      fDuo("Headline", "center.heading"),
      fDuo("Paragraph", "center.body", "area"),
      fDuo("Label on the intact side", "center.label_before"),
      fDuo("Label on the destroyed side", "center.label_after"),
      fDuo("Drag hint", "center.hint"))
  );
  K.views.forEach((v, i) => {
    pane.append(
      grp("Comparison " + (i + 1),
        fDuo("Name of this viewpoint", `center.views.${i}.name`),
        imgField("BEFORE photo (intact)", `center.views.${i}.before`),
        imgField("AFTER photo (destroyed)", `center.views.${i}.after`),
        fDuo("Caption under the slider", `center.views.${i}.note`, "area"))
    );
  });
  const addBtn = document.createElement("button");
  addBtn.className = "btn add"; addBtn.type = "button"; addBtn.textContent = "+ Add another comparison";
  addBtn.addEventListener("click", () => {
    K.views.push({ id: "v" + Date.now().toString(36), name: { en: "", ar: "" }, before: "", after: "", note: { en: "", ar: "" } });
    markDirty(); buildCenterPane();
  });
  if (K.views.length > 1) {
    const del = document.createElement("button");
    del.className = "btn"; del.type = "button"; del.textContent = "Remove last comparison";
    del.style.marginInlineStart = ".6rem";
    del.addEventListener("click", () => {
      if (confirm("Remove the last comparison?")) { K.views.pop(); markDirty(); buildCenterPane(); }
    });
    pane.append(addBtn, del);
  } else pane.append(addBtn);
  pane.append(grp("After the destruction",
    imgField("Rebuilding photo", "center.rebuild.image"),
    fDuo("Caption", "center.rebuild.caption")));
}

function buildAll() {
  buildTexts();
  buildCenterPane();
  renderList("videos");
  renderList("timeline");
  renderList("projects");
  renderList("photos");
  renderList("bank");
  renderGallery();
}

/* ── publish ── */
$("#publish").addEventListener("click", async () => {
  const btn = $("#publish");
  btn.disabled = true;
  try {
    let n = 0;
    for (const u of uploads) {
      n++;
      setState(`Uploading photo ${n}/${uploads.length}...`, "busy");
      if (MODE === "php") {
        await php("upload", { name: u.path.split("/").pop(), b64: u.b64 });
      } else {
        let sha;
        try { const ex = await gh(repoPath(u.path) + `?ref=${CFG.branch}`); sha = ex.sha; } catch (e) {}
        await putFile(u.path, u.b64, "Admin: add photo " + u.path, sha);
      }
    }
    uploads = [];
    setState("Saving content...", "busy");
    const clean = JSON.parse(JSON.stringify(DATA, (k, v) => k === "_preview" ? undefined : v));
    if (MODE === "php") {
      await php("save", { content: clean });
      dirty = false;
      setState("Published. Changes are live now.", "ok");
      renderGallery();
      return;
    }
    try {
      await putFile("content/content.json", enc(JSON.stringify(clean, null, 2)), "Admin: update content", SHA);
    } catch (e) {
      if (/409|422|sha/i.test(e.message)) {
        const fresh = await gh(repoPath("content/content.json") + `?ref=${CFG.branch}`);
        SHA = fresh.sha;
        await putFile("content/content.json", enc(JSON.stringify(clean, null, 2)), "Admin: update content", SHA);
      } else throw e;
    }
    const fresh2 = await gh(repoPath("content/content.json") + `?ref=${CFG.branch}`);
    SHA = fresh2.sha;
    dirty = false;
    setState("Published. The live site updates in about a minute.", "ok");
    renderGallery();
  } catch (e) {
    setState("Failed: " + e.message, "err");
    btn.disabled = false;
  }
});

addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
init();
})();
