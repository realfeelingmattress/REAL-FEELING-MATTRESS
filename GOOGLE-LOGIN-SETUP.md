# Connect Google sign-in

## REAL FEELING MATTRESS

**Current status:** the customer button and server integration are implemented, but Google sign-in is not activated until you configure a Google OAuth client ID. Email/password registration and sign-in already work. A real Google-account sign-in has not been tested because no client ID was provided.

You can also find these instructions inside **`/owner` → Settings → Google login**.

## 1. Create your Google project and branding

1. Open [Google Cloud Console](https://console.cloud.google.com/auth/overview) using the Google account that should own this business integration.
2. Create or select a project, then open **Google Auth Platform**.
3. Set the app name to **REAL FEELING MATTRESS**. Add your actual support email and developer contact email; these were not provided, so the shop does not invent them.
4. Configure **Audience** for your customers (External for a public customer store). If asked about data access, use only basic sign-in identity: `openid`, `email`, and `profile`. While the app is in testing, add your intended Google test accounts wherever the console requires them.
5. Add your real website home page, reviewed privacy policy, and terms URLs. Complete any domain verification or publishing requirements Google shows for your project.

Google's official setup guide covers the current console, branding, client ID and origin settings. [3](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)

## 2. Create a Web application client

Under **Clients → Create client**, select **Web application**. In **Authorized JavaScript origins**, add each exact origin where customers will use the shop. Origins contain the scheme, hostname and any development port—not a page path. [3](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)

Example production origins — replace with your own actual domain:

```text
https://your-real-domain.com
https://www.your-real-domain.com
```

Local development:

```text
http://localhost
http://localhost:3000
```

Only add addresses you use. Do not enter `/account` or `/owner` as part of the origin.

**This implementation uses the Google Identity Services JavaScript callback and server-verified ID tokens. It does not use an OAuth authorization-code redirect, so no redirect URI or Google client secret is needed.**

Temporary preview hosts can change, and embedded browsers may restrict Google's own sign-in window. For reliable Google end-to-end testing, use your stable HTTPS domain or `http://localhost:3000` in a regular browser tab. This does **not** change email/password login, which is tested inside the cookie-blocked preview.

## 3. Set the client ID on the server

Copy the **Client ID**, which has this general form:

```text
123456789-example.apps.googleusercontent.com
```

For local development, create a `.env` file in the project root (`nocte/.env`) and add:

```dotenv
GOOGLE_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com
```

Replace the complete placeholder with Google's complete client ID. Keep your existing database and other environment settings. The Node server loads `.env` if present; deployment environment variables take precedence.

For hosting, add the same `GOOGLE_CLIENT_ID` variable through the hosting provider's environment settings.

**Restart the Node server**, not just the browser:

```bash
npm run dev
```

If a server is already running, stop that process before starting it again. Do not run two servers on port 3000. In production, use the normal guarded production deployment process.

A client ID is a public identifier, not a secret. **Do not paste a client secret, Google password, service-account key, or token into the owner dashboard or this chat.** `.env` is excluded from version control and blocked from the web server.

## 4. Test the customer journey

1. Load the shop from an authorized origin. Reload after restarting the server.
2. Click **Sign in**, or click **Add to bag** while signed out.
3. Click the official **Continue with Google** button and choose an allowed Google account.
4. For a new email, the backend creates a **customer** account. It uses the verified Google name, email and profile-photo URL when Google supplies one. If there is no usable photo, the interface shows initials.
5. The header/account profile shows the customer's photo and name. Signing in after an Add to bag prompt adds the saved product selection once.
6. Sign out and sign in again with the same Google account. Test on desktop and mobile before launch.

**Existing email/password account:** the app deliberately does not silently attach Google just because the emails match. Sign in with your password, open **Profile & security → Your Google connection**, confirm your current account password, and choose the Google account with the same email. Then Google sign-in can be used for that customer account.

Google-only accounts manage their Google password at Google. The app does not receive or store that password. Name/photo refresh when Google sign-in is used again; this is not a continuous background sync.

## Separation and security

- Owner/staff login remains exclusively in the owner workspace UI at **`/owner`**, using its own password endpoint. Google cannot create an owner, elevate a customer, or link to a privileged account.
- The backend verifies Google's signature, issuer, client audience, token timing, verified email and session-bound nonce. Decoding a JWT alone is not accepted.
- A challenge is short-lived and single-use. Login rotates the app session, including the isolated demo-preview session when used.
- Profile-image URLs are restricted to Google's supported HTTPS image hosts. No client-supplied arbitrary profile URL or role is trusted.
- The database stores the Google subject identifier, account name/email, and optional photo URL—not Google passwords, access tokens or refresh tokens.
- The app requests only sign-in identity. It does not request Gmail, Drive or contact access.
- Customer names, emails and avatars are personal data. Publish a reviewed privacy policy and retention/deletion process before going live.

## Troubleshooting

| What you see                              | Check                                                                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| “Google sign-in is not connected yet”     | `GOOGLE_CLIENT_ID` is missing/malformed, or the server was not restarted.                                                                  |
| Origin not allowed                        | Match the browser's exact origin to Authorized JavaScript origins. Include the development port where used.                                |
| A Google popup cannot open in the preview | Test on your own authorized HTTPS site or localhost outside the embedded frame. Email/password login remains available inside the preview. |
| Account already uses this email           | Sign in with your password and explicitly connect Google in Profile & security.                                                            |
| Request expired                           | Start Google sign-in again; challenges expire after five minutes and cannot be replayed.                                                   |
| Google could not load                     | Check network/content blockers and use email sign-in while resolving the provider issue.                                                   |
| Owner credentials rejected on the shop    | Use `/owner`. Storefront sign-in is for customer accounts only.                                                                            |

**No database reset is required to connect Google.** Existing shop settings, products, users and orders are retained.
