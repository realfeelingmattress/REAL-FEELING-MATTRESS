# Cloud preparation · Verification record

**9 September 2026 — preparation only; no provider accounts connected and no public deployment.**

## Verified

| Area | Result |
|---|---|
| Production frontend build | Passed (`npm run build`) |
| Backend/unit/security tests | **51/51 passed** with isolated SQLite databases |
| PostgreSQL commerce integration | **24/24 passed** against a real local PostgreSQL 17 server |
| Clean provisioning | One configured owner, no products/customers/orders/reviews; unpublished policies; rerun preserves owner |
| Node 22 function simulation | Passed with **two separate Express function instances**, importing `api/index.js` with `VERCEL=1` |
| Cross-instance state | Sessions, login lockouts, Google nonce expiry and saved records persist through PostgreSQL |
| Order concurrency | Concurrent retry creates one order/stock deduction; concurrent cancellation restores stock once |
| Launch controls | Real orders require `CHECKOUT_MODE=cod` plus owner launch confirmation |
| Private documents | Genuine PDFs; customer ownership and staff permissions enforced; guest/other-customer access denied |
| Public tracking | Address, phone, email and PDF access are not exposed by order-number + email lookup |
| PDF output | Embedded Unicode font, Hindi callback/customer notes, real A4 PDF; long-order pagination tested |
| Customer checkout browser flow | Contact → shipping → review → submit; saved ID/details; PDF download; call/WhatsApp/email actions |
| Customer order retrieval | Full details and PDF actions survive reload through authenticated account |
| Owner images | Banner settings publish correctly; new product upload name includes product name and reserved ID; saved product uses that ID |
| Responsive checks | New review and receipt tested at 320/375/390/430/768/1024/1440/1920px; owner banner editor at four widths |
| New accessibility scans | No detected WCAG-tagged violations in review/receipt regions in light and dark modes |
| Existing UI regressions | Passed customer auth/cart intent, multiword search, owner separation, nine storefront widths and owner layouts |
| Restricted preview regressions | Passed cookie-free and all-storage-blocked owner/customer flows, uploads, CSRF and logout |
| HTTPS embedded cookies | Passed partitioned HttpOnly session, refresh, CSRF rejection and logout |
| Full legacy commerce flow | Updated for three-step checkout; passed browsing, variants, coupons, tracking, account, owner edits and mobile accessory checkout |
| Vercel configuration | Validated against the published configuration schema |
| Function dependency trace | Approximately 43 MB; PDF font and Linux Sharp binding present; database files and Vite dev server excluded |
| Isolated traced-bundle smoke test | Node 22 imports function, serves PostgreSQL bootstrap and executes Sharp without the project `node_modules` directory |
| Production dependency audit | **0 known vulnerabilities** reported by `npm audit --omit=dev` at this check |
| Original preview records | All original values preserved in 19 users, 8 products, 51 orders and 51 order items; additive schema changes only |

No application exceptions were reported by the completed browser suites. Axe checks are scoped automated checks, not a whole-site accessibility certification or substitute for assistive-technology testing.

## Evidence files

- `qa/cloud-full-tests.txt`
- `qa/postgres-commerce-final.txt`
- `qa/postgres-serverless.txt`
- `qa/cloud-clean-final-setup.txt`
- `qa/cloud-checkout-ui.txt`
- `qa/cloud-regressions.txt`
- `qa/cloud-final-build.txt`
- `qa/vercel-config-validation.txt`
- `qa/vercel-function-trace-summary.txt`
- `qa/vercel-bundle-smoke.txt`
- `audit-dependencies.json`

Workspace screenshots and sample PDF files are in `qa/` for visual verification. They contain **test orders**, not real purchases. Earlier diagnostic logs/screenshots may reflect intermediate issues; the files above describe the completed verification.

The function tracer also reports missing optional/other-platform dependencies (for example non-Linux Sharp bindings and optional PostgreSQL native support). The required Linux binding was traced, and an isolated copied bundle ran successfully. This does not replace a real Vercel build/deployment check.

## Not verified or not included

- No real Vercel project/build/deployment, purchased plan, domain/DNS connection, production cron execution or external HTTPS smoke test.
- No Supabase-hosted database connection, actual pooler/TLS handshake, production backup/restore or provider-quota testing. PostgreSQL tests used a local server.
- No live ImgBB upload with your key. The API contract, naming, re-encoding, error handling and omitted expiration were tested with a stub; local owner uploads were tested end-to-end.
- No real Google sign-in with your OAuth client. Cryptographic validation/local-key tests and challenge handling passed; provider consent/origins still need live testing.
- No real phone call or delivered WhatsApp/email. Browser links, recipient changes and PDF download passed. Native file sharing and delivery must be checked on actual customer devices.
- No load test, security certification, legal/tax review or promise of permanent free storage.
- No online payments, automatic messages, offline-payment reconciliation, real refunds, tax invoices or carrier integration.

**Before launch:** complete [VERCEL-SETUP.md](VERCEL-SETUP.md), configure separate staging/production resources, test the live services, review business content and establish backups.
