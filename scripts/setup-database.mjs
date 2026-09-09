import '../server/env.js';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {productionDefaults,policyDrafts} from '../server/production-defaults.js';
if(process.env.VERCEL)throw new Error('Run migrations explicitly from a trusted local machine, not inside a Vercel Function or build.');
if(!process.env.DATABASE_URL)throw new Error('Set DATABASE_URL to the PostgreSQL database you intend to initialize. This command will not modify the local SQLite preview.');
process.env.DB_AUTO_SETUP='1';delete process.env.DB_SEED_DEMO;
const {db,uid}=await import('../server/db.js');
try{
 const owners=await db.prepare("SELECT id FROM users WHERE role='owner'").all();
 let owner;
 if(!owners.length){owner=z.object({email:z.string().email(),password:z.string().min(14).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/)}).parse({email:process.env.OWNER_EMAIL,password:process.env.OWNER_PASSWORD});if(owner.password==='NocteDemo!2026')throw new Error('Demo passwords are forbidden.')}
 await db.transaction(async()=>{
  if(owner)await db.prepare('INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)').run(uid(),'Shop owner',owner.email.trim().toLowerCase(),await bcrypt.hash(owner.password,12),'owner');
  for(const [key,value]of Object.entries(productionDefaults))await db.prepare('INSERT OR IGNORE INTO settings(id,value) VALUES(?,?)').run(key,JSON.stringify(value));
  for(const [id,title]of policyDrafts)await db.prepare('INSERT OR IGNORE INTO content(id,title,body,type,active) VALUES(?,?,?,?,?)').run(id,title,'OWNER REVIEW REQUIRED. Replace this draft with the actual shop policy before publishing.','policy',0);
  // Supabase's browser Data API must never expose this server-owned database.
  // Only restrict our own tables, not unrelated tables in the same project.
  const {schema,previewSchema,googleSchema,cloudSchema}=await import('../server/schema.js');
  const tables=[...new Set([...([schema,previewSchema,googleSchema,cloudSchema].join('\n')).matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map(m=>m[1]))];
  const clientRoles=(await db.prepare("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')").all()).map(r=>r.rolname);
  for(const table of tables){await db.exec(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);await db.exec(`REVOKE ALL ON TABLE "${table}" FROM PUBLIC`);for(const role of clientRoles)await db.exec(`REVOKE ALL ON TABLE "${table}" FROM "${role}"`)}
 })();
 console.log('Schema migrated. Owner '+(owner?'created':'preserved')+'. Existing records preserved.');
 console.log('No demo customers, orders, reviews, products or coupons were inserted. Policy drafts remain unpublished.');
 console.log('Add actual categories/products, review shipping/tax/policies, and confirm launch readiness in /owner.');
 console.log('OWNER_EMAIL and OWNER_PASSWORD are one-time setup variables; remove them from your shell afterward. They are not needed in Vercel.');
}finally{await db.close()}
