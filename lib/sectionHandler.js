const { verifyToken } = require("./auth");
const { saveSection } = require("./store");

/* Creates a handler for `PUT /api/<section>` that requires a valid admin
   session token, validates the request body shape, and persists it. */
function createSectionHandler(sectionKey, validate) {
  return async (req, res) => {
    if (req.method !== "PUT") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    if (!verifyToken(req)) {
      res.status(401).json({ error: "Session expired or invalid. Please log in again." });
      return;
    }
    const body = req.body;
    const validationError = validate ? validate(body) : null;
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }
    try {
      await saveSection(sectionKey, body);
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Could not save changes. Please try again." });
    }
  };
}

module.exports = { createSectionHandler };
