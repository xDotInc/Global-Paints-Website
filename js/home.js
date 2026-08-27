GPCStore.onReady(function () {
  "use strict";
  if (typeof HERO_SLIDES === "undefined") return;

  /* ---------------- Hero slider ---------------- */
  const heroSlidesWrap = document.getElementById("heroSlides");
  const heroCopy = document.getElementById("heroCopy");
  const dotsWrap = document.querySelector(".hero-dots");
  let current = 0;
  let timer = null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function renderSlideEls() {
    heroSlidesWrap.innerHTML = HERO_SLIDES.map(
      (s, i) => `
      <div class="hero-slide${i === 0 ? " is-active" : ""}" style="background-image:url('${s.image}')" data-slide="${i}">
        <div class="kb" style="background-image:url('${s.image}')"></div>
      </div>`
    ).join("");
  }

  function renderCopy(i) {
    if (!heroCopy) return;
    const s = HERO_SLIDES[i];
    heroCopy.innerHTML = `
      <div class="eyebrow">${s.eyebrow}</div>
      <h1>${s.heading}</h1>
      <p class="lede">${s.body}</p>
      <div class="hero-ctas">
        <a class="btn btn-gold" href="${s.primaryHref}">${s.primaryLabel}</a>
        <a class="btn btn-outline-light" href="${s.secondaryHref}">${s.secondaryLabel}</a>
      </div>`;
  }

  function renderDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = HERO_SLIDES.map(
      (_, i) => `<button type="button" role="tab" aria-label="Show slide ${i + 1}" class="${i === 0 ? "is-active" : ""}" data-dot="${i}"></button>`
    ).join("");
    dotsWrap.querySelectorAll("[data-dot]").forEach((btn) =>
      btn.addEventListener("click", () => goTo(Number(btn.dataset.dot)))
    );
  }

  function goTo(i) {
    current = (i + HERO_SLIDES.length) % HERO_SLIDES.length;
    heroSlidesWrap.querySelectorAll(".hero-slide").forEach((el) => el.classList.toggle("is-active", Number(el.dataset.slide) === current));
    dotsWrap?.querySelectorAll("[data-dot]").forEach((d) => d.classList.toggle("is-active", Number(d.dataset.dot) === current));
    renderCopy(current);
    restartTimer();
  }
  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }
  function restartTimer() {
    if (reduceMotion) return;
    clearInterval(timer);
    timer = setInterval(next, 6500);
  }

  document.querySelector("[data-hero-next]")?.addEventListener("click", next);
  document.querySelector("[data-hero-prev]")?.addEventListener("click", prev);

  if (heroCopy && heroSlidesWrap && HERO_SLIDES.length) {
    renderSlideEls();
    renderCopy(0);
    renderDots();
    restartTimer();
  }

  /* ---------------- Colour family preview ---------------- */
  const homeColourGrid = document.getElementById("homeColourGrid");
  if (homeColourGrid && typeof COLOUR_FAMILIES !== "undefined") {
    homeColourGrid.innerHTML = COLOUR_FAMILIES.map(
      (fam) => `
      <a class="colour-family-card" href="colours.html#${fam.id}">
        <div class="swatch-strip">
          ${fam.swatches.slice(0, 5).map((s) => `<span style="background:${s.hex}"></span>`).join("")}
        </div>
        <h4>${fam.name}</h4>
      </a>`
    ).join("");
  }

  /* ---------------- Awards list ---------------- */
  const homeAwardList = document.getElementById("homeAwardList");
  if (homeAwardList && typeof AWARDS !== "undefined") {
    homeAwardList.innerHTML = AWARDS.map(
      (a) => `<div class="award-item"><span class="yr">${a.year}</span><span>${a.title} — ${a.detail}</span></div>`
    ).join("");
  }
});
