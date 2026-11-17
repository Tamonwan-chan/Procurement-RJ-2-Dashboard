/* ตรวจเลขซ้ำจากไฟล์สำรองข้อมูลทุกเครื่อง (local only: ห้าม commit · ผลมีข้อมูลจริง)
   ใช้: node audit-numbers.js <ไฟล์ .json หรือโฟลเดอร์> [...]
   ตั้งชื่อไฟล์ตามเครื่อง เช่น "โอม-โน้ตบุ๊ก.json" ชื่อไฟล์คือชื่อเครื่องในรายงาน
   ผล: รายงานบนจอ + audit-numbers.csv (UTF-8 BOM เปิดใน Excel ได้) ในโฟลเดอร์เดียวกับไฟล์สำรอง ไม่ใช่ใน repo */
var fs = require('fs'), path = require('path');

var files = [];
process.argv.slice(2).forEach(function(p){
  if(fs.statSync(p).isDirectory()) fs.readdirSync(p).filter(function(f){ return /\.json$/i.test(f); }).forEach(function(f){ files.push(path.join(p, f)); });
  else files.push(p);
});
if(!files.length){ console.log('ใช้: node audit-numbers.js <ไฟล์สำรอง .json หรือโฟลเดอร์>'); process.exit(1); }

var KIND = { drug:{ p:'ภย', k:'ขย', r:'รย' }, non:{ p:'ภว', k:'ขว', r:'รยว' } };
function kindOf(doc){ var m = doc.memo; return m && m.kind ? m.kind : (doc.series === 'WM' || doc.series === 'WC' ? 'non' : 'drug'); }
function sig(o){ return JSON.stringify(o); }

var uses = [], nexts = [];   /* uses: ทุกเลขที่พบ · nexts: เลขถัดไปที่แต่ละเครื่องจำไว้ */
files.forEach(function(f){
  var dev = path.basename(f).replace(/\.json$/i, ''), data;
  try{ data = JSON.parse(fs.readFileSync(f, 'utf8')); }catch(e){ console.log('อ่านไม่ได้: ' + f); return; }
  if(!data || data.app !== 'rj2-procurement-backup'){ console.log('ไม่ใช่ไฟล์สำรองของโปรแกรม: ' + f); return; }
  var saved = String(data.savedAt || '').slice(0, 10);
  var recs = {}; (data.records || []).forEach(function(r){ recs[r.slot] = r; });
  var q = recs._quotes || {}, m = recs._memoset || {};
  (q.docs || []).forEach(function(doc){
    var lines = (doc.lines || []).map(function(l){ return [l.id, l.qty, l.price]; });
    uses.push({ series:doc.series || 'W', no:doc.no, dev:dev, date:doc.date || '', company:doc.company || '', what:'ใบเสนอราคา ' + lines.length + ' รายการ', sure:true,
      sig:sig([doc.company, lines]) });
    var mm = doc.memo, k = KIND[kindOf(doc)];
    if(mm && mm.pNo) uses.push({ series:k.p, no:mm.pNo, dev:dev, date:mm.pDate || '', company:doc.company || '', what:'ตาม ' + doc.no, sure:false, sig:sig([doc.no]) });
    if(mm && mm.kNo) uses.push({ series:k.k + ' (ย. ใช้เลขเดียวกัน)', no:mm.kNo, dev:dev, date:mm.kDate || '', company:doc.company || '', what:'ตาม ' + doc.no, sure:false, sig:sig([doc.no]) });
  });
  Object.keys(m.ry || {}).forEach(function(n){
    var d = m.ry[n]; if(!d || !d.rNo) return;
    var r = d.kind === 'non' ? 'รยว' : 'รย';
    uses.push({ series:r, no:d.rNo, dev:dev, date:d.inspect || d.rDate || '', company:d.company || '', what:'รับ ' + (d.no || n) + (d.kNo ? ' ตาม ' + d.kNo : ''), sure:!!d.done,
      sig:sig([d.no || n]) });
  });
  var nx = q.next || {};
  Object.keys(nx).forEach(function(s){ nexts.push({ series:s, next:nx[s], dev:dev, src:'_quotes' }); });
  Object.keys(data.localStorage || {}).forEach(function(key){ var s = key.replace('rj2-quote-next-', ''); nexts.push({ series:s, next:data.localStorage[key], dev:dev, src:'localStorage' }); });
  Object.keys(m.next || {}).forEach(function(s){ nexts.push({ series:s, next:m.next[s], dev:dev, src:'_memoset' }); });
  console.log('อ่านแล้ว: ' + dev + ' (สำรองวันที่ ' + saved + ') ใบเสนอราคา ' + (q.docs || []).length + ' ใบ · รย. ' + Object.keys(m.ry || {}).length + ' ใบ');
});

