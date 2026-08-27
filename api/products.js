const { createSectionHandler } = require("../lib/sectionHandler");

module.exports = createSectionHandler("products", (body) =>
  Array.isArray(body) ? null : "Expected an array of products."
);
