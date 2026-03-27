async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return await res.json();
}

function qs(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

function safe(v, fallback = "TBC") {
  if (v === null || v === undefined || v === "") return fallback;
  return v;
}

function createEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v);
  });
  children.forEach((c) => el.appendChild(c));
  return el;
}
