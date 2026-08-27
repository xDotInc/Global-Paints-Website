(function () {
  "use strict";
  if (typeof PRODUCTS === "undefined") return;

  /* =====================================================================
     PASSWORD GATE
     Real server-side auth: the password is checked by the backend
     (/api/login) and never stored in this file. A successful login
     returns a signed session token (JWT) that's sent with every admin
     write request and expires automatically after 12 hours.
     ===================================================================== */
  const gate = document.getElementById("adminGate");
  const shell = document.getElementById("adminShell");
  const gateForm = document.getElementById("gateForm");
  const gateError = document.getElementById("gateError");
  const gateSubmitBtn = gateForm.querySelector('button[type="submit"]');

  function unlock() {
    gate.style.display = "none";
    shell.classList.add("is-active");
    GPCStore.onReady(renderAll);
  }
  if (GPCStore.isLoggedIn()) unlock();

  gateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = document.getElementById("gatePassword").value;
    gateError.textContent = "";
    gateSubmitBtn.disabled = true;
    gateSubmitBtn.textContent = "Checking...";
    try {
      await GPCStore.login(val);
      unlock();
    } catch (err) {
      gateError.textContent = err.message || "Incorrect password. Please try again.";
    } finally {
      gateSubmitBtn.disabled = false;
      gateSubmitBtn.textContent = "Enter admin panel";
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    GPCStore.clearToken();
    location.reload();
  });

  /* =====================================================================
     TOAST + persistence helper
     ===================================================================== */
  const toast = document.getElementById("adminToast");
  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  const SECTION_API = { products: "products", projects: "projects", company: "company", awards: "awards", heroSlides: "hero-slides" };

  /* Saves one section to the live server. Returns true on success; shows
     a toast and returns false on failure (e.g. session expired) so
     callers can skip closing forms / clearing state when a save fails. */
  async function persist(partial) {
    const key = Object.keys(partial)[0];
    try {
      await GPCStore.saveSection(SECTION_API[key], partial[key]);
      return true;
    } catch (err) {
      showToast(err.message || "Save failed — please try again.");
      return false;
    }
  }

  /* =====================================================================
     SIDEBAR TAB NAVIGATION
     ===================================================================== */
  const sidebarBtns = document.querySelectorAll("[data-panel]");
  sidebarBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      sidebarBtns.forEach((b) => b.classList.toggle("active", b === btn));
      document.querySelectorAll("[data-panel-content]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.panelContent === btn.dataset.panel);
      });
    });
  });

  /* =====================================================================
     Image upload helper
     ===================================================================== */
  function readFileAsDataUri(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* =====================================================================
     DASHBOARD
     ===================================================================== */
  function renderDashboard() {
    const wrap = document.getElementById("dashboardStats");
    const cards = [
      { label: "Products", value: PRODUCTS.length, panel: "products" },
      { label: "Project photos", value: PROJECTS.length, panel: "projects" },
      { label: "Recognition entries", value: AWARDS.length, panel: "awards" },
    ];
    wrap.innerHTML = cards
      .map(
        (c) => `
      <button type="button" class="admin-form-card" data-goto="${c.panel}" style="text-align:left; cursor:pointer;">
        <div class="eyebrow">${c.label}</div>
        <div style="font-family:var(--font-display); font-size:2.2rem; color:var(--deep-navy);">${c.value}</div>
      </button>`
      )
      .join("");
    wrap.querySelectorAll("[data-goto]").forEach((btn) =>
      btn.addEventListener("click", () => document.querySelector(`[data-panel="${btn.dataset.goto}"]`).click())
    );
  }

  /* =====================================================================
     PRODUCTS CRUD
     ===================================================================== */
  const productFormCard = document.getElementById("productFormCard");
  const productForm = document.getElementById("productForm");
  const productFormTitle = document.getElementById("productFormTitle");
  const pfSurfaces = document.getElementById("pf-surfaces");
  let pfImageData = null;

  pfSurfaces.innerHTML = SURFACES.map(
    (s) => `<label><input type="checkbox" value="${s.id}"> ${s.label}</label>`
  ).join("");

  function slugify(str) {
    return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function renderProductsTable() {
    const tbody = document.getElementById("productsTableBody");
    tbody.innerHTML = PRODUCTS.map(
      (p) => `
      <tr>
        <td>${p.image ? `<img class="thumb" src="${p.image}" alt="">` : `<div class="thumb" style="display:flex;align-items:center;justify-content:center;background:var(--mist-blue);color:var(--paint-teal);">—</div>`}</td>
        <td><b>${p.name}</b>${p.dataIncomplete ? ' <span class="tag gold">Incomplete data</span>' : ""}</td>
        <td>${p.size}</td>
        <td>${p.price != null ? `$${p.price}` : `<span class="muted">On request</span>`}</td>
        <td>${p.use}</td>
        <td>
          <div class="admin-row-actions">
            <button type="button" class="btn btn-outline btn-sm" data-edit-product="${p.slug}">Edit</button>
            <button type="button" class="btn btn-outline btn-sm" style="border-color:#C0392B;color:#C0392B;" data-delete-product="${p.slug}">Delete</button>
          </div>
        </td>
      </tr>`
    ).join("");

    tbody.querySelectorAll("[data-edit-product]").forEach((btn) =>
      btn.addEventListener("click", () => openProductForm(getProductBySlug(btn.dataset.editProduct)))
    );
    tbody.querySelectorAll("[data-delete-product]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this product? This can't be undone here (but you can Reset to defaults later).")) return;
        const next = PRODUCTS.filter((p) => p.slug !== btn.dataset.deleteProduct);
        const ok = await persist({ products: next });
        if (!ok) return;
        PRODUCTS = next;
        renderProductsTable();
        renderDashboard();
        showToast("Product deleted");
      })
    );
  }

  function openProductForm(product) {
    productFormCard.style.display = "block";
    productFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
    productFormTitle.textContent = product ? `Edit: ${product.name}` : "Add product";
    document.getElementById("pf-slug").value = product ? product.slug : "";
    document.getElementById("pf-name").value = product ? product.name : "";
    document.getElementById("pf-alias").value = product?.alias || "";
    document.getElementById("pf-tagline").value = product?.tagline || "";
    document.getElementById("pf-description").value = product?.description || "";
    document.getElementById("pf-use").value = product?.use || "";
    document.getElementById("pf-size").value = product?.size || "20L";
    document.getElementById("pf-coverageLow").value = product?.coverageLow ?? "";
    document.getElementById("pf-coverageHigh").value = product?.coverageHigh ?? "";
    document.getElementById("pf-lifespan").value = product?.lifespan || "";
    document.getElementById("pf-coats").value = product?.recommendedCoats ?? "";
    document.getElementById("pf-price").value = product?.price ?? "";
    document.getElementById("pf-colours").value = product?.colours ? product.colours.join(", ") : "";
    document.getElementById("pf-features").value = product?.features ? product.features.join("\n") : "";
    document.getElementById("pf-incomplete").checked = !!product?.dataIncomplete;
    pfSurfaces.querySelectorAll("input").forEach((cb) => {
      cb.checked = product ? product.surfaces.includes(cb.value) : false;
    });
    pfImageData = product?.image || null;
    updatePfImagePreview();
    document.getElementById("pf-image-input").value = "";
  }

  function updatePfImagePreview() {
    const img = document.getElementById("pf-image-preview");
    const empty = document.getElementById("pf-image-empty");
    if (pfImageData) {
      img.src = pfImageData;
      img.style.display = "block";
      empty.style.display = "none";
    } else {
      img.style.display = "none";
      empty.style.display = "flex";
    }
  }

  let pfUploading = false;
  document.getElementById("pf-image-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Instant local preview while the real upload happens in the background.
    pfImageData = await readFileAsDataUri(file);
    updatePfImagePreview();
    pfUploading = true;
    try {
      pfImageData = await GPCStore.uploadImage(file);
    } catch (err) {
      showToast(err.message || "Image upload failed — try a different file.");
    } finally {
      pfUploading = false;
    }
  });

  document.getElementById("newProductBtn").addEventListener("click", () => openProductForm(null));
  document.getElementById("cancelProductForm").addEventListener("click", () => {
    productFormCard.style.display = "none";
    productForm.reset();
  });

  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (pfUploading) {
      alert("Please wait for the photo to finish uploading before saving.");
      return;
    }
    const name = document.getElementById("pf-name").value.trim();
    const existingSlug = document.getElementById("pf-slug").value;
    const surfaces = Array.from(pfSurfaces.querySelectorAll("input:checked")).map((cb) => cb.value);
    if (!surfaces.length) {
      alert("Please select at least one surface/use.");
      return;
    }
    const colours = document.getElementById("pf-colours").value.trim();
    const features = document.getElementById("pf-features").value.trim();
    const covLow = document.getElementById("pf-coverageLow").value;
    const covHigh = document.getElementById("pf-coverageHigh").value;
    const incomplete = document.getElementById("pf-incomplete").checked;

    const product = {
      slug: existingSlug || slugify(name) || `product-${Date.now()}`,
      name,
      alias: document.getElementById("pf-alias").value.trim() || null,
      tagline: document.getElementById("pf-tagline").value.trim(),
      description: document.getElementById("pf-description").value.trim(),
      use: document.getElementById("pf-use").value.trim(),
      size: document.getElementById("pf-size").value,
      coverageLow: incomplete || covLow === "" ? null : Number(covLow),
      coverageHigh: incomplete || covHigh === "" ? null : Number(covHigh),
      lifespan: incomplete ? null : (document.getElementById("pf-lifespan").value.trim() || null),
      recommendedCoats: document.getElementById("pf-coats").value ? Number(document.getElementById("pf-coats").value) : null,
      price: document.getElementById("pf-price").value !== "" ? Number(document.getElementById("pf-price").value) : null,
      surfaces,
      colours: colours ? colours.split(",").map((c) => c.trim()).filter(Boolean) : null,
      features: features ? features.split("\n").map((f) => f.trim()).filter(Boolean) : null,
      availableSizes: [parseInt(document.getElementById("pf-size").value, 10)],
      image: pfImageData,
      dataIncomplete: incomplete,
    };

    const idx = PRODUCTS.findIndex((p) => p.slug === existingSlug);
    const next = PRODUCTS.slice();
    if (idx > -1) next[idx] = product;
    else next.push(product);

    const ok = await persist({ products: next });
    if (!ok) return;
    PRODUCTS = next;
    renderProductsTable();
    renderDashboard();
    productFormCard.style.display = "none";
    productForm.reset();
    showToast(idx > -1 ? "Product updated" : "Product added");
  });

  /* =====================================================================
     PROJECTS CRUD
     ===================================================================== */
  const projectFormCard = document.getElementById("projectFormCard");
  const projectForm = document.getElementById("projectForm");
  const projectFormTitle = document.getElementById("projectFormTitle");
  let prfImageData = null;

  function renderProjectsTable() {
    const tbody = document.getElementById("projectsTableBody");
    tbody.innerHTML = PROJECTS.map(
      (p, idx) => `
      <tr>
        <td><img class="thumb" src="${p.file}" alt=""></td>
        <td>${p.caption}</td>
        <td>
          <div class="admin-row-actions">
            <button type="button" class="btn btn-outline btn-sm" data-edit-project="${idx}">Edit</button>
            <button type="button" class="btn btn-outline btn-sm" style="border-color:#C0392B;color:#C0392B;" data-delete-project="${idx}">Delete</button>
          </div>
        </td>
      </tr>`
    ).join("");

    tbody.querySelectorAll("[data-edit-project]").forEach((btn) =>
      btn.addEventListener("click", () => openProjectForm(Number(btn.dataset.editProject)))
    );
    tbody.querySelectorAll("[data-delete-project]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this project photo?")) return;
        const next = PROJECTS.slice();
        next.splice(Number(btn.dataset.deleteProject), 1);
        const ok = await persist({ projects: next });
        if (!ok) return;
        PROJECTS = next;
        renderProjectsTable();
        renderDashboard();
        showToast("Project photo deleted");
      })
    );
  }

  function openProjectForm(index) {
    projectFormCard.style.display = "block";
    projectFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
    const project = index > -1 ? PROJECTS[index] : null;
    projectFormTitle.textContent = project ? "Edit project photo" : "Add project photo";
    document.getElementById("prf-index").value = index;
    document.getElementById("prf-caption").value = project?.caption || "";
    prfImageData = project?.file || null;
    updatePrfImagePreview();
    document.getElementById("prf-image-input").value = "";
  }

  function updatePrfImagePreview() {
    const img = document.getElementById("prf-image-preview");
    const empty = document.getElementById("prf-image-empty");
    if (prfImageData) {
      img.src = prfImageData;
      img.style.display = "block";
      empty.style.display = "none";
    } else {
      img.style.display = "none";
      empty.style.display = "flex";
    }
  }

  let prfUploading = false;
  document.getElementById("prf-image-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    prfImageData = await readFileAsDataUri(file); // instant local preview
    updatePrfImagePreview();
    prfUploading = true;
    try {
      prfImageData = await GPCStore.uploadImage(file);
    } catch (err) {
      showToast(err.message || "Image upload failed — try a different file.");
    } finally {
      prfUploading = false;
    }
  });

  document.getElementById("newProjectBtn").addEventListener("click", () => openProjectForm(-1));
  document.getElementById("cancelProjectForm").addEventListener("click", () => {
    projectFormCard.style.display = "none";
    projectForm.reset();
    prfImageData = null;
  });

  projectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!prfImageData) {
      alert("Please choose a photo.");
      return;
    }
    if (prfUploading) {
      alert("Please wait for the photo to finish uploading before saving.");
      return;
    }
    const index = Number(document.getElementById("prf-index").value);
    const entry = { file: prfImageData, caption: document.getElementById("prf-caption").value.trim() };
    const next = PROJECTS.slice();
    if (index > -1) next[index] = entry;
    else next.push(entry);

    const ok = await persist({ projects: next });
    if (!ok) return;
    PROJECTS = next;
    renderProjectsTable();
    renderDashboard();
    projectFormCard.style.display = "none";
    projectForm.reset();
    prfImageData = null;
    showToast(index > -1 ? "Project photo updated" : "Project photo added");
  });

  /* =====================================================================
     COMPANY DETAILS + HERO SLIDES
     ===================================================================== */
  function renderCompanyForm() {
    document.getElementById("cf2-name").value = COMPANY.name || "";
    document.getElementById("cf2-tagline").value = COMPANY.tagline || "";
    document.getElementById("cf2-address").value = COMPANY.address || "";
    document.getElementById("cf2-phone").value = COMPANY.phone || "";
    document.getElementById("cf2-phoneAlt").value = COMPANY.phoneAlt || "";
    document.getElementById("cf2-whatsapp").value = COMPANY.whatsappNumber || "";
    document.getElementById("cf2-email").value = COMPANY.email || "";
    document.getElementById("cf2-founder").value = COMPANY.founder || "";
    document.getElementById("cf2-radio").value = COMPANY.radio || "";
  }

  document.getElementById("companyForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const next = {
      name: document.getElementById("cf2-name").value.trim(),
      tagline: document.getElementById("cf2-tagline").value.trim(),
      address: document.getElementById("cf2-address").value.trim(),
      phone: document.getElementById("cf2-phone").value.trim(),
      phoneAlt: document.getElementById("cf2-phoneAlt").value.trim(),
      whatsappNumber: document.getElementById("cf2-whatsapp").value.trim().replace(/[^0-9]/g, ""),
      email: document.getElementById("cf2-email").value.trim(),
      founder: document.getElementById("cf2-founder").value.trim(),
      radio: document.getElementById("cf2-radio").value.trim(),
    };
    const ok = await persist({ company: next });
    if (!ok) return;
    COMPANY = next;
    showToast("Company details saved");
  });

  const heroSlidesWrap = document.getElementById("heroSlidesWrap");
  let heroImageData = {};

  function renderHeroSlides() {
    heroSlidesWrap.innerHTML = HERO_SLIDES.map(
      (s, i) => `
      <div class="admin-form-card">
        <h3>Hero slide ${i + 1}</h3>
        <div class="form-grid">
          <div class="field"><label for="hs-eyebrow-${i}">Eyebrow label</label><input type="text" id="hs-eyebrow-${i}" value="${escapeAttr(s.eyebrow)}"></div>
          <div class="field"><label for="hs-heading-${i}">Heading (use &lt;em&gt;word&lt;/em&gt; for italic emphasis)</label><input type="text" id="hs-heading-${i}" value="${escapeAttr(s.heading)}"></div>
          <div class="field full"><label for="hs-body-${i}">Supporting text</label><input type="text" id="hs-body-${i}" value="${escapeAttr(s.body)}"></div>
          <div class="field"><label for="hs-primaryLabel-${i}">Primary button label</label><input type="text" id="hs-primaryLabel-${i}" value="${escapeAttr(s.primaryLabel)}"></div>
          <div class="field"><label for="hs-primaryHref-${i}">Primary button link</label><input type="text" id="hs-primaryHref-${i}" value="${escapeAttr(s.primaryHref)}"></div>
          <div class="field"><label for="hs-secondaryLabel-${i}">Secondary button label</label><input type="text" id="hs-secondaryLabel-${i}" value="${escapeAttr(s.secondaryLabel)}"></div>
          <div class="field"><label for="hs-secondaryHref-${i}">Secondary button link</label><input type="text" id="hs-secondaryHref-${i}" value="${escapeAttr(s.secondaryHref)}"></div>
          <div class="field full">
            <label>Background photo</label>
            <div class="upload-box">
              <img class="preview" id="hs-preview-${i}" src="${s.image}" alt="">
              <input type="file" accept="image/*" data-hero-image="${i}">
            </div>
          </div>
        </div>
        <button type="button" class="btn btn-primary" data-save-hero="${i}" style="margin-top:18px;">Save slide ${i + 1}</button>
      </div>`
    ).join("");

    heroSlidesWrap.querySelectorAll("[data-hero-image]").forEach((input) => {
      input.addEventListener("change", async (e) => {
        const i = Number(input.dataset.heroImage);
        const file = e.target.files[0];
        if (!file) return;
        const localPreview = await readFileAsDataUri(file);
        document.getElementById(`hs-preview-${i}`).src = localPreview;
        try {
          heroImageData[i] = await GPCStore.uploadImage(file);
        } catch (err) {
          showToast(err.message || "Image upload failed — try a different file.");
        }
      });
    });

    heroSlidesWrap.querySelectorAll("[data-save-hero]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const i = Number(btn.dataset.saveHero);
        const next = HERO_SLIDES.slice();
        next[i] = {
          eyebrow: document.getElementById(`hs-eyebrow-${i}`).value,
          heading: document.getElementById(`hs-heading-${i}`).value,
          body: document.getElementById(`hs-body-${i}`).value,
          primaryLabel: document.getElementById(`hs-primaryLabel-${i}`).value,
          primaryHref: document.getElementById(`hs-primaryHref-${i}`).value,
          secondaryLabel: document.getElementById(`hs-secondaryLabel-${i}`).value,
          secondaryHref: document.getElementById(`hs-secondaryHref-${i}`).value,
          image: heroImageData[i] || HERO_SLIDES[i].image,
        };
        const ok = await persist({ heroSlides: next });
        if (!ok) return;
        HERO_SLIDES = next;
        showToast(`Hero slide ${i + 1} saved`);
      });
    });
  }

  function escapeAttr(str) {
    return String(str || "").replace(/"/g, "&quot;");
  }

  /* =====================================================================
     AWARDS CRUD
     ===================================================================== */
  const awardFormCard = document.getElementById("awardFormCard");
  const awardForm = document.getElementById("awardForm");

  function renderAwardsTable() {
    const tbody = document.getElementById("awardsTableBody");
    tbody.innerHTML = AWARDS.map(
      (a, idx) => `
      <tr>
        <td><b>${a.year}</b></td>
        <td>${a.title}</td>
        <td>${a.detail}</td>
        <td>
          <div class="admin-row-actions">
            <button type="button" class="btn btn-outline btn-sm" data-edit-award="${idx}">Edit</button>
            <button type="button" class="btn btn-outline btn-sm" style="border-color:#C0392B;color:#C0392B;" data-delete-award="${idx}">Delete</button>
          </div>
        </td>
      </tr>`
    ).join("");

    tbody.querySelectorAll("[data-edit-award]").forEach((btn) =>
      btn.addEventListener("click", () => openAwardForm(Number(btn.dataset.editAward)))
    );
    tbody.querySelectorAll("[data-delete-award]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this recognition entry?")) return;
        const next = AWARDS.slice();
        next.splice(Number(btn.dataset.deleteAward), 1);
        const ok = await persist({ awards: next });
        if (!ok) return;
        AWARDS = next;
        renderAwardsTable();
        renderDashboard();
        showToast("Recognition entry deleted");
      })
    );
  }

  function openAwardForm(index) {
    awardFormCard.style.display = "block";
    awardFormCard.scrollIntoView({ behavior: "smooth", block: "start" });
    const award = index > -1 ? AWARDS[index] : null;
    document.getElementById("awardFormTitle").textContent = award ? "Edit recognition" : "Add recognition";
    document.getElementById("af-index").value = index;
    document.getElementById("af-year").value = award?.year || "";
    document.getElementById("af-title").value = award?.title || "";
    document.getElementById("af-detail").value = award?.detail || "";
  }

  document.getElementById("newAwardBtn").addEventListener("click", () => openAwardForm(-1));
  document.getElementById("cancelAwardForm").addEventListener("click", () => {
    awardFormCard.style.display = "none";
    awardForm.reset();
  });

  awardForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const index = Number(document.getElementById("af-index").value);
    const entry = {
      year: document.getElementById("af-year").value.trim(),
      title: document.getElementById("af-title").value.trim(),
      detail: document.getElementById("af-detail").value.trim(),
    };
    const next = AWARDS.slice();
    if (index > -1) next[index] = entry;
    else next.push(entry);
    const ok = await persist({ awards: next });
    if (!ok) return;
    AWARDS = next;
    renderAwardsTable();
    renderDashboard();
    awardFormCard.style.display = "none";
    awardForm.reset();
    showToast(index > -1 ? "Recognition updated" : "Recognition added");
  });

  /* =====================================================================
     IMPORT / EXPORT / RESET
     ===================================================================== */
  function downloadJSON() {
    const data = GPCStore.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `global-paints-content-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  document.getElementById("exportBtn").addEventListener("click", downloadJSON);
  document.getElementById("topExportBtn").addEventListener("click", downloadJSON);

  document.getElementById("importInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch (err) {
      alert("That file couldn't be read as valid site content JSON.");
      return;
    }
    try {
      if (data.company) await GPCStore.saveSection("company", data.company);
      if (data.heroSlides) await GPCStore.saveSection("hero-slides", data.heroSlides);
      if (data.awards) await GPCStore.saveSection("awards", data.awards);
      if (data.products) await GPCStore.saveSection("products", data.products);
      if (data.projects) await GPCStore.saveSection("projects", data.projects);
      GPCStore.applyContent(data);
      renderAll();
      showToast("Content imported and published to the live site");
    } catch (err) {
      showToast(err.message || "Import failed partway through — please check the file and try again.");
    }
  });

  document.getElementById("resetBtn").addEventListener("click", async () => {
    if (!confirm("This restores the original seed content on the live server for everyone. Continue?")) return;
    try {
      await GPCStore.resetAll();
      location.reload();
    } catch (err) {
      showToast(err.message || "Reset failed — please try again.");
    }
  });

  /* =====================================================================
     INIT
     ===================================================================== */
  function renderAll() {
    renderDashboard();
    renderProductsTable();
    renderProjectsTable();
    renderCompanyForm();
    renderHeroSlides();
    renderAwardsTable();
  }
})();
