/**
 * @OnlyCurrentDoc
 *
 * ที่เก็บข้อมูลกลาง ระบบจัดซื้อยาและเวชภัณฑ์ โรงพยาบาลราชวิถี 2 (รังสิต) · issue #44
 * Google Sheet ของบัญชีคลัง (inventory) + web app ที่หน้าโปรแกรมเรียกใช้
 *
 * ห้ามใส่ในไฟล์นี้: ข้อมูลจริง รหัสเข้าถึง ที่อยู่ web app (repo เป็นสาธารณะ)
 * รหัสเข้าถึงอยู่ใน Script Properties (ACCESS_KEY) เท่านั้น สร้างด้วย setup() / newKey()
 * deploy โดยบัญชีคลังเท่านั้น (Execute as: Me) เพื่อให้ทำงานในนามบัญชีคลัง ไม่ใช่บัญชีส่วนตัว
 *
 * หน้าโปรแกรมส่ง POST (Content-Type: text/plain) เป็น JSON: { key, by, action, ... }
 *   ping                                   → ตรวจรหัส
 *   pull                                   → ข้อมูลทั้งหมด + เลขที่ถัดไป
 *   put     { records:[{ kind, id, baseRev, data, summary, deleted, force }] }
 *           บันทึกทีละรายการ · baseRev ไม่ตรงกับใน Sheet = มีคนแก้ไปก่อน → conflict (ไม่เขียนทับ)
 *   reserve { series, expect, next }       → จองเลขที่ แบบเทียบก่อนเขียน (compare-and-set) ภายใต้ lock
 *           รูปแบบเลข (W001-70, 0001/2570 ขึ้นปีใหม่) คิดที่หน้าโปรแกรมที่เดียว script แค่กันชนกัน
 */

var API_VERSION = 1;
var SYS_COLS = ['id', 'rev', 'แก้ล่าสุด', 'โดย', 'ลบแล้ว', 'data'];
var TABS = {
  quote:   { name:'ใบเสนอราคา', cols:['เลขที่', 'ชุด', 'วันที่', 'บริษัท', 'จำนวนรายการ', 'ยอดเงิน', 'เลข ภ.', 'เลข ข. / ย.'] },
  ry:      { name:'ตรวจรับ', cols:['เลขที่', 'เลขรับ (minpno)', 'วันที่', 'บริษัท', 'ตามใบ ย.'] },
  person:  { name:'รายชื่อ', cols:['ชื่อ', 'ตำแหน่ง'] },
  setting: { name:'ตั้งค่า', cols:['หัวข้อ'] }
};
var COUNTER_TAB = 'เลขที่', COUNTER_COLS = ['ชุดเลข', 'เลขถัดไป', 'แก้ล่าสุด', 'โดย'];
var LOG_TAB = 'บันทึกการแก้', LOG_COLS = ['เวลา', 'โดย', 'การทำ', 'ชนิด', 'id', 'รายละเอียด'];
var MAX_CELL = 49000;   /* Sheets รับได้ 50,000 ตัวอักษรต่อช่อง */

/* ---------- เมนูใน Sheet (บัญชีคลังใช้) ---------- */

function onOpen(){
  SpreadsheetApp.getUi().createMenu('ระบบจัดซื้อ')
    .addItem('ตั้งค่าครั้งแรก (สร้างแท็บและรหัสเข้าถึง)', 'setup')
    .addItem('แสดงรหัสเข้าถึง', 'showKey')
    .addItem('สร้างรหัสเข้าถึงใหม่ (ทุกเครื่องต้องใส่ใหม่)', 'newKey')
    .addToUi();
}

