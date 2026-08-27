const { createSectionHandler } = require("../lib/sectionHandler");

module.exports = createSectionHandler("projects", (body) =>
  Array.isArray(body) ? null : "Expected an array of projects."
);
