GPCStore.onReady(function () {
  "use strict";
  if (typeof PRODUCTS === "undefined") return;

  const grid = document.getElementById("productGrid");
  const chipsWrap = document.getElementById("filterChips");
  const searchInput = document.getElementById("productSearch");
  const sortSelect = document.getElementById("productSort");
  const noResults = document.getElementById("noResults");

  let activeFilters = new Set();
  let query = "";
  let sortBy = "name";

  function formatPrice(p) {
    if (!p.price) return `<span class="muted" style="font-weight:600;">Price on request</span>`;
    return `$${p.price}<span class="muted" style="font-weight:500;"> / ${p.size}</span>`;
  }

  /* Pre-select a filter from a footer link like products.html?surface=exterior */
  const params = new URLSearchParams(location.search);
  if (params.get("surface")) activeFilters.add(params.get("surface"));

  function renderChips() {
    chipsWrap.innerHTML =
      `<button type="button" class="filter-chip" data-all aria-pressed="${activeFilters.size === 0}">All products</button>` +
      SURFACES.map(
        (s) => `<button type="button" class="filter-chip" data-surface="${s.id}" aria-pressed="${activeFilters.has(s.id)}">${s.label}</button>`
      ).join("");

    chipsWrap.querySelector("[data-all]").addEventListener("click", () => {
      activeFilters.clear();
      renderChips();
      renderGrid();
    });
    chipsWrap.querySelectorAll("[data-surface]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.surface;
        if (activeFilters.has(id)) activeFilters.delete(id);
        else activeFilters.add(id);
        renderChips();
        renderGrid();
      });
    });
  }

  function matches(p) {
    const q = query.trim().toLowerCase();
    const searchOk =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.use.toLowerCase().includes(q) ||
      (p.alias && p.alias.toLowerCase().includes(q)) ||
      p.description.toLowerCase().includes(q);
    const filterOk = activeFilters.size === 0 || p.surfaces.some((s) => activeFilters.has(s));
    return searchOk && filterOk;
  }

  function sortList(list) {
    const copy = [...list];
    if (sortBy === "name") copy.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "size") copy.sort((a, b) => parseInt(a.size) - parseInt(b.size));
    if (sortBy === "lifespan") {
      copy.sort((a, b) => {
        const av = a.lifespan ? parseInt(a.lifespan) : -1;
        const bv = b.lifespan ? parseInt(b.lifespan) : -1;
        return bv - av;
      });
    }
    return copy;
  }

  function productCard(p) {
    const media = p.image
      ? `<img src="${p.image}" alt="${p.name} packaging" loading="lazy">`
      : `<div class="no-photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 4h16v16H4z"/><path d="M4 15l4-4 4 4 4-6 4 4"/></svg></div>`;
    const specs = p.dataIncomplete
      ? `<span>Coverage and lifespan: <b>to be confirmed</b></span>`
      : `<span><b>${p.coverageLow}–${p.coverageHigh} m²</b> per coat</span><span><b>${p.lifespan}</b></span>`;
    return `
    <article class="feature-card">
      <button type="button" class="feature-media" style="border:none; padding:0; width:100%; cursor:pointer;" data-open-detail="${p.slug}" aria-label="View details for ${p.name}">
        ${media}
      </button>
      <div class="feature-body">
        <div class="tag-row">${p.surfaces.slice(0, 2).map((s) => `<span class="tag">${surfaceLabel(s)}</span>`).join("")}</div>
        <h3><button type="button" style="all:unset; cursor:pointer;" data-open-detail="${p.slug}">${p.name}</button></h3>
        <p class="muted">${p.tagline}</p>
        <div class="spec-line">${specs}</div>
        <div class="product-price">${formatPrice(p)}</div>
        <div class="feature-footer">
          <button type="button" class="btn btn-outline btn-sm" data-open-detail="${p.slug}">Details</button>
          <button type="button" class="btn btn-primary btn-sm" data-quick-add="${p.slug}">Add to Cart</button>
        </div>
      </div>
    </article>`;
  }

  function renderGrid() {
    const list = sortList(PRODUCTS.filter(matches));
    grid.innerHTML = list.map(productCard).join("");
    noResults.hidden = list.length > 0;
    grid.querySelectorAll("[data-open-detail]").forEach((btn) =>
      btn.addEventListener("click", () => openDetail(btn.dataset.openDetail))
    );
    grid.querySelectorAll("[data-quick-add]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const p = getProductBySlug(btn.dataset.quickAdd);
        if (!p) return;
        window.GPCCart?.add({ slug: p.slug, name: p.name, size: p.size, qty: 1, price: p.price || null });
        const original = btn.textContent;
        btn.textContent = "Added ✓";
        btn.disabled = true;
        setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1300);
      })
    );
  }

  searchInput?.addEventListener("input", (e) => {
    query = e.target.value;
    renderGrid();
  });
  sortSelect?.addEventListener("change", (e) => {
    sortBy = e.target.value;
    renderGrid();
  });

  renderChips();
  renderGrid();

  /* ---------------- Detail overlay ---------------- */
  const overlay = document.getElementById("productDetailOverlay");
  const detailContent = document.getElementById("detailContent");
  let lastFocused = null;

  function openDetail(slug) {
    const p = getProductBySlug(slug);
    if (!p) return;
    lastFocused = document.activeElement;

    const media = p.image
      ? `<img src="${p.image}" alt="${p.name} packaging">`
      : `<div class="no-photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 4h16v16H4z"/><path d="M4 15l4-4 4 4 4-6 4 4"/></svg><p>Product photo not yet supplied</p></div>`;

    const coloursBlock = p.colours
      ? `<div class="detail-note">Available in: <b>${p.colours.join(", ")}</b>. Recommended: 2 coats for a uniform finish.</div>`
      : "";
    const featuresBlock = p.features
      ? `<h4>Key features</h4><ul style="display:grid; gap:8px; margin-bottom:20px;">${p.features
          .map((f) => `<li style="display:flex; gap:8px; align-items:flex-start;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--leaf-green)" stroke-width="2.4" style="margin-top:3px; flex-shrink:0;"><path d="M20 6L9 17l-5-5"/></svg><span class="muted">${f}</span></li>`)
          .join("")}</ul>`
      : "";
    const incompleteNote = p.dataIncomplete
      ? `<div class="detail-note" style="background:#FBF0D6; color:#7a5c0d;">Full coverage and lifespan figures for this product were not included in our current specification sheet. Please contact us and we'll confirm the details for your project.</div>`
      : "";

    detailContent.innerHTML = `
      <div class="detail-media">${media}</div>
      <div class="tag-row" style="margin-bottom:14px;">${p.surfaces.map((s) => `<span class="tag blue">${surfaceLabel(s)}</span>`).join("")}</div>
      <h2 style="margin-bottom:4px;">${p.name}</h2>
      ${p.alias ? `<p class="muted" style="margin-bottom:14px;">${p.alias}</p>` : ""}
      <div class="product-price" style="margin-bottom:14px;">${formatPrice(p)}</div>
      <p>${p.description}</p>

      ${incompleteNote}

      <div class="detail-specs">
        <div class="spec-box"><div class="label">Price</div><div class="value">${p.price ? `$${p.price}` : "On request"}</div></div>
        <div class="spec-box"><div class="label">Available size</div><div class="value">${p.size}</div></div>
        <div class="spec-box"><div class="label">Recommended use</div><div class="value" style="font-size:1rem;">${p.use}</div></div>
        ${!p.dataIncomplete ? `
        <div class="spec-box"><div class="label">Approx. coverage per coat</div><div class="value">${p.coverageLow}–${p.coverageHigh} m²</div></div>
        <div class="spec-box"><div class="label">Expected lifespan</div><div class="value" style="font-size:1rem;">${p.lifespan}</div></div>` : ""}
      </div>

      ${coloursBlock}
      ${featuresBlock}

      <p class="muted" style="font-size:.85rem;">Coverage figures are approximate and assume a properly prepared surface. Actual results depend on surface condition, porosity, application method, number of coats, weather exposure, and maintenance. Prices are current at time of publishing and may change without notice.</p>

      <div class="detail-actions">
        <button type="button" class="btn btn-primary" data-add-quote="${p.slug}">Add to Cart</button>
        <a class="btn btn-outline" href="calculator.html">Estimate quantity needed</a>
        <a class="btn btn-whatsapp" href="${waLink('Hello Global Paints & Coatings, I have a question about ' + p.name + '.')}" target="_blank" rel="noopener">Ask a question</a>
      </div>
    `;

    detailContent.querySelector("[data-add-quote]")?.addEventListener("click", () => {
      window.GPCCart?.add({ slug: p.slug, name: p.name, size: p.size, qty: 1, price: p.price || null });
    });

    overlay.setAttribute("data-open", "true");
    document.body.style.overflow = "hidden";
    overlay.querySelector(".detail-close").focus();
    history.replaceState(null, "", `#${slug}`);
  }

  function closeDetail() {
    overlay.removeAttribute("data-open");
    document.body.style.overflow = "";
    lastFocused?.focus();
    history.replaceState(null, "", location.pathname);
  }

  overlay?.querySelectorAll("[data-detail-close]").forEach((el) => el.addEventListener("click", closeDetail));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay?.getAttribute("data-open") === "true") closeDetail();
    if (e.key === "Tab" && overlay?.getAttribute("data-open") === "true") {
      const focusables = overlay.querySelectorAll('a, button, input, [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* Open directly via #slug on load (e.g. products.html#wall-coat from home page links) */
  if (location.hash) {
    const slug = location.hash.replace("#", "");
    if (getProductBySlug(slug)) openDetail(slug);
  }
});
