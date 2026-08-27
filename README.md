# Global Paints & Coatings — Website on Vercel

This is the Vercel-native version of the site: the same frontend as before,
but the backend is rebuilt to fit how Vercel actually works — serverless
functions instead of a persistent server, Upstash Redis instead of a local
`content.json` file, and Vercel Blob instead of a local `uploads/` folder.

If you're coming from the Express/`gpc-backend` version: functionally this
is identical (same admin panel, same API shape, same site) — only the
storage plumbing changed, because Vercel Functions have no persistent disk
to write to.

## Requirements
- A Vercel account (free tier is enough to start)
- Node.js 18+ and the Vercel CLI (`npm i -g vercel`) for local development
- A GitHub account (Vercel deploys by connecting a repo)

## 1. Push this project to GitHub
```bash
cd gpc-vercel
git init
git add .
git commit -m "Initial commit"
```
Create an empty repo on GitHub, then:
```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

## 2. Import the project into Vercel
1. Go to vercel.com/new and import the GitHub repo you just pushed.
2. Vercel will auto-detect it as a plain static project with `/api`
   functions — no build command or framework preset needed. Click **Deploy**.
   (The first deploy will succeed but the site won't fully work yet —
   the admin panel needs the two storage connections below first.)

## 3. Connect storage (this is the part that makes it "real")

**Redis (content storage) — Upstash, via Vercel's Storage Marketplace:**
1. In your Vercel project, go to the **Storage** tab → **Create Database**
   → choose **Upstash** → **Redis** (or **KV**, same thing, different
   branding depending on when you're reading this).
2. Connect it to this project. Vercel automatically adds the connection
   details to your project's environment variables — you don't type these
   in yourself. Depending on when you're reading this, they may show up
   named `KV_REST_API_URL` / `KV_REST_API_TOKEN` (the current naming, a
   holdover from the old "Vercel KV" product) or
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — this project's
   code checks for both, so either is fine.

**Blob storage (product/project photo uploads):**
1. Still in the **Storage** tab → **Create Database** → **Blob**.
2. Connect it to this project. This adds `BLOB_READ_WRITE_TOKEN`
   automatically, same as above.

## 4. Set the two variables only you know
In **Project Settings → Environment Variables**, add:
- `ADMIN_PASSWORD` — your real admin panel password
- `JWT_SECRET` — a long random string. Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

Then trigger a redeploy (Deployments tab → ⋯ → Redeploy) so the new
environment variables take effect.

## 5. Seed the content
The first time `GET /api/content` runs and finds nothing in Redis yet, it
falls back to the values in `data/content.seed.json` (your real product,
project, and company data) — so the site works immediately, showing the
seed content, even before an admin edits anything. The first admin *save*
is what actually writes into Redis; from then on Redis is the source of
truth for that section, live for every visitor.

## Local development
```bash
npm install
vercel link              # connect this folder to your Vercel project
vercel env pull .env.local   # fetches ADMIN_PASSWORD, JWT_SECRET, and the
                              # storage connection strings you set up above
vercel dev                # emulates the /api functions + static site locally
```
Then open http://localhost:3000 and http://localhost:3000/admin.html.

## Using the admin panel
Same as the Express version: log in at `/admin.html`, edit products,
projects, hero slides, company details, or recognition — changes save to
Redis and are live for every visitor immediately (no per-browser
limitation, unlike the original static-only build). Export/Import and
Reset work the same way too.

## Vercel-specific things worth knowing

- **Photo upload size limit: 3MB per image.** Vercel serverless functions
  have a request body size limit (~4.5MB at time of writing — check
  Vercel's current docs if you hit a `413` error, since platform limits do
  change). Uploads are sent as base64, which inflates file size by ~33%,
  so the app rejects raw files over 3MB to stay safely under that ceiling.
  If you need to upload a larger photo, resize/compress it first.
- **Cold starts.** Functions that haven't been hit in a while take a
  moment to "wake up" on the next request (usually well under a second,
  occasionally a bit more). This is normal for serverless and not a bug.
- **Login rate limiting** is IP-based and stored in the same Redis
  database (20 attempts per 15 minutes) — this is necessary because,
  unlike a traditional server, serverless functions don't share memory
  between requests, so an in-memory rate limiter wouldn't actually work
  here.
- **No `vercel.json` needed.** The project structure (static files at the
  root, `/api/*.js` as functions) is exactly what Vercel expects
  zero-config, so there's deliberately no build/rewrite configuration to
  maintain.

## Security notes (same as before, still worth reading)
- This is a lightweight admin system for **one trusted editor**, not a
  multi-user CMS with roles or permissions. Anyone with the password has
  full edit access.
- Vercel serves everything over HTTPS by default, so the login password
  and session token are always encrypted in transit — no extra setup
  needed there (unlike a self-managed VPS).
- Back up your content periodically using the admin panel's
  Import/Export tab.
- If you ever suspect the admin password has leaked, change
  `ADMIN_PASSWORD` and `JWT_SECRET` in Vercel's environment variables and
  redeploy — that immediately invalidates all existing sessions.

## Project structure
```
gpc-vercel/
├── api/                    # each file = one serverless function
│   ├── content.js            # GET  /api/content        (public)
│   ├── login.js               # POST /api/login          (public, rate-limited)
│   ├── company.js             # PUT  /api/company         (admin)
│   ├── hero-slides.js         # PUT  /api/hero-slides     (admin)
│   ├── awards.js              # PUT  /api/awards          (admin)
│   ├── products.js            # PUT  /api/products        (admin)
│   ├── projects.js            # PUT  /api/projects        (admin)
│   ├── upload.js              # POST /api/upload          (admin, → Vercel Blob)
│   └── reset.js               # POST /api/reset           (admin)
├── lib/
│   ├── auth.js               # password check + JWT sign/verify
│   ├── store.js               # Redis-backed content get/save/reset
│   └── sectionHandler.js      # shared logic behind the 5 PUT routes above
├── data/
│   └── content.seed.json      # original content — always ships with the code
├── package.json
├── .env.local.example
├── index.html, products.html, ... , admin.html   # the site itself
├── css/
├── js/
│   ├── data.js                # fallback defaults if the API is unreachable
│   ├── store.js                # fetches live content, handles admin auth + saves
│   ├── admin.js                # admin panel logic (unchanged from Express version)
│   └── ...
└── assets/
```
