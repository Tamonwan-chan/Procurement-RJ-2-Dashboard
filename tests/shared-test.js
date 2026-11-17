/* ทดสอบหน้าโปรแกรมกับข้อมูลกลาง (#44): 2 เครื่องจำลอง + Code.gs บน Sheet จำลอง · ข้อมูลสมมติทั้งหมด
   ใช้: node shared-test.js   (ไม่ต้องใช้ไฟล์ HIS ไม่ต้องต่ออินเทอร์เน็ต) */
const assert = require('assert');
const h = require('./harness');
const srv = require('./gas-fake').create();
srv.ctx.setup();
const KEY = srv.props.ACCESS_KEY, URL = 'https://script.google.com/macros/s/TEST/exec';

const backup = { app: 'rj2-procurement-backup', version: 1, savedAt: '2026-11-17T00:00:00.000Z', localStorage: { 'rj2-quote-next-W': 'W003-70' },
  records: [
    { slot: '_quotes', next: { W: 'W003-70' }, docs: [
      { no: 'W002-70', series: 'W', company: 'บริษัท ทดสอบ ข จำกัด', date: '2026-11-02', at: '2026-11-02T03:00:00.000Z', file: 'x.xlsx', revisions: 1,
        lines: [{ id: 'T2', name: 'TESTDRUG B 10 MG', qty: 2, price: 107, unitS: 'เม็ด', unitP: 'กล่อง', pack: 10 }] },
      { no: 'W001-70', series: 'W', company: 'บริษัท ทดสอบ ก จำกัด', date: '2026-11-01', at: '2026-11-01T03:00:00.000Z', file: 'x.xlsx', revisions: 1,
        lines: [{ id: 'T1', name: 'TESTDRUG A 5 MG', qty: 3, price: 214, unitS: 'เม็ด', unitP: 'กล่อง', pack: 100 }] }] },
    { slot: '_memoset', people: [
        { id: 'pa', name: 'ผู้ทดสอบ หนึ่ง', pos: 'เภสัชกร', sign: '', roles: { committee: true, chair: true } },
        { id: 'pb', name: 'ผู้ทดสอบ สอง', pos: 'เภสัชกร', sign: '', roles: { committee: true } }],
      planRef: {}, next: { 'ภย': '0005/2569', 'ขย': '0003/2570' }, pick: {}, garuda: null, rolesV: 2,
      org: { hosp: 'โรงพยาบาลทดสอบ', dept: 'กลุ่มงานทดสอบ', lineP: 'บรรทัดทดสอบ', lineK: 'บรรทัดทดสอบ' } }
  ] };

const wait = ms => new Promise(r => setTimeout(r, ms));
function until(cond, ms, what){
  const t0 = Date.now();
  return new Promise((ok, no) => (function tick(){ if(cond()) return ok(); if(Date.now() - t0 > (ms || 8000)) return no(new Error('timed out: ' + what)); setTimeout(tick, 50); })());
}
function device(name){
  return h.load({ fetch: srv.fetch }).then(p => {
    const w = p.window, d = p.document;
    p.downloads = [];
    w.URL.createObjectURL = () => 'blob:test'; w.URL.revokeObjectURL = () => {};
    w.Element.prototype.scrollIntoView = function(){};          /* jsdom ไม่มี */
    w.TextEncoder = w.TextEncoder || require('util').TextEncoder;
    w.HTMLAnchorElement.prototype.click = function(){ if(this.download) p.downloads.push(this.download); };
    p.name = name;
    p.$ = id => d.getElementById(id);
    p.click = el => (typeof el === 'string' ? p.$(el) : el).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    p.set = (id, v) => { const el = p.$(id); el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); el.dispatchEvent(new w.Event('change', { bubbles: true })); };
    p.status = () => p.$('sh-status').textContent;
    p.connect = () => {
      p.click('btn-shared');
      p.set('sh-url', URL); p.set('sh-key', '  ' + KEY + '\n'); p.set('sh-by', name);
      p.click('sh-connect');
      return until(() => /เชื่อมต่อแล้ว|ไม่สำเร็จ/.test(p.status()), 8000, name + ' connect');
    };
    p.restore = data => {
      const input = p.$('backup-file'), f = new w.File([JSON.stringify(data)], 'backup.json');
      Object.defineProperty(input, 'files', { value: [f], configurable: true });
      input.dispatchEvent(new w.Event('change'));
      return until(() => /กู้คืน/.test(p.text('#importnote') + p.text('#errorbar')), 5000, 'restore');
    };
    p.openMemo = no => { p.set('quote-hist', no); p.click('quote-memo'); return until(() => p.$('memo-box').querySelector('[data-act="exp-p"]'), 3000, 'memo ' + no); };
    p.memoMsg = () => p.text('#memo-sum');
    p.sync = () => { const pulls = () => srv.calls.filter(c => c === 'pull').length, n = pulls(); p.click('sh-sync');
      return until(() => pulls() > n && !/กำลังซิงก์/.test(p.status()), 5000, name + ' sync').then(() => wait(50)); };
    p.exportP = () => { const n = p.downloads.length; p.click(p.$('memo-box').querySelector('[data-act="exp-p"]'));
      return until(() => p.downloads.length > n || /ยังไม่ได้ส่งออก|ไม่สำเร็จ/.test(p.memoMsg()), 5000, 'export p · ' + p.memoMsg().slice(-200) + ' · ' + p.errors.join(' | ').slice(0, 600)).then(() => p.downloads.length > n); };
    p.pNo = () => p.$('memo-box').querySelector('[data-f="pNo"]').value;
    return p;
  });
}
const rows = tab => srv.tab(tab).v.slice(1);
const counter = s => (rows('เลขที่').find(r => r[0] === s) || [])[1];
const quoteRow = no => { const t = srv.tab('ใบเสนอราคา'), head = t.v[0]; const r = rows('ใบเสนอราคา').find(x => x[head.indexOf('id')] === no); return r && Object.fromEntries(head.map((k, i) => [k, r[i]])); };

