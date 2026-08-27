const { getContent } = require("../lib/store");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const content = await getContent();
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(content);
  } catch (e) {
    res.status(500).json({ error: "Could not load content." });
  }
};
