
let MEDIA = {}; fetch("api/_media.json").then(r => r.json()).then(m => MEDIA = m).catch(() => {});
const k = (p) => p.replace(/[^a-zA-Z0-9]+/g, "_");
window.__demoMedia = (p) => MEDIA[p] ? "media/" + MEDIA[p] : "logo.png";
window.__demoApi = async (path, opts = {}) => {
  if (opts.method && opts.method !== "GET") { const t = document.createElement("div"); t.className = "toast"; t.textContent = "Demo preview: read-only. Editing and rendering run on the team Mac."; document.body.appendChild(t); setTimeout(() => t.remove(), 3200); throw new Error("Read-only demo"); }
  if (!Object.keys(MEDIA).length) try { MEDIA = await (await fetch("api/_media.json")).json(); } catch {}
  const r = await fetch("api/" + k(path) + ".json"); if (!r.ok) return {}; return r.json();
};
document.addEventListener("DOMContentLoaded", () => { const b = document.createElement("div"); b.textContent = "Read-only preview of the GSCG Content Suite. The live app runs locally for the team."; b.style.cssText = "background:#C8102E;color:#fff;font:600 13px 'IBM Plex Sans',system-ui,sans-serif;text-align:center;padding:6px 12px"; document.body.prepend(b); });