function setup(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(function(k){ ensureTab_(ss, TABS[k].name, TABS[k].cols.concat(SYS_COLS)); });
  ensureTab_(ss, COUNTER_TAB, COUNTER_COLS);
  ensureTab_(ss, LOG_TAB, LOG_COLS);
  /* ลบแท็บเปล่าที่ Google สร้างให้ตอนเริ่ม (Sheet1 / ชีต1) */
  ss.getSheets().forEach(function(sh){
    if(/^(Sheet|ชีต)\s*1$/.test(sh.getName()) && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
  var props = PropertiesService.getScriptProperties();
  if(!props.getProperty('ACCESS_KEY')) props.setProperty('ACCESS_KEY', makeKey_());
  showKey();
}

function showKey(){
  var key = PropertiesService.getScriptProperties().getProperty('ACCESS_KEY') || '(ยังไม่ได้ตั้งค่า กด ตั้งค่าครั้งแรก)';
  say_('รหัสเข้าถึง (ส่งให้ผู้ใช้ทางส่วนตัว ห้ามโพสต์ในกลุ่ม):\n\n' + key);
}

function newKey(){
  PropertiesService.getScriptProperties().setProperty('ACCESS_KEY', makeKey_());
  log_('ระบบ', 'สร้างรหัสใหม่', '', '', '');
  showKey();
}

function makeKey_(){ return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8); }

function say_(msg){
  Logger.log(msg);
  try{ SpreadsheetApp.getUi().alert(msg); }catch(e){}   /* รันจากหน้า script editor ไม่มีหน้าต่าง ดูใน Execution log แทน */
}

function ensureTab_(ss, name, cols){
  var sh = ss.getSheetByName(name);
  if(!sh) sh = ss.insertSheet(name);
  sh.getRange(1, 1, sh.getMaxRows(), Math.max(sh.getMaxColumns(), cols.length)).setNumberFormat('@');   /* เก็บเป็นข้อความ: 0001/2570 จะไม่กลายเป็นวันที่ */
  sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
  sh.setFrozenRows(1);
  if(!sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).length){
    sh.protect().setDescription('โปรแกรมจัดซื้อเขียนแท็บนี้ อย่าแก้ด้วยมือ').setWarningOnly(true);
  }
  return sh;
}

/* ---------- web app ---------- */

function doGet(e){
  var p = e && e.parameter || {};
  return out_(handle_({ key:p.key, action:p.action || 'ping', by:p.by }));
}

function doPost(e){
  var req;
  try{ req = JSON.parse(e.postData.contents); }catch(err){ return out_({ ok:false, error:'bad-json' }); }
  return out_(handle_(req));
}

function out_(o){
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function handle_(req){
  var key = PropertiesService.getScriptProperties().getProperty('ACCESS_KEY');
  if(!key) return { ok:false, error:'not-set-up' };
  if(!req || String(req.key || '').replace(/\s+/g, '') !== key) return { ok:false, error:'key' };   /* ช่องว่าง / ขึ้นบรรทัดที่ติดมาตอนคัดลอก ไม่นับ */
  var by = String(req.by || '').slice(0, 40) || '(ไม่ระบุ)';
  try{
    if(req.action === 'ping') return { ok:true, api:API_VERSION, now:new Date().toISOString(), sheet:SpreadsheetApp.getActiveSpreadsheet().getName() };
    if(req.action === 'pull') return pull_();
    if(req.action === 'put') return withLock_(function(){ return put_(req.records || [], by); });
    if(req.action === 'reserve') return withLock_(function(){ return reserve_(req, by); });
    return { ok:false, error:'action' };
  }catch(err){
    return { ok:false, error:String(err && err.message || err) };
  }
}

function withLock_(fn){
  var lock = LockService.getScriptLock();
  if(!lock.tryLock(30000)) return { ok:false, error:'busy' };
  try{ return fn(); }finally{ lock.releaseLock(); }
}

function tab_(name){
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if(!sh) throw new Error('ไม่พบแท็บ ' + name + ' (กด ตั้งค่าครั้งแรก)');
  return sh;
}

function table_(sh){
  var values = sh.getDataRange().getValues(), head = values[0] || [], col = {};
  head.forEach(function(h, i){ col[h] = i; });
  return { values:values, col:col, width:head.length };
}

/* ---------- pull ---------- */

function pull_(){
  var records = [];
  Object.keys(TABS).forEach(function(kind){
    var t = table_(tab_(TABS[kind].name)), c = t.col;
    for(var r = 1; r < t.values.length; r++){
      var row = t.values[r], id = String(row[c.id] || '');
      if(!id) continue;
      var data = null;
      try{ data = JSON.parse(String(row[c.data] || 'null')); }catch(e){ data = null; }
      records.push({ kind:kind, id:id, rev:Number(row[c.rev]) || 0, at:String(row[c['แก้ล่าสุด']] || ''),
        by:String(row[c['โดย']] || ''), deleted:String(row[c['ลบแล้ว']]) === 'ลบ', data:data });
    }
  });
  return { ok:true, api:API_VERSION, now:new Date().toISOString(), records:records, counters:counters_() };
}

function counters_(){
  var t = table_(tab_(COUNTER_TAB)), o = {};
  for(var r = 1; r < t.values.length; r++){
    var s = String(t.values[r][0] || '');
    if(s) o[s] = { next:String(t.values[r][1] || ''), at:String(t.values[r][2] || ''), by:String(t.values[r][3] || ''), row:r + 1 };
  }
  return o;
}

/* ---------- put ---------- */

function put_(recs, by){
  var now = new Date().toISOString(), results = [], cache = {};
  recs.forEach(function(rec){
    var kind = rec && rec.kind, spec = TABS[kind], id = String(rec && rec.id || '');
    if(!spec || !id){ results.push({ kind:kind, id:id, status:'invalid' }); return; }
    var json = JSON.stringify(rec.data === undefined ? null : rec.data);
    if(json.length > MAX_CELL){ results.push({ kind:kind, id:id, status:'too-big' }); return; }
    var sh = tab_(spec.name), t = cache[kind] || (cache[kind] = table_(sh)), c = t.col, at = -1;
    for(var r = 1; r < t.values.length; r++) if(String(t.values[r][c.id]) === id){ at = r; break; }
    var cur = at > 0 ? Number(t.values[at][c.rev]) || 0 : 0;
    var base = rec.baseRev === undefined || rec.baseRev === null ? null : Number(rec.baseRev) || 0;
    if(!rec.force && base !== null && base !== cur){
      var curData = null;
      if(at > 0){ try{ curData = JSON.parse(String(t.values[at][c.data] || 'null')); }catch(e){} }
      results.push({ kind:kind, id:id, status:'conflict', rev:cur, by:at > 0 ? String(t.values[at][c['โดย']]) : '',
        at:at > 0 ? String(t.values[at][c['แก้ล่าสุด']]) : '', data:curData });
      return;
    }
    var row = [], sum = rec.summary || {};
    for(var i = 0; i < t.width; i++) row.push(at > 0 ? t.values[at][i] : '');   /* ช่องสรุปที่ไม่ได้ส่งมา คงค่าเดิม */
    spec.cols.forEach(function(h){ if(sum[h] !== undefined && sum[h] !== null) row[c[h]] = String(sum[h]); });
    row[c.id] = id; row[c.rev] = String(cur + 1); row[c['แก้ล่าสุด']] = now; row[c['โดย']] = by;
    row[c['ลบแล้ว']] = rec.deleted ? 'ลบ' : ''; row[c.data] = json;
    if(at > 0){ writeRow_(sh, at + 1, row); t.values[at] = row; }
    else{ writeRow_(sh, 0, row); t.values.push(row); }
    log_(by, rec.deleted ? 'ลบ' : at > 0 ? 'แก้' : 'เพิ่ม', kind, id, rec.force && base !== cur ? 'เขียนทับ (force)' : '');
    results.push({ kind:kind, id:id, status:'ok', rev:cur + 1, at:now });
  });
  return { ok:true, results:results };
}

/* ---------- reserve (เลขที่ถัดไป) ---------- */

function reserve_(req, by){
  var series = String(req.series || ''), expect = String(req.expect || ''), next = String(req.next || '');
  if(!series || !next) return { ok:false, error:'invalid' };
  var all = counters_(), cur = all[series], now = new Date().toISOString();
  if((cur ? cur.next : '') !== expect) return { ok:true, status:'conflict', current:cur ? cur.next : '', by:cur ? cur.by : '', at:cur ? cur.at : '' };
  var sh = tab_(COUNTER_TAB), row = [series, next, now, by];
  writeRow_(sh, cur ? cur.row : 0, row);
  log_(by, 'ออกเลข', series, next, expect ? 'ต่อจาก ' + expect : 'เริ่มชุด');
  return { ok:true, status:'ok', next:next, at:now };
}

function log_(by, what, kind, id, note){
  try{ writeRow_(tab_(LOG_TAB), 0, [new Date().toISOString(), by, what, kind, id, note || '']); }catch(e){}
}

/* เขียนเป็นข้อความเสมอ (appendRow ทำให้ 0001/2570 กลายเป็นวันที่) · row 0 = ต่อท้าย */
function writeRow_(sh, row, values){
  if(!row){
    row = sh.getLastRow() + 1;
    if(row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 200);
  }
  sh.getRange(row, 1, 1, values.length).setNumberFormat('@').setValues([values]);
}
