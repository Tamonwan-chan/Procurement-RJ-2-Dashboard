/* Google Sheet + Apps Script จำลอง: รัน appscript/Code.gs ใน Node (ไม่ต้องต่ออินเทอร์เน็ต)
   ใช้: var srv = require('./gas-fake').create();  srv.call({ action:'ping' })  · srv.fetch = แทน window.fetch ของหน้าโปรแกรม
   srv.offline = true → fetch ล้มเหลวเหมือนไม่มีอินเทอร์เน็ต */
const fs = require('fs'), path = require('path'), vm = require('vm');

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

function create(codePath){
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
  vm.runInContext(fs.readFileSync(codePath || path.join(__dirname, '..', 'appscript', 'Code.gs'), 'utf8'), ctx);
  const srv = {
    ctx, sheets, props, offline: false, calls: [],
    tab: name => sheets.find(s => s.name === name),
    call: o => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ key: props.ACCESS_KEY, by: 'ทดสอบ' }, o)) } }).text),
    /* window.fetch ของหน้าโปรแกรม: POST text/plain → doPost (ข้าม 302 ของ Google) */
    fetch(url, init){
      if(srv.offline) return Promise.reject(new TypeError('Failed to fetch'));
      const body = String(init && init.body || '');
      try{ srv.calls.push(JSON.parse(body).action); }catch(e){}
      const text = ctx.doPost({ postData: { contents: body } }).text;
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(text), json: () => Promise.resolve(JSON.parse(text)) });
    }
  };
  return srv;
}

module.exports = { create, Sheet };
