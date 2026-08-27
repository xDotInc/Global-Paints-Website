const { createSectionHandler } = require("../lib/sectionHandler");

module.exports = createSectionHandler("awards", (body) =>
  Array.isArray(body) ? null : "Expected an array of awards."
);
