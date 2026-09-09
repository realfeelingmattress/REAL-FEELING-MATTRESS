# Vercel + Neon Deployment Guide
# ================================
# This is a step-by-step checklist for deploying REAL FEELING MATTRESS
# to Vercel with a Neon PostgreSQL database.

## STEP 1: Set up Neon Database
─────────────────────────────────
1. Go to https://console.neon.tech/
2. Create a new project (choose region closest to your users, e.g., "Asia Southeast")
3. Go to "Connect" and copy the **Direct** connection string (for setup)
4. Also copy the **Transaction Pooler** connection string (for Vercel runtime)

## STEP 2: Initialize the Database (on your local machine)
─────────────────────────────────
Run these commands in your terminal:

```bash
# Set your Neon DIRECT connection string (for migrations)
export DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Set your owner credentials (one-time setup)
export OWNER_EMAIL="your-real-email@example.com"
export OWNER_PASSWORD="YourStrongPassword123+"

# Run the database setup
npm run db:setup
```

After setup completes, REMOVE those variables from your shell:
```bash
unset DATABASE_URL OWNER_EMAIL OWNER_PASSWORD
```

## STEP 3: Set Environment Variables in Vercel Dashboard
─────────────────────────────────
Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables (set for Production, Preview, and Development):

| Variable           | Value                                                    |
|--------------------|----------------------------------------------------------|
| DATABASE_URL       | Your Neon TRANSACTION POOLER connection string            |
| SITE_URL           | https://your-project.vercel.app (exact deployed URL)     |
| IMGBB_API_KEY      | 3710349a670481d3d8cc3f115bf5eefd                         |
| GOOGLE_CLIENT_ID   | 1009599087603-g7jm0cvlai870gpgau9nh1gsrgpvqr5p.apps.googleusercontent.com |
| CRON_SECRET        | (generate a random 32+ char string)                      |
| CHECKOUT_MODE      | preview                                                   |

⚠️ DO NOT set DB_AUTO_SETUP or DB_SEED_DEMO in Vercel!

## STEP 4: Configure Google OAuth (for Google Login)
─────────────────────────────────
1. Go to Google Cloud Console → Credentials → your OAuth Client ID
2. Under "Authorized JavaScript origins", add:
   - https://your-project.vercel.app
   - Your custom domain if applicable
3. Save changes

## STEP 5: Deploy
─────────────────────────────────
Push your code to GitHub and Vercel will auto-deploy, or:
```bash
vercel --prod
```

## Common Deployment Errors & Fixes
─────────────────────────────────

### "Vercel requires DATABASE_URL"
→ You forgot to set DATABASE_URL in Vercel environment variables.

### "SITE_URL must be your exact canonical HTTPS origin"
→ Set SITE_URL to your exact Vercel URL (e.g., https://my-app.vercel.app).
   No trailing slash, no path, must be https://

### "Create a non-demo owner using npm run db:setup"
→ You need to run `npm run db:setup` against your Neon database BEFORE deploying.
   The app refuses to start in production without a real owner account.

### "Run npm run db:setup before deploying this database version"
→ Same as above — the `_cloudPreparedV1` flag is missing from your database.

### "502: FUNCTION_INVOCATION_FAILED"
→ Check Vercel Function Logs. Usually means database connection failed or
   env vars are misconfigured.

### Database connection timeout
→ Make sure you're using Neon's connection string (not the Supabase API URL).
   Use the Transaction Pooler URL for Vercel runtime.
   Neon may pause free-tier projects after inactivity — check your Neon dashboard.

### Image uploads fail with 503
→ IMGBB_API_KEY is not set in Vercel environment variables.

### Google login shows "not configured"
→ GOOGLE_CLIENT_ID is not set or has wrong format in Vercel env vars.
→ Make sure your Vercel domain is in Google's "Authorized JavaScript origins".
