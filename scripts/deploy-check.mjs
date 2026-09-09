import '../server/env.js';

// Deployment pre-flight check
// Run locally to verify your environment is ready for Vercel deployment

const checks = [];
let passed = 0;
let failed = 0;

function check(name, condition, hint) {
  const status = condition ? '✅' : '❌';
  checks.push({ name, status, hint, condition });
  condition ? passed++ : failed++;
}

console.log('\n🔍 REAL FEELING MATTRESS — Deployment Pre-flight Check\n');
console.log('=' .repeat(60));

// Check DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
check(
  'DATABASE_URL is set',
  Boolean(dbUrl),
  'Set DATABASE_URL to your Neon PostgreSQL connection string'
);

if (dbUrl) {
  check(
    'DATABASE_URL is PostgreSQL (not SQLite)',
    dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'),
    'DATABASE_URL must be a postgresql:// connection string from Neon'
  );

  try {
    const url = new URL(dbUrl);
    check(
      'DATABASE_URL has a valid host',
      url.hostname.length > 0 && url.hostname.includes('.'),
      'Check your Neon connection string host'
    );
    check(
      'DATABASE_URL has a password',
      url.password.length > 0,
      'URL-encode your Neon database password in the connection string'
    );
  } catch {
    check('DATABASE_URL is a valid URL', false, 'Check your connection string format');
  }
}

// Check SITE_URL
const siteUrl = process.env.SITE_URL;
check(
  'SITE_URL is set',
  Boolean(siteUrl),
  'Set SITE_URL to your exact Vercel HTTPS domain (e.g., https://my-app.vercel.app)'
);

if (siteUrl) {
  try {
    const url = new URL(siteUrl);
    check(
      'SITE_URL uses HTTPS',
      url.protocol === 'https:',
      'SITE_URL must start with https://'
    );
    check(
      'SITE_URL has no path',
      url.pathname === '/',
      'Remove any path from SITE_URL (use just the origin)'
    );
    check(
      'SITE_URL has no query string',
      !url.search,
      'Remove any query parameters from SITE_URL'
    );
  } catch {
    check('SITE_URL is a valid URL', false, 'Check SITE_URL format');
  }
}

// Check IMGBB
check(
  'IMGBB_API_KEY is set',
  Boolean(process.env.IMGBB_API_KEY),
  'Set IMGBB_API_KEY to your ImgBB API key from https://api.imgbb.com/'
);

// Check Google
const googleId = process.env.GOOGLE_CLIENT_ID;
check(
  'GOOGLE_CLIENT_ID is set',
  Boolean(googleId),
  'Set GOOGLE_CLIENT_ID to your Google OAuth Client ID'
);

if (googleId) {
  check(
    'GOOGLE_CLIENT_ID format is valid',
    /^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(googleId),
    'Check your Google Cloud Console OAuth Client ID'
  );
}

// Check CRON_SECRET
check(
  'CRON_SECRET is set (32+ chars)',
  Boolean(process.env.CRON_SECRET) && process.env.CRON_SECRET.length >= 32,
  'Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
);

// Check forbidden variables
check(
  'DB_AUTO_SETUP is NOT set',
  process.env.DB_AUTO_SETUP !== '1',
  'Do NOT set DB_AUTO_SETUP=1 in Vercel. Run db:setup locally instead.'
);
check(
  'DB_SEED_DEMO is NOT set',
  process.env.DB_SEED_DEMO !== '1',
  'Do NOT set DB_SEED_DEMO=1 in Vercel.'
);

// Print results
console.log('');
for (const c of checks) {
  console.log(`  ${c.status} ${c.name}`);
  if (!c.condition) {
    console.log(`     → ${c.hint}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);

// Test database connection
if (dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'))) {
  console.log('Testing database connection...');
  try {
    const { db } = await import('../server/database.js');
    const tables = await db.prepare(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
    ).all();
    
    if (tables.length === 0) {
      console.log('  ⚠️  Database connected but has no tables.');
      console.log('     Run: npm run db:setup (with OWNER_EMAIL and OWNER_PASSWORD set)');
    } else {
      console.log(`  ✅ Database connected. Found ${tables.length} tables.`);
      
      // Check for owner
      const owners = await db.prepare("SELECT id, email FROM users WHERE role='owner'").all();
      if (owners.length === 0) {
        console.log('  ❌ No owner account found.');
        console.log('     Run: npm run db:setup (with OWNER_EMAIL and OWNER_PASSWORD set)');
      } else {
        console.log(`  ✅ Owner account exists: ${owners[0].email}`);
      }

      // Check for cloudPreparedV1
      const cloudReady = await db.prepare("SELECT id FROM settings WHERE id='_cloudPreparedV1'").get();
      if (!cloudReady) {
        console.log('  ❌ Database not cloud-prepared (_cloudPreparedV1 missing).');
        console.log('     Run: npm run db:setup');
      } else {
        console.log('  ✅ Database is cloud-prepared.');
      }
    }
    
    await db.close();
  } catch (err) {
    console.log(`  ❌ Database connection failed: ${err.message}`);
    console.log('     Check your DATABASE_URL and Neon project status.');
  }
}

if (failed > 0) {
  console.log('\n⚠️  Fix the issues above before deploying to Vercel.\n');
  process.exit(1);
} else {
  console.log('\n✅ All checks passed! Ready to deploy.\n');
}
