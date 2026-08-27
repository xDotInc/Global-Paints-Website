const { createSectionHandler } = require("../lib/sectionHandler");

module.exports = createSectionHandler("heroSlides", (body) =>
  Array.isArray(body) ? null : "Expected an array of hero slides."
);
