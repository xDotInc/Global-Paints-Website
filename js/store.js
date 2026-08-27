/* ==========================================================================
   Global Paints & Coatings — Content Store (live API version)
   Fetches current content from the backend on every page load, then
   dispatches "gpc:content-ready" once PRODUCTS/PROJECTS/COMPANY/etc. are
   up to date. If the API can't be reached, the page falls back to the
   built-in defaults from data.js so the site still renders.
   ========================================================================== */

const GPCStore = (function () {
  "use strict";

  const API_BASE = window.GPC_API_BASE || ""; // same-origin by default
  let ready = false;
  let lastError = null;

  function applyContent(data) {
    if (data.company) COMPANY = Object.assign({}, COMPANY, data.company);
    if (Array.isArray(data.awards)) AWARDS = data.awards;
    if (Array.isArray(data.heroSlides)) HERO_SLIDES = data.heroSlides;
    if (Array.isArray(data.products)) PRODUCTS = data.products;
    if (Array.isArray(data.projects)) PROJECTS = data.projects;
  }

  async function load() {
    try {
      const res = await fetch(`${API_BASE}/api/content`, { cache: "no-store" });
      if (!res.ok) throw new Error(`API responded with ${res.status}`);
      const data = await res.json();
      applyContent(data);
      lastError = null;
    } catch (e) {
      lastError = e;
      console.warn("GPCStore: could not load live content from the API — showing built-in defaults instead.", e);
    } finally {
      ready = true;
      document.dispatchEvent(new CustomEvent("gpc:content-ready", { detail: { error: lastError } }));
    }
  }

  function onReady(cb) {
    if (ready) cb();
    else document.addEventListener("gpc:content-ready", cb, { once: true });
  }

  /* ---------------- Admin session + writes ---------------- */
  const TOKEN_KEY = "gpc_admin_token";

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  }
  function setToken(token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
  function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
  }
  function isLoggedIn() {
    return !!getToken();
  }

  async function login(password) {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed.");
    setToken(data.token);
    return data;
  }

  async function authedFetch(url, options = {}) {
    const token = getToken();
    const headers = Object.assign({}, options.headers, token ? { Authorization: `Bearer ${token}` } : {});
    const res = await fetch(`${API_BASE}${url}`, Object.assign({}, options, { headers }));
    if (res.status === 401) {
      clearToken();
      throw new Error("Your admin session expired. Please log in again.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  async function saveSection(section, body) {
    return authedFetch(`/api/${section}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function readFileAsDataUri(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadImage(file) {
    const dataUri = await readFileAsDataUri(file);
    const data = await authedFetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: dataUri }),
    });
    return data.url; // e.g. "https://<store>.public.blob.vercel-storage.com/uploads/abc123.jpg"
  }

  async function resetAll() {
    const data = await authedFetch("/api/reset", { method: "POST" });
    applyContent(data.content);
    return data;
  }

  function exportAll() {
    return { company: COMPANY, awards: AWARDS, heroSlides: HERO_SLIDES, products: PRODUCTS, projects: PROJECTS, exportedAt: new Date().toISOString() };
  }

  load();

  return { onReady, load, login, isLoggedIn, clearToken, saveSection, uploadImage, resetAll, exportAll, applyContent };
})();
