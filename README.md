# REAL FEELING MATTRESS

A responsive React storefront and a separate Express-backed owner workspace. Prepared for **Vercel, PostgreSQL, ImgBB and Google customer sign-in**, with a preserved SQLite preview.

**No cloud account has been connected, purchased or publicly deployed.** Start with **[VERCEL-SETUP.md](VERCEL-SETUP.md)**. Google-specific setup: **[GOOGLE-LOGIN-SETUP.md](GOOGLE-LOGIN-SETUP.md)**.

## Run locally

Use Node.js **22.x** and a fresh dependency install for that Node version:

```bash
npm ci
npm run dev
```

Open `/` for the shop and `/owner` for the owner workspace. The server binds `0.0.0.0:3000`; browser APIs use same-origin `/api` paths. Local `.env` is optional; deployment environment variables take precedence.

The local preview creates `data/nocte.sqlite` only if needed and preserves it across restarts. Demo owner: `owner@nocte.demo` / `NocteDemo!2026`. These are deliberately public, local-only demo credentials. Do not copy this database to production. Cloud setup creates your own owner and does not seed fake business records.

## Customer ordering

**Sign in → Contact → Shipping → Review → Submit**

- Saved `RFM-…` order ID and full order details.
- Server-calculated prices, discounts, shipping and included tax. Changed review prices require re-review.
- Awaiting owner confirmation; **unpaid**, with no online payment collection.
- Real, private PDF summary with an embedded Hindi-capable font.
- English/Hindi callback message, direct call, editable WhatsApp recipient and email draft.
- Customer-initiated PDF sharing where supported; manual download/attachment otherwise.
- Authenticated customer retrieval and authorized owner/staff access. Public tracking is redacted.

WhatsApp/email links do not attach files or automatically send messages. A summary is not a tax invoice or payment receipt.

## Owner workspace

`/owner` remains separate from customer navigation and login. Server-side role checks protect management actions.

- Products, variants, galleries, prices, product-shared inventory, categories and orders.
- ImgBB uploads auto-named using product/banner names and IDs; main/gallery images and three homepage banner slots.
- Customer/support records, reviews, coupons, policies, content, staff access, audit logs and settings.
- Google setup status and an explicit launch-readiness checkbox.
- Order-value reporting, not claims of collected revenue. No payment/refund money movement.

Upload constraints: JPEG/PNG/WebP, maximum **3 MB / 20 megapixels**; server validation, resize and WebP re-encoding. Keys stay server-side. Cloud uploads never fall back to ephemeral disk.

## Architecture

| File | Responsibility |
|---|---|
| `src/` | Storefront, owner UI, checkout, private PDF/download/share actions |
| `server/app.js` | Exported Express application, API authentication/RBAC/CSRF and commerce |
| `server/index.js` | Local/standalone listener and Vite/static integration; not the Vercel function |
| `api/index.js` | Vercel Node function entry |
| `server/database.js` | Async SQLite/PostgreSQL adapter, connection-scoped transactions and retries |
| `server/db.js`, `server/schema.js` | Schema, additive local migrations and explicitly gated setup |
| `server/security-store.js` | Shared database-backed rate limits, login lockouts and expiry cleanup |
| `server/media.js` | ImgBB/local-preview image storage, validation and naming |
| `server/order-pdf.js`, `server/fonts/` | PDF generation and licensed embedded Unicode font |
| `server/google-*.js` | Google token validation, single-use nonce and explicit account linking |
| `server/preview-transport.js` | Dev-only protected fallback for restricted embedded previews |
| `scripts/setup-database.mjs` | Explicit PostgreSQL provisioning; no demo data |
| `scripts/cloud-check.mjs` | Configuration/readiness checker |
| `vercel.json` | Static/API routing, security headers, function settings and maintenance cron |

PostgreSQL uses real async queries, BIGINT expiry timestamps, a bounded pool and serializable transactions. Sessions, nonces and rate limits are shared across instances. Local SQLite requests are serialized around transactions to avoid cross-request transaction leakage. Production preview transport is disabled.

## Verification

```bash
npm run build
npm test
npx playwright install --with-deps chromium
npm run test:checkout-ui
```

The backend suites use disposable local databases. The checkout UI suite starts its own isolated test server/database. Do not run QA with a live `DATABASE_URL`. Install OS browser dependencies if your machine needs them.

Additional regression scripts and results are in `qa/`. **[CLOUD-QA.md](CLOUD-QA.md)** records the latest verification, including a real local PostgreSQL server and separate Node 22 function-instance simulations. Google/ImgBB/Vercel have not been tested against your live accounts.

## Production setup

```bash
npm run db:setup     # Explicit PostgreSQL setup with private setup credentials
npm run cloud:check  # Check intended runtime configuration and launch readiness
```

Read the setup guide before running either against a database. `OWNER_EMAIL` and `OWNER_PASSWORD` are one-time provisioning inputs, not Vercel runtime requirements. Never set `DB_SEED_DEMO` or `DB_AUTO_SETUP` in Vercel. Use separate staging and production resources.

Vercel Hobby is non-commercial; this shop needs a suitable paid plan. External storage is durable across redeployments, **not guaranteed permanent without active accounts and backups**.

## Scope and honest limitations

- The local preview still contains sample products, reviews and orders. Cloud provisioning does not copy them; owner must add actual content and review policies/claims.
- No online payment provider, automatic WhatsApp/SMTP delivery, password-reset email, offline-payment ledger, real refund, tax-invoice or carrier integration is connected.
- Google authenticates identity only. Existing accounts are not auto-linked solely by matching email.
- Stock is shared across variants of a product; separate size/firmness inventory needs an expanded model.
- Keep independent PostgreSQL backups and original images. Removing an image from the shop does not delete it from ImgBB.
- No real secrets or local customer databases are included in the clean source archive.
