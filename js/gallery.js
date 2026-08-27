GPCStore.onReady(function () {
  "use strict";
  if (typeof PROJECTS === "undefined") return;

  const masonry = document.getElementById("projectMasonry");
  masonry.innerHTML = PROJECTS.map(
    (p, i) => `
    <div class="masonry-item" tabindex="0" role="button" data-index="${i}" aria-label="Open photo: ${p.caption}">
      <img src="${p.file}" alt="${p.caption}" loading="lazy">
      <div class="masonry-caption">${p.caption}</div>
    </div>`
  ).join("");

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  let current = 0;
  let lastFocused = null;

  function open(index) {
    current = index;
    lastFocused = document.activeElement;
    render();
    lightbox.setAttribute("data-open", "true");
    document.body.style.overflow = "hidden";
    document.getElementById("lightboxClose").focus();
    document.addEventListener("keydown", onKeydown);
  }
  function close() {
    lightbox.removeAttribute("data-open");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKeydown);
    lastFocused?.focus();
  }
  function render() {
    const p = PROJECTS[current];
    lightboxImg.src = p.file;
    lightboxImg.alt = p.caption;
    lightboxCaption.textContent = `${p.caption} (${current + 1} of ${PROJECTS.length})`;
  }
  function next() { current = (current + 1) % PROJECTS.length; render(); }
  function prev() { current = (current - 1 + PROJECTS.length) % PROJECTS.length; render(); }
  function onKeydown(e) {
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  }

  masonry.querySelectorAll(".masonry-item").forEach((el) => {
    el.addEventListener("click", () => open(Number(el.dataset.index)));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(Number(el.dataset.index));
      }
    });
  });

  document.getElementById("lightboxClose").addEventListener("click", close);
  document.getElementById("lightboxNext").addEventListener("click", next);
  document.getElementById("lightboxPrev").addEventListener("click", prev);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });
});
