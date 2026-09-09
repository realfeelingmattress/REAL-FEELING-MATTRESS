import { chromium } from '@playwright/test';
const browser=await chromium.launch();const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const routes=['/','/mattresses','/product/hybrid-mattress','/collections','/quiz','/compare','/wishlist','/cart','/checkout','/account','/tracking','/support','/faq','/sleep-guide','/page/privacy'];
const failures=[];
for(const width of [320,375,390,430,768,1024,1280,1440,1920]){
 await page.setViewportSize({width,height:900});
 for(const route of width===320||width===768?routes:['/','/mattresses','/product/hybrid-mattress']){
  await page.goto('http://127.0.0.1:3000'+route);await page.waitForTimeout(220);await page.waitForSelector('h1,h2');
  const result=await page.evaluate(()=>{const w=innerWidth;return{width:w,scroll:document.documentElement.scrollWidth,culprits:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>w+2&&r.width>0&&!e.closest('.home-products,.testimonial-grid,.journal-grid,.comparison-scroll,.table-wrap,.product-tabs,.account-nav,.settings-nav')}).slice(0,10).map(e=>e.className||e.tagName)}});
  if(result.scroll>width+1)failures.push({route,...result});
 }
 console.log('viewport',width,'checked');
}
console.log('FAILURES',JSON.stringify(failures,null,2));console.log('ERRORS',errors);
await page.goto('http://127.0.0.1:3000/owner');await page.getByRole('button',{name:'Use demo owner credentials'}).click();await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/owner/dashboard');
for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:900});for(const route of ['dashboard','products','inventory','orders','customers','reviews','coupons','content','categories','analytics','support','staff','security','audit','settings']){await page.goto('http://127.0.0.1:3000/owner/'+route);await page.waitForTimeout(180);const result=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,txt:document.body.innerText.slice(0,40)}));if(result.scroll>width+1)failures.push({route,...result})}console.log('owner viewport',width,'checked')}
console.log('ALL FAILURES',JSON.stringify(failures,null,2));console.log('ERRORS',errors);await browser.close();
