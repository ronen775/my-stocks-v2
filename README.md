## Cloudflare Worker for Symbols (optional)

To enable daily symbol updates without CORS issues, deploy the worker in `workers/symbols-worker.ts` on a free Cloudflare account:

1. Install Wrangler: `npm i -g wrangler`
2. Initialize (one-time): `wrangler login`
3. Create a new Worker (one-time): `wrangler init symbols-worker --type=ts`
4. Replace the generated `src/index.ts` with the contents of `workers/symbols-worker.ts`
5. Deploy: `wrangler deploy`
6. Set in `.env.local` (or system env): `VITE_SYMBOLS_ENDPOINT=https://<your-worker-subdomain>.workers.dev/symbols`

With `VITE_SYMBOLS_ENDPOINT` set, the client will auto-refresh the symbols list daily via the proxy with CORS enabled and edge caching.

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` and set your Firebase VITE_* keys as described in `FIREBASE_SETUP.md`
3. Run the app:
   `npm run dev`
