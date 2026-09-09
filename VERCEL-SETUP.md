# REAL FEELING MATTRESS · Cloud setup

**Prepared 9 September 2026. Nothing has been purchased or publicly deployed.**

The project is prepared for **Vercel + PostgreSQL (Supabase recommended) + ImgBB + Google customer sign-in**. The running workspace remains a local preview. Your cloud accounts and credentials are still needed; this guide does not mean those services are connected.

## What your customer gets

1. Sign in, including Google once configured.
2. **Contact → Shipping → Review → Submit.** No payment screen and no card collection.
3. A saved reference such as `RFM-20260909-…`, complete details, and **Awaiting confirmation / unpaid** status.
4. A genuine, downloadable **PDF order summary**, with an embedded Hindi-capable font.
5. **“The owner will call you soon.”** / **“दुकान के मालिक जल्द ही आपको कॉल करेंगे।”**
6. **Call the shop**, WhatsApp text sharing to your number or an editable recipient, and an email draft.
7. **Share PDF** through supported device share sheets, or download and manually attach it.

The default shop number is **+91 74053 23892**. No shop email has been invented. If you add a business email in owner settings, email drafts can address it; otherwise the customer chooses the recipient in their email app.

**Sharing is customer-initiated.** WhatsApp and email links do not attach a PDF or automatically send a message. Native PDF sharing depends on the browser/device and installed apps. Very long text orders use a shorter message reminding the customer to attach the PDF. Normal internet/call charges may apply. The app has no WhatsApp Business messaging or SMTP service.

PDFs require the purchasing customer's login or an authorized owner/staff session. There are **no public address/PDF links**. Public order-number + email tracking exposes only a limited status summary, not the delivery address or document. Downloaded/shared files are outside the app's access controls, so customers must choose recipients carefully.

## Costs and “permanent” storage

