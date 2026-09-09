import os from 'node:os';
import {nodeFileTrace} from '@vercel/nft';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
if(!process.env.DATABASE_URL?.includes('127.0.0.1'))throw new Error('Use a disposable local PostgreSQL database.');
const dir=fs.mkdtempSync(os.tmpdir()+'/rfm-function-');
try{
 const traced=await nodeFileTrace(['api/index.js'],{base:process.cwd(),ignore:['data/**','qa/**','node_modules/better-sqlite3/**']});
 for(const file of traced.fileList){const to=path.join(dir,file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(file,to)}
 const code=`import http from 'node:http';import assert from 'node:assert/strict';const {default:app}=await import('./api/index.js');const {db}=await import('./server/database.js');const {storeImage}=await import('./server/media.js');const sharp=(await import('sharp')).default;const s=http.createServer(app);await new Promise(r=>s.listen(0,'127.0.0.1',r));try{const r=await fetch('http://127.0.0.1:'+s.address().port+'/api/bootstrap');assert.equal(r.status,200);const b=await r.json();assert.equal(b.storage.database,'postgres');assert.equal(b.demo,false);const image=await sharp({create:{width:2,height:2,channels:3,background:'#ffffff'}}).png().toBuffer();await assert.rejects(storeImage(image,'qa',{key:'',cloud:true}),/not configured/);console.log('PASS isolated traced function imports and serves PostgreSQL bootstrap; Sharp works; no Vite/SQLite/data directory present. Node '+process.version)}finally{await new Promise(r=>s.close(r));await db.close()}`;
 const run=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:dir,env:{...process.env,VERCEL:'1',NODE_ENV:'production',SITE_URL:'https://shop.example.test',CHECKOUT_MODE:'preview',DB_AUTO_SETUP:'',DB_SEED_DEMO:''},encoding:'utf8',timeout:30000});console.log(run.stdout);if(run.status){console.error(run.stderr);process.exitCode=1}
}finally{fs.rmSync(dir,{recursive:true,force:true})}
