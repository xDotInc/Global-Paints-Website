const { verifyToken } = require("../lib/auth");
const { resetContent } = require("../lib/store");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!verifyToken(req)) {
    res.status(401).json({ error: "Session expired or invalid. Please log in again." });
    return;
  }
  try {
    const content = await resetContent();
    res.status(200).json({ ok: true, content });
  } catch (e) {
    res.status(500).json({ error: "Reset failed. Please try again." });
  }
};
