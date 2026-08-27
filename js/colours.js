(function () {
  "use strict";
  if (typeof COLOUR_FAMILIES === "undefined") return;

  const tabsWrap = document.getElementById("familyTabs");
  const swatchGrid = document.getElementById("swatchGrid");
  const roomWrap = document.getElementById("roomSvgWrap");
  const selectedName = document.getElementById("selectedName");
  const selectedHex = document.getElementById("selectedHex");
  let activeFamily = COLOUR_FAMILIES[0].id;
  let activeSwatch = null;

  function roomSvg(hex) {
    return `
    <svg viewBox="0 0 480 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Preview wall coloured with the selected tone">
      <rect x="0" y="0" width="480" height="340" fill="${hex}"/>
      <rect x="0" y="270" width="480" height="70" fill="#D9CBB0"/>
      <rect x="0" y="270" width="480" height="6" fill="#00000014"/>
      <rect x="60" y="60" width="140" height="160" rx="4" fill="#EAF4F8" stroke="#10233F" stroke-opacity="0.25" stroke-width="3"/>
      <line x1="130" y1="60" x2="130" y2="220" stroke="#10233F" stroke-opacity="0.25" stroke-width="3"/>
      <line x1="60" y1="140" x2="200" y2="140" stroke="#10233F" stroke-opacity="0.25" stroke-width="3"/>
      <rect x="300" y="120" width="110" height="150" rx="3" fill="#8C5A34"/>
      <rect x="300" y="120" width="110" height="150" rx="3" fill="#00000010"/>
      <circle cx="392" cy="195" r="4" fill="#F8F6F0"/>
    </svg>`;
  }

  function renderTabs() {
    tabsWrap.innerHTML = COLOUR_FAMILIES.map(
      (f) => `<button type="button" class="family-tab" role="tab" id="tab-${f.id}" aria-selected="${f.id === activeFamily}">${f.name}</button>`
    ).join("");
    tabsWrap.querySelectorAll(".family-tab").forEach((btn, i) => {
      btn.addEventListener("click", () => {
        activeFamily = COLOUR_FAMILIES[i].id;
        renderTabs();
        renderSwatches();
      });
    });
  }

  function selectSwatch(sw) {
    activeSwatch = sw;
    roomWrap.innerHTML = roomSvg(sw.hex);
    selectedName.textContent = sw.name;
    selectedHex.textContent = `${sw.hex.toUpperCase()} · sample tone`;
    swatchGrid.querySelectorAll(".swatch-btn").forEach((b) => b.setAttribute("aria-pressed", b.dataset.hex === sw.hex ? "true" : "false"));
  }

  function renderSwatches() {
    const fam = COLOUR_FAMILIES.find((f) => f.id === activeFamily);
    swatchGrid.innerHTML = fam.swatches
      .map(
        (s) => `
      <div class="swatch-cell">
        <button type="button" class="swatch-btn" data-hex="${s.hex}" aria-pressed="false" aria-label="${s.name}, sample tone ${s.hex}">
          <span class="puddle-ring"></span>
          <img class="puddle-img" src="${s.image}" alt="" loading="lazy">
          <span class="check"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg></span>
        </button>
        <span class="swatch-name">${s.name}</span>
      </div>`
      )
      .join("");
    swatchGrid.querySelectorAll(".swatch-btn").forEach((btn, i) => {
      btn.addEventListener("click", () => selectSwatch(fam.swatches[i]));
    });
    // Auto-select first swatch of the family for an immediate preview
    selectSwatch(fam.swatches[0]);
  }

  renderTabs();
  renderSwatches();

  /* Jump to a family via hash from the home page preview, e.g. colours.html#greens */
  if (location.hash) {
    const id = location.hash.replace("#", "");
    if (COLOUR_FAMILIES.some((f) => f.id === id)) {
      activeFamily = id;
      renderTabs();
      renderSwatches();
    }
  }

  document.getElementById("askColourBtn")?.addEventListener("click", () => {
    if (!activeSwatch) return;
    const msg = `Hello Global Paints & Coatings, I'm interested in a colour direction called "${activeSwatch.name}" (${activeSwatch.hex}) from your Colour Studio. Could you help me find the closest match?`;
    window.open(waLink(msg), "_blank", "noopener");
  });

  document.getElementById("saveColourBtn")?.addEventListener("click", (e) => {
    if (!activeSwatch) return;
    try {
      const raw = localStorage.getItem("gpc_saved_colours_v1");
      const saved = raw ? JSON.parse(raw) : [];
      if (!saved.some((c) => c.hex === activeSwatch.hex)) saved.push(activeSwatch);
      localStorage.setItem("gpc_saved_colours_v1", JSON.stringify(saved));
      const btn = e.currentTarget;
      const original = btn.textContent;
      btn.textContent = "Saved ✓";
      setTimeout(() => (btn.textContent = original), 1600);
    } catch (err) { /* storage unavailable */ }
  });
})();
