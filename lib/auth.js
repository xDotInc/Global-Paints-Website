/* Shared auth helpers for Vercel serverless functions.
   No sessions/state kept server-side — a signed JWT is the only "session". */

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Hashed once per cold start, not per request.
const passwordHash = ADMIN_PASSWORD ? bcrypt.hashSync(ADMIN_PASSWORD, 10) : null;

function checkPassword(password) {
  if (!passwordHash) return false; // ADMIN_PASSWORD not configured yet
  return typeof password === "string" && bcrypt.compareSync(password, passwordHash);
}

function signToken() {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured.");
  return jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "12h" });
}

function verifyToken(req) {
  if (!JWT_SECRET) return false;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return false;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.role === "admin";
  } catch (e) {
    return false;
  }
}

module.exports = { checkPassword, signToken, verifyToken };