let A, B;
device('เครื่อง ก').then(p => { A = p; return A.restore(backup); }).then(() => {
  assert.ok(/กู้คืนข้อมูลแล้ว/.test(A.text('#importnote')), 'restore on A');
  assert.strictEqual(A.$('btn-shared').textContent, 'ข้อมูลกลาง');
  return A.connect();
}).then(() => {
  // 1. เครื่องแรก + Sheet ว่าง → ส่งข้อมูลตั้งต้นขึ้น (confirm = ตกลง)
  assert.ok(/ส่งข้อมูลของเครื่องนี้ขึ้น/.test(A.status()), A.status());
  assert.strictEqual(rows('ใบเสนอราคา').length, 2);
  assert.strictEqual(rows('รายชื่อ').length, 2);
  assert.strictEqual(counter('W'), 'W003-70'); assert.strictEqual(counter('ภย'), '0005/2569'); assert.strictEqual(counter('ขย'), '0003/2570');
  assert.strictEqual(quoteRow('W001-70')['บริษัท'], 'บริษัท ทดสอบ ก จำกัด');
  assert.ok(/เชื่อมต่อแล้ว/.test(A.$('btn-shared').textContent));
  return device('เครื่อง ข');
}).then(p => { B = p; return B.connect(); }).then(() => {
  // 2. เครื่องที่สองเข้าร่วม: ได้ข้อมูลกลางทั้งหมด เลขถัดไปตาม Sheet
  assert.ok(/ใช้ข้อมูลกลางแทน/.test(B.status()), B.status());
  B.click('btn-quote'); A.click('btn-quote');
  assert.deepStrictEqual([].map.call(B.$('quote-hist').options, o => o.value).filter(Boolean).sort(), ['W001-70', 'W002-70']);
  assert.strictEqual(B.$('quote-no-W').value, 'W003-70');
  // 3. B ออก ภย. ใบแรก: จองเลขที่ Sheet
  return B.openMemo('W001-70');
}).then(() => {
  assert.strictEqual(B.pNo(), '0005/2569');
  return B.exportP();
}).then(ok => {
  assert.ok(ok, 'B exported: ' + B.memoMsg());
  assert.strictEqual(counter('ภย'), '0006/2569');
  return until(() => (quoteRow('W001-70') || {})['เลข ภ.'] === 'ภย.0005/2569', 5000, 'issued pushed');
}).then(() => {
  // 4. A ยังไม่ซิงก์ (จำเลขถัดไปเดิม 0005): ออก ภย. ไม่ได้ เพราะ B ใช้เลขนั้นไปแล้ว
  return A.openMemo('W002-70');
}).then(() => {
  assert.strictEqual(A.pNo(), '0005/2569');
  return A.exportP();
}).then(ok => {
  assert.ok(!ok, 'A must not export a number B took');
  assert.ok(/เพิ่งออกเลข/.test(A.memoMsg()) && /0006\/2569/.test(A.memoMsg()), A.memoMsg());
  assert.ok(A.$('memo-sum').querySelector('.sh-refused'), 'refusal shown as a red box');
  assert.strictEqual(counter('ภย'), '0006/2569');
  return until(() => A.errors.some(e => /^alert: ยังไม่ได้ส่งออก/.test(e)), 2000, 'refusal pops up');
}).then(() => {
  assert.ok(A.$('memo-box').querySelector('[data-f="pNo"]').classList.contains('sh-flash'), 'number field flashes');
  // 5. A ซิงก์แล้วเปิดใหม่: เลขที่เติมอัตโนมัติขยับเป็นเลขถัดไป ส่งออกได้
  return A.sync();
}).then(() => A.openMemo('W002-70')).then(() => {
  assert.strictEqual(A.pNo(), '0006/2569');
  return A.exportP();
}).then(ok => {
  assert.ok(ok, 'A exported after sync: ' + A.memoMsg());
  assert.strictEqual(counter('ภย'), '0007/2569');
  // 6. A พิมพ์เลขของใบอื่นเอง: ไม่ให้ส่งออก
  const el = A.$('memo-box').querySelector('[data-f="pNo"]'); el.value = '0005/2569'; el.dispatchEvent(new A.window.Event('input', { bubbles: true }));
  return A.exportP();
}).then(ok => {
  assert.ok(!ok, 'A must not reuse W001-70 number');
  assert.ok(/ออกไปแล้วกับใบ W001-70/.test(A.memoMsg()), A.memoMsg());
  // 7. B พิมพ์ซ้ำใบเดิมของตัวเอง (เลขต่ำกว่าเลขถัดไป): ได้ ไม่จองเลขใหม่
  return B.sync().then(() => B.openMemo('W001-70'));
}).then(() => {
  assert.strictEqual(B.pNo(), '0005/2569');
  const before = srv.calls.filter(c => c === 'reserve').length;
  return B.exportP().then(ok => { assert.ok(ok, 'reprint: ' + B.memoMsg()); assert.strictEqual(srv.calls.filter(c => c === 'reserve').length, before); });
}).then(() => {
  // 8. ออฟไลน์: ออกเลขใหม่ไม่ได้ ปุ่มบอกสถานะ
  srv.offline = true;
  return A.openMemo('W002-70').then(() => {
    const el = A.$('memo-box').querySelector('[data-f="pNo"]'); el.value = '0007/2569'; el.dispatchEvent(new A.window.Event('input', { bubbles: true }));
    return A.exportP();
  });
}).then(ok => {
  assert.ok(!ok); assert.ok(/ติดต่อข้อมูลกลางไม่ได้/.test(A.memoMsg()), A.memoMsg());
  assert.ok(/ออฟไลน์/.test(A.$('btn-shared').textContent));
  srv.offline = false;
  // 9. เชื่อมต่ออยู่ กู้คืนจากไฟล์ไม่ได้
  const input = A.$('backup-file'); Object.defineProperty(input, 'files', { value: [new A.window.File([JSON.stringify(backup)], 'b.json')], configurable: true });
  input.dispatchEvent(new A.window.Event('change'));
  return until(() => /เชื่อมต่อข้อมูลกลางอยู่/.test(A.text('#errorbar')), 3000, 'restore blocked');
}).then(() => {
  // 10. รหัสผิด: เชื่อมต่อไม่สำเร็จ ไม่บันทึกค่า
  return device('เครื่อง ค').then(C => {
    C.click('btn-shared'); C.set('sh-url', URL); C.set('sh-key', 'wrong'); C.set('sh-by', 'ค'); C.click('sh-connect');
    return until(() => /ไม่สำเร็จ/.test(C.status()), 3000, 'bad key').then(() => {
      assert.ok(/รหัสเข้าถึงไม่ถูกต้อง/.test(C.status()), C.status());
      assert.strictEqual(C.window.localStorage.getItem('rj2-shared-key'), null);
      assert.deepStrictEqual(C.errors, []); C.close();
    });
  });
}).then(() => {
  /* ข้อ 4, 6, 8 = ยังไม่ได้ส่งออก มีหน้าต่างแจ้ง 3 ครั้ง นอกนั้นต้องไม่มี error */
  const popups = A.errors.filter(e => /^alert: ยังไม่ได้ส่งออก/.test(e));
  assert.strictEqual(popups.length, 3, popups.join('\n'));
  assert.deepStrictEqual(A.errors.filter(e => popups.indexOf(e) < 0), []); assert.deepStrictEqual(B.errors, []);
  const log = rows('บันทึกการแก้').map(r => r[1] + ' ' + r[2] + ' ' + r[3] + ' ' + r[4]);
  assert.ok(log.some(l => /^เครื่อง ข ออกเลข ภย 0006\/2569/.test(l)), log.join('\n'));
  console.log('all shared-store checks passed · Sheet log rows: ' + log.length + ' · downloads A ' + A.downloads.length + ', B ' + B.downloads.length);
  A.close(); B.close(); process.exit(0);
}).catch(err => {
  console.error(err && err.stack || err);
  [A, B].forEach(p => p && p.errors.length && console.error(p.name, p.errors));
  process.exit(1);
});
