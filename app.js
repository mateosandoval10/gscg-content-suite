// GSCG Studio front end — no build step. Hash routes:
//   #/  projects   #/p/<id>/<step>  project flow   #/playbook   #/insights   #/settings
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $("#app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const media = (p) => window.__demoMedia(p);
let B = null; // bootstrap data

async function api(path, opts = {}) { return window.__demoApi(path, opts);
  const r = await fetch(`/api/${path}`, { headers: { "Content-Type": "application/json" }, ...opts, body: opts.body && typeof opts.body !== "string" && !(opts.body instanceof Blob) && !(opts.body instanceof File) ? JSON.stringify(opts.body) : opts.body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}
function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

// ---------------- router ----------------
let poll = null;
async function route() {
  clearInterval(poll);
  B = await api("bootstrap");
  const h = location.hash.replace(/^#\/?/, "").split("/");
  const navKey = h[0] === "p" ? "projects" : h[0] || "home";
  $$(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.nav === navKey));
  app.className = ""; app.oninput = app.onchange = null;
  if (h[0] === "p" && h[1]) return projectPage(h[1], h[2] || null);
  if (h[0] === "projects") return projectsPage();
  if (h[0] === "messaging") return h[1] === "workshop" ? workshopPage() : messagingPage();
  if (h[0] === "library") return libraryPage();
  if (h[0] === "playbook") return playbook();
  if (h[0] === "calendar") return calendarPage(0);
  if (h[0] === "insights") return insightsPage();
  if (h[0] === "settings") return settingsPage();
  return home();
}
window.addEventListener("hashchange", route);
route();

// ---------------- shared bits ----------------
const KINDS = [["video", "Video"], ["flyer", "Flyer"], ["carousel", "Carousel"], ["linkedin", "LinkedIn post"], ["stories", "Story set"], ["podcast", "Podcast clip"]];
const STILL_KINDS = ["flyer", "carousel", "linkedin", "stories"];
const isStill = (p) => STILL_KINDS.includes(p.kind);
const platName = (k) => B.platforms[k]?.short || B.stills?.formats[k]?.short || k;
const DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const dayNum = (d) => Number(d.slice(8, 10));
const todayISO = () => new Date().toLocaleDateString("en-CA");
const statusChip = (s) => ({ new: ["Footage needed", ""], analyzed: ["Picking type", ""], ideas: ["Questions waiting", ""], rendering: ["Building", "r"], review: ["In review", "n"], scheduled: ["Scheduled", "g"], posted: ["Posted", "g"] }[s] || [s, ""]);
const pillar = (id) => B.messaging.pillars.find((x) => x.id === id);
const audience = (id) => B.messaging.audiences.find((x) => x.id === id);
const pdots = (ids = []) => ids.map((id) => { const x = pillar(id); return x ? `<i class="pd" style="background:${x.color}" title="${esc(x.name)}"></i>` : ""; }).join("");
const ptag = (id) => { const x = pillar(id); return x ? `<span class="ptag"><i class="pd" style="background:${x.color}"></i>${esc(x.name)}</span>` : ""; };
const niceDate = (d) => new Date(d + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
/** Big Shoulders title card for things without footage yet (second half of the title in red, like the videos). */
function titleCard(t) {
  const w = String(t).replace(/[?:]/g, (c) => c).split(/\s+/), k = Math.ceil(w.length / 2);
  return `<div class="ph"><span>${esc(w.slice(0, k).join(" "))}</span><span class="r">${esc(w.slice(k).join(" "))}</span></div>`;
}
function weekStrip(week, events, { link = true, compact = false } = {}) {
  const today = todayISO();
  const hot = week.includes(today) ? today : week.find((d) => events.some((e) => e.date === d));
  const days = compact && week.filter((d) => events.some((e) => e.date === d)).length >= 3 ? week.filter((d) => events.some((e) => e.date === d)) : week;
  return `<div class="week" style="grid-template-columns:repeat(${days.length},minmax(0,1fr))">${days.map((d) => {
    const evs = events.filter((e) => e.date === d);
    return `<div class="day ${d === hot ? "hot" : ""}"><b>${DOW[(new Date(d + "T12:00").getDay() + 6) % 7]} ${dayNum(d)}</b>${evs.length ? evs.map((e) => {
      const tagName = link && e.project ? "a" : "div";
      return `<${tagName} ${tagName === "a" ? `href="#/p/${e.project}"` : ""} class="ev"><span>${esc(e.title)}</span><small>${esc(e.format || "")}${e.time ? ` · ${fmtTime(e.time)}` : ""}</small><div class="evf">${pdots(e.pillars)}<i class="st ${e.status}">${esc(e.status)}</i></div></${tagName}>`; }).join("") : `<span class="none">Coming soon</span>`}</div>`; }).join("")}</div>`;
}
const fmtTime = (t) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""} ${h < 12 ? "AM" : "PM"}`; };
function brainCard(br) {
  const rows = [["Research sources", br.research], ["Content types", br.types], ["Messaging + proof", br.messaging], ["Past videos", br.videos], ["Reviews + notes", br.reviews]];
  const max = Math.max(...rows.map((r) => r[1]), 1);
  return `<p class="eyebrow">The brain</p><h3 class="serif">${br.total} sources · learns every post</h3>
    ${rows.map(([l, n]) => `<div class="bbar"><span>${l}</span><i><u style="width:${Math.max(2, (n / max) * 100)}%"></u></i><b>${n}</b></div>`).join("")}`;
}
function projCard(p) {
  const [t, k] = statusChip(p.status);
  return `<a class="proj" href="#/p/${p.id}">${p.cover ? `<img src="${media(p.cover)}">` : p.thumb ? `<img src="thumb/${p.thumb}">` : titleCard(p.name)}
    <div class="pb"><b>${esc(p.name)}</b><div class="row" style="gap:6px"><span class="pchip ${k}">${esc(t)}</span><span class="dots">${pdots(p.pillars)}</span></div></div></a>`;
}
function messagingStats(m) {
  const all = [...m.identity, ...m.audiences, ...m.pillars];
  return { open: m.identity.filter((f) => f.status === "open").length + m.audiences.filter((a) => !a.message).length, draft: all.filter((x) => x.status === "draft").length, verified: m.proof.filter((x) => x.status === "verified").length };
}

// ---------------- home (Content Suite dashboard) ----------------
async function home() {
  const br = B.brand, c = br.colors, M = B.messaging;
  const evs = B.calendar.filter((e) => B.week.includes(e.date));
  const active = B.projects.filter((p) => p.status !== "posted");
  const ideas = B.calendar.filter((e) => !e.project && e.status === "idea" && e.date >= todayISO()).slice(0, Math.max(0, 6 - active.length));
  const st = messagingStats(M);
  const ms = (d) => new Date(d + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  app.className = "wide";
  app.innerHTML = `
  <div class="dash">
   <div class="col">
    <div class="card tight" id="startcard"><p class="eyebrow">Start something new</p><h2 class="serif">What are we making?</h2>
      <textarea id="req" placeholder='Drop footage, or describe an idea… e.g. "flyer for the case comp info night"'></textarea>
      <div class="row startrow">${KINDS.map(([k, l], i) => `<button class="chip ${i ? "" : "on"}" data-kind="${k}">${l}</button>`).join("")}
        <span class="spacer"></span><select id="owner" class="mini" title="Owner">${B.team.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}</select>
        <button class="btn navy" id="start">Start →</button></div>
      <div id="shared" class="small muted foot">${B.claude.ok === false ? `<span class="warnline">Captions in template mode · <a href="#/settings">fix</a></span>` : ""}</div></div>
    <div class="card tight plain"><div class="row"><div><p class="eyebrow">Calendar</p><h2 class="serif" style="margin:0">${B.week.includes(todayISO()) ? "This week" : "Coming up"} · ${evs.length} post${evs.length === 1 ? "" : "s"} planned</h2></div><span class="spacer"></span><span class="small muted">Goal: 3–5 posts + daily stories</span> <a class="btn ghost sm" href="#/calendar">Open</a></div>
      <div style="margin-top:12px">${weekStrip(B.week, evs, { compact: true })}</div>
      <div class="mix small">${M.pillars.map((x) => { const n = evs.filter((e) => (e.pillars || []).includes(x.id)).length; return `<span class="${n ? "" : "zero"}"><i class="pd" style="background:${x.color}"></i>${esc(x.name)} <b>${n}</b></span>`; }).join("")}</div></div>
    <div class="card tight plain"><div class="row"><p class="eyebrow" style="margin:0">In progress</p><span class="spacer"></span><a class="small" href="#/projects">All projects →</a></div>
      <div class="grid g3" style="margin-top:10px">${active.map(projCard).join("")}${ideas.map((e) => `
        <div class="proj idea">${titleCard(e.title)}<div class="pb"><b>${esc(e.title)}</b><div class="row" style="gap:6px"><span class="pchip">Idea · ${ms(e.date)}</span><span class="dots">${pdots(e.pillars)}</span><span class="spacer"></span><button class="btn red xs" data-startev="${e.id}">Start</button></div></div></div>`).join("")}
        ${!active.length && !ideas.length ? `<div class="empty">Nothing in progress. Describe something above.</div>` : ""}</div></div>
   </div>
   <div class="col side">
    <div class="card tight"><p class="eyebrow">Brand kit</p><h3 class="serif">Locked on every post</h3>
      <div class="row" style="gap:8px;margin:8px 0 10px"><i class="sw" style="background:${c.primary}"></i><i class="sw" style="background:${c.accent}"></i><i class="sw" style="background:#fff;border:1.5px solid var(--line)"></i><i class="sw" style="background:${c.primary};display:grid;place-items:center"><img src="logo-white.png" style="height:30px"></i>
        <div style="margin-left:6px"><div class="bs" style="font-size:22px;color:var(--navy)">Big Shoulders</div><div class="small muted">IBM Plex Sans</div></div></div>
      <div class="small"><span class="ok">✓</span>Logo, top right &nbsp;<span class="ok">✓</span>3-part outro &nbsp;<span class="ok">✓</span>GSCG voice</div></div>
    <div class="card tight navy"><div class="row"><p class="eyebrow" style="margin:0">Messaging</p><span class="spacer"></span><span class="pchip ${M.status === "approved" ? "g" : ""}">${M.status === "approved" ? "Approved" : "Draft"}</span></div>
      <h3 class="serif" style="margin-top:4px">${M.status === "approved" ? "What we say, to whom" : M.meeting ? `To decide at the ${ms(M.meeting.date)} meeting` : "What we say, to whom"}</h3>
      <div class="pillars-mini">${M.pillars.map((x) => `<div><i class="pd" style="background:${x.color}"></i><b>${esc(x.name)}</b></div>`).join("")}</div>
      <p class="small muted" style="margin:8px 0 10px">${M.audiences.length} audiences · ${st.verified} verified proof points · ${st.open} open question${st.open === 1 ? "" : "s"}</p>
      <div class="row" style="gap:8px"><a class="btn ghost sm" href="#/messaging">Open messaging</a><a class="btn ghost sm" href="#/messaging/workshop">Meeting worksheet</a></div></div>
    <div class="card tight plain">${brainCard(B.brain)}</div>
    <div class="card tight plain"><p class="eyebrow">Team</p><h3 class="serif">Who's working on what</h3>
      ${B.team.map((m, i) => `<div class="mem"><span class="av ${i === B.team.length - 1 ? "r" : ""}">${esc(m.initials)}</span><div><b>${esc(m.name)}</b> · ${m.project ? `<a href="#/p/${m.project.id}">${esc(m.project.name)}</a> <span class="muted small">· ${esc(statusChip(m.project.status)[0].toLowerCase())}</span>` : `<span class="muted">No project yet</span>`}</div></div>`).join("")}</div>
   </div>
  </div>`;
  let kind = "video";
  $$("[data-kind]").forEach((b) => (b.onclick = () => { kind = b.dataset.kind; $$("[data-kind]").forEach((x) => x.classList.toggle("on", x === b)); }));
  const create = async (extra = {}) => {
    const request = $("#req").value.trim();
    const name = (request || extra.fallback || "New project").replace(/^(a|an|the)\s+/i, "").split(/[.,\n]/)[0].slice(0, 60);
    return api("projects", { method: "POST", body: { name: name.charAt(0).toUpperCase() + name.slice(1), request, kind, owner: $("#owner").value, ...extra.body } });
  };
  $("#start").onclick = async () => {
    if (!$("#req").value.trim()) return toast("Describe what you're making, or drop footage in the box");
    const p = await create(); location.hash = `#/p/${p.id}/footage`;
  };
  // Drop footage straight onto the request box: creates the project, uploads, starts analysis.
  const card = $("#startcard");
  ["dragenter", "dragover"].forEach((ev) => card.addEventListener(ev, (e) => { e.preventDefault(); card.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => card.addEventListener(ev, (e) => { e.preventDefault(); if (ev === "drop" || !card.contains(e.relatedTarget)) card.classList.remove("over"); }));
  card.addEventListener("drop", async (e) => {
    const files = [...e.dataTransfer.files].filter((f) => /^(video|image)\//.test(f.type) || /\.(mov|mp4|m4v|heic|jpe?g|png)$/i.test(f.name));
    if (!files.length) return toast("Drop videos or photos");
    const p = await create({ fallback: `Footage ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}` });
    for (let i = 0; i < files.length; i++) {
      $("#shared").textContent = `Uploading ${i + 1}/${files.length}: ${files[i].name}…`;
      await fetch(`/api/projects/${p.id}/upload?name=${encodeURIComponent(files[i].name)}`, { method: "PUT", body: files[i] });
    }
    await api(`projects/${p.id}/analyze`, { method: "POST" });
    location.hash = `#/p/${p.id}/footage`;
  });
  $$("[data-startev]").forEach((b) => (b.onclick = async () => { const p = await api(`calendar/${b.dataset.startev}/start`, { method: "POST", body: { owner: $("#owner").value } }); location.hash = `#/p/${p.id}/footage`; }));
  try {
    const sh = await api("shared");
    if (sh.folders?.length) $("#shared").insertAdjacentHTML("beforeend", ` <b>In the shared folder:</b> ${sh.folders.map((f) => `<a href="#" data-imp="${esc(f.path)}" data-name="${esc(f.name)}">${esc(f.name)}</a> (${f.media})`).join(" · ")}`);
    $$("[data-imp]").forEach((a) => (a.onclick = async (e) => {
      e.preventDefault();
      const p = await api("projects", { method: "POST", body: { name: a.dataset.name, importFrom: a.dataset.imp, request: $("#req").value.trim(), kind, owner: $("#owner").value } });
      location.hash = `#/p/${p.id}/footage`;
    }));
  } catch {}
}

// ---------------- projects ----------------
function projectsPage(filter = "active") {
  const F = { active: ["In progress", (p) => p.status !== "posted" && p.status !== "scheduled"], scheduled: ["Scheduled", (p) => p.status === "scheduled"], posted: ["Posted", (p) => p.status === "posted"], all: ["All", () => true] };
  const list = B.projects.filter(F[filter][1]);
  const owner = (id) => B.team.find((m) => m.id === id)?.name || "—";
  const recipe = (id) => B.recipes.find((r) => r.id === id)?.name || "Not picked yet";
  app.className = "wide";
  app.innerHTML = `<p class="eyebrow">Projects</p><div class="row"><h1 style="margin:0">Everything we're making</h1><span class="spacer"></span><a class="btn navy" href="#/">+ New project</a></div>
  <div style="margin:16px 0 18px">${Object.entries(F).map(([k, [l, fn]]) => `<button class="chip ${k === filter ? "on" : ""}" data-f="${k}">${l} · ${B.projects.filter(fn).length}</button>`).join("")}</div>
  ${list.length ? `<div class="grid g4">${list.map(projCard).join("")}</div>
  <div class="card plain" style="margin-top:22px"><table><tr><th>Project</th><th>Owner</th><th>Type</th><th>Pillars</th><th>Status</th><th>Clips</th><th>Videos</th><th>Updated</th></tr>
    ${list.map((p) => `<tr><td><a href="#/p/${p.id}">${esc(p.name)}</a>${p.request ? `<div class="small muted">“${esc(p.request.slice(0, 90))}”</div>` : ""}</td><td>${esc(owner(p.owner))}</td><td>${esc(recipe(p.recipe))}<div class="small muted">${esc((KINDS.find((k) => k[0] === p.kind) || [0, "Video"])[1])}</div></td><td>${p.pillars.map(ptag).join("")}</td><td><span class="pchip ${statusChip(p.status)[1]}">${esc(statusChip(p.status)[0])}</span></td><td>${p.clips}</td><td>${p.outputs} · ${p.approved} approved</td><td class="small">${esc(fmtDate(p.updated))}</td></tr>`).join("")}</table></div>`
    : `<div class="card plain empty">No projects here.</div>`}`;
  $$("[data-f]").forEach((b) => (b.onclick = () => projectsPage(b.dataset.f)));
}

// ---------------- calendar ----------------
async function calendarPage(offset = 0) {
  const base = new Date(B.week[0] + "T12:00"); base.setDate(base.getDate() + offset * 7);
  const week = Array.from({ length: 7 }, (_, k) => { const d = new Date(base); d.setDate(base.getDate() + k); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
  const cal = B.calendar;
  const wk = cal.filter((e) => week.includes(e.date));
  const nice = (d) => new Date(d + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const shotsFor = B.calendar.find((e) => week.includes(e.date) && e.status !== "scheduled" && e.status !== "posted" && e.shots?.length);
  app.className = "wide";
  app.innerHTML = `<p class="eyebrow">Calendar</p><div class="row"><h1 style="margin:0">Week of ${nice(week[0])}</h1><span class="spacer"></span>
    <button class="btn ghost sm" id="prev">← Prev</button><button class="btn ghost sm" id="today">This week</button><button class="btn ghost sm" id="next">Next →</button></div>
  <p class="lead" style="margin-top:8px">Goal: <b>3–5 posts a week</b> plus daily stories, balanced across the messaging pillars. Approved videos land here when you schedule them on the Post step.</p>
  <div class="card plain">${weekStrip(week, wk)}
    <div class="mix small">${B.messaging.pillars.map((x) => { const n = wk.filter((e) => (e.pillars || []).includes(x.id)).length; return `<span class="${n ? "" : "zero"}"><i class="pd" style="background:${x.color}"></i>${esc(x.name)} <b>${n}</b></span>`; }).join("")}</div></div>
  <div class="grid g2">
   <div class="card"><p class="eyebrow">Plan a post</p><h3>Add to the calendar</h3>
    <div class="grid g2"><div class="field"><label class="f">Date</label><input type="text" id="cd" value="${week[0]}"></div><div class="field"><label class="f">Time</label><input type="text" id="ct" value="18:00"></div></div>
    <div class="field"><label class="f">Title</label><input type="text" id="cti" placeholder="Case comp scope reveal"></div>
    <div class="grid g2"><div class="field"><label class="f">Format</label><input type="text" id="cf" placeholder="Flyer + Reel"></div>
     <div class="field"><label class="f">Content type</label><select id="cr"><option value="">—</option>${B.recipes.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join("")}</select></div></div>
    <div class="field"><label class="f">Pillars <span class="muted small">(blank = from the content type)</span></label><div>${B.messaging.pillars.map((x) => `<button class="chip" data-cp="${x.id}"><i class="pd" style="background:${x.color}"></i> ${esc(x.name)}</button>`).join("")}</div></div>
    <div class="field"><label class="f">Status</label><select id="cs">${["idea", "draft", "ready", "scheduled", "posted"].map((s) => `<option>${s}</option>`).join("")}</select></div>
    <button class="btn red sm" id="cadd">Add</button></div>
   <div class="card navy"><p class="eyebrow">Shot list</p>${shotsFor ? `<h3>${esc(shotsFor.title)} · ${nice(shotsFor.date)}</h3><ol class="shots">${shotsFor.shots.map((s) => `<li><b>${esc(s.beat)}</b> <span class="muted small">(${esc(s.seconds)} s)</span><br><span class="small">${esc(s.tip || "")}</span></li>`).join("")}</ol>` : `<p class="muted">Give a planned post a content type and its shot list shows up here, built from that format's playbook.</p>`}</div>
  </div>
  <div class="card plain"><p class="eyebrow">Everything planned</p>${cal.length ? `<table><tr><th>Date</th><th>Title</th><th>Format</th><th>Pillars</th><th>Status</th><th></th></tr>${cal.map((e) => `<tr><td>${nice(e.date)}${e.time ? " · " + fmtTime(e.time) : ""}</td><td>${e.project ? `<a href="#/p/${e.project}">${esc(e.title)}</a>` : `${esc(e.title)} <a href="#" class="small" data-startev="${e.id}">start project →</a>`}</td><td>${esc(e.format || "")}</td><td>${(e.pillars || []).map(ptag).join("")}</td><td><span class="status">${esc(e.status)}</span></td><td><a href="#" data-del="${e.id}" class="small">remove</a></td></tr>`).join("")}</table>` : `<p class="muted">Nothing planned yet.</p>`}</div>`;
  $("#prev").onclick = () => calendarPage(offset - 1); $("#next").onclick = () => calendarPage(offset + 1); $("#today").onclick = () => calendarPage(0);
  const cps = new Set();
  $$("[data-cp]").forEach((b) => (b.onclick = () => { b.classList.toggle("on"); cps.has(b.dataset.cp) ? cps.delete(b.dataset.cp) : cps.add(b.dataset.cp); }));
  $("#cadd").onclick = async () => {
    if (!$("#cti").value.trim()) return toast("Add a title");
    await api("calendar", { method: "POST", body: { date: $("#cd").value.trim(), time: $("#ct").value.trim(), title: $("#cti").value.trim(), format: $("#cf").value.trim(), recipe: $("#cr").value || null, status: $("#cs").value, ...(cps.size ? { pillars: [...cps] } : {}) } });
    B = await api("bootstrap"); toast("Added"); calendarPage(offset);
  };
  $$("[data-startev]").forEach((a) => (a.onclick = async (e) => { e.preventDefault(); const p = await api(`calendar/${a.dataset.startev}/start`, { method: "POST", body: {} }); location.hash = `#/p/${p.id}/footage`; }));
  $$("[data-del]").forEach((a) => (a.onclick = async (e) => { e.preventDefault(); await api(`calendar/${a.dataset.del}`, { method: "DELETE" }); B = await api("bootstrap"); calendarPage(offset); }));
}

// ---------------- project ----------------
const STEPS = [
  ["footage", "Footage"], ["brief", "What we're making"], ["questions", "Questions"], ["build", "Build"], ["review", "Review"], ["post", "Post"],
];
const STILL_STEPS = [["footage", "Photos"], ["brief", "What we're making"], ["design", "Design"], ["review", "Review"], ["post", "Post"]];
const stepsFor = (p) => (isStill(p) ? STILL_STEPS : STEPS);
function stepIndex(p) {
  if (isStill(p)) {
    if (p.status === "scheduled" || p.status === "posted" || p.outputs.some((o) => o.status === "approved")) return 4;
    if (p.outputs.some((o) => o.status !== "replaced")) return 3;
    if (p.stills || (p.recipe && p.ideas?.length)) return 2;
    if (p.clips.length || p.recipe) return 1;
    return 0;
  }
  if (p.status === "scheduled" || p.status === "posted" || p.outputs.some((o) => o.status === "approved")) return 5;
  if (p.outputs.some((o) => o.status !== "replaced")) return 4;
  if (p.status === "rendering") return 3;
  if (p.recipe && p.ideas?.length) return 2;
  if (p.clips.length) return 1;
  return 0;
}

async function projectPage(id, step) {
  app.className = "wide";
  let p = await api(`projects/${id}`);
  const S = stepsFor(p);
  const cur = step || S[stepIndex(p)][0];
  const reached = stepIndex(p);
  const head = `
    <p class="eyebrow">Project · ${esc(fmtDate(p.created))}</p>
    <div class="row"><h1 style="margin:0">${esc(p.name)}</h1><span class="spacer"></span>
      <label class="small muted">Owner <select id="own" style="width:auto;margin-left:6px">${["", ...p.team.map((m) => m.id)].map((tid) => `<option value="${tid}" ${p.owner === tid || (!p.owner && !tid) ? "selected" : ""}>${tid ? esc(p.team.find((m) => m.id === tid).name) : "—"}</option>`).join("")}</select></label>
      <a class="btn ghost sm" href="#/">← Home</a></div>
    ${p.request ? `<div class="req">“${esc(p.request)}”</div>` : ""}
    <div class="steps ${S.length === 5 ? "s5" : ""}" style="margin-top:18px">${S.map(([k, t], i) => `
      <a class="step ${k === cur ? "on" : i <= reached ? "done" : ""}" href="#/p/${p.id}/${k}"><div class="n">Step ${i + 1}</div><div class="t">${i < reached && k !== cur ? "✓ " : ""}${t}</div></a>`).join("")}</div>
    <div id="jobs"></div><div id="body"></div>`;
  app.innerHTML = head;
  $("#own").onchange = async () => { await api(`projects/${p.id}/update`, { method: "POST", body: { owner: $("#own").value || null } }); toast("Owner saved"); };
  const body = $("#body");
  ({ footage: stepFootage, brief: stepBrief, questions: stepQuestions, ideas: stepQuestions, music: stepMusic, build: stepBuild, design: stepDesign, review: isStill(p) ? stepReviewStills : stepReview, post: stepPost }[cur] || stepFootage)(p, body);
  watchJobs(p.id);
}

function watchJobs(pid) {
  const paint = async () => {
    const p = await api(`projects/${pid}`).catch(() => null);
    if (!p) return;
    const active = p.jobs.filter((j) => j.status === "running" || j.status === "queued" || (j.status !== "done" && j.status !== "error"));
    const recentErr = p.jobs.filter((j) => j.status === "error").slice(-1);
    const box = $("#jobs");
    if (!box) return clearInterval(poll);
    box.innerHTML = [...active, ...recentErr].map((j) => `
      <div class="job"><div class="row"><b>${esc(j.label)}</b><span class="muted small">${esc(j.status === "error" ? "Failed: " + j.error : j.message)}</span><span class="spacer"></span><span class="small muted">${Math.round(j.progress * 100)}%</span></div>
      <div class="bar"><i style="width:${Math.round(j.progress * 100)}%"></i></div></div>`).join("");
    const doneNow = p.jobs.filter((j) => j.status === "done").map((j) => j.id);
    if (watchJobs.seen && doneNow.some((d) => !watchJobs.seen.includes(d))) { watchJobs.seen = doneNow; return route(); }
    watchJobs.seen = doneNow;
    if (!active.length && !recentErr.length) box.innerHTML = "";
  };
  watchJobs.seen = null;
  paint();
  poll = setInterval(paint, 1500);
}

// Step 1 — footage
function stepFootage(p, body) {
  const ok = p.clips.filter((c) => !c.error);
  const unnamed = p.placeClusters.filter((c) => !c.name);
  const low = ok.filter((c) => c.lowRes).length;
  body.innerHTML = `
  <div class="card">
    <p class="eyebrow dot">Step 1 · Footage</p>
    <h2 class="red">Add the clips</h2>
    <div class="drop" id="drop"><b>Drag videos or photos here</b><br><span class="small">or <a href="#" id="pick">choose files</a> · iPhone .mov, .mp4, .jpg, .heic · originals keep full quality</span></div>
    <input type="file" id="files" multiple accept="video/*,image/*" hidden />
    <div id="upl" class="small muted" style="margin-top:10px"></div>
    <div class="row" style="margin-top:14px">
      <input type="text" id="folder" placeholder="…or paste a folder path, e.g. /Users/you/Desktop/gscg video workflow" />
      <button class="btn ghost sm" id="imp">Import folder</button>
    </div>
    <div class="row" style="margin-top:18px">
      <button class="btn navy" id="an">${ok.length ? "Re-analyze footage" : "Analyze footage →"}</button>
      <span class="muted small">Scores every moment (quality, people, motion, blur), orders the day by capture time and finds places from GPS. Cached, so re-runs are quick.</span>
    </div>
  </div>
  ${ok.length ? `
  ${low ? `<div class="note warn"><b>${low} of ${ok.length} clips are low resolution</b> (≤ 720p exports). AirDrop with <b>Options → All Photos Data</b> on to send full-quality originals; vertical crops will look much sharper.</div>` : ""}
  ${unnamed.length ? `<div class="card navy"><p class="eyebrow">Places</p><h3>Name these spots once — the Studio will remember them for every future batch</h3>
    ${unnamed.map((c) => { const sug = (p.placeSuggestions || []).find((s) => Math.abs(s.lat - c.lat) < 0.004 && Math.abs(s.lon - c.lon) < 0.004);
      return `<div class="row" style="margin:8px 0"><span class="small muted" style="width:250px">${c.count} clips from ${esc(c.first || "")} · ${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}</span>
      <input type="text" data-place="${c.lat},${c.lon}" placeholder="${sug ? esc(sug.name) + " (suggested)" : "e.g. Lumen Field"}" value="" style="max-width:280px">
      <a class="small" target="_blank" href="https://maps.apple.com/?ll=${c.lat},${c.lon}">see on map ↗</a></div>`; }).join("")}
    <button class="btn red sm" id="saveplaces">Save places</button></div>` : ""}
  <div class="card plain">
    <div class="row"><p class="eyebrow" style="margin:0">Your day · ${ok.length} clips in capture order</p><span class="spacer"></span>
    <span class="small muted">Click a clip to leave it out · ★ to force it in</span></div>
    <div class="clips" style="margin-top:14px">${ok.map((c) => {
      const off = (p.excluded || []).includes(c.file), pin = (p.pinned || []).some((x) => x.startsWith(c.file + "@"));
      return `<div class="clip ${off ? "off" : ""} ${pin ? "pin" : ""}" data-file="${esc(c.file)}">
        <div class="tags">${c.vertical ? `<span class="tag light">9:16</span>` : `<span class="tag light">16:9</span>`}${c.lowRes ? `<span class="tag">720p</span>` : ""}${c.people > 0.3 ? `<span class="tag red">people</span>` : ""}${c.speech ? `<span class="tag" title="${esc(c.transcript || "")}">🎙 speech</span>` : ""}</div>
        <img loading="lazy" src="thumb/${c.key}">
        <div class="meta"><b>${esc(c.time || "")}</b> · ${Math.round(c.duration)}s<br><span class="muted">${esc(c.place || c.file)}</span>
        <a href="#" data-pin="${esc(c.file)}" style="float:right;text-decoration:none">${pin ? "★" : "☆"}</a></div></div>`; }).join("")}</div>
    <div class="row" style="margin-top:20px"><span class="spacer"></span><a class="btn red" href="#/p/${p.id}/brief">Next: what we're making →</a></div>
  </div>` : ""}`;

  const drop = $("#drop"), files = $("#files");
  $("#pick").onclick = (e) => { e.preventDefault(); files.click(); };
  const upload = async (list) => {
    const arr = [...list];
    for (let i = 0; i < arr.length; i++) {
      $("#upl").textContent = `Uploading ${i + 1}/${arr.length}: ${arr[i].name} (${(arr[i].size / 1e6).toFixed(1)} MB)…`;
      await fetch(`/api/projects/${p.id}/upload?name=${encodeURIComponent(arr[i].name)}`, { method: "PUT", body: arr[i] });
    }
    $("#upl").textContent = `Added ${arr.length} files. Analyzing…`;
    await api(`projects/${p.id}/analyze`, { method: "POST" });
  };
  files.onchange = () => upload(files.files);
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => upload(e.dataTransfer.files));
  $("#imp").onclick = async () => {
    try { const r = await api(`projects/${p.id}/import`, { method: "POST", body: { folder: $("#folder").value.trim() } }); toast(`Imported ${r.imported} files`); await api(`projects/${p.id}/analyze`, { method: "POST" }); }
    catch (e) { toast(e.message); }
  };
  $("#an").onclick = async () => { try { await api(`projects/${p.id}/analyze`, { method: "POST" }); } catch (e) { toast(e.message); } };
  $$(".clip").forEach((el) => (el.onclick = async (e) => {
    if (e.target.dataset.pin) return;
    const f = el.dataset.file;
    const ex = new Set(p.excluded || []);
    ex.has(f) ? ex.delete(f) : ex.add(f);
    p = await api(`projects/${p.id}/update`, { method: "POST", body: { excluded: [...ex] } });
    el.classList.toggle("off", ex.has(f));
  }));
  $$("[data-pin]").forEach((a) => (a.onclick = async (e) => {
    e.preventDefault(); e.stopPropagation();
    const f = a.dataset.pin, c = p.clips.find((x) => x.file === f);
    let pins = (p.pinned || []).filter((x) => !x.startsWith(f + "@"));
    if (pins.length === (p.pinned || []).length) pins.push(`${f}@${(c.duration / 2).toFixed(1)}`);
    p = await api(`projects/${p.id}/update`, { method: "POST", body: { pinned: pins } });
    route();
  }));
  const sp = $("#saveplaces");
  if (sp) sp.onclick = async () => {
    for (const inp of $$("[data-place]")) {
      const name = inp.value.trim() || (inp.placeholder.includes("(suggested)") ? inp.placeholder.replace(" (suggested)", "") : "");
      if (!name) continue;
      const [lat, lon] = inp.dataset.place.split(",").map(Number);
      await api("places", { method: "POST", body: { name, lat, lon } });
    }
    toast("Places saved"); route();
  };
}

// Step 2 — what we're making: suggested type + framework + knowledge + who's in it + message (pillars, audience, proof), then the brief
function stepBrief(p, body) {
  const groups = {};
  for (const r of B.recipes) (groups[r.group] ||= []).push(r);
  const rec = B.recipes.find((r) => r.id === p.recipe);
  const top = p.suggestions?.[0];
  const fw = p.framework;
  const br = p.brain;
  const M = B.messaging, msg = p.message;
  const f = (k, label, ph, ta) => `<div class="field"><label class="f">${label}</label>${ta ? `<textarea data-b="${k}" placeholder="${esc(ph)}">${esc(p.brief[k])}</textarea>` : `<input type="text" data-b="${k}" placeholder="${esc(ph)}" value="${esc(p.brief[k])}">`}</div>`;
  body.innerHTML = `
  <div class="grid g2">
   <div class="card"><p class="eyebrow dot">Content type</p>
     ${top ? `<div class="row" style="align-items:baseline"><span class="bs" style="font-size:34px;color:var(--navy)">${esc(rec?.name || top.name)}</span>${!p.recipe || p.recipe === top.id ? `<span class="pchip g">${top.match}% match</span>` : `<span class="pchip">your pick</span>`}</div>
     <div style="margin:8px 0">${p.suggestions.filter((s) => s.id !== (p.recipe || top.id)).slice(0, 3).map((s) => `<button class="chip" data-recipe="${s.id}">${esc(s.name)} ${s.match}%</button>`).join("")}<button class="chip" id="alltypes">+${B.recipes.length - 3} more</button></div>` : ""}
     ${!p.recipe && top ? `<button class="btn red sm" data-recipe="${top.id}">Use ${esc(top.name)}</button>` : ""}
     ${fw?.structure ? `<p class="small" style="margin-top:10px"><b>Framework applied · ${esc(fw.format)}</b><br>${fw.structure.map((s) => `${esc(s.beat)} <span class="muted">(${esc(s.seconds)} s)</span>`).join(" → ")}</p>` : p.recipe ? "" : `<p class="small muted">Pick a type to apply its playbook.</p>`}</div>
   <div class="card"><p class="eyebrow dot">Knowledge it's using</p>
     <div class="row" style="align-items:baseline"><span class="bs" style="font-size:40px;color:var(--red)">${br.total}</span><span class="small">sources in the GSCG brain</span></div>
     ${[["Research sources", br.research], ["Content types", br.types], ["Messaging + proof", br.messaging], ["Past videos", br.videos], ["Reviews + edit notes", br.reviews]].map(([l, n]) => `<div class="bbar"><span>${l}</span><i><u style="width:${Math.max(2, (n / Math.max(br.research, 1)) * 100)}%"></u></i><b>${n}</b></div>`).join("")}</div>
   <div class="card plain"><p class="eyebrow dot">Who's in it</p>
     ${p.peopleThumbs?.length ? `<div class="row"><div class="faces">${p.peopleThumbs.map((k) => `<img src="thumb/${k}">`).join("")}</div><span class="small">People in <b>${p.peopleClips}</b> clips${p.brief.people ? ` · ${esc(p.brief.people)}` : ""}</span></div>` : `<p class="muted small">Analyze footage to see who's in it.</p>`}
     <div class="field" style="margin-top:10px"><label class="f">Who's featured</label><input type="text" data-b="people" placeholder="Seven GSCG consultants" value="${esc(p.brief.people)}"></div></div>
   <div class="card plain"><div class="row"><p class="eyebrow dot" style="margin:0">Intended audience focus</p><span class="spacer"></span><a class="small" href="#/messaging">messaging</a></div>
     <div style="margin-top:8px">${M.audiences.map((a) => `<button class="chip ${msg.audiences.includes(a.id) ? "on" : ""}" data-aud="${a.id}">${esc(a.name)}</button>`).join("")}</div>
     <p class="small" style="margin-top:6px">${M.voice.do.slice(0, 1).concat(M.voice.dont.slice(0, 1)).map((v) => `<span class="ok">✓</span>${esc(v)} `).join("&nbsp;")}<br>${p.clientRules?.length ? p.clientRules.map((c) => `<span class="ok">✓</span>${esc(c.name)}: name ${c.nameUse === "text" ? "in text only" : esc(c.nameUse)}, logo ${esc(c.logo)}`).join(" &nbsp;") : `<span class="ok">✓</span>Clients named in text only, no logos`}</p></div>
  </div>
  <div class="card navy"><div class="row"><p class="eyebrow" style="margin:0">The message · which buckets this draws from</p><span class="spacer"></span><span class="small muted">${M.status === "approved" ? "Approved messaging" : "Draft messaging · updates after the meeting"}</span></div>
    <div style="margin:10px 0 4px">${M.pillars.map((x) => `<button class="chip pil ${msg.pillars.includes(x.id) ? "on" : ""}" data-pil="${x.id}" style="--pc:${x.color}"><i class="pd" style="background:${x.color}"></i> ${esc(x.name)}</button>`).join("")}</div>
    <div class="grid g2" style="margin-top:8px"><div id="says"></div>
     <div><b class="small">Proof it can use</b> <span class="small muted">(verified only)</span><div id="proofs" style="margin-top:6px"></div></div></div></div>
  <div class="card plain" id="typesbox" style="display:none">
    <p class="eyebrow">All content types</p>
    ${Object.entries(groups).map(([g, rs]) => `<div class="group-label">${esc(g)}</div><div class="grid g3">${rs.map((r) => `
      <div class="choice ${p.recipe === r.id ? "sel" : ""}" data-recipe="${r.id}"><h3>${esc(r.name)}</h3><p class="muted">${esc(r.description)}</p></div>`).join("")}</div>`).join("")}
  </div>
  <div class="card plain">
    <p class="eyebrow">The brief</p>
    <h3>What actually happened? (only facts — the copy is built from this)</h3>
    <div class="grid g2" style="margin-top:12px">
      <div>${f("event", "Event", "Seattle client day")}${f("client", "Client(s)", "Seattle Mariners, Seattle Seahawks")}${f("date", "Date", "April 21, 2026")}</div>
      <div>${f("facts", "Key facts (one per line)", "Toured Lumen Field and T-Mobile Park\nPresented research to the Mariners", true)}</div>
    </div>
    ${f("notes", "Anything else (tone, must-include, avoid)", "Keep it upbeat; don't show the parking lot clip", true)}
    <details><summary class="small"><b>Engine options</b></summary>
      <div class="grid g2" style="margin-top:10px">
        <div><label class="f">Speech captions</label><select id="caps">${[["auto", "Auto — when people are talking"], ["on", "Always"], ["off", "Off"]].map(([v, l]) => `<option value="${v}" ${(p.captions || "auto") === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div><label class="f">A/B test</label><label class="check"><input type="checkbox" id="exp" ${p.experiment === false ? "" : "checked"}><div class="small">Render one test variant (length or opening)</div></label></div>
      </div></details>
    <div class="row" style="margin-top:14px"><span class="spacer"></span><button class="btn red" id="save">Next: questions →</button></div>
  </div>`;
  $$("[data-recipe]").forEach((el) => (el.onclick = async () => { await api(`projects/${p.id}/update`, { method: "POST", body: { recipe: el.dataset.recipe } }); route(); }));
  const at = $("#alltypes"); if (at) at.onclick = () => { const b = $("#typesbox"); b.style.display = b.style.display === "none" ? "block" : "none"; };
  $$("[data-aud]").forEach((b) => (b.onclick = () => b.classList.toggle("on")));
  const selP = new Set(msg.pillars), selProof = new Set(msg.proof);
  const paintMsg = () => {
    const pil = M.pillars.filter((x) => selP.has(x.id));
    $("#says").innerHTML = `<b class="small">What it will say</b>${pil.map((x) => `<div class="says"><i class="pd" style="background:${x.color}"></i><div><b>${esc(x.name)}</b><div class="small">${esc(x.promise)}</div></div></div>`).join("") || `<p class="small muted">Pick at least one pillar.</p>`}`;
    const pr = M.proof.filter((x) => x.status === "verified" && x.pillars.some((k) => selP.has(k)));
    $("#proofs").innerHTML = pr.map((x) => `<label class="pr"><input type="checkbox" data-proof="${x.id}" ${selProof.has(x.id) ? "checked" : ""}><span class="small">${esc(x.text)}</span></label>`).join("") || `<p class="small muted">No verified proof for these pillars yet.</p>`;
    $$("[data-proof]").forEach((c) => (c.onchange = () => (c.checked ? selProof.add(c.dataset.proof) : selProof.delete(c.dataset.proof))));
  };
  $$("[data-pil]").forEach((b) => (b.onclick = () => { b.classList.toggle("on"); selP.has(b.dataset.pil) ? selP.delete(b.dataset.pil) : selP.add(b.dataset.pil); paintMsg(); }));
  paintMsg();
  $("#save").onclick = async () => {
    const recipe = p.recipe || top?.id;
    if (!recipe) return toast("Pick a content type first");
    const brief = { ...p.brief }; $$("[data-b]").forEach((i) => (brief[i.dataset.b] = i.value.trim()));
    const audiences = $$("[data-aud]").filter((b) => b.classList.contains("on")).map((b) => b.dataset.aud);
    const message = { pillars: [...selP], audiences, proof: [...selProof] };
    await api(`projects/${p.id}/update`, { method: "POST", body: { recipe, brief, message, audience: audiences.map((a) => M.audiences.find((x) => x.id === a)?.name || a), captions: $("#caps").value, experiment: $("#exp").checked } });
    await api(`projects/${p.id}/ideas`, { method: "POST" });
    location.hash = `#/p/${p.id}/${isStill(p) ? "design" : "questions"}`;
  };
}

// Step 3 — questions (and the title/caption angle)
function stepQuestions(p, body) {
  const A = { ...p.answers };
  const sel = p.idea || p.ideas?.[0];
  body.innerHTML = `
  <div class="card"><div class="row"><p class="eyebrow dot" style="margin:0">Step 3 · Questions</p><span class="spacer"></span><span class="small muted">${p.questions.length} questions · about 1 minute</span></div>
    <h2 class="red">A few quick questions</h2>
    <p class="small muted" style="margin-top:-4px">Answers go straight into the build. The best guess is pre-selected for each.</p>
    <div class="qgrid">${p.questions.map((q, n) => `<div class="q"><div class="qt">${n + 1}. ${esc(q.q)}</div>
      ${q.options.map((o) => `<button class="opt ${q.multi ? ((A[q.id] || []).includes(o.value) ? "on" : "") : A[q.id] === o.value ? "on" : ""}" data-q="${q.id}" data-v="${esc(o.value)}" ${q.multi ? "data-multi" : ""}>${esc(o.label)}</button>`).join("")}
      ${q.more ? `<span class="opt more">+${q.more} more</span>` : ""}</div>`).join("")}</div>
  </div>
  <div class="card navy"><div class="row"><p class="eyebrow" style="margin:0">Title &amp; caption</p><span class="spacer"></span><button class="btn ghost sm" id="regen">↻ New ideas</button></div>
    ${p.ideas?.length ? `<div class="grid g3" style="margin-top:12px">${p.ideas.map((i) => `
      <div class="choice ${sel?.id === i.id ? "sel" : ""}" data-idea="${i.id}"><p class="eyebrow" style="margin:0">${esc(i.angle || "Idea")}</p>
        <div class="idea-frame"><span class="k">${esc(i.kicker)}</span><div class="t">${esc(i.title).replace(/\|/g, "<br>")}</div><div class="s">${esc(i.subtitle)}</div></div>
        <div class="caption-box small">${esc(i.caption)}</div></div>`).join("")}</div>` : `<div class="empty">Titles and captions are being written… about a minute.</div>`}
    <p class="small" style="margin-top:10px">Music: ${p.music?.file ? esc(p.music.file) : "auto-picked from the library at build time"} · <a href="#/p/${p.id}/music">music library</a></p>
  </div>
  <div class="row"><span class="spacer"></span><button class="btn red" id="build">Build it →</button></div>`;
  $$("[data-q]").forEach((b) => (b.onclick = () => {
    const q = b.dataset.q, v = b.dataset.v;
    if (b.hasAttribute("data-multi")) { const s = new Set(A[q] || []); s.has(v) ? s.delete(v) : s.add(v); A[q] = [...s]; b.classList.toggle("on"); }
    else { A[q] = v; $$(`[data-q="${q}"]`).forEach((x) => x.classList.toggle("on", x === b)); }
  }));
  $$("[data-idea]").forEach((el) => (el.onclick = async () => { await api(`projects/${p.id}/update`, { method: "POST", body: { idea: p.ideas.find((i) => i.id === el.dataset.idea), answers: A } }); route(); }));
  $("#regen").onclick = async () => { await api(`projects/${p.id}/ideas`, { method: "POST" }); toast("Writing new ideas…"); };
  $("#build").onclick = async () => {
    if (!(A.platforms || []).length) return toast("Pick at least one platform");
    try { await api(`projects/${p.id}/build`, { method: "POST", body: { answers: A } }); location.hash = `#/p/${p.id}/build`; } catch (e) { toast(e.message); }
  };
}

// Step 4 — build: every cut's progress + brand checks
function stepBuild(p, body) {
  const running = p.jobs.filter((j) => j.kind === "render" && j.status !== "done" && j.status !== "error");
  const latest = Object.values(p.outputs.filter((o) => o.status !== "replaced").reduce((m, o) => ((m[o.platform] = o), m), {}));
  const plat = (k) => B.platforms[k]?.short || k;
  body.innerHTML = `
  <div class="card"><div class="row"><p class="eyebrow dot" style="margin:0">Step 4 · Build</p><span class="spacer"></span>${running.length ? `<span class="small muted">${running.length} cut${running.length > 1 ? "s" : ""} rendering</span>` : ""}</div>
    <h2 class="red">${running.length ? `Building ${running.length + latest.length} cut${running.length + latest.length > 1 ? "s" : ""}` : latest.length ? "Built" : "Nothing building yet"}</h2>
    <div class="buildrow">
      ${latest.map((o) => `<div class="cut"><div class="phone"><img src="${media(o.cover)}"></div><div class="small"><b>${esc(plat(o.platform))}</b> · ${o.duration}s<br><span class="ok">✓</span>Rendered${o.qc?.issues?.length ? ` · ⚠ ${esc(o.qc.issues[0])}` : ""}</div></div>`).join("")}
      ${running.map((j) => `<div class="cut"><div class="phone ghost"><span>${Math.round(j.progress * 100)}%</span></div><div class="small"><b>${esc(j.label)}</b><br><span style="color:var(--red)">●</span> ${esc(j.message || j.status)}</div></div>`).join("")}
      ${!latest.length && !running.length ? `<p class="muted">Answer the questions, then press Build it.</p>` : ""}
      <div class="checks"><b class="small">Brand checks · every new render</b>${["Logo, top right", "Navy + red titles", "Big Shoulders + IBM Plex", "Time + place stamps", "Captions on speech", "3-part outro", "Audio −14 LUFS", "Text in safe zones"].map((c) => `<div class="small"><span class="ok">✓</span>${c}</div>`).join("")}</div>
    </div>
    ${latest.length ? `<div class="row" style="margin-top:16px"><span class="spacer"></span><a class="btn red" href="#/p/${p.id}/review">Review →</a></div>` : ""}
  </div>`;
}

// Step 4 — music
async function stepMusic(p, body) {
  const mood = p.idea?.musicMood || "upbeat", energy = p.idea?.energy || 3;
  const pick = await api(`music/pick?mood=${encodeURIComponent(mood)}&energy=${energy}`);
  const chosen = p.music?.file ? B.music.find((t) => t.file === p.music.file) : null;
  const trackHTML = (t, tag) => `<div class="choice ${p.music?.file === t.file ? "sel" : ""}" data-track="${esc(t.file)}">
    <p class="eyebrow" style="margin:0">${tag}</p><h3>${esc(t.title)}</h3>
    <p class="small muted">${esc(t.moods.join(", "))} · energy ${t.energy}${t.bpm ? ` · ${t.bpm} BPM` : ""} · ${esc(t.license || "license unknown")}</p>
    ${t.why ? `<p class="small">${esc(t.why)}</p>` : ""}<audio controls preload="none" src="track/${encodeURIComponent(t.file)}" style="width:100%;margin-top:6px"></audio></div>`;
  body.innerHTML = `
  <div class="card">
    <p class="eyebrow dot">Music library</p>
    <h2 class="red">Soundtrack</h2>
    <p>The idea asks for <b>${esc(mood)}</b> music at energy <b>${energy}/5</b>. Cuts are timed to the track's beat automatically.</p>
    ${pick.pick ? `<div class="grid g2" style="margin-top:12px">${trackHTML(pick.pick, "Auto-pick")}${pick.alternatives.map((t) => trackHTML(t, "Alternative")).join("")}</div>`
      : `<div class="note warn"><b>The music library is empty.</b> The Studio will use a royalty-free placeholder beat that is perfectly on-grid. For Instagram, GSCG's business account can only use Meta's commercially cleared library, so every Reel also gets a <b>no-music version</b> to add a track in the app. Add licensed tracks below to have them chosen automatically.</div>`}
    <div class="row" style="margin-top:14px">
      <div class="choice ${!p.music?.file ? "sel" : ""}" data-track="" style="flex:1"><h3>Placeholder beat</h3><p class="small muted">Generated, royalty-free, on the beat grid. Use with the no-music export for Instagram.</p></div>
    </div>
  </div>
  <div class="card plain">
    <p class="eyebrow">Add a licensed track</p>
    <div class="grid g4">
      <div class="field"><label class="f">Audio file</label><input type="file" id="mf" accept="audio/*"></div>
      <div class="field"><label class="f">Moods</label><input type="text" id="mm" placeholder="hype, upbeat"></div>
      <div class="field"><label class="f">Energy 1–5</label><input type="number" id="me" min="1" max="5" value="4"></div>
      <div class="field"><label class="f">License / source</label><input type="text" id="ml" placeholder="Epidemic Sound, Artlist…"></div>
    </div>
    <button class="btn ghost sm" id="mup">Add to library</button>
  </div>
  <div class="row"><span class="spacer"></span><a class="btn red" href="#/p/${p.id}/questions">Back to questions →</a></div>`;
  $$("[data-track]").forEach((el) => (el.onclick = async (e) => {
    if (e.target.tagName === "AUDIO") return;
    await api(`projects/${p.id}/update`, { method: "POST", body: { music: el.dataset.track ? { file: el.dataset.track } : { file: null, placeholder: true } } }); route();
  }));
  if (!p.music && pick.pick) { // first visit: take the auto-pick
    await api(`projects/${p.id}/update`, { method: "POST", body: { music: { file: pick.pick.file, auto: true } } });
    return route();
  }
  $("#mup").onclick = async () => {
    const f = $("#mf").files[0]; if (!f) return toast("Choose an audio file");
    const q = new URLSearchParams({ name: f.name, title: f.name.replace(/\.[^.]+$/, ""), moods: $("#mm").value.replace(/\s/g, ""), energy: $("#me").value, license: $("#ml").value });
    await fetch(`/api/music?${q}`, { method: "PUT", body: f }); toast("Track added"); route();
  };
}

// Step 3 (graphics) — design: live frame previews + editor, then export PNG/PDF
const FIELDS = {
  cover: [["kicker", "Label"], ["title", "Title", "area"], ["body", "Subtitle"], ["photo"]],
  statement: [["kicker", "Label"], ["title", "Big line", "area"], ["body", "Supporting line", "area"]],
  points: [["kicker", "Label"], ["title", "Heading"], ["items", "Points (one per line)", "list"]],
  proof: [["kicker", "Label"], ["stat", "Big number"], ["body", "The fact", "area"]],
  photo: [["kicker", "Label"], ["body", "Caption", "area"], ["photo"]],
  cta: [["title", "Slogan", "area"], ["body", "Button"], ["kicker", "Small line"]],
  flyer: [["kicker", "Label"], ["title", "Title", "area"], ["body", "Subtitle"], ["details"], ["items", "Points (one per line)", "list"], ["cta", "Call to action"], ["photo"]],
};
function scaledFrame(src, fid, width, cls = "") {
  const f = B.stills.formats[fid], k = width / f.w;
  return `<div class="sframe ${cls}" style="width:${width}px;height:${Math.round(f.h * k)}px"><iframe src="${src}" scrolling="no" tabindex="-1" style="width:${f.w}px;height:${f.h}px;transform:scale(${k})"></iframe></div>`;
}
async function stepDesign(p, body) {
  if (!p.stills) {
    if (!p.recipe) { body.innerHTML = `<div class="card plain empty">Pick what we're making first. <a href="#/p/${p.id}/brief">What we're making →</a></div>`; return; }
    if (!p.ideas?.length && p.jobs.some((j) => j.kind === "ideas" && j.status !== "done" && j.status !== "error")) { body.innerHTML = `<div class="card plain empty">Writing the title and caption… the design is drafted right after.</div>`; return; }
    body.innerHTML = `<div class="card plain empty">Drafting the frames from the brief, the messaging and the best photos…</div>`;
    try { await api(`projects/${p.id}/stills`, { method: "POST", body: {} }); } catch (e) { body.innerHTML = `<div class="note warn">${esc(e.message)}</div>`; return; }
    return route();
  }
  const S = p.stills, FT = B.stills.frameTypes;
  let sel = Math.min(Number(sessionStorage.getItem(`sel-${p.id}`)) || 0, S.frames.length - 1), view = S.formats[0], timer = null;
  const src = (i, fid = view) => `/still/${p.id}/${fid}/${i}?v=${Date.now()}`;
  const save = () => api(`projects/${p.id}/stills`, { method: "POST", body: { set: { frames: S.frames, formats: S.formats, caption: S.caption, hashtags: S.hashtags } } });
  const kindName = (KINDS.find((k) => k[0] === p.kind) || [0, "Graphics"])[1];
  const paint = () => {
    const fr = S.frames[sel];
    body.innerHTML = `
    <div class="card"><div class="row"><p class="eyebrow dot" style="margin:0">Step 3 · Design</p><span class="spacer"></span>
      <span class="small muted">Exports:</span>${Object.entries(B.stills.formats).map(([k, f]) => `<button class="chip ${S.formats.includes(k) ? "on" : ""}" data-fmt="${k}" title="${esc(f.label)}">${esc(f.short)}</button>`).join("")}</div>
      <h2 class="red">${esc(kindName)} · ${S.frames.length} frame${S.frames.length > 1 ? "s" : ""}</h2>
      <div class="strip">${S.frames.map((f, i) => `<div class="sthumb ${i === sel ? "on" : ""}" data-sel="${i}">${scaledFrame(src(i), view, 150)}<div class="small"><b>${i + 1}</b> ${esc(FT[f.type].split(" · ")[0])}</div></div>`).join("")}
        <div class="sadd"><select id="addtype"><option value="">+ Add frame</option>${Object.entries(FT).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></div></div>
    </div>
    <div class="designer">
      <div class="card plain bigprev"><div class="row"><span class="small muted">Preview</span><span class="spacer"></span>
        ${S.formats.length > 1 ? `<select id="view" class="mini">${S.formats.map((k) => `<option value="${k}" ${k === view ? "selected" : ""}>${esc(B.stills.formats[k].short)}</option>`).join("")}</select>` : `<span class="small">${esc(B.stills.formats[view].label)}</span>`}</div>
        <div id="big">${scaledFrame(src(sel), view, 440)}</div></div>
      <div class="card plain"><div class="row"><b>Frame ${sel + 1}</b><span class="spacer"></span>
          <button class="btn ghost sm" data-mv="-1" ${sel ? "" : "disabled"}>←</button><button class="btn ghost sm" data-mv="1" ${sel < S.frames.length - 1 ? "" : "disabled"}>→</button>
          <button class="btn ghost sm" id="dup">Duplicate</button><button class="btn ghost sm" id="del" ${S.frames.length > 1 ? "" : "disabled"}>Remove</button></div>
        <label class="f">Layout</label><select data-fk="type">${Object.entries(FT).map(([k, l]) => `<option value="${k}" ${k === fr.type ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
        ${(FIELDS[fr.type] || []).map(([k, label, kind]) => {
          if (k === "photo") return `<label class="f">Photo</label><div class="photos"><div class="ph ${!fr.photo ? "on" : ""}" data-photo=""><span>None</span></div>${(p.stills.photos || []).map((ph) => `<div class="ph ${fr.photo === ph.path ? "on" : ""}" data-photo="${esc(ph.path)}" data-focus="${ph.focus.join(",")}"><img src="${media(ph.path)}"></div>`).join("")}</div>
            ${(p.stills.photos || []).length ? "" : `<p class="small muted">No photos yet. Add footage or photos on step 1 and the best frames show up here.</p>`}`;
          if (k === "details") return `<label class="f">Details</label>${[0, 1, 2].map((n) => `<div class="row" style="gap:6px;margin-bottom:6px"><input type="text" data-det="${n}" data-dk="0" value="${esc(fr.details?.[n]?.[0] || ["When", "Where", "More"][n])}" style="width:110px"><input type="text" data-det="${n}" data-dk="1" value="${esc(fr.details?.[n]?.[1] || "")}" placeholder="—"></div>`).join("")}`;
          const v = kind === "list" ? (fr.items || []).join("\n") : fr[k] || "";
          return `<label class="f">${esc(label)}</label>${kind ? `<textarea data-fk="${k}" rows="${kind === "list" ? 4 : 2}">${esc(v)}</textarea>` : `<input type="text" data-fk="${k}" value="${esc(v)}">`}`;
        }).join("")}
        <p class="small muted" style="margin-top:8px">In titles, <code>|</code> starts a new line (the last line turns red) and <code>*word*</code> makes a word red. Type shrinks to fit automatically.${fr.type === "proof" ? " <b>Only verified facts</b> from Messaging → Proof." : ""}</p>
        <p class="small" style="margin-top:6px">${p.clientRules?.length ? p.clientRules.map((c) => `<span class="ok">✓</span>${esc(c.name)}: name ${c.nameUse === "text" ? "in text only" : esc(c.nameUse)}, logo ${esc(c.logo)}`).join(" &nbsp;") : `<span class="ok">✓</span>Client names in text only, no client logos`}</p>
      </div>
    </div>
    <div class="card navy"><p class="eyebrow">Caption</p><textarea id="cap" rows="3">${esc(S.caption || "")}</textarea>
      <label class="f" style="color:#fff">Hashtags</label><input type="text" id="tags" value="${esc((S.hashtags || []).join(" "))}"></div>
    <div class="row"><button class="btn ghost sm" id="redraft">↻ Re-draft from brief</button><span class="spacer"></span><button class="btn red" id="export">Export ${S.formats.map((k) => esc(B.stills.formats[k].short)).join(" + ")} →</button></div>`;
    wire();
  };
  const refresh = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      await save();
      const big = $("#big iframe"); if (big) big.src = src(sel);
      const th = $(`[data-sel="${sel}"] iframe`); if (th) th.src = src(sel);
    }, 450);
  };
  const commit = async () => { await save(); paint(); };
  const wire = () => {
    const fr = S.frames[sel];
    $$("[data-sel]").forEach((el) => (el.onclick = () => { sel = Number(el.dataset.sel); sessionStorage.setItem(`sel-${p.id}`, sel); paint(); }));
    $$("[data-fmt]").forEach((b) => (b.onclick = () => {
      const k = b.dataset.fmt;
      if (S.formats.includes(k)) { if (S.formats.length === 1) return toast("Keep at least one format"); S.formats = S.formats.filter((x) => x !== k); }
      else S.formats.push(k);
      if (!S.formats.includes(view)) view = S.formats[0];
      commit();
    }));
    if ($("#view")) $("#view").onchange = (e) => { view = e.target.value; paint(); };
    $$("[data-fk]").forEach((el) => (el.oninput = el.onchange = () => {
      const k = el.dataset.fk;
      if (k === "type") { fr.type = el.value; return commit(); }
      if (k === "items") fr.items = el.value.split("\n").map((x) => x.trim()).filter(Boolean);
      else fr[k] = el.value;
      refresh();
    }));
    $$("[data-det]").forEach((el) => (el.oninput = () => {
      fr.details = [0, 1, 2].map((n) => [$(`[data-det="${n}"][data-dk="0"]`).value.trim(), $(`[data-det="${n}"][data-dk="1"]`).value.trim()]);
      refresh();
    }));
    $$("[data-photo]").forEach((el) => (el.onclick = () => {
      fr.photo = el.dataset.photo || null; fr.focus = el.dataset.focus ? el.dataset.focus.split(",").map(Number) : undefined;
      commit();
    }));
    $$("[data-mv]").forEach((b) => (b.onclick = () => { const to = sel + Number(b.dataset.mv); [S.frames[sel], S.frames[to]] = [S.frames[to], S.frames[sel]]; sel = to; commit(); }));
    $("#dup").onclick = () => { S.frames.splice(sel + 1, 0, { ...structuredClone(fr), id: `f${Date.now().toString(36)}` }); sel++; commit(); };
    $("#del").onclick = () => { S.frames.splice(sel, 1); sel = Math.max(0, sel - 1); commit(); };
    $("#addtype").onchange = (e) => {
      if (!e.target.value) return;
      const t = e.target.value, ph = p.stills.photos?.[S.frames.length % Math.max(1, p.stills.photos.length)];
      const nf = { id: `f${Date.now().toString(36)}`, type: t, kicker: S.frames[0]?.kicker || "", title: t === "cta" ? (S.frames.find((f) => f.type === "cta")?.title || B.brand.tagline) : "New frame", body: t === "cta" ? S.cta || "Follow for more" : "", items: t === "points" ? ["First point", "Second point", "Third point"] : [] };
      if (["cover", "photo", "flyer"].includes(t) && ph) Object.assign(nf, { photo: ph.path, focus: ph.focus });
      const closeAt = S.frames.findIndex((f) => f.type === "cta");
      const at = t !== "cta" && closeAt > 0 ? closeAt : S.frames.length;
      S.frames.splice(at, 0, nf); sel = at; commit();
    };
    $("#cap").oninput = () => { S.caption = $("#cap").value; clearTimeout(timer); timer = setTimeout(save, 600); };
    $("#tags").oninput = () => { S.hashtags = $("#tags").value.split(/\s+/).filter(Boolean); clearTimeout(timer); timer = setTimeout(save, 600); };
    $("#redraft").onclick = async () => {
      if (!confirm("Replace these frames with a fresh draft from the brief? Your edits to the frames will be lost.")) return;
      await api(`projects/${p.id}/stills`, { method: "POST", body: {} }); sessionStorage.removeItem(`sel-${p.id}`); route();
    };
    $("#export").onclick = async () => {
      await save();
      try { await api(`projects/${p.id}/export`, { method: "POST" }); toast("Exporting…"); location.hash = `#/p/${p.id}/review`; } catch (e) { toast(e.message); }
    };
  };
  paint();
}

// Step 4 (graphics) — review: every exported frame, PDF, approve/reject
function stepReviewStills(p, body) {
  const outs = p.outputs.filter((o) => o.status !== "replaced").slice().reverse();
  const running = p.jobs.filter((j) => j.kind === "render" && j.status !== "done" && j.status !== "error");
  body.innerHTML = `
  <div class="card"><p class="eyebrow dot">Step 4 · Review</p>
    <div class="row"><h2 class="red" style="margin:0">Your graphics</h2><span class="spacer"></span><a class="btn ghost sm" href="#/p/${p.id}/design">← Edit design</a></div>
    <p class="small muted">Check every frame, then approve what you'd post. Approved sets go to the Post step with their caption.</p></div>
  ${outs.length ? outs.map((o) => `
    <div class="card plain sout ${o.status}"><div class="row"><b>${esc(platName(o.platform))}</b><span class="small muted">${esc(B.stills.formats[o.platform]?.label || "")} · ${o.frames} frame${o.frames > 1 ? "s" : ""} · ${esc(fmtDate(o.created))}</span><span class="spacer"></span><span class="status ${o.status}">${esc(o.status)}</span></div>
      <div class="sfiles">${o.files.map((f, i) => `<a href="${media(f)}" target="_blank" title="Frame ${i + 1}"><img src="${media(f)}"></a>`).join("")}</div>
      <div class="caption-box small">${esc(o.idea?.caption || "")}\n${esc((o.idea?.hashtags || []).join(" "))}</div>
      <div class="row" style="margin-top:10px">
        <button class="btn red sm" data-approve="${o.id}">Approve</button><button class="btn ghost sm" data-reject="${o.id}">Reject</button>
        <span class="spacer"></span>${o.pdf ? `<a class="btn ghost sm" href="${media(o.pdf)}" target="_blank">Open PDF</a>` : ""}
        <button class="btn ghost sm" data-copy="${o.id}">Copy caption</button><button class="btn ghost sm" data-reveal="${esc(o.files[0])}">Show in Finder</button></div>
    </div>`).join("") : running.length ? "" : `<div class="card plain empty">Nothing exported yet. <a href="#/p/${p.id}/design">Design →</a></div>`}
  ${p.outputs.some((o) => o.status === "approved") ? `<div class="row"><span class="spacer"></span><a class="btn red" href="#/p/${p.id}/post">Next: post →</a></div>` : ""}`;
  const fb = async (id, approved) => { await api(`projects/${p.id}/feedback`, { method: "POST", body: { output: id, approved } }); toast(approved ? "Approved" : "Rejected"); route(); };
  $$("[data-approve]").forEach((b) => (b.onclick = () => fb(b.dataset.approve, true)));
  $$("[data-reject]").forEach((b) => (b.onclick = () => fb(b.dataset.reject, false)));
  $$("[data-copy]").forEach((b) => (b.onclick = () => { const o = p.outputs.find((x) => x.id === b.dataset.copy); navigator.clipboard.writeText(`${o.idea?.caption || ""}\n\n${(o.idea?.hashtags || []).join(" ")}`); toast("Caption copied"); }));
  $$("[data-reveal]").forEach((b) => (b.onclick = () => api("reveal", { method: "POST", body: { file: b.dataset.reveal } })));
}

// Step 5 — render & review
function stepReview(p, body) {
  const outs = p.outputs.filter((o) => o.status !== "replaced").slice().reverse();
  const plat = (k) => B.platforms[k]?.short || k;
  body.innerHTML = `
  <div class="card">
    <p class="eyebrow dot">Step 5 · Review</p>
    <div class="row"><h2 class="red" style="margin:0">Your videos</h2><span class="spacer"></span>
      <button class="btn ghost sm" id="again">Render again</button></div>
    <p class="small muted">Approve what you'd post, or open the timeline and click shots to cut them. Every decision trains the system.</p>
  </div>
  ${outs.length ? `<div class="outputs">${outs.map((o) => `
    <div class="out ${o.status}" data-out="${o.id}">
      <video controls preload="metadata" poster="${o.cover ? media(o.cover) : ""}" src="${media(o.file)}"></video>
      <div class="body">
        <div class="row"><b>${esc(plat(o.platform))} · ${o.duration}s</b><span class="spacer"></span><span class="status ${o.status}">${esc(o.status)}</span></div>
        <p class="small muted" style="margin:6px 0">${esc(B.recipes.find((r) => r.id === o.recipe)?.name || o.recipe)} · ${o.track ? "🎵 " + esc(o.track) : "placeholder beat"} · ${o.qc?.lufs ?? "?"} LUFS${o.qc?.issues?.length ? ` · ⚠ ${esc(o.qc.issues.join(", "))}` : ""}</p>
        ${o.experiment ? `<div class="note small"><b>A/B test · version ${o.experiment.arm}</b> — ${esc(o.experiment.label)}. Post both versions on similar days/times, then log both results; the winner becomes the default.</div>` : ""}
        ${o.readiness?.score != null ? `<details class="ready" style="margin:8px 0"><summary><b style="color:${o.readiness.score >= 80 ? "var(--ok)" : o.readiness.score >= 60 ? "var(--warn)" : "var(--red)"}">Ready-to-post score ${o.readiness.score}/100</b>${o.readiness.fixes.length ? ` · <span class="small">${esc(o.readiness.fixes[0])}</span>` : ""}</summary>
          <table style="margin-top:6px">${o.readiness.checks.map((c) => `<tr><td>${c.score >= 0.8 ? "✅" : c.score >= 0.5 ? "🟡" : "🔴"}</td><td>${esc(c.label)}<div class="small muted">${esc(c.detail || "")}</div></td><td class="small muted" title="Evidence grade: A platform-official, B large dataset, C weak">[${c.grade}]</td></tr>`).join("")}</table></details>` : ""}
        ${(o.qc?.warnings || []).map((w) => `<div class="note warn small">${esc(w)}</div>`).join("")}
        <div class="caption-box small">${esc(o.idea?.caption || "")}\n${esc((o.idea?.hashtags || []).join(" "))}</div>
        <div class="row" style="margin-top:10px">
          <button class="btn ghost sm" data-copy="${o.id}">Copy caption</button>
          <button class="btn ghost sm" data-reveal="${esc(o.file)}">Show in Finder</button>
          ${o.nomusic ? `<a class="btn ghost sm" href="${media(o.nomusic)}" download>No-music version</a>` : ""}
        </div>
        <div class="stars" style="margin-top:12px" data-stars="${o.id}">${[1, 2, 3, 4, 5].map((n) => `<button data-n="${n}" class="${(o.rating || 0) >= n ? "on" : ""}">★</button>`).join("")}</div>
        <textarea data-notes="${o.id}" placeholder="Notes (what to change next time)" style="min-height:56px;margin-top:6px">${esc(o.notes || "")}</textarea>
        <div class="row" style="margin-top:10px">
          <button class="btn red sm" data-approve="${o.id}">Approve</button>
          <button class="btn ghost sm" data-reject="${o.id}">Reject</button>
          <button class="btn ghost sm" data-sb="${o.id}">Timeline</button>
        </div>
        <div data-sbbox="${o.id}"></div>
        ${o.status === "approved" ? `<details style="margin-top:12px"><summary class="small"><b>Log results after posting</b></summary>
          <div class="grid g3" style="margin-top:8px">${["views", "likes", "comments", "shares", "saves"].map((k) => `<div><label class="f small">${k}</label><input type="number" data-perf="${k}"></div>`).join("")}
          <div><label class="f small">post URL</label><input type="url" data-perf="url"></div></div>
          <button class="btn ghost sm" data-logperf="${o.id}" style="margin-top:8px">Save results</button></details>` : ""}
      </div>
    </div>`).join("")}</div>` : `<div class="card plain empty">Videos appear here as they finish rendering (about 1–2 minutes each).</div>`}`;
  $("#again").onclick = async () => { await api(`projects/${p.id}/render`, { method: "POST" }); toast("Queued"); };
  $$("[data-copy]").forEach((b) => (b.onclick = () => { const o = p.outputs.find((x) => x.id === b.dataset.copy); navigator.clipboard.writeText(`${o.idea?.caption || ""}\n\n${(o.idea?.hashtags || []).join(" ")}`); toast("Caption copied"); }));
  $$("[data-reveal]").forEach((b) => (b.onclick = () => api("reveal", { method: "POST", body: { file: b.dataset.reveal } })));
  const rating = {};
  $$("[data-stars]").forEach((box) => $$("button", box).forEach((btn) => (btn.onclick = () => {
    rating[box.dataset.stars] = Number(btn.dataset.n);
    $$("button", box).forEach((x) => x.classList.toggle("on", Number(x.dataset.n) <= Number(btn.dataset.n)));
  })));
  const fb = async (id, approved) => {
    await api(`projects/${p.id}/feedback`, { method: "POST", body: { output: id, approved, rating: rating[id] || p.outputs.find((o) => o.id === id).rating, notes: $(`[data-notes="${id}"]`).value } });
    toast(approved ? "Approved — learned from it" : "Rejected — noted"); route();
  };
  $$("[data-approve]").forEach((b) => (b.onclick = () => fb(b.dataset.approve, true)));
  $$("[data-reject]").forEach((b) => (b.onclick = () => fb(b.dataset.reject, false)));
  $$("[data-sb]").forEach((b) => (b.onclick = async () => {
    const id = b.dataset.sb, box = $(`[data-sbbox="${id}"]`);
    const shots = await api(`projects/${p.id}/plan?output=${id}`);
    const bans = new Set();
    const total = shots.reduce((a, s) => Math.max(a, s.start + s.dur), 0) || 1;
    box.innerHTML = `<p class="small" style="margin:10px 0 0"><b>Timeline</b> · click shots to cut, then re-cut. It won't use them again and learns what you don't like.</p>
      <div class="tlv"><div class="ruler">${Array.from({ length: Math.floor(total / 5) + 1 }, (_, k) => `<span style="left:${(k * 5 / total) * 100}%">0:${String(k * 5).padStart(2, "0")}</span>`).join("")}</div>
      <div class="storyboard trk">${shots.map((s, k) => `<div class="sb" data-key="${esc(s.key)}" style="flex:${s.dur}">${s.thumb ? `<img src="thumb/${s.thumb}">` : ""}<span>${k + 1}</span></div>`).join("")}</div></div>
      <button class="btn navy sm" data-recut="${id}">Re-cut without these</button>`;
    $$(".sb", box).forEach((el) => (el.onclick = () => { el.classList.toggle("ban"); bans.has(el.dataset.key) ? bans.delete(el.dataset.key) : bans.add(el.dataset.key); }));
    $(`[data-recut="${id}"]`).onclick = async () => {
      if (!bans.size) return toast("Click at least one shot");
      await api(`projects/${p.id}/recut`, { method: "POST", body: { output: id, bans: [...bans] } }); toast("Re-cutting…");
    };
  }));
  const firstTl = $("[data-sb]"); if (firstTl) firstTl.click();
  if (p.outputs.some((o) => o.status === "approved")) body.insertAdjacentHTML("beforeend", `<div class="row"><span class="spacer"></span><a class="btn red" href="#/p/${p.id}/post">Next: post →</a></div>`);
  $$("[data-logperf]").forEach((b) => (b.onclick = async () => {
    const o = p.outputs.find((x) => x.id === b.dataset.logperf), wrap = b.closest("details");
    const rec = { output: o.id, project: p.id, recipe: o.recipe, platform: o.platform, title: o.idea?.title, duration: o.duration };
    $$("[data-perf]", wrap).forEach((i) => (rec[i.dataset.perf] = i.value));
    await api("performance", { method: "POST", body: rec }); toast("Results saved");
  }));
}

// Step 6 — post: channels, captions, schedule, post kit + the week ahead
function stepPost(p, body) {
  const approved = p.outputs.filter((o) => o.status === "approved");
  const plat = (k) => B.platforms[k]?.short || k;
  const CH = { reels: "Instagram", shorts: "YouTube", youtube: "YouTube", linkedin: "LinkedIn", "linkedin-wide": "LinkedIn", "ig-post": "Instagram", "ig-story": "Instagram", "li-post": "LinkedIn", flyer: "Instagram" };
  const nm = new Date(); nm.setDate(nm.getDate() + ((8 - nm.getDay()) % 7 || 7));
  const sched = p.schedule || { date: nm.toLocaleDateString("en-CA"), time: "18:00" };
  const evs = B.calendar.filter((e) => B.week.includes(e.date) || e.project === p.id);
  const nextWeek = (() => { const d = new Date(B.week[0] + "T12:00"); d.setDate(d.getDate() + 7); return Array.from({ length: 7 }, (_, k) => { const x = new Date(d); x.setDate(d.getDate() + k); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; }); })();
  const showWeek = sched.date && nextWeek.includes(sched.date) ? nextWeek : B.week;
  const shotsFor = B.calendar.find((e) => showWeek.includes(e.date) && e.project !== p.id && e.status !== "scheduled" && e.status !== "posted" && e.shots?.length);
  const capFor = (o, ch) => {
    const c = o.idea?.caption || "", tags = (o.idea?.hashtags || []).join(" ");
    return ch === "LinkedIn" ? `${c}\n\n${o.idea?.cta || ""}`.trim() : `${c}\n\n${tags}`.trim();
  };
  body.innerHTML = `
  <div class="card"><p class="eyebrow dot">Step 6 · Post</p><h2 class="red">Post to GSCG channels</h2>
    ${approved.length ? approved.map((o) => { const ch = CH[o.platform] || o.platform; const posted = o.post; return `
    <div class="postrow" data-o="${o.id}">
      ${o.kind === "still" ? `<img class="stillpost" src="${media(o.cover)}">` : `<video controls preload="metadata" poster="${o.cover ? media(o.cover) : ""}" src="${media(o.file)}"></video>`}
      <div style="flex:1;min-width:0">
        <div class="row"><b>${esc(platName(o.platform))} · ${o.kind === "still" ? `${o.frames} frame${o.frames > 1 ? "s" : ""}` : `${o.duration}s`}</b><span class="spacer"></span>${posted ? `<span class="status approved">${esc(posted.status)} · ${esc(posted.date)} ${fmtTime(posted.time)}</span>` : ""}</div>
        <div class="chans">${["Instagram", "LinkedIn", "YouTube"].map((c) => `<label class="chan ${c === ch ? "on" : ""}"><input type="checkbox" data-ch="${c}" ${c === ch || posted?.channels?.includes(c) ? "checked" : ""}><b>${c}</b></label>`).join("")}</div>
        <div class="field"><label class="f">Caption · ${ch}</label><textarea data-cap="${ch}">${esc(posted?.captions?.[ch] || capFor(o, ch))}</textarea></div>
        <div class="row"><label class="small">Date <input type="text" data-date value="${esc(posted?.date || sched.date || "")}" style="width:120px"></label><label class="small">Time <input type="text" data-time value="${esc(posted?.time || sched.time || "18:00")}" style="width:80px"></label>
          <span class="spacer"></span><button class="btn ghost sm" data-kit="${o.id}">Save post kit</button><button class="btn red" data-post="${o.id}">${posted ? "Update schedule" : "Schedule post"}</button></div>
        ${posted?.kit ? `<p class="small muted">Post kit: <a href="#" data-reveal="${esc(posted.kit)}">open folder</a> (${o.kind === "still" ? "PNGs, PDF, captions.txt" : "video, no-music version, cover, captions.txt"})</p>` : ""}
      </div></div>`; }).join("") : `<div class="empty">Approve a video on the Review step and it shows up here, ready to schedule.</div>`}
    <p class="small muted" style="margin-top:6px">Direct publishing to Instagram, LinkedIn and YouTube needs each platform's API access, which isn't connected yet. Until then, scheduling saves a ready-to-post kit and puts it on the calendar.</p>
  </div>
  <div class="card plain"><div class="row"><p class="eyebrow" style="margin:0">Calendar</p><span class="spacer"></span><a class="small" href="#/calendar">Open calendar →</a></div>
    <h3 style="margin-top:4px">Week of ${new Date(showWeek[0] + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</h3>${weekStrip(showWeek, B.calendar.filter((e) => showWeek.includes(e.date)))}</div>
  ${shotsFor ? `<div class="card navy"><p class="eyebrow">Shot list · ${esc(shotsFor.title)}</p><ol class="shots">${shotsFor.shots.map((s) => `<li><b>${esc(s.beat)}</b> <span class="muted small">(${esc(s.seconds)} s)</span> — <span class="small">${esc(s.tip || "")}</span></li>`).join("")}</ol></div>` : ""}`;
  const collect = (row) => ({
    channels: $$("[data-ch]", row).filter((c) => c.checked).map((c) => c.dataset.ch),
    captions: Object.fromEntries($$("[data-cap]", row).map((t) => [t.dataset.cap, t.value])),
    date: $("[data-date]", row).value.trim(), time: $("[data-time]", row).value.trim(),
  });
  $$("[data-post]").forEach((b) => (b.onclick = async () => {
    const row = b.closest(".postrow"); const d = collect(row);
    if (!d.channels.length) return toast("Pick at least one channel");
    await api(`projects/${p.id}/post`, { method: "POST", body: { output: b.dataset.post, ...d } }); toast("Scheduled · post kit saved"); route();
  }));
  $$("[data-kit]").forEach((b) => (b.onclick = async () => {
    const row = b.closest(".postrow"); const d = collect(row);
    await api(`projects/${p.id}/post`, { method: "POST", body: { output: b.dataset.kit, ...d, now: true } }); toast("Post kit saved"); route();
  }));
  $$("[data-reveal]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); api("reveal", { method: "POST", body: { file: a.dataset.reveal + "/captions.txt" } }); }));
}

// ---------------- messaging (source of truth: brand/messaging.json) ----------------
const STATUS = ["verified", "draft", "open"];
const setPath = (o, path, v) => { const ks = path.split("."); let x = o; for (let i = 0; i < ks.length - 1; i++) x = x[ks[i]]; x[ks.at(-1)] = v; };
const stSel = (path, v, opts = STATUS) => `<select class="mini st-${esc(v)}" data-p="${path}">${opts.map((s) => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("")}</select>`;
let MSG = null, msgDirty = false;
async function messagingPage(section) {
  if (!MSG || !msgDirty) MSG = await api("messaging");
  const m = MSG, R = B.recipes, st = messagingStats(m);
  const groups = {}; for (const r of R) (groups[r.group] ||= []).push(r);
  app.className = "wide";
  app.innerHTML = `<p class="eyebrow">Messaging · source of truth</p>
  <div class="row"><h1 style="margin:0">What GSCG says, and to whom</h1><span class="spacer"></span><a class="btn ghost sm" href="#/messaging/workshop">Meeting worksheet</a></div>
  <p class="lead" style="margin:10px 0 14px">Every post draws from this: the pillars are the content buckets, each content type pulls from its buckets, and captions are written for the audience. It lives in the repo (<code>brand/messaging.json</code> + <code>messaging.md</code>), so Claude and the future GSCG website read the same thing.</p>
  <div class="statusbar"><span>Document status ${stSel("status", m.status, ["draft", "approved"])}</span><span><b>${st.verified}</b> verified proof points</span><span><b>${st.draft}</b> drafts to approve</span><span><b>${st.open}</b> open</span>
    ${m.meeting ? `<span>Meeting: <input type="text" class="mini" data-p="meeting.date" value="${esc(m.meeting.date)}" style="width:110px"></span>` : ""}<span class="spacer"></span><span class="legend"><i class="lg verified"></i>verified <i class="lg draft"></i>draft <i class="lg open"></i>open</span></div>
  <div class="subnav">${[["who", "Who we are"], ["aud", "Audiences"], ["pil", "Pillars"], ["map", "Content buckets"], ["proof", "Proof"], ["voice", "Voice"], ["clients", "Client rules"]].map(([k, l]) => `<button data-jump="${k}">${l}</button>`).join("")}</div>

  <div class="card" id="s-who"><p class="eyebrow dot">Who we are</p>
    ${m.identity.map((f, i) => `<div class="idrow lg-${f.status}"><div class="idl"><b>${esc(f.label)}</b><div>${stSel(`identity.${i}.status`, f.status)}</div>${f.source ? `<div class="small muted">${esc(f.source)}</div>` : ""}</div>
      <textarea data-p="identity.${i}.text" placeholder="${esc(f.hint || "To decide")}" rows="2">${esc(f.text)}</textarea></div>`).join("")}</div>

  <div class="card plain" id="s-aud"><p class="eyebrow dot">Audiences</p><p class="small muted" style="margin-top:-2px">Who we're talking to. Every project picks one or more, and its captions are written for them.</p>
    <div class="grid g3">${m.audiences.map((a, i) => `<div class="acard lg-${a.status}"><div class="row"><input type="text" class="h" data-p="audiences.${i}.name" value="${esc(a.name)}"><span class="spacer"></span>${stSel(`audiences.${i}.status`, a.status)}</div>
      <label class="f">What they care about</label><textarea data-p="audiences.${i}.care" rows="2">${esc(a.care)}</textarea>
      <label class="f">What they need to believe</label><textarea data-p="audiences.${i}.believe" rows="2" placeholder="Decide in the meeting">${esc(a.believe || "")}</textarea>
      <label class="f">Key message</label><textarea data-p="audiences.${i}.message" rows="2" placeholder="Decide in the meeting">${esc(a.message)}</textarea>
      <div class="grid g2"><div><label class="f">Next step</label><input type="text" data-p="audiences.${i}.action" value="${esc(a.action)}"></div><div><label class="f">Channels</label><input type="text" data-p="audiences.${i}.channels" value="${esc(a.channels)}"></div></div></div>`).join("")}</div>
    <button class="btn ghost sm" id="addaud" style="margin-top:12px">+ Add audience</button></div>

  <div class="card" id="s-pil"><p class="eyebrow dot">Pillars · the content buckets</p><p class="small muted" style="margin-top:-2px">The 3–5 things GSCG wants to be known for. Rename or replace these after the meeting; content types and projects keep their links.</p>
    <div class="grid g3">${m.pillars.map((x, i) => `<div class="pcard lg-${x.status}" style="border-top-color:${x.color}"><div class="row"><input type="color" data-p="pillars.${i}.color" value="${esc(x.color)}"><input type="text" class="h" data-p="pillars.${i}.name" value="${esc(x.name)}"><span class="spacer"></span>${stSel(`pillars.${i}.status`, x.status)}</div>
      <label class="f">Promise</label><textarea data-p="pillars.${i}.promise" rows="2">${esc(x.promise)}</textarea>
      <label class="f">Talking points (one per line)</label><textarea data-l="pillars.${i}.points" rows="3">${esc(x.points.join("\n"))}</textarea>
      <div class="small"><b>Content types:</b> ${Object.entries(m.typeMap).filter(([, v]) => v.pillars.includes(x.id)).map(([k]) => esc(R.find((r) => r.id === k)?.name || k)).join(", ") || "none"}</div>
      <div class="small"><b>Proof:</b> ${m.proof.filter((p) => p.pillars.includes(x.id) && p.status === "verified").length} verified · <a href="#" data-rmpil="${i}">remove pillar</a></div></div>`).join("")}</div>
    <button class="btn ghost sm" id="addpil" style="margin-top:12px">+ Add pillar</button></div>

  <div class="card plain" id="s-map"><div class="row"><p class="eyebrow dot" style="margin:0">Content buckets · which content types draw from which pillars</p><span class="spacer"></span>
    <button class="chip on" data-mapmode="pillars">By pillar</button><button class="chip" data-mapmode="audiences">By audience</button></div>
    <div id="matrix"></div></div>

  <div class="card" id="s-proof"><p class="eyebrow dot">Proof bank</p><p class="small muted" style="margin-top:-2px">Facts copy is allowed to use. Only <b>verified</b> items are ever stated as fact; add results after the client agrees.</p>
    <table class="proof"><tr><th>Proof point</th><th>Source</th><th>Pillars</th><th>Status</th><th></th></tr>${m.proof.map((x, i) => `<tr class="lg-${x.status}"><td><textarea data-p="proof.${i}.text" rows="2">${esc(x.text)}</textarea></td><td><input type="text" data-p="proof.${i}.source" value="${esc(x.source)}"></td>
      <td>${m.pillars.map((pl) => `<label class="pk"><input type="checkbox" data-proofpil="${i}|${pl.id}" ${x.pillars.includes(pl.id) ? "checked" : ""}><i class="pd" style="background:${pl.color}"></i>${esc(pl.name)}</label>`).join("")}</td>
      <td>${stSel(`proof.${i}.status`, x.status, ["verified", "draft"])}</td><td><a href="#" data-rmproof="${i}" class="small">remove</a></td></tr>`).join("")}</table>
    <button class="btn ghost sm" id="addproof" style="margin-top:10px">+ Add proof point</button></div>

  <div class="card plain" id="s-voice"><p class="eyebrow dot">Voice</p><div class="grid g2">
    <div><label class="f">Do (one per line)</label><textarea data-l="voice.do" rows="5">${esc(m.voice.do.join("\n"))}</textarea></div>
    <div><label class="f">Don't (one per line)</label><textarea data-l="voice.dont" rows="5">${esc(m.voice.dont.join("\n"))}</textarea></div></div></div>

  <div class="card" id="s-clients"><p class="eyebrow dot">Client permission rules</p><p class="small muted" style="margin-top:-2px">Applied to every caption and title. Default until a client confirms: <b>named in text only, no logo</b>.</p>
    <table><tr><th>Client</th><th>Season</th><th>Name</th><th>Logo</th><th>Notes</th><th></th></tr>${m.clients.map((c, i) => `<tr><td><input type="text" data-p="clients.${i}.name" value="${esc(c.name)}"></td><td><input type="text" data-p="clients.${i}.season" value="${esc(c.season)}" style="width:130px"></td>
      <td>${stSel(`clients.${i}.nameUse`, c.nameUse, ["yes", "text", "no", "ask"])}</td><td>${stSel(`clients.${i}.logo`, c.logo, ["yes", "no", "ask"])}</td><td><input type="text" data-p="clients.${i}.notes" value="${esc(c.notes || "")}" placeholder="e.g. confirmed by email 11/12"></td><td><a href="#" data-rmcl="${i}" class="small">remove</a></td></tr>`).join("")}</table>
    <p class="small muted">Name: <b>yes</b> anywhere · <b>text</b> captions/cards only · <b>no</b> never · <b>ask</b> check first.</p>
    <button class="btn ghost sm" id="addcl">+ Add client</button></div>
  <div class="savebar ${msgDirty ? "show" : ""}" id="savebar"><span>Unsaved changes to messaging</span><span class="spacer"></span><button class="btn ghost sm" id="discard">Discard</button><button class="btn red" id="msave">Save messaging</button></div>`;

  const dirty = () => { msgDirty = true; $("#savebar").classList.add("show"); };
  const rerender = () => { const y = scrollY; messagingPage().then(() => scrollTo(0, y)); };
  app.oninput = app.onchange = (e) => {
    const t = e.target;
    if (t.dataset.p) { setPath(m, t.dataset.p, t.value); if (t.tagName === "SELECT") t.className = `mini st-${t.value}`; dirty(); }
    else if (t.dataset.l) { setPath(m, t.dataset.l, t.value.split("\n").map((x) => x.trim()).filter(Boolean)); dirty(); }
    else if (t.dataset.proofpil && e.type === "change") { const [i, k] = t.dataset.proofpil.split("|"); const s = new Set(m.proof[i].pillars); t.checked ? s.add(k) : s.delete(k); m.proof[i].pillars = [...s]; dirty(); }
    else if (t.dataset.map && e.type === "change") { const [r, k, mode] = t.dataset.map.split("|"); const e2 = (m.typeMap[r] ||= { pillars: [], audiences: [] }); const s = new Set(e2[mode]); t.checked ? s.add(k) : s.delete(k); e2[mode] = [...s]; dirty(); }
  };
  const matrix = (mode) => {
    const cols = mode === "pillars" ? m.pillars : m.audiences;
    $("#matrix").innerHTML = `<table class="matrix"><tr><th>Content type</th>${cols.map((c) => `<th>${mode === "pillars" ? `<i class="pd" style="background:${c.color}"></i>` : ""}${esc(c.name)}</th>`).join("")}</tr>
      ${Object.entries(groups).map(([g, rs]) => `<tr class="grp"><td colspan="${cols.length + 1}">${esc(g)}</td></tr>${rs.map((r) => `<tr><td>${esc(r.name)}</td>${cols.map((c) => `<td><input type="checkbox" data-map="${r.id}|${c.id}|${mode}" ${(m.typeMap[r.id]?.[mode] || []).includes(c.id) ? "checked" : ""}></td>`).join("")}</tr>`).join("")}`).join("")}</table>`;
  };
  matrix("pillars");
  $$("[data-mapmode]").forEach((b) => (b.onclick = () => { $$("[data-mapmode]").forEach((x) => x.classList.toggle("on", x === b)); matrix(b.dataset.mapmode); }));
  $$("[data-jump]").forEach((b) => (b.onclick = () => $(`#s-${b.dataset.jump}`).scrollIntoView({ behavior: "smooth", block: "start" })));
  const slugId = (s, list) => { let id = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item"; while (list.some((x) => x.id === id)) id += "-2"; return id; };
  $("#addaud").onclick = () => { m.audiences.push({ id: slugId("audience", m.audiences), name: "New audience", care: "", believe: "", message: "", action: "", channels: "", status: "open" }); dirty(); rerender(); };
  $("#addpil").onclick = () => { m.pillars.push({ id: slugId("pillar", m.pillars), name: "New pillar", promise: "", points: [], color: "#5b6b8c", status: "open" }); dirty(); rerender(); };
  $$("[data-rmpil]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); const id = m.pillars[a.dataset.rmpil].id; if (!confirm(`Remove "${m.pillars[a.dataset.rmpil].name}"? Content types lose this bucket.`)) return; m.pillars.splice(a.dataset.rmpil, 1); for (const v of Object.values(m.typeMap)) v.pillars = v.pillars.filter((x) => x !== id); for (const x of m.proof) x.pillars = x.pillars.filter((k) => k !== id); dirty(); rerender(); }));
  $("#addproof").onclick = () => { m.proof.push({ id: slugId("proof", m.proof), text: "", source: "", pillars: [], status: "draft" }); dirty(); rerender(); };
  $$("[data-rmproof]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); m.proof.splice(a.dataset.rmproof, 1); dirty(); rerender(); }));
  $("#addcl").onclick = () => { m.clients.push({ name: "", season: "", nameUse: "ask", logo: "ask", notes: "" }); dirty(); rerender(); };
  $$("[data-rmcl]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); m.clients.splice(a.dataset.rmcl, 1); dirty(); rerender(); }));
  $("#msave").onclick = async () => { MSG = await api("messaging", { method: "POST", body: m }); msgDirty = false; toast("Messaging saved · brand/messaging.md updated"); route(); };
  $("#discard").onclick = () => { msgDirty = false; MSG = null; route(); };
  if (section) $(`#s-${section}`)?.scrollIntoView();
}
window.addEventListener("beforeunload", (e) => { if (msgDirty) e.preventDefault(); });

// ---------------- messaging meeting worksheet (type live in the meeting, or print) ----------------
async function workshopPage() {
  const m = await api("messaging");
  m.notes ||= {};
  const field = (f) => {
    if (f.startsWith("identity.")) { const i = m.identity.findIndex((x) => x.id === f.split(".")[1]); return { path: `identity.${i}.text`, value: m.identity[i]?.text || "", status: m.identity[i]?.status }; }
    return { path: `notes.${f}`, value: m.notes[f] || "" };
  };
  const secs = [...new Set(m.workshop.map((w) => w.section))];
  const meet = m.meeting ? new Date(m.meeting.date + "T12:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "";
  app.className = "";
  app.innerHTML = `<div class="noprint row" style="margin-bottom:14px"><a class="btn ghost sm" href="#/messaging">← Messaging</a><span class="spacer"></span><span class="small muted" id="wsave">Answers save as you type</span><button class="btn navy sm" onclick="print()">Print worksheet</button></div>
  <div class="ws">
  <p class="eyebrow">GSCG messaging meeting${meet ? ` · ${meet}` : ""}</p><h1>Who is GSCG, and what should people see?</h1>
  <p class="lead">Goal: decide what GSCG says and to whom. Answers here go straight into the Content Suite's messaging, so every video, caption and, later, the GSCG website uses them. Starters come from our current public copy; replace them freely.</p>
  ${secs.map((s) => `<div class="card plain wsec"><p class="eyebrow dot">${esc(s)}</p>${m.workshop.filter((w) => w.section === s).map((w) => { const f = field(w.field); return `
    <div class="wq"><div class="qt">${esc(w.q)}</div>${f.value && f.status !== "open" ? `<div class="small muted">Starter${f.status ? ` (${f.status})` : ""}</div>` : ""}<textarea data-p="${f.path}" rows="2" placeholder="">${esc(f.value)}</textarea><div class="lines"></div></div>`; }).join("")}
    ${s === "Pillars" ? `<p class="small"><b>Current starter pillars:</b> ${m.pillars.map((x) => `${esc(x.name)} (${esc(x.promise)})`).join(" · ")}</p>` : ""}
    ${s === "Proof" ? `<p class="small"><b>Already verified:</b> ${m.proof.filter((x) => x.status === "verified").map((x) => esc(x.text)).join(" · ")}</p>` : ""}</div>`).join("")}
  <div class="card plain wsec"><p class="eyebrow dot">Audiences · what each one should see</p>
    ${m.audiences.map((a, i) => `<div class="wa"><h3>${esc(a.name)}</h3><div class="small muted">Starter: they care about ${esc(a.care.replace(/\.$/, "").toLowerCase())}.</div>
      <div class="grid g2">${[["believe", m.audienceQuestions[0]], ["message", m.audienceQuestions[1]], ["proofNote", m.audienceQuestions[2]], ["action", m.audienceQuestions[3]]].map(([k, q]) => `<div><label class="f">${esc(q)}</label><textarea data-p="audiences.${i}.${k}" rows="2">${esc(a[k] || "")}</textarea><div class="lines"></div></div>`).join("")}</div></div>`).join("")}</div>
  <div class="card plain wsec"><p class="eyebrow dot">Decisions & next steps</p><textarea data-p="notes.decisions" rows="4" placeholder="Who approves messaging? When do we revisit it? Anything for the website?">${esc(m.notes.decisions || "")}</textarea><div class="lines tall"></div></div>
  </div>`;
  let t = null;
  app.oninput = (e) => {
    const el = e.target; if (!el.dataset.p) return;
    setPath(m, el.dataset.p, el.value);
    if (el.dataset.p.startsWith("identity.") && el.value.trim()) setPath(m, el.dataset.p.replace(/text$/, "status"), "draft");
    $("#wsave").textContent = "Saving…"; clearTimeout(t);
    t = setTimeout(async () => { await api("messaging", { method: "POST", body: m }); MSG = null; $("#wsave").textContent = "Saved to messaging"; }, 700);
  };
}

// ---------------- library: everything we've made + filmed, by bucket ----------------
async function libraryPage(filter = {}) {
  const L = await api("library");
  const M = B.messaging;
  const items = L.items.filter((i) => (!filter.pillar || i.pillars.includes(filter.pillar)) && (!filter.audience || i.audiences.includes(filter.audience)) && (!filter.status || i.status === filter.status));
  const plat = (k) => B.platforms[k]?.short || k;
  app.className = "wide";
  app.innerHTML = `<p class="eyebrow">Library</p><h1>Everything we've made, by bucket</h1>
  <p class="lead" style="margin-bottom:18px">Every finished piece and every batch of footage, tagged by pillar, audience and client. Buckets with nothing approved show what to make next.</p>
  <div class="grid g5">${L.gaps.map((g) => { const x = pillar(g.pillar); return `<div class="gap ${g.approved ? "" : "isgap"}" style="border-top-color:${x.color}" data-gp="${g.pillar}">
    <b>${esc(x.name)}</b><div class="gn"><span>${g.approved}</span> approved · ${g.planned} planned</div>
    ${g.approved ? "" : `<div class="small">Gap. Try: ${g.types.slice(0, 3).map((t) => esc(t.name)).join(", ")}</div>`}</div>`; }).join("")}</div>
  <div class="row" style="margin:18px 0 6px;gap:4px"><span class="small muted" style="margin-right:6px">Pillar</span><button class="chip ${!filter.pillar ? "on" : ""}" data-lf="pillar|">All</button>${M.pillars.map((x) => `<button class="chip ${filter.pillar === x.id ? "on" : ""}" data-lf="pillar|${x.id}"><i class="pd" style="background:${x.color}"></i> ${esc(x.name)}</button>`).join("")}</div>
  <div class="row" style="margin:0 0 6px;gap:4px"><span class="small muted" style="margin-right:6px">Audience</span><button class="chip ${!filter.audience ? "on" : ""}" data-lf="audience|">All</button>${M.audiences.map((x) => `<button class="chip ${filter.audience === x.id ? "on" : ""}" data-lf="audience|${x.id}">${esc(x.name)}</button>`).join("")}</div>
  <div class="row" style="margin:0 0 16px;gap:4px"><span class="small muted" style="margin-right:6px">Status</span>${[["", "All"], ["approved", "Approved"], ["review", "In review"], ["rejected", "Rejected"]].map(([k, l]) => `<button class="chip ${(filter.status || "") === k ? "on" : ""}" data-lf="status|${k}">${l}</button>`).join("")}</div>
  <div class="card plain"><p class="eyebrow">Finished pieces · ${items.length}</p>
    ${items.length ? `<div class="lib">${items.map((i) => `<a class="li" href="#/p/${i.project}/review"><div class="lc">${i.cover ? `<img src="${media(i.cover)}">` : ""}<span class="tag light">${esc(platName(i.platform))} · ${i.frames ? `${i.frames} frame${i.frames > 1 ? "s" : ""}` : `${i.duration}s`}</span></div>
      <b>${esc(i.title || i.projectName)}</b><div class="small muted">${esc(B.recipes.find((r) => r.id === i.recipe)?.name || i.recipe)}${i.client ? ` · ${esc(i.client)}` : ""}</div>
      <div class="row" style="gap:6px;margin-top:4px"><span class="status ${i.status}">${esc(i.posted ? i.posted.status : i.status)}</span><span class="dots">${pdots(i.pillars)}</span></div></a>`).join("")}</div>` : `<div class="empty">Nothing matches.</div>`}</div>
  <div class="card plain"><p class="eyebrow">Footage</p>
    ${L.clips.length ? L.clips.map((c) => `<div class="fr"><div class="faces sq">${c.thumbs.map((k) => `<img src="thumb/${k}">`).join("")}</div><div style="flex:1"><a href="#/p/${c.project}/footage"><b>${esc(c.projectName)}</b></a>
      <div class="small muted">${c.count} clips · people in ${c.people} · speech in ${c.speech}${c.places.length ? ` · ${c.places.map(esc).join(", ")}` : ""}${c.client ? ` · ${esc(c.client)}` : ""}</div></div><span class="dots">${pdots(c.pillars)}</span></div>`).join("") : `<p class="muted">No footage yet.</p>`}</div>`;
  $$("[data-lf]").forEach((b) => (b.onclick = () => { const [k, v] = b.dataset.lf.split("|"); libraryPage({ ...filter, [k]: v || undefined }); }));
  $$("[data-gp]").forEach((b) => (b.onclick = () => libraryPage({ ...filter, pillar: b.dataset.gp })));
}

// ---------------- playbook ----------------
function mdToHtml(md) {
  const lines = md.split("\n"); let html = "", inTable = false, inList = false;
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>").replace(/`(.+?)`/g, "<code>$1</code>").replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank">$1</a>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1").replace(/(^|\s)_([^_]+)_(?=[\s.,;:)]|$)/g, "$1<i>$2</i>");
  for (const l of lines) {
    if (/^\|/.test(l)) {
      if (/^\|\s*-/.test(l)) continue;
      const cells = l.split("|").slice(1, -1).map((c) => inline(c.trim()));
      html += (inTable ? "" : "<table>") + `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`; inTable = true; continue;
    } else if (inTable) { html += "</table>"; inTable = false; }
    if (/^\s*[-*] /.test(l)) { html += (inList ? "" : "<ul>") + `<li>${inline(l.replace(/^\s*[-*] /, ""))}</li>`; inList = true; continue; }
    else if (inList) { html += "</ul>"; inList = false; }
    const h = l.match(/^(#{1,4}) (.*)/);
    if (h) html += `<h${h[1].length + 1 > 4 ? 4 : h[1].length}>${inline(h[2])}</h${h[1].length}>`;
    else if (l.trim()) html += `<p>${inline(l)}</p>`;
  }
  return html + (inTable ? "</table>" : "") + (inList ? "</ul>" : "");
}
const FORMAT_NAMES = { "day-in-the-life": "Day in the life", "come-with-me": "Come with me / POV", "hype-recap": "Recap", "behind-the-scenes": "Behind the scenes", testimonial: "Testimonial", announcement: "Announcement", "text-on-screen": "Text on screen", "trend-audio": "Trend / challenge" };
async function playbook(sel) {
  const fw = await api("framework");
  const F = fw.json?.formats || {}, R = fw.references?.formats || {};
  const fmts = Object.keys(F);
  sel = fmts.includes(sel) ? sel : sessionStorage.getItem("pb-fmt") && fmts.includes(sessionStorage.getItem("pb-fmt")) ? sessionStorage.getItem("pb-fmt") : fmts[0];
  const f = F[sel] || {}, ref = R[sel] || {}, m = ref.measured, ex = ref.examples || [];
  const recipes = Object.entries(fw.json?.recipeMap || {}).filter(([, v]) => v === sel).map(([k]) => B.recipes.find((r) => r.id === k)?.name || k);
  const P = (x) => (x == null ? "—" : `${Math.round(x * 100)}%`), S = (x) => (x == null ? "—" : `${Math.round(x * 10) / 10} s`);
  const tiles = m ? [["Typical length", S(m.duration)], ["Average shot", S(m.avgShot)], ["First cut", S(m.firstCut)], ["Person on screen in first 2 s", P(m.faceInHook)],
    ["Voice-led", P(m.voiceLed)], ["Burned-in captions", P(m.captions)], ["Time stamps", P(m.timeStamps)], ["Text on screen (median)", P(m.textPct)], ["Text in first 2 s", P(m.textInHook)], ["Text on the last frames", P(m.endHasText)]] : [];
  app.className = "wide";
  app.innerHTML = `<p class="eyebrow">Research · baseline</p><h1>Content playbook</h1>
  <p class="lead">What each type of content looks like, measured from real examples, plus the platform research. The Suite uses this as the <b>starting point</b> for every project, then adjusts to what GSCG's own audience responds to.</p>
  <div class="card"><p class="eyebrow dot">Content types · what they look like</p>
    <div class="subnav" style="margin-top:8px">${fmts.map((k) => `<button data-fmt="${k}" class="${k === sel ? "on" : ""}">${esc(FORMAT_NAMES[k] || k)}${R[k]?.examples?.length ? ` <span class="muted small">${R[k].examples.length}</span>` : ""}</button>`).join("")}</div>
    <h2 class="red" style="margin-top:14px">${esc(FORMAT_NAMES[sel] || sel)}</h2>
    <p>${esc(f.description || "")}</p>
    ${recipes.length ? `<p class="small muted">Used by: ${recipes.map(esc).join(" · ")}</p>` : ""}
    ${m ? `<p class="small muted" style="margin:14px 0 6px">Measured from ${m.n} real example${m.n > 1 ? "s" : ""} (medians; percentages = share of examples)${ref.caveat ? ` · <b>${esc(ref.caveat)}</b>` : ""}</p>
      <div class="mtiles">${tiles.map(([l, v]) => `<div class="mt"><b>${v}</b><span>${esc(l)}</span></div>`).join("")}</div>` : `<div class="note">No measured examples for this type yet.</div>`}
    ${(ref.look || []).length ? `<h3 style="margin-top:18px">What the examples do</h3><ul class="look">${ref.look.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
  </div>
  ${f.structure ? `<div class="card plain"><p class="eyebrow">Framework</p>
    <div class="beats">${f.structure.map((b) => `<div class="beat"><b>${esc(b.beat)}</b><span class="small muted">${esc(b.seconds)} s</span><p class="small">${esc(b.tip)}</p></div>`).join("")}</div>
    ${f.textRules?.length ? `<p class="small" style="margin-top:10px"><b>Text rules:</b> ${f.textRules.map(esc).join(" · ")}</p>` : ""}
    ${(ref.hooks || []).length ? `<p class="small"><b>Real opening text from the examples:</b> ${ref.hooks.map((h) => `“${esc(h)}”`).join(" · ")}</p>` : ""}
    ${f.hookPatterns?.length ? `<p class="small muted"><b>Draft hooks (written, not from examples):</b> ${f.hookPatterns.map((h) => `“${esc(h)}”`).join(" · ")}</p>` : ""}
    ${f.musicGuidance ? `<p class="small"><b>Music:</b> ${esc(f.musicGuidance)}</p>` : ""}</div>` : ""}
  ${ex.length ? `<div class="card plain"><p class="eyebrow">Examples · ${ex.length}</p><div class="exgrid">${ex.map((x) => `<div class="ex">
      <a href="${esc(x.url)}" target="_blank" rel="noopener" class="exsheet"><img src="${media(x.sheet)}" loading="lazy"></a>
      <div class="exb"><b>${esc(x.title)}</b><div class="small muted">${esc(x.channel)}${x.views != null ? ` · ${Number(x.views).toLocaleString()} views` : ""} · ${Math.round(x.duration)} s</div>
      <div class="chipsrow">${[`${x.shots} shots · ${x.avgShot.toFixed(1)} s avg`, x.voiceLed ? "voice-led" : "music/visual-led", x.captions ? "captions" : "", x.timeStamps ? "time stamps" : "", x.faceInHook ? "person in first 2 s" : "", `text ${Math.round(x.textPct * 100)}%`].filter(Boolean).map((c) => `<span class="tag">${esc(c)}</span>`).join("")}</div>
      ${x.notes ? `<p class="small">${esc(x.notes)}</p>` : ""}
      ${x.voiceLed && x.firstWords ? `<p class="small muted">Opening words: “${esc(x.firstWords)}”</p>` : ""}
      <a class="small" href="${esc(x.url)}" target="_blank" rel="noopener">Watch on YouTube ↗</a></div></div>`).join("")}</div></div>` : ""}
  <h2 style="margin-top:26px">Platform research</h2>
  ${fw.markdown ? `<div class="card md">${mdToHtml(fw.markdown)}</div>` : `<div class="card plain empty">The research playbook is still being compiled.</div>`}`;
  $$("[data-fmt]").forEach((b) => (b.onclick = () => { sessionStorage.setItem("pb-fmt", b.dataset.fmt); playbook(b.dataset.fmt); }));
}

// ---------------- insights ----------------
async function insightsPage() {
  const d = await api("insights");
  const w = d.shotWeights?.deltas;
  const recipeName = (id) => B.recipes.find((r) => r.id === id)?.name || id;
  app.innerHTML = `<p class="eyebrow">Learning loop</p><h1>What the Studio has learned</h1>
  <p class="lead">Built from <b>${d.events}</b> reviews and <b>${d.samples}</b> labeled shots. It changes how shots are picked, how long each recipe runs, which music gets chosen and how ideas are written.</p>
  <div class="grid g2">
    <div class="card"><p class="eyebrow dot">Shot taste</p><h3>How the shot picker has shifted</h3>
      ${w ? `<div class="weights" style="margin-top:12px">${Object.entries(w).map(([k, v]) => `<span>${esc({ aest: "Looks good", action: "Action / motion", people: "People in frame", crowd: "Crowd noise", blur: "Blur", utility: "Screens / docs", still: "Photos" }[k] || k)}</span>
        <div class="wbar"><i style="left:${v < 0 ? 50 + (v / 0.15) * 50 : 50}%;width:${Math.abs(v / 0.15) * 50}%;background:${v < 0 ? "#9aa1b2" : "var(--red)"}"></i></div><span class="small">${v > 0 ? "+" : ""}${v}</span>`).join("")}</div>
        <p class="small muted">Fitted on ${d.shotWeights.n} shots (${d.shotWeights.pos} kept, ${d.shotWeights.neg} cut).</p>`
      : `<p class="muted">Needs at least 12 labeled shots (4 kept, 4 cut). Approve videos and cut shots you don't like — it starts adjusting automatically.</p>`}</div>
    <div class="card navy"><p class="eyebrow">Recipe norms</p><h3>Approval and learned lengths</h3>
      ${d.recipes.length ? `<table><tr><th>Recipe</th><th>Platform</th><th>Uses</th><th>Approved</th><th>Rating</th><th>Length</th></tr>${d.recipes.map((r) => `<tr><td>${esc(recipeName(r.recipe))}</td><td>${esc(B.platforms[r.platform]?.short || r.platform)}</td><td>${r.uses}</td><td>${r.approvalRate}%</td><td>${r.avgRating ?? "–"}</td><td>${r.learnedLength ? r.learnedLength + "s" : "–"}</td></tr>`).join("")}</table>` : `<p class="muted">No reviews yet.</p>`}</div>
  </div>
  <div class="card"><p class="eyebrow dot">Experiments</p><h3>A/B tests and what they decided</h3>
    ${d.experiments.length ? `<table><tr><th>Test</th><th>Format</th><th>Platform</th><th>Status</th><th>Result</th></tr>${d.experiments.slice().reverse().map((x) => `<tr><td>${esc(x.label)}</td><td>${esc(x.format)}</td><td>${esc(B.platforms[x.platform]?.short || x.platform)}</td><td><span class="status">${esc(x.status)}</span></td><td class="small">${x.status === "decided" ? (x.winner === "tie" ? "Tie" : `<b>${x.winner} won</b> (${esc(x.variants[x.winner].value)})`) + ` · views A ${x.result.A.views} / B ${x.result.B.views}` : "Log results for both versions"}</td></tr>`).join("")}</table>` : `<p class="muted">Each render batch can include one test. Results you log decide them.</p>`}</div>
  <div class="card navy"><p class="eyebrow">Current defaults</p><h3>What the engine will do next (Reels & LinkedIn)</h3>
    <table><tr><th>Recipe</th><th>Platform</th><th>Length</th><th>Why</th><th>Opening</th></tr>${d.defaults.map((x) => `<tr><td>${esc(recipeName(x.recipe))}</td><td>${esc(B.platforms[x.platform]?.short)}</td><td>${x.duration}s <span class="small muted">(${x.band[0]}–${x.band[1]})</span></td><td class="small">${esc(x.why)}</td><td class="small">${x.opening === "action" ? "action-first" : "title-first"}</td></tr>`).join("")}</table></div>
  <div class="card plain"><p class="eyebrow">Copy bank</p><h3>Approved titles &amp; captions (the voice new ideas copy)</h3>
    ${d.copyBank.length ? `<table><tr><th>Recipe</th><th>Title</th><th>Caption</th></tr>${d.copyBank.map((c) => `<tr><td>${esc(recipeName(c.recipe))}</td><td><b>${esc(c.kicker)}</b><br>${esc(c.title).replace(/\|/g, " ")}</td><td class="small">${esc(c.caption)}</td></tr>`).join("")}</table>` : `<p class="muted">Approve a video to start the copy bank.</p>`}</div>
  <div class="card plain"><p class="eyebrow">Results</p><h3>Logged post performance</h3>
    ${d.performance.length ? `<table><tr><th>Title</th><th>Recipe</th><th>Platform</th><th>Length</th><th>Views</th><th>Likes</th><th>Shares</th><th>Saves</th></tr>${d.performance.sort((a, b) => b.views - a.views).map((x) => `<tr><td>${x.url ? `<a href="${esc(x.url)}" target="_blank">${esc((x.title || "").replace(/\|/g, " "))}</a>` : esc((x.title || "").replace(/\|/g, " "))}</td><td>${esc(recipeName(x.recipe))}</td><td>${esc(x.platform)}</td><td>${x.duration || ""}s</td><td>${x.views}</td><td>${x.likes}</td><td>${x.shares}</td><td>${x.saves}</td></tr>`).join("")}</table>` : `<p class="muted">After posting an approved video, log its numbers on the review screen. Top performers are fed back into idea writing.</p>`}</div>
  <div class="card plain"><p class="eyebrow">Music</p><h3>Track history</h3>
    ${Object.keys(d.trackStats).length ? `<table><tr><th>Track</th><th>Uses</th><th>Approved</th><th>Rejected</th></tr>${Object.entries(d.trackStats).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v.uses}</td><td>${v.approved}</td><td>${v.rejected}</td></tr>`).join("")}</table>` : `<p class="muted">No tracks used yet.</p>`}</div>`;
}

// ---------------- settings ----------------
async function settingsPage() {
  const s = B.settings;
  app.innerHTML = `<p class="eyebrow">Settings</p><h1>Studio settings</h1>
  <div class="card"><p class="eyebrow dot">Team folder</p><h3>Shared footage folder</h3>
    <p class="small">Point this at a synced folder (Google Drive, Dropbox, OneDrive or iCloud). Members drop a folder of clips per event; it shows up on the Projects page. Approved videos are copied to <code>GSCG Studio Exports/</code> inside it.</p>
    <div class="field"><input type="text" id="sd" value="${esc(s.sharedDir)}" placeholder="/Users/you/Library/CloudStorage/GoogleDrive-…/Shared drives/GSCG Media"></div>
    <label class="check" style="max-width:420px"><input type="checkbox" id="ex" ${s.exportToShared ? "checked" : ""}> Copy approved videos to the shared folder</label>
    <button class="btn navy sm" id="ss" style="margin-top:12px">Save</button></div>
  <div class="card navy"><p class="eyebrow">Idea writing</p><h3>Claude Code connection: ${B.claude.ok ? "✅ connected" : B.claude.ok === false ? "⚠ not connected" : "checking…"}</h3>
    ${B.claude.ok ? "" : `<p class="small">${esc(B.claude.reason || "")}</p><p class="small">To fix: open <b>Terminal</b>, type <code>claude</code>, press Return, then type <code>/login</code> and sign in. Close Terminal and click re-check.</p>`}
    <button class="btn ghost sm" id="rc">Re-check</button></div>
  <div class="card"><p class="eyebrow dot">Team</p><h3>Who's on the Content Suite</h3>
    <table id="teamt"><tr><th>Name</th><th>Initials</th><th>Role</th><th></th></tr>${(await api("team")).map((m) => `<tr data-id="${esc(m.id)}"><td><input type="text" data-k="name" value="${esc(m.name)}"></td><td><input type="text" data-k="initials" value="${esc(m.initials)}" style="width:70px"></td><td><input type="text" data-k="role" value="${esc(m.role || "")}"></td><td><a href="#" data-rm class="small">remove</a></td></tr>`).join("")}</table>
    <div class="row" style="margin-top:10px"><button class="btn ghost sm" id="tadd">+ Add member</button><button class="btn navy sm" id="tsave">Save team</button></div></div>
  <div class="card plain"><p class="eyebrow">Remembered places</p>
    ${B.places.length ? `<table><tr><th>Name</th><th>Location</th></tr>${B.places.map((p) => `<tr><td>${esc(p.name)}</td><td class="small">${p.lat}, ${p.lon}</td></tr>`).join("")}</table>` : `<p class="muted">Name GPS spots on a project's Footage step and they appear here.</p>`}</div>
  <div class="card plain"><p class="eyebrow">Music library</p>
    ${B.music.length ? `<table><tr><th>Track</th><th>Moods</th><th>Energy</th><th>BPM</th><th>License</th></tr>${B.music.map((t) => `<tr><td>${esc(t.title)}</td><td>${esc(t.moods.join(", "))}</td><td>${t.energy}</td><td>${t.bpm || "–"}</td><td>${esc(t.license)}</td></tr>`).join("")}</table>` : `<p class="muted">Empty — add tracks on a project's Music step or drop files into <code>music/</code>.</p>`}</div>
  <div class="card plain"><p class="eyebrow">Brand</p><div class="row"><img src="logo.png" style="height:64px"><div><b>${esc(B.brand.name)}</b><br><span class="small muted">${esc(B.brand.handle)} · ${esc(B.brand.tagline)}</span></div></div></div>`;
  const tbl = $("#teamt");
  const bindRm = () => $$("[data-rm]", tbl).forEach((x) => (x.onclick = (e) => { e.preventDefault(); x.closest("tr").remove(); }));
  bindRm();
  $("#tadd").onclick = () => { tbl.insertAdjacentHTML("beforeend", `<tr data-id=""><td><input type="text" data-k="name"></td><td><input type="text" data-k="initials" style="width:70px"></td><td><input type="text" data-k="role"></td><td><a href="#" data-rm class="small">remove</a></td></tr>`); bindRm(); };
  $("#tsave").onclick = async () => {
    const list = $$("tr[data-id]", tbl).map((tr) => { const g = (k) => $(`[data-k="${k}"]`, tr).value.trim(); const name = g("name"); return name ? { id: tr.dataset.id || name.toLowerCase().replace(/[^a-z]+/g, "-"), name, initials: g("initials") || name.slice(0, 2).toUpperCase(), role: g("role") } : null; }).filter(Boolean);
    await api("team", { method: "POST", body: { team: list } }); toast("Team saved");
  };
  $("#ss").onclick = async () => { await api("settings", { method: "POST", body: { sharedDir: $("#sd").value.trim(), exportToShared: $("#ex").checked } }); toast("Saved"); };
  $("#rc").onclick = async () => { toast("Checking…"); await api("claude", { method: "POST" }); route(); };
}
