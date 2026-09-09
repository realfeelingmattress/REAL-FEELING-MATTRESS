import os from 'node:os';
import{spawn}from'node:child_process';import fs from'node:fs';
for(const suite of process.argv.slice(2)){
 const dir=fs.mkdtempSync(os.tmpdir()+'/rfm-regression-');
 const code="import express from 'express';import path from 'node:path';const{default:app}=await import('./server/app.js');app.get('/src/api.js',(req,res)=>res.type('application/javascript').sendFile(path.resolve('src/api.js')));app.use(express.static('dist'));app.get('/{*path}',(req,res)=>res.sendFile(path.resolve('dist/index.html')));app.listen(3128,'127.0.0.1',()=>console.log('ISOLATED READY'))";
 const child=spawn(process.execPath,['--input-type=module','-e',code],{env:{...process.env,NODE_ENV:'development',DATABASE_URL:'',DB_PATH:dir+'/test.sqlite',CHECKOUT_MODE:'preview'},stdio:['ignore','pipe','pipe']});let logs='';child.stderr.on('data',d=>logs+=d);
 try{await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error(logs)),25000);child.stdout.on('data',d=>{logs+=d;if(logs.includes('ISOLATED READY')){clearTimeout(t);resolve()}});child.once('exit',()=>{clearTimeout(t);reject(new Error(logs))})});
 const run=spawn(process.execPath,[suite],{env:{...process.env,TEST_PORT:'3128',TEST_ROOT:'http://127.0.0.1:3128'},stdio:'inherit'});const code=await new Promise(r=>run.once('exit',r));if(code)process.exitCode=1;
 }catch(e){console.error(e.message);process.exitCode=1}finally{child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));fs.rmSync(dir,{recursive:true,force:true})}
}