- **Vercel Hobby is for personal, non-commercial use.** This commercial shop needs an appropriate paid plan. Pro currently starts at **US$20/month**, with possible usage charges and taxes. No plan has been purchased. Review [Vercel's terms](https://vercel.com/docs/plans/hobby) and [pricing](https://vercel.com/pricing) before proceeding.
- Supabase provides the PostgreSQL database separately. Free-tier quotas, inactivity pauses and backup limitations apply; it is not a guaranteed permanent archive. Review [current plans](https://supabase.com/pricing).
- ImgBB provides image hosting separately. Uploads here deliberately omit an expiration parameter, but that is **not a lifetime retention guarantee**. Keep original images elsewhere. [ImgBB API](https://api.imgbb.com/).
- Google sign-in supplies verified identity, **not** database storage, email delivery or hosting.

Orders/images will no longer depend on this sandbox once you configure and deploy the external services. They will still depend on those providers remaining active, available and paid where required. Keep independent backups.

## 1 · Keep the project private

Use **Node.js 22**, run `npm ci`, and keep the project root as the folder containing `package.json`, `vercel.json`, `api/`, `server/` and `src/`.

Create a private Git repository when you are ready. Never upload `.env`, database files, passwords, backups or screenshots containing customer details. `.gitignore` and `.vercelignore` exclude the local database and environment files. Do not put them under `public/`.

The local preview remains available with:

```bash
npm ci
npm run dev
```

Do **not** copy `data/nocte.sqlite` to Vercel. Vercel's function filesystem is not durable. The application refuses to use SQLite when `VERCEL=1`.

## 2 · Create the PostgreSQL database

1. Create your own Supabase project. Choose a region near your customers/functions, preferably Mumbai for this shop if available.
2. Save its database password privately. Open the project's **Connect** panel.
3. For Vercel runtime, use the **Supavisor transaction-pooler PostgreSQL connection string**, commonly port `6543`. Copy the host/user from your own project; do not guess them.
4. URL-encode special characters in the password. This is a PostgreSQL URL, **not** the Supabase project HTTPS URL, anon key, or service-role API key.
5. For provisioning/migrations, prefer the direct PostgreSQL connection or the **session pooler**, commonly port `5432`. Use the connection the Connect panel recommends for your network.

Remote TLS certificate verification is enabled. If your provider requires its own certificate chain, configure `PG_CA_CERT` with that PEM chain. Do not bypass TLS verification.

The adapter uses async queries, a small connection pool, transaction-scoped connections, PostgreSQL-safe integer/timestamp handling, and serializable transactions with bounded retries. It does not use named prepared statements, which avoids the transaction-pooler limitation on session-persistent prepared statements.

### Initialize a clean store explicitly

On a trusted machine, set these **temporary shell environment variables** privately:

- `DATABASE_URL`: provisioning connection
- `OWNER_EMAIL`: your real owner login email
- `OWNER_PASSWORD`: a unique password of at least 14 characters, with uppercase, lowercase and a number

Then run:

```bash
npm run db:setup
```

This creates/migrates tables, creates the owner only if none exists, preserves existing records, and creates unpublished policy drafts. **It does not import the preview's products, customers, orders, reviews or coupons.** Running it again preserves the existing owner; it is not a password-reset command.

The setup enables row-level security on this application's tables and removes access for Supabase's public `anon` and `authenticated` roles. The app uses a server-side PostgreSQL connection; browser clients must never receive it. Use the provisioning/table-owner database login for the documented setup. A separate least-privilege runtime role is recommended for a maintained production installation, but requires deliberate SQL grants and RLS policies—simply changing to an unprivileged role will block requests.

Remove `OWNER_EMAIL` and `OWNER_PASSWORD` from your shell afterward. **They are not required in Vercel.** Do not set `DB_AUTO_SETUP` or `DB_SEED_DEMO` in Vercel. Builds/functions do not run cloud migrations or seed demo accounts.

For future schema changes: back up first, run the explicit setup/migration command against a staging database, test it, then apply it deliberately before deploying compatible code. Do not point development/QA commands at the live database.

## 3 · Configure ImgBB

1. Create/sign in to your own ImgBB account and obtain its API key.
2. Store it as the server-only **`IMGBB_API_KEY`** environment variable.
3. Never use a `VITE_` prefix, put it in browser code, or paste it into owner settings.

In `/owner`:

- **Products → Add/Edit product**: upload a main image and optional gallery images.
- **Settings → Homepage**: upload desktop hero, mobile hero and story banner images.
- Enter the product/headline name before uploading, then **Save changes** to publish.

Names include the corresponding product or banner ID, e.g. `product-cloud-mattress-<product-id>-<suffix>`. New product uploads reserve the actual future product ID; save that draft within 24 hours. ImgBB assigns its own hosted ID and URL. The database retains media metadata and the provider's deletion link privately.

Uploads accept JPEG/PNG/WebP, up to **3 MB and 20 megapixels**. The server validates, resizes and re-encodes them to WebP, stripping metadata. The limit stays below Vercel's request-size ceiling. Compress oversized camera photos first. Cloud uploads fail clearly if the key is missing—there is no silent ephemeral-disk fallback.

Replacing/removing a shop image does **not** delete it from ImgBB. Abandoned uploads can remain hosted; manage them through your provider account. Keep original images and a metadata backup. Avoid uploading personal documents or customer photos to this public product-image workflow.

## 4 · Configure Google customer login

Follow **[GOOGLE-LOGIN-SETUP.md](GOOGLE-LOGIN-SETUP.md)**.

- Create a Google **Web application** OAuth client.
- Configure branding, audience and required privacy/terms links.
- Add exact JavaScript origins, such as `https://your-shop.example` and your stable staging origin. No paths or wildcard deployment domains.
- Put its public client ID in **`GOOGLE_CLIENT_ID`** on the server, then redeploy.
- This Google Identity Services callback flow does **not** use a client secret or a redirect URI.

Google login verifies the token server-side, including audience/issuer/signature, verified email and a single-use session-bound nonce. It cannot create an owner/staff role. Existing password accounts are linked only after explicit password confirmation; matching email alone does not auto-link them.

Test on the standalone HTTPS site, not solely inside an embedded preview. No live Google sign-in has been performed during preparation because your client ID has not been supplied.

## 5 · Vercel project settings — when you authorize deployment

Creating/deploying a commercial project may incur charges. **These are future instructions, not actions already taken.**

Import the private repository into the appropriate Vercel team/plan:

| Setting | Value |
|---|---|
| Root Directory | Folder containing this project's `package.json` |
| Framework | Vite |
| Node.js | 22.x |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Function entry | `api/index.js` → `server/app.js` |
| Function region | Choose near the PostgreSQL region |

Commit the supplied `vercel.json`. It routes API requests to the Express function, serves built assets through Vercel, supports SPA deep links, includes the PDF font, and configures security headers and private API caching. Do not deploy the entire source folder as public static content.

### Runtime environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Server-only PostgreSQL transaction-pooler URL |
| `IMGBB_API_KEY` | Server-only image upload key |
| `GOOGLE_CLIENT_ID` | Your Google Web application client ID |
| `SITE_URL` | Exact canonical HTTPS origin, e.g. `https://your-shop.example`; no path |
| `CHECKOUT_MODE` | Start with `preview`; use `cod` only for reviewed, real callback orders |
| `CRON_SECRET` | Random secret, at least 32 characters, for maintenance |
| `PG_CA_CERT` | Optional provider-required PEM certificate chain |

Generate a cron secret locally, for example:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Vercel supplies `VERCEL` and production runtime context. Do not expose credentials to the frontend. Keep staging and production databases/keys separate; **never point disposable preview deployments at the live database**. Use Vercel deployment protection for staging.

The scheduled `/api/maintenance` request prunes expired sessions, nonces, rate-limit counters and product reservations. It runs daily at **02:17 UTC / 07:47 IST** using Vercel's `CRON_SECRET` bearer header. Expiry is also enforced on reads, so delayed cleanup does not extend sessions. Check cron logs after deployment.

## 6 · Owner launch checklist

In `/owner`:

- Add actual categories, products, prices, stock and images. Production starts empty on purpose.
- Review every product benefit/specification, policy, shipping statement and warranty claim. Preview assets/content are not evidence of real commercial guarantees.
- Publish actual privacy, terms, shipping, returns, refunds and relevant warranty/about content. Initial drafts are unpublished.
- Set actual delivery coverage/charges and tax treatment. Clean defaults are **0 tax / 0 shipping fee**, not a tax or free-delivery recommendation. Product prices are treated as tax-inclusive; shipping tax is not separately modelled. Confirm the correct treatment for your business before accepting orders.
- Confirm contact details; add business email/hours only if you want them displayed.
- Under **Settings → Commerce**, confirm that the launch checklist has been reviewed.
- Set `CHECKOUT_MODE=cod` and redeploy only when you intend to accept real order requests. `cod` is the code's name for the owner-confirmed/offline-payment flow; it is not an online payment processor or a guarantee of a particular payment arrangement.

Real order submission needs **both** the environment flag and the owner's saved launch confirmation. Preview submissions are explicitly labelled and do not arrange an actual callback.

Run the readiness checker with your intended runtime configuration:

```bash
npm run cloud:check
```

It checks configuration and database readiness without printing secrets. It does not prove a live Google/ImgBB connection or certify legal compliance.

## 7 · Verify before accepting real customers

- Open `/`, a product deep link, `/account` and `/owner` directly and after refresh.
- Confirm no server source, `.env`, SQLite files or private backups can be fetched.
- Try a real Google sign-in, logout and return; verify name/photo and customer-only permissions.
- Upload a real product/banner to ImgBB; save, reload and verify its HTTPS image on mobile and desktop.
- Submit a small test order; check owner/customer visibility, one stock deduction, PDF content and Hindi rendering.
- Retry the same interrupted submission: one order, not two. Double-cancel a test order: inventory restored once.
- Try the PDF as another customer and as a guest: access denied.
- Test actual call, WhatsApp and email handoffs on your Android/iPhone. Confirm recipient selection and manual PDF attachment where needed. A successful app handoff is not proof that a message was delivered.
- Check logs, database limits, cron execution, budget alerts and backup/restore procedures.

### Preparation QA already performed

See **[CLOUD-QA.md](CLOUD-QA.md)** for the exact tested scope and exclusions. Local PostgreSQL and simulated Node 22 function tests are not a public Vercel deployment test.

## Ongoing operation and backups

Daily product, stock, order, content and store-setting operations remain in `/owner`. Provider accounts are still needed for billing, initial secrets, domain/Google configuration, backups and infrastructure maintenance.

- Protect owner, Vercel, Supabase, Google and ImgBB accounts; enable provider-account MFA.
- Maintain encrypted, offsite PostgreSQL backups and image originals. Test restoration to a **separate** database. Never restore over the live store as a test.
- Supabase Free is not an automatic-backup plan. Choose a backup process suitable for customer orders, and monitor inactivity/quotas. A Vercel redeploy or Git backup is **not** an order-data backup.
- Password-reset email, automated transactional email/WhatsApp, online payments, offline-payment reconciliation, real refunds, invoices/GST documents and carrier tracking integrations are **not connected**. No money is moved by the app. Owner/staff must handle actual payment/refund arrangements outside this system.
- Inventory remains one stock pool per product across its variants. If you stock sizes/firmnesses independently, a per-variant inventory model is required before selling that way.
- Clear stale/abandoned test orders and reservations intentionally; do not use a reset/demo-seeding command on production.

**Never paste database passwords or secret API keys into a public chat or repository.** Enter them directly in the provider's server environment settings when you are ready.
