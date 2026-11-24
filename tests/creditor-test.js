/* Creditor report (#55) from made-up deliveries: tick boxes, number checks, the .xlsx cells, reprint, cancel.
   Run: node creditor-test.js  (needs exceljs, the same 4.4.0 the page loads from cdnjs) */
const REPO = require('path').resolve(__dirname, '..'), OUT = require('os').tmpdir();
const h = require(REPO + '/tests/harness');
const ExcelJS = require('exceljs');
const fs = require('fs');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if(!c) fails++; };
(async () => {
  const page = await h.load({ inside:true }), I = page.inside, w = page.window, d = page.document;
  w.ExcelJS = ExcelJS;
  const saved = [];
  I.set('saveBlob', function(blob, name){ saved.push({ blob, name }); });
  const st = I.get('state'); st.lookups = st.lookups || {};
  st.lookups.reg = st.lookups.reg || {}; st.lookups.med = st.lookups.med || {};
  st.lookups.po = [
    { no:'P001', date:20261102, company:'บริษัท ทดสอบหนึ่ง จำกัด', inv:'INV-1', id:'X1', name:'DRUG ALPHA 10 MG', qty:10, value:1000 },
    { no:'P001', date:20261102, company:'บริษัท ทดสอบหนึ่ง จำกัด', inv:'INV-1', id:'X2', name:'DRUG BETA', qty:5, value:250.5 },
    { no:'P002', date:20261103, company:'บริษัท ทดสอบสอง จำกัด', inv:'INV-2', id:'X3', name:'DRUG GAMMA', qty:1, value:999 },
    { no:'P003', date:20261104, company:'บริษัท ทดสอบสาม จำกัด', inv:'INV-3', id:'X4', name:'GLOVE', qty:1, value:50 },
    { no:'P004', date:20261105, company:'บริษัท ทดสอบสี่ จำกัด', inv:'INV-4', id:'X5', name:'DRUG DELTA', qty:1, value:10 }
  ];
  const seed = I.get('memoSeed')();
  seed.people = [{ id:'s1', name:'นางสาวทดสอบ ผู้ส่ง', pos:'เภสัชกร', sign:'เภสัชกรชำนาญการ', roles:{ crSend:true } }];
  const rec = (no, rNo, kNo, kind) => ({ no, kind:kind || 'drug', rNo, rDate:'2026-11-10', kNo, kDate:'2026-11-01', company:'บริษัท ' + no, bill:'B-' + no, billDate:'', inspect:'2026-11-10', subj:'', cat:'', committee:['', '', ''], skip:{}, done:true });
  seed.ry = { P001:rec('P001', '0012/2569', '0030/2570'), P002:rec('P002', '0011/2569', '0031/2570'), P003:rec('P003', '0005/2569', '0002/2570', 'non') };
  seed.ry.P002.skip = {};
  I.set('memoSet', seed);
  const ryState = I.get('ryState'); ryState.open = true; I.get('renderRy')();
  const box = d.getElementById('ry-box');
  const boxes = [...box.querySelectorAll('[data-cr]')];
  ok(boxes.length === 4, 'tick box on every delivery row (' + boxes.length + ')');
  ok(boxes.filter(b => !b.disabled).length === 3, 'only deliveries with รย. issued are tickable');
  ok(box.querySelector('thead th').textContent === 'เจ้าหนี้' && box.querySelectorAll('thead th')[1].textContent === 'สถานะ', 'tick + status columns at the front');
  const tick = no => { const b = box.querySelector('[data-cr="' + no + '"]'); b.checked = true; b.dispatchEvent(new w.Event('change', { bubbles:true })); };
  tick('P001'); tick('P003');
  ok(/แยกใบตามหมวดพัสดุ/.test(d.getElementById('cr-panel').textContent), 'mixing รย. and รยว. is refused');
  const un = box.querySelector('[data-cr="P003"]'); un.checked = false; un.dispatchEvent(new w.Event('change', { bubbles:true }));
  tick('P002');
  const panel = d.getElementById('cr-panel');
  ok(/เลขชุด ภ- ควรเป็นรูปแบบ/.test(panel.textContent), 'first report asks for the ภ- number');
  const cs = I.get('crState');
  cs.no = '0091/2569'; cs.doc = '25'; cs.date = '2026-11-19'; cs.noAuto = false;
  cs.fine.P001 = '120';
  I.get('crPanel')();
  const order = [...panel.querySelectorAll('tbody tr')].slice(0, 2).map(tr => tr.children[7].textContent);
  ok(order.join() === 'รย.0011/2569,รย.0012/2569', 'rows ordered by รย. number (' + order.join() + ')');
  panel.querySelector('[data-cact="export"]').click();
  for(let i = 0; i < 50 && !saved.length; i++) await new Promise(r => setTimeout(r, 50));
  ok(saved.length === 1, 'one file saved');
  ok(saved[0] && saved[0].name === 'รายงานเจ้าหนี้การค้า.การเงิน -19.11.69 (25ภ.91).xlsx', 'file name: ' + (saved[0] && saved[0].name));
  const buf = Buffer.from(await new Promise((res, rej) => { const fr = new w.FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsArrayBuffer(saved[0].blob); }));
  fs.writeFileSync(OUT + '/creditor-test.xlsx', buf);
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf); const ws = wb.worksheets[0];
  const v = a => { const x = ws.getCell(a).value; return x && x.formula ? '=' + x.formula : (x && x.toISOString) ? x.toISOString().slice(0, 10) : x; };
  ok(v('I1') === 'ภ-0091/2569' && v('H1') === 'เลขชุด :', 'number cell');
  ok(v('B1') === '2026-11-19', 'print date');
  ok(v('B5') === 'เงินบำรุง โรงพยาบาลราชวิถี 2 (รังสิต) หมวดค่าวัสดุ' && v('H5') === 'เงินบำรุงโรงพยาบาลราชวิถี 2 (รังสิต)', 'fund lines');
  ok(v('H6') === 'วัสดุยาและเวชภัณฑ์' && v('D8') === 'วัสดุยาและเวชภัณฑ์', 'หมวดพัสดุ');
  ok(v('B8') === 'ขย.0031/2570' && v('I8') === 'รย.0011/2569' && v('B9') === 'ขย.0030/2570', 'memo and inspection numbers');
  ok(v('G9') === 1250.5 && v('G8') === 999, 'amounts from รย. rows');
  ok(v('H9') === 120, 'fine typed before export');
  ok(v('F9') === 'DRUG ALPHA 10 MG, DRUG BETA', 'item names');
  ok(v('C10') === 2 && v('D10') === 'ใบ' && v('E10') === 'รวมทั้งสิ้น' && v('G10') === '=SUM(G8:G9)', 'total row');
  ok(v('B12') === 'ผู้ส่ง' && v('G12') === 'ผู้รับ' && v('C13') === '(นางสาวทดสอบ ผู้ส่ง)' && v('C14') === 'เภสัชกรชำนาญการ', 'signatures');
  ok(ws.pageSetup.orientation === 'landscape' && ws.pageSetup.paperSize === 9, 'A4 landscape');
  ok(ws.getCell('A7').font.name === 'TH SarabunPSK' && ws.getCell('A7').border.top.style === 'thin', 'font and borders');
  const ms = I.get('memoSet');
  ok(ms.ry.P001.cr && ms.ry.P001.cr.no === '0091/2569' && ms.ry.P002.cr.order === 0, 'report stored on both deliveries');
  ok(ms.next['ภ'] === '0092/2569', 'next ภ- number ' + ms.next['ภ']);
  ok(/รายงาน 25ภ\.91/.test(box.querySelector('[data-cr="P001"]').closest('tr').lastElementChild.textContent), 'report number at the end of the row');
  ok(box.querySelector('[data-cr="P001"]').disabled, 'reported delivery no longer tickable');
  tick('P003');
  ok(I.get('crState').no === '0092/2569' && I.get('crState').doc === '26', 'next report pre-filled 0092/2569 · 26');
  ok(/วัสดุเวชภัณฑ์ไม่ใช่ยา/.test(d.querySelector('[data-cf="cat"]').value), 'รยว. report gets the non-drug หมวด');
  /* edit the open รย. after the report: the tag must survive */
  const rd = JSON.parse(JSON.stringify(I.get('memoSet').ry.P001)); delete rd.cr; I.get('ryState').d = rd; rd.subj = 'แก้'; I.get('ryStore')(rd);
  ok(I.get('memoSet').ry.P001.cr && I.get('memoSet').ry.P001.cr.no === '0091/2569', 'editing the รย. keeps the report tag');
  /* reprint */
  saved.length = 0; d.querySelector('[data-cact="again"]').click();
  for(let i = 0; i < 50 && !saved.length; i++) await new Promise(r => setTimeout(r, 50));
  ok(saved.length === 1 && saved[0].name === 'รายงานเจ้าหนี้การค้า.การเงิน -19.11.69 (25ภ.91).xlsx' && I.get('memoSet').next['ภ'] === '0092/2569', 'reprint keeps number and counter');
  /* ภ- restarts on 1 Jan (by พ.ศ., his answer to question 40) */
  ok(I.get('crNextNo')('2026-12-30') === '0092/2569' && I.get('crNextNo')('2027-01-04') === '0001/2570', 'ภ- restarts at 0001 in the new พ.ศ.');
  /* bill comes later: add a ticked delivery to the issued report (question 41) */
  const ms2 = I.get('memoSet'); ms2.ry.P004 = rec('P004', '0013/2569', '0032/2570'); I.get('renderRy')();
  tick('P004'); tick('P003');
  w.confirm = () => true; saved.length = 0;
  d.querySelector('[data-cact="add"]').click();
  ok(!saved.length && /ยังไม่ได้เพิ่ม/.test(d.getElementById('cr-panel').textContent) && !ms2.ry.P004.cr, 'adding a รยว. to a รย. report is refused');
  const un3 = box.querySelector('[data-cr="P003"]'); un3.checked = false; un3.dispatchEvent(new w.Event('change', { bubbles:true }));
  d.querySelector('[data-cact="add"]').click();
  for(let i = 0; i < 50 && !saved.length; i++) await new Promise(r => setTimeout(r, 50));
  ok(ms2.ry.P004.cr && ms2.ry.P004.cr.no === '0091/2569' && ms2.ry.P004.cr.doc === '25' && ms2.ry.P004.cr.order === 2, 'added delivery joins the report at the end');
  ok(saved.length === 1 && saved[0].name === 'รายงานเจ้าหนี้การค้า.การเงิน -19.11.69 (25ภ.91).xlsx' && ms2.next['ภ'] === '0092/2569', 'whole report re-exported, same number, counter unchanged');
  if(saved.length){
    const b2 = Buffer.from(await new Promise((res, rej) => { const fr = new w.FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsArrayBuffer(saved[0].blob); }));
    const wb2 = new ExcelJS.Workbook(); await wb2.xlsx.load(b2); const ws2 = wb2.worksheets[0];
    const v2 = a => { const x = ws2.getCell(a).value; return x && x.formula ? '=' + x.formula : x; };
    ok(v2('I10') === 'รย.0013/2569' && v2('G10') === 10 && v2('C11') === 3 && v2('G11') === '=SUM(G8:G10)', 'added row and total in the file');
  }
  /* at most 15 deliveries per report, like his Excel form (24 Nov 2026) */
  const K = I.get('MEMO_KIND').drug, hOk = { no:'0200/2569', doc:'30', date:'2026-11-24', sender:'s1' };
  const fake = n => Array.from({ length:n }, (_, i) => ({ k:K, total:1, fine:'', ry:'รย.' + i }));
  ok(!I.get('crWarn')(fake(15), hOk).block.some(m => /ไม่เกิน 15/.test(m)) && I.get('crWarn')(fake(16), hOk).block.some(m => /ไม่เกิน 15 ใบ \(ติ๊กไว้ 16\)/.test(m)), '15 per report allowed, 16 refused');
  /* budget file name */
  ok(I.get('crFileName')({ fund:'budget', date:'2026-09-30', doc:'52', no:'0118/2569' }) === 'รายงานเจ้าหนี้การค้า. (งบประมาณ) 30.9.69 (52ภ.118).xlsx', 'budget file name');
  /* cancel */
  w.confirm = () => true; d.querySelector('[data-cact="cancel"]').click();
  ok(!I.get('memoSet').ry.P001.cr && !I.get('memoSet').ry.P002.cr && !I.get('memoSet').ry.P004.cr, 'cancel frees every delivery in the report');
  console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
