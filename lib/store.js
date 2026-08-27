/* Content store — Upstash Redis (via Vercel's Storage Marketplace) instead
   of a local JSON file. Serverless functions have no persistent disk, so
   every "save" from the admin panel needs to land somewhere external;
   Redis is a natural fit for this app's shape (a handful of named JSON
   blobs: company, awards, heroSlides, products, projects).

   The actual connection is handled by lib/redisClient.js, which reads
   whichever environment variable names Vercel's Upstash integration
   injects — no manual copy-pasting of connection strings needed. */

const { getRedis } = require("./redisClient");
const fs = require("fs");
const path = require("path");

const SECTIONS = ["company", "awards", "heroSlides", "products", "projects"];
const KEY_PREFIX = "gpc:content:";

let cachedSeed = null;
function loadSeed() {
  if (!cachedSeed) {
    const seedPath = path.join(process.cwd(), "data", "content.seed.json");
    cachedSeed = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  }
  return cachedSeed;
}

// Stored as JSON strings explicitly (rather than relying on the client's
// own auto-serialization) so behaviour is predictable across client
// library versions.
async function getContent() {
  const redis = getRedis();
  const seed = loadSeed();
  const result = {};
  await Promise.all(
    SECTIONS.map(async (key) => {
      const raw = await redis.get(KEY_PREFIX + key);
      if (raw == null) {
        result[key] = seed[key];
      } else {
        result[key] = typeof raw === "string" ? JSON.parse(raw) : raw;
      }
    })
  );
  return result;
}

async function saveSection(key, value) {
  if (!SECTIONS.includes(key)) throw new Error(`Unknown content section: ${key}`);
  const redis = getRedis();
  await redis.set(KEY_PREFIX + key, JSON.stringify(value));
}

async function resetContent() {
  const redis = getRedis();
  const seed = loadSeed();
  await Promise.all(SECTIONS.map((key) => redis.set(KEY_PREFIX + key, JSON.stringify(seed[key]))));
  return seed;
}

module.exports = { getContent, saveSection, resetContent, SECTIONS };
