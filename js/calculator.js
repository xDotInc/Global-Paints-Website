GPCStore.onReady(function () {
  "use strict";
  if (typeof PRODUCTS === "undefined") return;

  const SURFACE_TYPES = [
    { id: "interior", label: "Interior wall" },
    { id: "exterior", label: "Exterior wall" },
    { id: "roof", label: "Roof" },
    { id: "woodmetal", label: "Wood / metal" },
    { id: "floor", label: "Floor / stoep" },
  ];

  let surfaceSeq = 0;
  let surfaces = [];
  let mode = "dimensions";

  function newSurface() {
    surfaceSeq += 1;
    return { id: surfaceSeq, type: "interior", width: "", height: "", openings: [] };
  }
  function newOpening() {
    surfaceSeq += 1;
    return { id: surfaceSeq, width: "", height: "", qty: 1 };
  }

  surfaces.push(newSurface());

  const surfaceList = document.getElementById("surfaceList");
  const addSurfaceBtn = document.getElementById("addSurfaceBtn");
  const modeDimensions = document.getElementById("modeDimensions");
  const modeArea = document.getElementById("modeArea");
  const dimensionsPanel = document.getElementById("dimensionsPanel");
  const areaPanel = document.getElementById("areaPanel");
  const totalAreaInput = document.getElementById("totalAreaInput");
  const productSelect = document.getElementById("productSelect");
  const productHint = document.getElementById("productHint");
  const includePrimer = document.getElementById("includePrimer");
  const resultBody = document.getElementById("resultBody");
  const startOverBtn = document.getElementById("startOverBtn");

  /* ---------------- Product select ---------------- */
  productSelect.innerHTML = PRODUCTS.map((p) => `<option value="${p.slug}">${p.name} (${p.size})</option>`).join("");
  function updateProductHint() {
    const p = getProductBySlug(productSelect.value);
    if (!p) return;
    productHint.textContent = p.dataIncomplete
      ? "Coverage data for this product isn't available yet — we'll route you to the team instead of an estimate."
      : `Approx. coverage: ${p.coverageLow}–${p.coverageHigh} m² per coat, ${p.size} container.`;
  }
  productSelect.addEventListener("change", () => { updateProductHint(); calculate(); });
  updateProductHint();

  /* ---------------- Mode toggle ---------------- */
  function setMode(next) {
    mode = next;
    const isDim = mode === "dimensions";
    modeDimensions.classList.toggle("active", isDim);
    modeDimensions.setAttribute("aria-selected", String(isDim));
    modeArea.classList.toggle("active", !isDim);
    modeArea.setAttribute("aria-selected", String(!isDim));
    dimensionsPanel.hidden = !isDim;
    areaPanel.hidden = isDim;
    calculate();
  }
  modeDimensions.addEventListener("click", () => setMode("dimensions"));
  modeArea.addEventListener("click", () => setMode("area"));

  /* ---------------- Surface rows ---------------- */
  function renderSurfaces() {
    surfaceList.innerHTML = surfaces
      .map(
        (s, idx) => `
      <div class="surface-block" data-surface="${s.id}">
        <div class="surface-row">
          <div class="field">
            <label for="type-${s.id}">Surface ${idx + 1} type</label>
            <select id="type-${s.id}" data-field="type" data-id="${s.id}">
              ${SURFACE_TYPES.map((t) => `<option value="${t.id}" ${t.id === s.type ? "selected" : ""}>${t.label}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="w-${s.id}">Width (m)</label>
            <input type="number" min="0" step="0.01" id="w-${s.id}" data-field="width" data-id="${s.id}" value="${s.width}" placeholder="e.g. 4.5">
          </div>
          <div class="field">
            <label for="h-${s.id}">Height / length (m)</label>
            <input type="number" min="0" step="0.01" id="h-${s.id}" data-field="height" data-id="${s.id}" value="${s.height}" placeholder="e.g. 2.4">
          </div>
          ${surfaces.length > 1 ? `<button type="button" class="remove-btn" data-remove-surface="${s.id}" aria-label="Remove surface ${idx + 1}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>` : "<span></span>"}
        </div>
        <div class="openings" data-openings-for="${s.id}">
          ${s.openings
            .map(
              (o, oi) => `
            <div class="opening-row" data-opening="${o.id}">
              <div class="field"><label for="ow-${o.id}">Opening ${oi + 1} width (m)</label><input type="number" min="0" step="0.01" id="ow-${o.id}" data-field="owidth" data-surface="${s.id}" data-id="${o.id}" value="${o.width}"></div>
              <div class="field"><label for="oh-${o.id}">Height (m)</label><input type="number" min="0" step="0.01" id="oh-${o.id}" data-field="oheight" data-surface="${s.id}" data-id="${o.id}" value="${o.height}"></div>
              <div class="field"><label for="oq-${o.id}">Qty</label><input type="number" min="1" step="1" id="oq-${o.id}" data-field="oqty" data-surface="${s.id}" data-id="${o.id}" value="${o.qty}"></div>
              <button type="button" class="remove-btn" data-remove-opening="${o.id}" data-surface="${s.id}" aria-label="Remove opening ${oi + 1}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
            </div>`
            )
            .join("")}
          <button type="button" class="link-btn" data-add-opening="${s.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add door / window opening
          </button>
        </div>
      </div>`
      )
      .join("");

    bindSurfaceEvents();
  }

  function bindSurfaceEvents() {
    surfaceList.querySelectorAll("[data-field]").forEach((el) => {
      el.addEventListener("input", (e) => {
        const id = Number(e.target.dataset.id);
        const field = e.target.dataset.field;
        const surfaceId = e.target.dataset.surface ? Number(e.target.dataset.surface) : id;
        const surface = surfaces.find((s) => s.id === surfaceId) || surfaces.find((s) => s.id === id);
        if (field === "type") surface.type = e.target.value;
        if (field === "width") surface.width = e.target.value;
        if (field === "height") surface.height = e.target.value;
        if (field === "owidth" || field === "oheight" || field === "oqty") {
          const opening = surface.openings.find((o) => o.id === Number(e.target.dataset.id));
          if (opening) {
            if (field === "owidth") opening.width = e.target.value;
            if (field === "oheight") opening.height = e.target.value;
            if (field === "oqty") opening.qty = e.target.value;
          }
        }
        calculate();
      });
    });
    surfaceList.querySelectorAll("[data-remove-surface]").forEach((btn) =>
      btn.addEventListener("click", () => {
        surfaces = surfaces.filter((s) => s.id !== Number(btn.dataset.removeSurface));
        renderSurfaces();
        calculate();
      })
    );
    surfaceList.querySelectorAll("[data-add-opening]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const surface = surfaces.find((s) => s.id === Number(btn.dataset.addOpening));
        surface.openings.push(newOpening());
        renderSurfaces();
        calculate();
      })
    );
    surfaceList.querySelectorAll("[data-remove-opening]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const surface = surfaces.find((s) => s.id === Number(btn.dataset.surface));
        surface.openings = surface.openings.filter((o) => o.id !== Number(btn.dataset.removeOpening));
        renderSurfaces();
        calculate();
      })
    );
  }

  addSurfaceBtn.addEventListener("click", () => {
    surfaces.push(newSurface());
    renderSurfaces();
    calculate();
  });

  document.getElementById("coatsToggle").addEventListener("change", calculate);
  includePrimer.addEventListener("change", calculate);
  totalAreaInput.addEventListener("input", calculate);

  startOverBtn.addEventListener("click", () => {
    surfaces = [newSurface()];
    totalAreaInput.value = "";
    includePrimer.checked = false;
    document.querySelector('input[name="coats"][value="2"]').checked = true;
    renderSurfaces();
    calculate();
  });

  /* ---------------- Calculation ---------------- */
  function num(v) {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  function isValidPositive(v) {
    const n = parseFloat(v);
    return v !== "" && !isNaN(n) && n > 0;
  }

  function computeNetArea() {
    if (mode === "area") {
      return isValidPositive(totalAreaInput.value) ? num(totalAreaInput.value) : 0;
    }
    let total = 0;
    surfaces.forEach((s) => {
      if (!isValidPositive(s.width) || !isValidPositive(s.height)) return;
      let area = num(s.width) * num(s.height);
      s.openings.forEach((o) => {
        if (isValidPositive(o.width) && isValidPositive(o.height)) {
          area -= num(o.width) * num(o.height) * Math.max(1, num(o.qty) || 1);
        }
      });
      total += Math.max(0, area);
    });
    return total;
  }

  function hasAnyValidInput() {
    if (mode === "area") return totalAreaInput.value !== "";
    return surfaces.some((s) => s.width !== "" || s.height !== "");
  }

  function coatsCount() {
    const checked = document.querySelector('input[name="coats"]:checked');
    return checked ? parseInt(checked.value, 10) : 2;
  }

  function litresFor(netArea, coats, product) {
    const containerSize = parseInt(product.size, 10);
    const coveragePerLitre = product.coverageLow / containerSize; // m² per litre, conservative (lower bound)
    const litres = (netArea * coats) / coveragePerLitre;
    return { litres, containerSize };
  }

  function roundUp(litres) {
    return Math.ceil(litres * 10) / 10; // round up to nearest 0.1 L, never down
  }

  function calculate() {
    const netArea = computeNetArea();
    const product = getProductBySlug(productSelect.value);
    const coats = coatsCount();

    if (!hasAnyValidInput()) {
      resultBody.innerHTML = `<p class="muted" style="color:rgba(255,255,255,.7);">Add your surface details to see a litre and bucket estimate here.</p>`;
      return;
    }
    if (netArea <= 0) {
      resultBody.innerHTML = `<p class="muted" style="color:rgba(255,255,255,.7);">Enter dimensions greater than zero (and check that openings don't exceed the surface area) to see your estimate.</p>`;
      return;
    }
    if (product.dataIncomplete) {
      resultBody.innerHTML = `
        <p style="color:rgba(255,255,255,.85);">Coverage and lifespan figures for <b>${product.name}</b> weren't included in our current specification sheet, so we can't calculate a reliable estimate yet.</p>
        <a class="btn btn-gold btn-block" href="${waLink('Hello Global Paints & Coatings, I would like help estimating ' + product.name + ' quantity for approximately ' + netArea.toFixed(1) + ' m².')}" target="_blank" rel="noopener">Speak to the team</a>`;
      return;
    }

    const main = litresFor(netArea, coats, product);
    const mainLitres = roundUp(main.litres);
    const mainBuckets = Math.ceil(mainLitres / main.containerSize);
    const mainProvided = mainBuckets * main.containerSize;
    const mainSurplus = +(mainProvided - mainLitres).toFixed(1);
    const mainCost = product.price != null ? product.price * mainBuckets : null;

    let primerHtml = "";
    let primerCost = null;
    let primerBuckets = 0;
    const primerProduct = getProductBySlug("wall-primer");
    if (includePrimer.checked) {
      const primer = litresFor(netArea, 1, primerProduct);
      const primerLitres = roundUp(primer.litres);
      primerBuckets = Math.ceil(primerLitres / primer.containerSize);
      const primerProvided = primerBuckets * primer.containerSize;
      primerCost = primerProduct.price != null ? primerProduct.price * primerBuckets : null;
      primerHtml = `
        <div class="result-line"><span>Primer (Wall Primer, 1 coat)</span><b>${primerLitres} L</b></div>
        <div class="bucket-pills"><span class="bucket-pill">${primerBuckets} × 20L primer bucket${primerBuckets > 1 ? "s" : ""}</span></div>
        ${primerCost != null ? `<div class="result-line"><span>Primer cost</span><b>$${primerCost.toFixed(2)}</b></div>` : ""}`;
    }

    const totalCost = (mainCost || 0) + (primerCost || 0);
    const costLine =
      mainCost != null
        ? `<div class="result-line"><span>Estimated cost (${product.name})</span><b>$${mainCost.toFixed(2)}</b></div>` +
          (includePrimer.checked && totalCost !== mainCost ? `<div class="result-line"><span>Estimated total (incl. primer)</span><b>$${totalCost.toFixed(2)}</b></div>` : "")
        : `<p style="font-size:.8rem; color:rgba(255,255,255,.65); margin-top:10px;">Current pricing available on request for ${product.name}.</p>`;

    resultBody.innerHTML = `
      <div class="result-hero">
        <div class="num">${mainLitres}<span style="font-size:1.4rem;"> L</span></div>
        <div class="unit">${product.name} needed for ${coats} coat${coats > 1 ? "s" : ""}</div>
      </div>
      <div class="bucket-pills">
        <span class="bucket-pill">${mainBuckets} × ${main.containerSize}L bucket${mainBuckets > 1 ? "s" : ""}</span>
      </div>
      <div class="result-line"><span>Net surface area</span><b>${netArea.toFixed(1)} m²</b></div>
      <div class="result-line"><span>Coverage assumption</span><b>${product.coverageLow} m²/L (lower estimate)</b></div>
      <div class="result-line"><span>Provided by recommended buckets</span><b>${mainProvided} L</b></div>
      <div class="result-line"><span>Expected surplus</span><b>${mainSurplus} L</b></div>
      ${costLine}
      ${primerHtml}
      <p style="font-size:.78rem; color:rgba(255,255,255,.6); margin-top:14px;">Prices are current at time of publishing and may change without notice.</p>
      <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;">
        <button type="button" class="btn btn-gold btn-block" id="addCalcToQuote">Add to Cart</button>
        <a class="btn btn-outline-light btn-block" href="${waLink('Hello Global Paints & Coatings, my estimate is ' + mainLitres + 'L of ' + product.name + ' for about ' + netArea.toFixed(1) + ' m². I would like to place an order.')}" target="_blank" rel="noopener">Place Order via WhatsApp</a>
      </div>
    `;

    document.getElementById("addCalcToQuote")?.addEventListener("click", () => {
      window.GPCCart?.add({
        slug: product.slug,
        name: product.name,
        size: `${mainBuckets} × ${main.containerSize}L`,
        qty: 1,
        price: mainCost,
        note: `Estimate: ${mainLitres}L for ${netArea.toFixed(1)} m², ${coats} coat(s)`,
      });
      if (includePrimer.checked) {
        window.GPCCart?.add({
          slug: "wall-primer",
          name: "Wall Primer",
          size: `${primerBuckets} × 20L`,
          qty: 1,
          price: primerCost,
          note: "Primer coat for the same area",
        });
      }
    });
  }

  renderSurfaces();
  calculate();
});
