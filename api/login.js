const { getRedis } = require("../lib/redisClient");
const { checkPassword, signToken } = require("../lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Simple per-IP rate limit (20 attempts / 15 min). Serverless functions
  // have no shared memory between invocations, so this counter lives in
  // the same Redis store used for content — the standard pattern for
  // rate-limiting on serverless platforms.
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const rlKey = `gpc:loginrl:${ip}`;
  try {
    const redis = getRedis();
    const attempts = await redis.incr(rlKey);
    if (attempts === 1) await redis.expire(rlKey, 15 * 60);
    if (attempts > 20) {
      res.status(429).json({ error: "Too many login attempts. Please try again in 15 minutes." });
      return;
    }
  } catch (e) {
    // If the rate-limit check itself fails (including Redis not being
    // configured yet), don't block legitimate logins over it.
  }

  const { password } = req.body || {};
  if (!checkPassword(password)) {
    res.status(401).json({ error: "Incorrect password." });
    return;
  }
  try {
    const token = signToken();
    res.status(200).json({ token, expiresIn: "12h" });
  } catch (e) {
    res.status(500).json({ error: "Server is not configured correctly (missing JWT_SECRET)." });
  }
};
