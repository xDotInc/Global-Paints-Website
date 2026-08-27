const { Redis } = require("@upstash/redis");

/* Vercel's Storage Marketplace integration for Upstash currently injects
   KV_REST_API_URL / KV_REST_API_TOKEN (a naming holdover from the old
   first-party "Vercel KV" product). Some setups/older docs instead use
   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN, which is what
   @upstash/redis's own Redis.fromEnv() looks for by default. We check
   both so this works regardless of which your dashboard shows you. */
let client = null;

function getRedis() {
  if (client) return client;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Redis is not configured. Connect an Upstash Redis database to this project in the Vercel dashboard (Storage tab), then redeploy."
    );
  }
  client = new Redis({ url, token });
  return client;
}

module.exports = { getRedis };
