import '../server/env.js';
const checks=[];
const check=(label,pass,note='')=>{checks.push({label,pass:Boolean(pass)});console.log((pass?'PASS':'MISSING')+'  '+label+(note?' — '+note:''))};
check('PostgreSQL connection configured',process.env.DATABASE_URL);
check('ImgBB server key configured',process.env.IMGBB_API_KEY);
check('Google web client ID configured',/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(process.env.GOOGLE_CLIENT_ID||''));
let origin;try{origin=new URL(process.env.SITE_URL)}catch{}
check('Canonical HTTPS origin',origin?.protocol==='https:'&&origin.pathname==='/'&&!origin.search&&!origin.hash);
check('Cron secret is at least 32 characters',(process.env.CRON_SECRET||'').length>=32);
check('Runtime demo seeding disabled',process.env.DB_SEED_DEMO!=='1');
check('Runtime automatic migrations disabled',process.env.DB_AUTO_SETUP!=='1');
if(process.env.DATABASE_URL){const {db}=await import('../server/database.js');try{const marker=await db.prepare("SELECT id FROM settings WHERE id='_cloudPreparedV1'").get();check('Cloud schema initialized',marker);const owners=await db.prepare("SELECT password FROM users WHERE role='owner'").all();const {default:bcrypt}=await import('bcryptjs');check('Non-demo owner exists',owners.length&&owners.every(u=>!bcrypt.compareSync('NocteDemo!2026',u.password)));const s=await db.prepare("SELECT value FROM settings WHERE id='launchReady'").get();check('Owner launch checklist confirmed',s&&JSON.parse(s.value));const products=await db.prepare('SELECT COUNT(*) AS n FROM products WHERE active=1').get();check('Actual products added',products.n>0);for(const id of ['privacy','terms','shipping','returns','refunds']){const p=await db.prepare('SELECT body,active FROM content WHERE id=?').get(id);check('Reviewed '+id+' policy published',p?.active&&!p.body.includes('OWNER REVIEW REQUIRED'))}}catch(e){check('Database readiness',false,e.code||e.name)}finally{await db.close()}}
console.log('\nThis checks configuration and database readiness only. It does not prove live Google login, ImgBB retention, email delivery, or public deployment.');
if(checks.some(c=>!c.pass))process.exitCode=1;
