const { createSectionHandler } = require("../lib/sectionHandler");

module.exports = createSectionHandler("company", (body) =>
  body && typeof body === "object" && !Array.isArray(body) ? null : "Expected a company object."
);
