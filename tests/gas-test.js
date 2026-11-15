/* ทดสอบ appscript/Code.gs กับ Google Sheet จำลอง (ไม่ต้องต่ออินเทอร์เน็ต) · ใช้: node gas-test.js [path ของ Code.gs] */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
function Sheet(name){ this.name = name; this.v = []; this.maxRows = 1000; this.prot = []; }
Sheet.prototype = {
  getName(){ return this.name; }, getLastRow(){ return this.v.length; }, getMaxRows(){ return this.maxRows; }, getMaxColumns(){ return 26; },
  insertRowsAfter(a, n){ this.maxRows += n; },
  getRange(r, c, nr, nc){ const sh = this; const R = { setValues(vals){ vals.forEach((row, i) => { while(sh.v.length < r + i) sh.v.push([]); row.forEach((x, j) => { sh.v[r - 1 + i][c - 1 + j] = x; }); }); return R; },
    setNumberFormat(){ return R; }, setFontWeight(){ return R; } }; return R; },
  getDataRange(){ const w = Math.max(0, ...this.v.map(r => r.length)); const vals = this.v.map(r => { const o = r.slice(); while(o.length < w) o.push(''); return o.map(x => x === undefined ? '' : x); }); return { getValues: () => vals }; },
  setFrozenRows(){}, getProtections(){ return this.prot; },
  protect(){ const p = { setDescription(){ return p; }, setWarningOnly(){ return p; } }; this.prot.push(p); return p; }
};
const sheets = [new Sheet('ชีต1')];
const ss = { getName: () => 'test', getSheetByName: n => sheets.find(s => s.name === n) || null,
  insertSheet(n){ const s = new Sheet(n); sheets.push(s); return s; }, getSheets: () => sheets.slice(), deleteSheet(s){ sheets.splice(sheets.indexOf(s), 1); } };
const props = {};
let uuid = 0;
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ss, getUi(){ throw new Error('no ui'); }, ProtectionType: { SHEET: 'SHEET' } },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty(k, v){ props[k] = v; } }) },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock(){} }) },
  Utilities: { getUuid: () => 'aaaaaaaa-bbbb-cccc-dddd-' + String(++uuid).padStart(12, '0') },
  Logger: { log(){} },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ setMimeType(){ return { text: t }; } }) }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[2] || require('path').join(__dirname, '..', 'appscript', 'Code.gs'), 'utf8'), ctx);
ctx.setup();
assert.deepStrictEqual(sheets.map(s => s.name), ['ใบเสนอราคา', 'ตรวจรับ', 'รายชื่อ', 'ตั้งค่า', 'เลขที่', 'บันทึกการแก้']);
const key = props.ACCESS_KEY; assert.ok(key && key.length >= 40);
const call = o => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ key, by: 'ทดสอบ' }, o)) } }).text);
assert.strictEqual(JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ key: 'x', action: 'ping' }) } }).text).error, 'key');
assert.strictEqual(JSON.parse(ctx.doGet({ parameter: { key } }).text).ok, true);
// new record
let r = call({ action: 'put', records: [{ kind: 'quote', id: 'W001-70', baseRev: 0, data: { no: 'W001-70', lines: [1, 2] }, summary: { 'เลขที่': 'W001-70', 'บริษัท': 'ก' } }] });
assert.strictEqual(r.results[0].status, 'ok'); assert.strictEqual(r.results[0].rev, 1);
// edit with right base
r = call({ action: 'put', records: [{ kind: 'quote', id: 'W001-70', baseRev: 1, data: { no: 'W001-70', lines: [1] } }] });
assert.strictEqual(r.results[0].rev, 2);
// stale edit → conflict, not overwritten
r = call({ action: 'put', records: [{ kind: 'quote', id: 'W001-70', baseRev: 1, data: { stale: true } }] });
assert.strictEqual(r.results[0].status, 'conflict'); assert.deepStrictEqual(r.results[0].data.lines, [1]);
// new-record collision: two devices both create W002-70 with baseRev 0
call({ action: 'put', records: [{ kind: 'quote', id: 'W002-70', baseRev: 0, data: { a: 1 } }] });
r = call({ action: 'put', records: [{ kind: 'quote', id: 'W002-70', baseRev: 0, data: { b: 1 } }] });
assert.strictEqual(r.results[0].status, 'conflict');
// bad kind / too big
r = call({ action: 'put', records: [{ kind: 'nope', id: 'x' }, { kind: 'quote', id: 'big', data: 'x'.repeat(50000) }] });
assert.deepStrictEqual(r.results.map(x => x.status), ['invalid', 'too-big']);
// reserve: compare-and-set
r = call({ action: 'reserve', series: 'W', expect: '', next: 'W002-70' }); assert.strictEqual(r.status, 'ok');
r = call({ action: 'reserve', series: 'W', expect: '', next: 'W002-70' }); assert.strictEqual(r.status, 'conflict'); assert.strictEqual(r.current, 'W002-70');
r = call({ action: 'reserve', series: 'W', expect: 'W002-70', next: 'W003-70' }); assert.strictEqual(r.status, 'ok');
r = call({ action: 'reserve', series: 'ขย', expect: '', next: '0002/2570' }); assert.strictEqual(r.status, 'ok');
// pull
r = call({ action: 'pull' });
assert.strictEqual(r.records.length, 2); assert.strictEqual(r.counters.W.next, 'W003-70'); assert.strictEqual(r.counters['ขย'].next, '0002/2570');
const q = sheets[0].v; assert.strictEqual(q[1][0], 'W001-70'); assert.strictEqual(q[1][3], 'ก');
assert.ok(sheets[5].v.length >= 7, 'log rows');
assert.strictEqual(call({ action: 'zzz' }).error, 'action');
console.log('all checks passed; log rows:', sheets[5].v.length - 1);
