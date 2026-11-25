/* Side menu แบบ ข (question 45 / Q&A 2.51, group choice 25 Nov 2026): every menu item reaches its part of the page.
   Made-up HIS exports (fake-his.js) and one made-up quote; prints no real data.
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
  const nav = d.getElementById('side-nav');
  const $ = id => d.getElementById(id);
  const click = key => { scrolled.length = 0; nav.querySelector('[data-go="' + key + '"]').click(); return scrolled[scrolled.length - 1]; };
  const flashed = el => !!el && el.classList.contains('nav-flash');

  /* layout */
  ok(!!nav && nav.parentNode.classList.contains('layout'), 'menu sits in the two-column layout');
  ok(!!d.querySelector('.layout > .content > .masthead') && !!d.querySelector('.layout > .content > #item-panel'), 'every part of the page is in the content column');
  ok(d.querySelector('body > footer #credit') !== null, 'CREDIT footer unchanged, outside the layout');
  ok(I.get('BRAND').name.indexOf($('side-brand').textContent) === 0 && $('side-brand').textContent.length > 5, 'menu title from BRAND: ' + $('side-brand').textContent);
  const groups = [...nav.querySelectorAll('.sg-t')].map(x => x.textContent.slice(1));
  ok(groups.join('|') === 'ใบเสนอราคา|บันทึกขอซื้อ / สั่งซื้อ|บันทึกตรวจรับ|เอกสารการเงิน|ข้อมูลยาและสถิติ|ข้อมูล', 'six groups in the order of picture ข: ' + groups.join(' / '));
  const soon = [...nav.querySelectorAll('.si.soon')];
  ok(soon.length === 2 && soon.every(x => x.tagName === 'SPAN'), 'two "(รอทำ)" items, not clickable');

  /* every clickable item has an action, and its target exists */
  const keys = [...nav.querySelectorAll('[data-go]')].map(b => b.getAttribute('data-go'));
  ok(keys.length === 23, 'clickable items: ' + keys.length);
  const errBefore = page.errors.length;
  keys.forEach(k => { const t = click(k); ok(!!t, k + ' → scrolls to ' + (t ? (t.id || t.className || t.tagName) : 'nothing')); });
  ok(page.errors.length === errBefore, 'no script errors while clicking every item');

  /* quotes */
  I.get('quoteState').open = false; I.get('renderQuote')();
  let t = click('quote-WM');
  ok(!$('quote-box').hidden && t === $('quote-box') && flashed($('quote-no-WM')), 'WM opens the quote box and flashes the WM number');

  /* memos: no memo open → pick a quote first */
  I.get('memoState').d = null; I.get('renderMemo')();
  t = click('memo-k');
  const combo = $('quote-hist').parentNode.querySelector('input');
  ok(t === $('quote-memo').parentNode && flashed(combo) && flashed($('quote-memo')), 'ขย. with no memo open → "ใบที่ส่งออกแล้ว" and the memo button');
  /* memo open → the field of that book */
  I.set('quoteHist', { slot:'_quotes', next:{}, docs:[
    { no:'W001-70', series:'W', company:'บริษัท ทดสอบ จำกัด', date:'2026-11-20', lines:[{ id:'X1', name:'DRUG A', qty:1, price:10 }] } ] });
  I.get('quoteHistFill')();
  I.get('memoOpen')('W001-70');
  ok(!$('memo-box').hidden, 'made-up memo open');
  t = click('memo-p'); ok(t && t.getAttribute('data-f') === 'pNo' && flashed(t) && d.activeElement === t, 'ภย. → ภย. number field');
  t = click('memo-k'); ok(t && t.getAttribute('data-f') === 'kNo' && flashed(t), 'ขย. → ขย. number field');
  t = click('memo-y'); ok(t && t.getAttribute('data-act') === 'exp-y', 'ย. → export ย. button');

  /* inspection and creditor report */
  I.get('ryState').open = false; I.get('renderRy')();
  t = click('ry'); ok(!$('ry-box').hidden && t === $('ry-box'), 'รย. opens the inspection box');
  I.get('ryState').open = false; I.get('renderRy')();
  t = click('cr'); ok(!$('ry-box').hidden && t === $('cr-panel'), 'รายงานเจ้าหนี้ opens the box at the creditor report');

  /* data */
  $('shared-box').hidden = true;
  t = click('shared'); ok(!$('shared-box').hidden && t === $('filestatus'), 'ข้อมูลกลาง opens the shared-store box');
  t = click('shared'); ok(!$('shared-box').hidden, 'a second click keeps it open');
  t = click('backup'); ok(t === $('filestatus') && flashed($('btn-backup')), 'สำรอง flashes the backup button');
  t = click('import'); ok(t === $('dropzone') && flashed($('dropzone')), 'นำเข้าไฟล์ → drop zone');
  [['rate', 'rate-panel'], ['item', 'item-panel'], ['rep', 'rep-panel'], ['kpi', 'kpi-panel'], ['top10', 'top10-panel'], ['edned', 'edned-panel'],
   ['value', 'value-panel'], ['gpu', 'gpu-panel'], ['plantop', 'plantop-panel'], ['po', 'po-panel'], ['disp', 'disp-panel']].forEach(([k, id]) => {
    t = click(k); ok(t === $(id), k + ' → #' + id);
  });

  /* highlight */
  click('ry');
  ok(nav.querySelector('[data-go="ry"]').classList.contains('on'), 'clicked item highlighted');
  click('po');
  const po = nav.querySelector('[data-go="po"]');
  ok(po.classList.contains('on') && po.parentNode.classList.contains('on') && !nav.querySelector('[data-go="ry"]').classList.contains('on'), 'one item at a time; a line with two links lights up the whole line');

  ok(!page.errors.length, 'no script errors' + (page.errors.length ? ': ' + page.errors.join(' | ') : ''));
  console.log((fails ? 'FAILED ' + fails + ' of ' : 'passed all ') + (passes + fails) + ' checks');
  page.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
