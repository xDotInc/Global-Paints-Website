const { put } = require("@vercel/blob");
const crypto = require("crypto");
const { verifyToken } = require("../lib/auth");

// Vercel serverless functions have a request body size limit (roughly
// 4.5MB on Hobby/Pro at time of writing — check Vercel's current docs if
// you hit a 413 error, as platform limits can change). Base64 inflates a
// file by ~33%, so we cap the *raw* file size well under that ceiling.
const MAX_RAW_BYTES = 3 * 1024 * 1024; // 3MB

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!verifyToken(req)) {
    res.status(401).json({ error: "Session expired or invalid. Please log in again." });
    return;
  }

  const { data } = req.body || {};
  if (!data || typeof data !== "string" || !data.startsWith("data:")) {
    res.status(400).json({ error: "No image data received." });
    return;
  }

  const match = data.match(/^data:(image\/(jpeg|png|webp|gif));base64,(.+)$/);
  if (!match) {
    res.status(400).json({ error: "Only JPG, PNG, WEBP, or GIF images are allowed." });
    return;
  }
  const mime = match[1];
  const ext = match[2] === "jpeg" ? "jpg" : match[2];
  const buffer = Buffer.from(match[3], "base64");

  if (buffer.length > MAX_RAW_BYTES) {
    res.status(400).json({ error: "Image is too large — please use a photo under 3MB." });
    return;
  }

  const key = `uploads/${crypto.randomBytes(12).toString("hex")}.${ext}`;
  try {
    const blob = await put(key, buffer, { access: "public", contentType: mime });
    res.status(200).json({ url: blob.url });
  } catch (e) {
    res.status(500).json({ error: "Image upload failed. Please try again." });
  }
};
