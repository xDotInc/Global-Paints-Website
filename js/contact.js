(function () {
  "use strict";

  const form = document.getElementById("contactForm");
  if (!form) return;
  const status = document.getElementById("formStatus");

  const fields = {
    name: { el: document.getElementById("cf-name"), required: true },
    phone: { el: document.getElementById("cf-phone"), required: true },
    email: { el: document.getElementById("cf-email"), required: false, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    type: { el: document.getElementById("cf-type"), required: true },
    product: { el: document.getElementById("cf-product"), required: false },
    message: { el: document.getElementById("cf-message"), required: true },
  };

  function validate() {
    let ok = true;
    Object.values(fields).forEach(({ el, required, pattern }) => {
      const wrapper = el.closest(".field");
      const value = el.value.trim();
      let fieldOk = true;
      if (required && !value) fieldOk = false;
      if (pattern && value && !pattern.test(value)) fieldOk = false;
      wrapper.classList.toggle("error", !fieldOk);
      if (!fieldOk) ok = false;
    });
    return ok;
  }

  Object.values(fields).forEach(({ el }) => {
    el.addEventListener("input", () => el.closest(".field").classList.remove("error"));
    el.addEventListener("blur", () => el.setAttribute("data-touched", "true"));
  });

  function buildMessage() {
    return (
      `Hello Global Paints & Coatings,\n\n` +
      `Name: ${fields.name.el.value.trim()}\n` +
      `Phone: ${fields.phone.el.value.trim()}\n` +
      (fields.email.el.value.trim() ? `Email: ${fields.email.el.value.trim()}\n` : "") +
      `Enquiry type: ${fields.type.el.value}\n` +
      (fields.product.el.value.trim() ? `Product/surface: ${fields.product.el.value.trim()}\n` : "") +
      `\nMessage:\n${fields.message.el.value.trim()}\n\n` +
      `Sent from the Global Paints & Coatings website contact form.`
    );
  }

  function showStatus(type, text) {
    status.className = `form-status show ${type}`;
    status.textContent = text;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate()) {
      showStatus("error", "Please fill in the required fields highlighted above before continuing.");
      return;
    }
    showStatus("success", "Your message is ready — continue in WhatsApp to send it to our team.");
    window.open(waLink(buildMessage()), "_blank", "noopener");
  });

  document.getElementById("prepareEmail").addEventListener("click", () => {
    if (!validate()) {
      showStatus("error", "Please fill in the required fields highlighted above before continuing.");
      return;
    }
    showStatus("success", "Your email is ready — continue in your mail app to send it to our team.");
    const subject = encodeURIComponent(`Website enquiry — ${fields.type.el.value || "General enquiry"}`);
    const body = encodeURIComponent(buildMessage());
    window.location.href = `mailto:${COMPANY.email}?subject=${subject}&body=${body}`;
  });
})();
