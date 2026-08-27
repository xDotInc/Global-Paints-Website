/* ==========================================================================
   Global Paints & Coatings — Shared site behaviour
   Header, mobile nav, floating WhatsApp chat, and the quote cart.
   No backend: the cart and contact form both hand off to WhatsApp / email
   with a ready-made message — they never claim to "send" on their own.
   ========================================================================== */

(function () {
  "use strict";

  /* ---------------- Header scroll state ---------------- */
  const header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------- Hero offset correction ----------------
     The hero pulls itself up under the transparent sticky header using a
     negative margin-top equal to the header's own height — that's what
     lets the header float transparently over the top of the hero image
     while leaving the (non-sticky) announcement bar above it undisturbed.
     A hardcoded pixel guess for the header's height is fragile (it
     depends on exact font metrics, which can shift once web fonts finish
     loading), so we measure the real rendered height instead. */
  const heroEl = document.querySelector(".hero");
  function fixHeroOffset() {
    if (!heroEl || !header) return;
    if (header.classList.contains("is-scrolled")) return; // only correct against the true unscrolled height
    heroEl.style.marginTop = `-${header.offsetHeight}px`;
  }
  if (heroEl) {
    fixHeroOffset();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fixHeroOffset);
    window.addEventListener("resize", fixHeroOffset);
  }

  /* ---------------- Footer year ---------------- */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  /* ---------------- Mobile nav with focus trap ---------------- */
  const mobileNav = document.querySelector(".mobile-nav");
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileNavClose = document.querySelector(".mobile-nav-close");
  const mobileNavBackdrop = document.querySelector(".mobile-nav-backdrop");
  let lastFocused = null;

  function trapFocus(container, e) {
    const focusables = container.querySelectorAll('a, button, input, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.key !== "Tab") return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openMobileNav() {
    if (!mobileNav) return;
    lastFocused = document.activeElement;
    mobileNav.setAttribute("data-open", "true");
    document.body.style.overflow = "hidden";
    menuToggle.setAttribute("aria-expanded", "true");
    const panel = mobileNav.querySelector(".mobile-nav-panel");
    panel.querySelector("a, button")?.focus();
    document.addEventListener("keydown", handleMobileNavKeydown);
  }
  function closeMobileNav() {
    if (!mobileNav) return;
    mobileNav.removeAttribute("data-open");
    document.body.style.overflow = "";
    menuToggle?.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", handleMobileNavKeydown);
    lastFocused?.focus();
  }
  function handleMobileNavKeydown(e) {
    if (e.key === "Escape") closeMobileNav();
    trapFocus(mobileNav.querySelector(".mobile-nav-panel"), e);
  }
  menuToggle?.addEventListener("click", openMobileNav);
  mobileNavClose?.addEventListener("click", closeMobileNav);
  mobileNavBackdrop?.addEventListener("click", closeMobileNav);
  mobileNav?.querySelectorAll(".mobile-nav-links a").forEach((a) => a.addEventListener("click", closeMobileNav));

  /* ---------------- Reveal on scroll ---------------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* =====================================================================
     QUOTE CART
     Persisted in localStorage so it survives navigation between pages.
     "Send Quote via WhatsApp" opens WhatsApp with the message pre-filled —
     the visitor still presses send themselves inside WhatsApp.
     ===================================================================== */
  const CART_KEY = "gpc_quote_cart_v1";

  function readCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function writeCart(items) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch (e) { /* storage unavailable — cart still works for this page view */ }
    renderCartCounts();
    renderCartDrawer();
  }

  function addToCart(item) {
    const items = readCart();
    const existing = items.find((i) => i.slug === item.slug && i.size === item.size);
    if (existing) {
      existing.qty += item.qty || 1;
      if (item.price != null) existing.price = item.price;
    } else {
      items.push({
        slug: item.slug,
        name: item.name,
        size: item.size || null,
        qty: item.qty || 1,
        price: item.price != null ? item.price : null,
        note: item.note || null,
      });
    }
    writeCart(items);
    openCartDrawer();
  }
  window.GPCCart = { add: addToCart, read: readCart };

  function updateQty(index, delta) {
    const items = readCart();
    if (!items[index]) return;
    items[index].qty = Math.max(1, items[index].qty + delta);
    writeCart(items);
  }
  function removeItem(index) {
    const items = readCart();
    items.splice(index, 1);
    writeCart(items);
  }

  function renderCartCounts() {
    const count = readCart().reduce((sum, i) => sum + i.qty, 0);
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = String(count);
      el.hidden = count === 0;
    });
  }

  function cartTotal(items) {
    return items.reduce((sum, i) => sum + (i.price != null ? i.price * i.qty : 0), 0);
  }
  function hasUnpriced(items) {
    return items.some((i) => i.price == null);
  }

  const cartDrawer = document.querySelector(".cart-drawer");
  const cartItemsEl = document.querySelector(".cart-items");
  const cartBackdrop = cartDrawer?.querySelector(".cart-backdrop");
  const cartTotalEl = document.querySelector(".cart-total");

  function renderCartDrawer() {
    if (!cartItemsEl) return;
    const items = readCart();
    if (!items.length) {
      cartItemsEl.innerHTML = `
        <div class="cart-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 5 3H2"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>
          <p>Your cart is empty. Browse products or use the paint calculator to add items.</p>
          <a class="btn btn-outline btn-sm" href="products.html">Browse products</a>
        </div>`;
      if (cartTotalEl) cartTotalEl.innerHTML = "";
      return;
    }
    cartItemsEl.innerHTML = items
      .map((item, idx) => {
        const lineTotal = item.price != null ? `$${(item.price * item.qty).toFixed(2)}` : "Price on request";
        const unitPrice = item.price != null ? `$${item.price} each` : "";
        const metaBits = [item.size, unitPrice, item.note].filter(Boolean).map(escapeHtml).join(" · ");
        return `
      <div class="cart-item">
        <div style="flex:1">
          <div class="ci-name">${escapeHtml(item.name)}</div>
          <div class="ci-meta">${metaBits || "Price on request"}</div>
          <div class="ci-qty">
            <button type="button" aria-label="Decrease quantity" data-qty-down="${idx}">−</button>
            <span>${item.qty}</span>
            <button type="button" aria-label="Increase quantity" data-qty-up="${idx}">+</button>
            <span class="ci-line-total">${lineTotal}</span>
          </div>
        </div>
        <button type="button" class="ci-remove" data-remove="${idx}">Remove</button>
      </div>`;
      })
      .join("");

    if (cartTotalEl) {
      const total = cartTotal(items);
      const unpriced = hasUnpriced(items);
      cartTotalEl.innerHTML = `
        <div class="cart-total-row"><span>Estimated total</span><b>$${total.toFixed(2)}</b></div>
        ${unpriced ? `<p class="muted" style="font-size:.78rem; margin:4px 0 0;">Some items are priced on request and aren't included in this total.</p>` : ""}`;
    }

    cartItemsEl.querySelectorAll("[data-qty-up]").forEach((btn) =>
      btn.addEventListener("click", () => updateQty(Number(btn.dataset.qtyUp), 1))
    );
    cartItemsEl.querySelectorAll("[data-qty-down]").forEach((btn) =>
      btn.addEventListener("click", () => updateQty(Number(btn.dataset.qtyDown), -1))
    );
    cartItemsEl.querySelectorAll("[data-remove]").forEach((btn) =>
      btn.addEventListener("click", () => removeItem(Number(btn.dataset.remove)))
    );
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function openCartDrawer() {
    cartDrawer?.setAttribute("data-open", "true");
    document.body.style.overflow = "hidden";
  }
  function closeCartDrawer() {
    cartDrawer?.removeAttribute("data-open");
    document.body.style.overflow = "";
  }
  document.querySelectorAll("[data-open-cart]").forEach((btn) => btn.addEventListener("click", openCartDrawer));
  document.querySelector(".cart-close")?.addEventListener("click", closeCartDrawer);
  cartBackdrop?.addEventListener("click", closeCartDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCartDrawer();
  });

  function buildQuoteMessage() {
    const items = readCart();
    const name = document.getElementById("cartName")?.value.trim();
    const phone = document.getElementById("cartPhone")?.value.trim();
    let msg = `Hello Global Paints & Coatings, I would like to place an order for the following:\n`;
    items.forEach((item) => {
      const lineTotal = item.price != null ? ` — $${(item.price * item.qty).toFixed(2)}` : item.note ? ` — ${item.note}` : "";
      msg += `• ${item.name}${item.size ? ` (${item.size})` : ""} x${item.qty}${lineTotal}\n`;
    });
    const total = cartTotal(items);
    if (total > 0) {
      msg += `\nEstimated total: $${total.toFixed(2)}`;
      if (hasUnpriced(items)) msg += ` (excludes items priced on request)`;
    }
    if (name) msg += `\nName: ${name}`;
    if (phone) msg += `\nContact number: ${phone}`;
    msg += `\n\nSent from the Global Paints & Coatings website.`;
    return msg;
  }

  document.querySelector("[data-send-quote]")?.addEventListener("click", () => {
    const items = readCart();
    if (!items.length) return;
    window.open(waLink(buildQuoteMessage()), "_blank", "noopener");
  });

  renderCartCounts();
  renderCartDrawer();

  /* =====================================================================
     FLOATING WHATSAPP CHAT
     Presented plainly as a way to start a WhatsApp conversation — not a
     live in-page chat agent — so nothing here implies a reply is generated
     by the website itself.
     ===================================================================== */
  const chatToggle = document.querySelector("[data-chat-toggle]");
  const chatPopover = document.querySelector(".chat-popover");
  const chatBackdropClose = document.querySelector("[data-chat-close]");

  function toggleChat(open) {
    if (!chatPopover) return;
    const isOpen = chatPopover.getAttribute("data-open") === "true";
    const next = open !== undefined ? open : !isOpen;
    if (next) {
      chatPopover.setAttribute("data-open", "true");
      chatToggle?.setAttribute("aria-expanded", "true");
      chatPopover.querySelector("textarea")?.focus();
    } else {
      chatPopover.removeAttribute("data-open");
      chatToggle?.setAttribute("aria-expanded", "false");
    }
  }
  chatToggle?.addEventListener("click", () => toggleChat());
  chatBackdropClose?.addEventListener("click", () => toggleChat(false));
  document.addEventListener("click", (e) => {
    if (!chatPopover || chatPopover.getAttribute("data-open") !== "true") return;
    if (chatPopover.contains(e.target) || chatToggle?.contains(e.target)) return;
    toggleChat(false);
  });
  document.querySelector("[data-chat-send]")?.addEventListener("click", () => {
    const text = document.getElementById("chatMessage")?.value.trim();
    const message = text && text.length ? text : "Hello Global Paints & Coatings, I'd like some help choosing a product.";
    window.open(waLink(message), "_blank", "noopener");
  });

  /* ---------------- Mark current nav link active ---------------- */
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".main-nav a, .mobile-nav-links a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path || (path === "" && href === "index.html")) a.classList.add("active");
  });
})();
