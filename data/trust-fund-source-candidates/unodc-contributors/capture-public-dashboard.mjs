import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const folder=path.dirname(new URL(import.meta.url).pathname);
const html=fs.readFileSync(path.join(folder,process.argv[2] || 'grants2024.html'),'utf8');
const target=html.match(/https:\/\/app\.powerbi\.com\/view\?r=[^"<\s]+/)[0].replaceAll('&amp;','&');
const destination=path.join(folder,process.argv[3] || 'dashboard-capture');
fs.mkdirSync(destination,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {})});
const page=await browser.newPage();
const records=[];
const pending=[];
page.on('response',response=>{
 const url=response.url();
 if(!url.includes('analysis.windows.net') && !url.includes('api.powerbi.com'))return;
 const item={url,status:response.status(),method:response.request().method()};
 const post=response.request().postData();if(post)item.postData=post;
 const index=records.length;records.push(item);
 pending.push((async()=>{try {const body=await response.body(); const file=`response-${String(index).padStart(3,'0')}.json`;fs.writeFileSync(path.join(destination,file),body);item.file=file;}catch(e){item.error=String(e);}})());
});
try {
 await page.goto(target,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForTimeout(20000);
 await page.screenshot({path:path.join(destination,'dashboard.png'),fullPage:true});
 fs.writeFileSync(path.join(destination,'page-text.txt'),await page.locator('body').innerText());
 await Promise.all(pending);
 fs.writeFileSync(path.join(destination,'requests.json'),JSON.stringify({target,records},null,2));
 console.log(records.map(r=>({url:r.url,status:r.status,file:r.file})));
}finally{await browser.close();}
