/* Side menu แบบ ข (question 45 / Q&A 2.51, group choice 25 Nov 2026), one page per menu item (her request the same day):
   every item shows only its own page, opens its box and reaches its field. Made-up HIS exports (fake-his.js) and one
   made-up quote; prints no real data.
   Run: node nav-test.js */
const REPO = require('path').resolve(__dirname, '..');
const h = require(REPO + '/tests/harness');
const fake = require(REPO + '/tests/fake-his');
const os = require('os'), path = require('path');
let fails = 0, passes = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if(c) passes++; else fails++; };
(async () => {
  const files = fake.write(path.join(os.tmpdir(), 'rj2-nav-test'));
  const page = await h.load({ inside:true }), I = page.inside, w = page.window, d = page.document;
  const scrolled = [];
  w.HTMLElement.prototype.scrollIntoView = function(){ scrolled.push(this); };
  await page.drop(files);
  const nav = d.getElementById('side-nav'), content = d.querySelector('.layout > .content');
  const $ = id => d.getElementById(id);
  const click = key => { scrolled.length = 0; nav.querySelector('[data-go="' + key + '"]').click(); };
  const flashed = el => !!el && el.classList.contains('nav-flash');
  /* what the page shows: top-level blocks of the current page that are not hidden */
  const onIds = () => [...content.children].filter(el => el.hasAttribute('data-view') && el.classList.contains('view-on') && !el.hidden).map(el => el.id || el.className.split(' ')[0]);

  /* layout */
  ok(!!nav && nav.parentNode.classList.contains('layout'), 'menu sits in the two-column layout');
  ok(d.querySelector('body > footer #credit') !== null, 'CREDIT footer unchanged, outside the layout');
  ok(I.get('BRAND').name.indexOf($('side-brand').textContent) === 0 && $('side-brand').textContent.length > 5, 'menu title from BRAND: ' + $('side-brand').textContent);
  const groups = [...nav.querySelectorAll('.sg-t')].map(x => x.textContent.slice(1));
  ok(groups.join('|') === 'ใบเสนอราคา|บันทึกขอซื้อ / สั่งซื้อ|บันทึกตรวจรับ|เอกสารการเงิน|ข้อมูลยาและสถิติ|ข้อมูล', 'six groups in the order of picture ข');
  const soon = [...nav.querySelectorAll('.si.soon')];
  ok(soon.length === 2 && soon.every(x => x.tagName === 'SPAN'), 'two "(รอทำ)" items, not clickable');
  ok(content.classList.contains('paged') && onIds().join() === 'dropzone,importnote,filestatus', 'first visit opens the data page: ' + onIds().join());
  ok([...content.children].every(el => el.hasAttribute('data-view') || ['masthead', 'errorbar'].some(c => el.classList.contains(c))), 'every block belongs to a page (except name and error bar)');

  /* every item shows its own page only */
  const PAGES = { 'quote-W':'quote-box', 'quote-WM':'quote-box', 'quote-WC':'quote-box', 'memo-p':'memo-pick', ry:'ry-box', cr:'ry-box',
    rate:'filters,rate-panel', item:'filters,item-panel', rep:'filters,rep-panel', kpi:'filters,kpi-panel', top10:'filters,kpi-row,top10-panel',
    edned:'filters,kpi-row,edned-panel', value:'filters,kpi-row,value-panel', gpu:'filters,gpu-panel', plantop:'filters,plantop-panel',
    po:'filters,po-panel', disp:'filters,disp-panel', 'import':'dropzone,importnote,filestatus' };
  const errBefore = page.errors.length;
  Object.keys(PAGES).forEach(k => { click(k); const got = onIds().join(); ok(got === PAGES[k], k + ' → shows only ' + got); });
  ok(page.errors.length === errBefore, 'no script errors while switching pages');

  /* page remembered: address and this PC */
  click('po');
  ok(w.location.hash === '#po' && w.localStorage.getItem('rj2-page') === 'po', 'page kept in the address (#po) and on this PC');

  /* quotes */
  click('quote-WM');
  ok(!$('quote-box').hidden && flashed($('quote-no-WM')), 'WM opens the quote box and flashes the WM number');
  ok(w.getComputedStyle($('quote-close')).display === 'none', 'quote box has no close button on its own page');
  click('rate');
  $('btn-quote').click();
  ok(onIds().join() === 'quote-box', '"ทำใบเสนอราคา" on the usage page goes to the quote page');

  /* memos: no memo open → pick a quote on the memo page */
  I.get('memoState').d = null; I.get('renderMemo')();
  click('memo-k');
  const combo = $('quote-hist').parentNode.querySelector('input');
  ok($('memo-pick').contains($('quote-memo')) && flashed(combo), 'ขย. with no memo open → quote history moves to the memo page');
  click('quote-W');
  ok($('quote-box').contains($('quote-memo')), 'quote history back in the quote box on the quote page');
  I.set('quoteHist', { slot:'_quotes', next:{}, docs:[
    { no:'W001-70', series:'W', company:'บริษัท ทดสอบ จำกัด', date:'2026-11-20', lines:[{ id:'X1', name:'DRUG A', qty:1, price:10 }] } ] });
  I.get('quoteHistFill')();
  $('quote-hist').value = 'W001-70';
  $('quote-memo').click();
  ok(onIds().join() === 'memo-pick,memo-box' && w.location.hash === '#memo', '"ออกบันทึก" opens the memo page: ' + onIds().join());
  click('memo-p'); let t = scrolled.pop(); ok(t && t.getAttribute('data-f') === 'pNo' && flashed(t) && d.activeElement === t, 'ภย. → ภย. number field');
  click('memo-k'); t = scrolled.pop(); ok(t && t.getAttribute('data-f') === 'kNo' && flashed(t), 'ขย. → ขย. number field');
  click('memo-y'); t = scrolled.pop(); ok(t && t.getAttribute('data-act') === 'exp-y', 'ย. → export ย. button');

  /* inspection and creditor report */
  I.get('ryState').open = false; I.get('renderRy')();
  click('cr'); t = scrolled.pop();
  ok(!$('ry-box').hidden && t === $('cr-panel') && onIds().join() === 'ry-box', 'รายงานเจ้าหนี้ opens the รย. page at the creditor report');
  click('rate'); $('quote-ry').click();
  ok(onIds().join() === 'ry-box', '"ออกบันทึกตรวจรับ" button goes to the รย. page');

  /* data */
  $('shared-box').hidden = true;
  click('shared'); ok(!$('shared-box').hidden && onIds().join() === 'dropzone,importnote,filestatus', 'ข้อมูลกลาง opens the shared-store box on the data page');
  click('backup'); ok(flashed($('btn-backup')), 'สำรอง flashes the backup button');

  /* files dropped outside the drop zone still import, from any page */
  click('item');
  let dropped = null; I.set('handleFiles', fl => { dropped = fl; });
  const ev = new w.Event('drop', { bubbles:true, cancelable:true });
  ev.dataTransfer = { types:['Files'], files:['x'] };
  $('item-panel').dispatchEvent(ev);
  ok(dropped && ev.defaultPrevented && onIds().join() === 'dropzone,importnote,filestatus', 'file dropped on another page → data page, imported');

  /* highlight */
  click('ry');
  ok(nav.querySelector('[data-go="ry"]').classList.contains('on'), 'current item highlighted');
  click('po');
  const po = nav.querySelector('[data-go="po"]');
  ok(po.classList.contains('on') && po.parentNode.classList.contains('on') && !nav.querySelector('[data-go="ry"]').classList.contains('on'), 'one item at a time; a line with two links lights up the whole line');

  /* reopen: the page comes back where it was left */
  const p2 = await h.load({ inside:true, storage:{ 'rj2-page':'kpi' } });
  ok(p2.document.querySelector('#kpi-panel').classList.contains('view-on') && !p2.document.querySelector('#rep-panel').classList.contains('view-on'), 'reopening the program shows the last page (kpi)');
  p2.close();

  ok(!page.errors.length, 'no script errors' + (page.errors.length ? ': ' + page.errors.join(' | ') : ''));
  console.log((fails ? 'FAILED ' + fails + ' of ' : 'passed all ') + (passes + fails) + ' checks');
  page.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