function numKey(no){ var a = /^(\D*)(\d+)(?:-(\d+))?(?:\/(\d+))?/.exec(String(no)); return a ? [Number(a[4] || a[3] || 0), Number(a[2])] : [0, 0]; }
function cmp(a, b){ var x = numKey(a), y = numKey(b); return x[0] - y[0] || x[1] - y[1]; }

/* จัดกลุ่มตามชุด + เลข */
var groups = {};
uses.forEach(function(u){ var g = u.series + '|' + u.no; (groups[g] = groups[g] || []).push(u); });
var dup = [], same = 0;
Object.keys(groups).forEach(function(g){
  var list = groups[g], sigs = {};
  list.forEach(function(u){ sigs[u.sig] = 1; });
  if(Object.keys(sigs).length > 1) dup.push(list);
  else if(list.length > 1) same++;
});

console.log('\n=== เลขเดียวกัน เนื้อหาต่างกัน (ต้องให้ผู้ใช้ตัดสิน) ===');
if(!dup.length) console.log('ไม่พบ');
dup.sort(function(a, b){ return a[0].series.localeCompare(b[0].series) || cmp(a[0].no, b[0].no); }).forEach(function(list){
  console.log('\n' + list[0].series + ' ' + list[0].no);
  list.forEach(function(u){ console.log('  - ' + u.dev + ' · ' + u.date + ' · ' + u.company + ' · ' + u.what + (u.sure ? '' : ' · (บันทึกอาจยังไม่ได้พิมพ์)')); });
});
console.log('\nเลขเดียวกันและเนื้อหาเหมือนกันหลายเครื่อง (สำเนาเดียวกัน ไม่ใช่ปัญหา): ' + same + ' เลข');

console.log('\n=== เลขสูงสุดที่ใช้ และเลขถัดไปที่แต่ละเครื่องจำไว้ ===');
var series = {};
uses.forEach(function(u){
  var key = /^W/.test(u.series) ? (/^[A-Z]+/.exec(String(u.no)) || [u.series])[0] : u.series;   /* WB (ชุดเดิม) แยกจาก W */
  var s = series[key] = series[key] || { max:null }; if(!s.max || cmp(u.no, s.max) > 0) s.max = u.no;
});
Object.keys(series).sort().forEach(function(s){ console.log(s + ': ใช้สูงสุด ' + series[s].max); });
nexts.sort(function(a, b){ return a.series.localeCompare(b.series) || a.dev.localeCompare(b.dev); }).forEach(function(n){
  console.log('  เลขถัดไป ' + n.series + ' = ' + n.next + ' (' + n.dev + ', ' + n.src + ')');
});

var csv = ['ชุด,เลขที่,เครื่อง,วันที่,บริษัท,รายละเอียด,พิมพ์แน่นอน,ซ้ำต่างเนื้อหา'];
var dupKey = {}; dup.forEach(function(l){ dupKey[l[0].series + '|' + l[0].no] = 1; });
uses.sort(function(a, b){ return a.series.localeCompare(b.series) || cmp(a.no, b.no) || a.dev.localeCompare(b.dev); }).forEach(function(u){
  csv.push([u.series, u.no, u.dev, u.date, u.company, u.what, u.sure ? 'ใช่' : 'ไม่แน่', dupKey[u.series + '|' + u.no] ? 'ซ้ำ' : '']
    .map(function(x){ return '"' + String(x).replace(/"/g, '""') + '"'; }).join(','));
});
var out = path.join(fs.statSync(process.argv[2]).isDirectory() ? process.argv[2] : path.dirname(process.argv[2]), 'audit-numbers.csv');
fs.writeFileSync(out, '﻿' + csv.join('\r\n'), 'utf8');
console.log('\nรายการทั้งหมด: ' + out);
