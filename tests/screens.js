/* Screenshots of one release, from made-up data only (fake-his.js), in real Chrome.
   Run after tagging a release: node screens.js   → ../research/screens/<APP_VERSION tag>/*.jpg
   Opens index.html from a local server with an empty browser profile (no IndexedDB, no shared-store connection,
   no DATA Template), drops the made-up HIS files, opens every collapsed section, then saves the full page
   and each panel. Needs Chrome or Edge installed and internet for SheetJS from cdnjs. */
const REPO = require('path').resolve(__dirname, '..');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const puppeteer = require('puppeteer-core');
const fake = require('./fake-his');

const BROWSERS = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.jpg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml', '.json':'application/json' };

(async () => {
  const exe = process.env.CHROME || BROWSERS.filter(p => fs.existsSync(p))[0];
  if(!exe) throw new Error('Chrome / Edge not found: set CHROME=<path>');
  const server = http.createServer((req, res) => {
    const p = path.join(REPO, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if(!p.startsWith(REPO) || !fs.existsSync(p) || fs.statSync(p).isDirectory()){ res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type':TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  }).listen(0);
  const port = server.address().port;
  const files = fake.write(fs.mkdtempSync(path.join(os.tmpdir(), 'rj2-fake-')));
  const browser = await puppeteer.launch({ executablePath:exe, headless:true, userDataDir:fs.mkdtempSync(path.join(os.tmpdir(), 'rj2-chrome-')),
    defaultViewport:{ width:1366, height:900, deviceScaleFactor:1 } });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:' + port + '/index.html', { waitUntil:'networkidle0' });
    const tag = await page.evaluate(() => (document.body.textContent.match(/v\d+\.\d+(?:\.\d+)?(?:-beta(?:\.\d+)?)?/) || ['unknown'])[0]);
    await (await page.$('#file-input')).uploadFile(...files);
    await page.waitForFunction(() => /นำเข้าแล้ว/.test(document.body.textContent), { timeout:60000 });
    await new Promise(r => setTimeout(r, 1500));
    /* open folded panels (▸ button, so their charts draw) and any <details> */
    await page.evaluate(() => {
      document.querySelectorAll('section.panel.collapsed .collapse-btn').forEach(b => b.click());
      document.querySelectorAll('details').forEach(d => { d.open = true; });
    });
    await new Promise(r => setTimeout(r, 1200));
    const out = path.join(REPO, 'research', 'screens', tag);
    fs.rmSync(out, { recursive:true, force:true });
    fs.mkdirSync(out, { recursive:true });
    await page.screenshot({ path:path.join(out, '00-full-page.jpg'), type:'jpeg', quality:70, fullPage:true });
    const panels = await page.$$('section.panel');
    let n = 0;
    for(const el of panels){
      const name = await el.evaluate(s => s.id || (s.querySelector('[data-collapse]') || {}).getAttribute && s.querySelector('[data-collapse]').getAttribute('data-collapse') || '');
      const box = await el.boundingBox();
      if(!box || box.height < 20) continue;
      n++;
      await el.screenshot({ path:path.join(out, String(n).padStart(2, '0') + (name ? '-' + name : '') + '.jpg'), type:'jpeg', quality:75 });
    }
    console.log('version ' + tag + ' · full page + ' + n + ' panels → ' + path.relative(REPO, out));
    if(errors.length){ console.log('page errors:\n  ' + errors.join('\n  ')); process.exitCode = 1; }
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
