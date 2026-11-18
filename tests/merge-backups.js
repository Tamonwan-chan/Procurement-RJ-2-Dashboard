/* รวมไฟล์สำรองข้อมูลทุกเครื่องเป็นไฟล์เดียว สำหรับย้ายเข้าข้อมูลกลาง (#44) · local only: ผลมีข้อมูลจริง ห้าม commit
   ใช้: node merge-backups.js <ไฟล์ .json หรือโฟลเดอร์> [...] [--last เลขล่าสุด.json]
   ชื่อไฟล์สำรองลงท้ายด้วยชื่อเครื่อง เช่น "สำรองข้อมูลโปรแกรมจัดซื้อ 2026-11-17-เครื่องพี่โอมที่ทำงาน.json"
   --last: ไฟล์ "เลขล่าสุด….json" เลขล่าสุดที่ออกจริงของแต่ละเล่ม (คำตอบข้อ 33) เช่น {"W":"W100-70","WM":"WM010-70","ภย":"0600/2569","ขย":"0010/2570"}
           เล่มบันทึกที่ไม่ใส่ = ไม่ตั้งเลขถัดไป (คนแรกที่ออกเล่มนั้นต้องยืนยันกับเล่มจริง) · ใบเสนอราคาที่ไม่ใส่ = สูงสุดในไฟล์สำรอง
           เลขในบันทึกเก่าที่สูงกว่าเลขล่าสุดของเล่ม = ไม่ได้ออกจริง ล้างทิ้ง
           ใบเสนอราคาที่สูงกว่าเลขล่าสุดของชุดนั้น = ใบทดสอบ ไม่ย้าย และเลขถัดไป = เลขล่าสุด + 1 (พี่โอม 18 พ.ย. 69: W141-70 เป็นใบลอง เริ่ม W121)
           "แก้เลข": { "<เลขใบเสนอราคา>": {"pNo":…}, "<เลขที่รับ minpno>": {"rNo":…} } เลขที่พิมพ์จริงต่างจากที่โปรแกรมจำ
   ผล (โฟลเดอร์เดียวกับไฟล์สำรองแรก ไม่ใช่ใน repo):
     สำรองข้อมูลรวม <วันที่>.json         กู้คืนเข้าหน้าโปรแกรม (ยังไม่เชื่อมต่อ) แล้วเชื่อมต่อ Sheet ที่ว่าง → OK = ส่งขึ้นเป็นข้อมูลตั้งต้น
     สำรองข้อมูลรวม <วันที่> รายงาน.csv  ทุกการตัดสินใจของการรวม
   กติกา (ข้อ 2.35 / ค่าตั้งต้นในข้อความ 17 พ.ย.):
     ใบเสนอราคาเลขเดียวกัน เนื้อหาเหมือนกัน = ใบเดียว (ใช้สำเนาที่มีค่าในบันทึกมากที่สุด)
     เลขเดียวกัน เนื้อหาต่างกัน = เก็บทุกใบ ติดป้าย "ออกซ้ำ" · ใบแรก (วันที่ก่อน) ใช้เลขเดิมเป็น id ใบถัดไป sid = เลข~2, ~3
     รายชื่อ: คนเดียวกัน (ชื่อตรงกัน) แต่ละเครื่องมี id ต่างกัน → ใช้ id จากไฟล์สำรองล่าสุด และเปลี่ยน id ในบันทึกทุกใบตาม
     ตรวจรับ (minpno): ใบที่ทำเสร็จก่อน แล้วไฟล์ล่าสุด
     เลขถัดไป W / WM / WC = สูงสุดของ (เลขที่ใช้ + 1, เลขถัดไปที่ทุกเครื่องจำไว้)
     หน่วยงาน หนังสืออ้างอิงแผน ผู้ลงนามล่าสุด ตราครุฑ = จากไฟล์สำรองล่าสุด
     ไม่รวม ตาราง KPI / คงคลังย้อนหลัง (อยู่เฉพาะเครื่อง กู้คืนไฟล์รวมแล้วของเดิมในเครื่องยังอยู่) */
var fs = require('fs'), path = require('path');

var args = process.argv.slice(2), files = [], lastFile = '';
for(var i = 0; i < args.length; i++){
  if(args[i] === '--last'){ lastFile = args[++i]; continue; }
  var p = args[i];
  if(fs.statSync(p).isDirectory()) fs.readdirSync(p).filter(function(f){ return /\.json$/i.test(f) && !/^(สำรองข้อมูลรวม|เลขล่าสุด)/.test(f); }).forEach(function(f){ files.push(path.join(p, f)); });
  else files.push(p);
}
if(!files.length){ console.log('ใช้: node merge-backups.js <ไฟล์สำรอง .json หรือโฟลเดอร์> [--last เลขล่าสุด.json]'); process.exit(1); }

var QUOTE_SERIES = ['W', 'WM', 'WC'], BOOKS = ['ภย', 'ขย', 'ภว', 'ขว', 'รย', 'รยว'];
var KIND = { drug:{ p:'ภย', k:'ขย', r:'รย' }, non:{ p:'ภว', k:'ขว', r:'รยว' } };
var report = [];   /* [หัวข้อ, เลขที่, รายละเอียด] */
function note(what, no, detail){ report.push([what, no, detail]); }

/* ---------- อ่าน ---------- */
var devs = [];
files.forEach(function(f){
  var data; try{ data = JSON.parse(fs.readFileSync(f, 'utf8')); }catch(e){ console.log('อ่านไม่ได้: ' + f); process.exit(1); }
  if(!data || data.app !== 'rj2-procurement-backup'){ console.log('ไม่ใช่ไฟล์สำรองของโปรแกรม: ' + f); process.exit(1); }
  var recs = {}; (data.records || []).forEach(function(r){ recs[r.slot] = r; });
  var name = path.basename(f).replace(/\.json$/i, '').replace(/^สำรองข้อมูลโปรแกรมจัดซื้อ\s*/, '').replace(/^\d{4}-\d{2}-\d{2}-?/, '') || path.basename(f);
  devs.push({ name:name, savedAt:String(data.savedAt || ''), q:recs._quotes || { docs:[] }, m:recs._memoset || {}, ls:data.localStorage || {} });
});
devs.sort(function(a, b){ return a.savedAt < b.savedAt ? -1 : a.savedAt > b.savedAt ? 1 : 0; });   /* ล่าสุดอยู่ท้าย */
var latest = devs[devs.length - 1];
devs.forEach(function(d){ console.log('อ่านแล้ว: ' + d.name + ' (สำรอง ' + d.savedAt.slice(0, 10) + ') ใบเสนอราคา ' + (d.q.docs || []).length + ' · รายชื่อ ' + (d.m.people || []).length + ' · ตรวจรับ ' + Object.keys(d.m.ry || {}).length); });

/* ---------- เลขที่ ---------- */
function parseNo(no){
  var a = /^([A-Z]*)(\d+)(?:-(\d+))?(?:\/(\d+))?$/.exec(String(no || '').trim().toUpperCase());
  return a ? { pre:a[1], n:Number(a[2]), width:a[2].length, year:Number(a[3] || a[4] || 0), slash:!!a[4] } : null;
}
function cmpNo(a, b){ var x = parseNo(a), y = parseNo(b); return (x.year - y.year) || (x.n - y.n); }
function bump(no){
  var p = parseNo(no), n = String(p.n + 1); while(n.length < p.width) n = '0' + n;
  return p.pre + n + (p.slash ? '/' + p.year : '-' + p.year);
}
function maxNo(list){ return list.filter(function(x){ return parseNo(x); }).sort(cmpNo).pop() || ''; }

/* ---------- รายชื่อ: รวมตามชื่อ ---------- */
function nameKey(p){ return String(p.name || '').replace(/\s+/g, '').replace(/^(นาย|นางสาว|นาง|น\.ส\.|ภก\.|ภญ\.|ดร\.)+/, ''); }
var people = [], byName = {}, remap = {};
devs.slice().reverse().forEach(function(d){   /* ล่าสุดก่อน = id หลัก */
  remap[d.name] = {};
  (d.m.people || []).forEach(function(p){
    var k = nameKey(p), c = byName[k];
    if(!c){ c = byName[k] = JSON.parse(JSON.stringify(p)); people.push(c); }
    else{
      if(!c.sign && p.sign) c.sign = p.sign;
      /* roles ({ committee:true, ... }) ใช้ของไฟล์ล่าสุด: เครื่องเก่าอาจยังไม่ได้ติ๊กออก */
      if(p.id !== c.id) note('รายชื่อ', '', 'รวม ' + d.name + ' id ' + p.id + ' → ' + c.id);
    }
    remap[d.name][p.id] = c.id;
  });
});
function remapIds(v, map){   /* แทน id คนในทุกช่องของบันทึก / ตรวจรับ / ผู้ลงนามล่าสุด */
  if(Array.isArray(v)) return v.map(function(x){ return remapIds(x, map); });
  if(v && typeof v === 'object' && !v.__b64){ var o = {}; Object.keys(v).forEach(function(k){ o[k] = remapIds(v[k], map); }); return o; }
  return typeof v === 'string' && map[v] ? map[v] : v;
}

/* ---------- ใบเสนอราคา ---------- */
function sigQuote(d){ return JSON.stringify([String(d.company || '').trim(), (d.lines || []).map(function(l){ return [l.id, +l.qty || 0, +l.price || 0]; })]); }
function memoScore(d){ var m = d.memo || {}; return ['pNo', 'pDate', 'kNo', 'kDate', 'yDate', 'bill', 'billDate'].filter(function(k){ return m[k]; }).length + (m.committee || []).filter(Boolean).length; }
function memoSig(d){ var m = JSON.parse(JSON.stringify(d.memo || {})); delete m.lines; return JSON.stringify(m); }
var groups = {};
devs.forEach(function(d){
  (d.q.docs || []).forEach(function(doc){
    var x = remapIds(JSON.parse(JSON.stringify(doc)), remap[d.name]);
    (groups[x.no] = groups[x.no] || []).push({ dev:d.name, savedAt:d.savedAt, doc:x });
  });
});
var docs = [], dupNos = 0, merged = 0;
Object.keys(groups).sort(cmpNo).forEach(function(no){
  var clusters = {};
  groups[no].forEach(function(c){ var s = sigQuote(c.doc); (clusters[s] = clusters[s] || []).push(c); });
  var picked = Object.keys(clusters).map(function(s){
    var list = clusters[s].sort(function(a, b){ return memoScore(b.doc) - memoScore(a.doc) || (String(b.doc.at) > String(a.doc.at) ? 1 : -1) || (b.savedAt > a.savedAt ? 1 : -1); });
    var best = list[0];
    if(list.length > 1){
      merged++;
      var memos = {}; list.forEach(function(c){ memos[memoSig(c.doc)] = 1; });
      note('ใบเดียวกันหลายเครื่อง', no, 'ใช้ของ ' + best.dev + ' จาก ' + list.map(function(c){ return c.dev; }).join(', ') + (Object.keys(memos).length > 1 ? ' · ค่าในบันทึกต่างกัน ใช้ของเครื่องที่กรอกมากกว่า ตรวจอีกครั้ง' : ''));
    }
    best.doc.from = best.dev;
    return best;
  });
  if(picked.length > 1){
    dupNos++;
    picked.sort(function(a, b){ return String(a.doc.date || '') < String(b.doc.date || '') ? -1 : String(a.doc.date || '') > String(b.doc.date || '') ? 1 : String(a.doc.at) < String(b.doc.at) ? -1 : 1; });
    picked.forEach(function(c, i){
      if(i) c.doc.sid = no + '~' + (i + 1);
      c.doc.dup = 'ออกซ้ำ (' + c.dev + ')';
      note('ออกซ้ำ เก็บทุกใบ', no, (c.doc.sid || no) + ' · ' + c.dev + ' · ' + (c.doc.date || '') + ' · ' + (c.doc.company || '') + ' · ' + (c.doc.lines || []).length + ' รายการ');
    });
  }
  picked.forEach(function(c){ docs.push(c.doc); });
});
docs.sort(function(a, b){ return String(b.at || '') < String(a.at || '') ? -1 : String(b.at || '') > String(a.at || '') ? 1 : 0; });

var last = lastFile ? JSON.parse(fs.readFileSync(lastFile, 'utf8')) : null;
Object.keys(last || {}).forEach(function(s){ if(s !== 'แก้เลข' && !parseNo(last[s])){ console.log('เลขใน --last ไม่ถูกรูปแบบ: ' + s + ' ' + last[s]); process.exit(1); } });
/* ใบเสนอราคาที่สูงกว่าเลขล่าสุดที่ออกจริง = ใบทดสอบ ไม่ย้ายเข้าข้อมูลกลาง */
docs = docs.filter(function(d){
  var p = parseNo(d.no), L = p && last && last[p.pre];
  if(!L || cmpNo(d.no, L) <= 0) return true;
  note('ไม่ย้าย ใบทดสอบ', d.sid || d.no, 'สูงกว่าเลขล่าสุดที่ออกจริง ' + L + ' · ' + (d.date || '') + ' · ' + (d.from || ''));
  console.log('ไม่ย้าย ' + (d.sid || d.no) + ' (สูงกว่าเลขจริง ' + L + ' = ใบทดสอบ)');
  return false;
});

/* เลขถัดไปของใบเสนอราคา: สูงสุดของ (เลขที่ใช้ + 1, ที่ทุกเครื่องจำไว้, เลขล่าสุดที่ออกจริง + 1) · ใบในโปรแกรมที่สูงกว่าเลขจริง แจ้งให้ถาม */
var qNext = {};
QUOTE_SERIES.forEach(function(s){
  var cand = [], above = [];
  docs.forEach(function(d){
    var p = parseNo(d.no); if(!p || p.pre !== s) return;
    cand.push(bump(d.no));
    if(last && last[s] && cmpNo(d.no, last[s]) > 0) above.push(d.no + ' (' + (d.date || '') + ', ' + d.from + ')');
  });
  devs.forEach(function(d){
    var a = d.q.next && d.q.next[s], b = d.ls['rj2-quote-next-' + s];
    [a, b].forEach(function(v){ var p = parseNo(v); if(p && p.pre === s) cand.push(v); });
  });
  var v = last && last[s] ? bump(last[s]) : maxNo(cand); if(!v) return;
  qNext[s] = v;
  var why = last && last[s] ? 'เลขล่าสุดที่ออกจริง ' + last[s] : 'ไม่มีเลขจริง ใช้สูงสุดในไฟล์สำรอง';
  note('เลขถัดไป', s, v + ' (' + why + ')' + (above.length ? ' · ในโปรแกรมมีใบสูงกว่าเลขจริง: ' + above.join(', ') : ''));
  console.log('เลขถัดไป ' + s + ' = ' + v + ' (' + why + ')' + (above.length ? '\n  ** ในโปรแกรมมีใบสูงกว่าเลขจริง ถามว่าใบจริงไหม: ' + above.join(', ') : ''));
});

/* ---------- ตรวจรับ ---------- */
var ry = {};
devs.forEach(function(d){
  Object.keys(d.m.ry || {}).forEach(function(n){
    var r = remapIds(JSON.parse(JSON.stringify(d.m.ry[n])), remap[d.name]), cur = ry[n];
    if(cur && JSON.stringify(cur.r) !== JSON.stringify(r)) note('ตรวจรับหลายเครื่อง', n, 'ต่างกัน ใช้ของ ' + (cur.r.done && !r.done ? cur.dev : d.name));
    if(!cur || !(cur.r.done && !r.done)) ry[n] = { r:r, dev:d.name };
  });
});
var ryOut = {}; Object.keys(ry).forEach(function(n){ ryOut[n] = ry[n].r; });

/* ---------- เล่มบันทึก: เลขที่ใช้ เลขที่แต่ละเครื่องจำไว้ และเลขถัดไป ----------
   เลขในบันทึกเก่าที่สูงกว่าเลขล่าสุดที่ออกจริงของเล่มนั้น = ไม่เคยออกจริง (เลขที่หน้าจอเติม / ชุดเลขเปลี่ยน) ล้างทิ้ง หน้าโปรแกรมเติมเลขถัดไปให้เอง */
var used = {}, remembered = {};
function overLast(s, no){ return last && last[s] && parseNo(no) && cmpNo(no, last[s]) > 0; }
/* "แก้เลข" ใน --last: เลขที่พิมพ์จริงต่างจากที่โปรแกรมจำ (แก้ตอนพิมพ์) เช่น {"แก้เลข":{"WM004-70":{"pNo":"0102/2569"}}} */
var fixes = last && last['แก้เลข'] || {};
Object.keys(fixes).forEach(function(key){
  var d = docs.filter(function(x){ return (x.sid || x.no) === key; })[0];
  if(!d && ryOut[key]){
    Object.keys(fixes[key]).forEach(function(f){ note('แก้เลขตามเล่มจริง', 'ตรวจรับ', f + ' ' + (ryOut[key][f] || '-') + ' → ' + fixes[key][f]); ryOut[key][f] = fixes[key][f]; });
    return;
  }
  if(!d){ console.log('แก้เลข: ไม่พบใบหรือเลขที่รับ ' + key); process.exit(1); }
  d.memo = d.memo || {};
  Object.keys(fixes[key]).forEach(function(f){ note('แก้เลขตามเล่มจริง', key, f + ' ' + (d.memo[f] || '-') + ' → ' + fixes[key][f]); d.memo[f] = fixes[key][f]; });
});
docs.forEach(function(d){
  var m = d.memo; if(!m) return;
  var k = KIND[m.kind || (d.series === 'WM' || d.series === 'WC' ? 'non' : 'drug')];
  [['pNo', k.p], ['kNo', k.k]].forEach(function(x){
    var f = x[0], s = x[1]; if(!m[f]) return;
    if(overLast(s, m[f])){ note('ล้างเลขที่ไม่ได้ออกจริง', d.sid || d.no, s + '. ' + m[f] + ' สูงกว่าเลขล่าสุดที่ออกจริง ' + last[s]); m[f] = ''; return; }
    (used[s] = used[s] || []).push(m[f]);
  });
});
Object.keys(ryOut).forEach(function(n){
  var r = ryOut[n]; if(!r.rNo) return;
  var s = r.kind === 'non' ? 'รยว' : 'รย';
  if(overLast(s, r.rNo)){ note('ล้างเลขที่ไม่ได้ออกจริง', n, s + '. ' + r.rNo + ' สูงกว่าเลขล่าสุดที่ออกจริง ' + last[s]); r.rNo = ''; return; }
  (used[s] = used[s] || []).push(r.rNo);
});
devs.forEach(function(d){ Object.keys(d.m.next || {}).forEach(function(s){ (remembered[s] = remembered[s] || []).push(d.name + ' ' + d.m.next[s]); }); });
var memoNext = {};
console.log('\n=== เล่มบันทึก ===');
BOOKS.forEach(function(s){
  var line = s + ': ในข้อมูลสูงสุด ' + (maxNo(used[s] || []) || '-') + ' · เครื่องจำเลขถัดไป ' + ((remembered[s] || []).join(', ') || '-');
  if(last && last[s] !== undefined){
    memoNext[s] = bump(last[s]); line += ' → เลขถัดไป ' + memoNext[s] + ' (ต่อจากเลขล่าสุดที่ออกจริง ' + last[s] + ')';
  }else line += ' → ยังไม่ตั้ง (คนแรกที่ออกเล่มนี้ต้องเทียบกับเล่มจริง)';
  console.log(line); note('เล่มบันทึก', s, line);
});
if(!last) console.log('** ยังไม่มี --last: ใช้ซ้อมได้ ตอนย้ายจริงใส่เลขล่าสุดที่ออกจริงของทุกเล่ม **');

/* ---------- เขียนไฟล์ ---------- */
var lm = latest.m, pick = remapIds(lm.pick || {}, remap[latest.name]);
var refMap = {}; devs.forEach(function(d){ Object.keys(d.q.refMap || {}).forEach(function(k){ refMap[k] = d.q.refMap[k]; }); });
var garuda = null; devs.forEach(function(d){ if(d.m.garuda) garuda = d.m.garuda; });
var memoset = { slot:'_memoset', people:people, planRef:lm.planRef || {}, next:memoNext, pick:pick, org:lm.org, ry:ryOut };
if(lm.rolesV) memoset.rolesV = lm.rolesV;
if(garuda) memoset.garuda = garuda;
var ls = {}; Object.keys(qNext).forEach(function(s){ ls['rj2-quote-next-' + s] = qNext[s]; });
var out = { app:'rj2-procurement-backup', version:1, savedAt:new Date().toISOString(), localStorage:ls, mergedFrom:devs.map(function(d){ return d.name; }),
  records:[{ slot:'_quotes', docs:docs, next:qNext, refMap:refMap }, memoset] };
var dir = path.dirname(files[0]), day = new Date().toISOString().slice(0, 10);
var outFile = path.join(dir, 'สำรองข้อมูลรวม ' + day + '.json'), csvFile = path.join(dir, 'สำรองข้อมูลรวม ' + day + ' รายงาน.csv');
fs.writeFileSync(outFile, JSON.stringify(out), 'utf8');
fs.writeFileSync(csvFile, '﻿' + [['หัวข้อ', 'เลขที่', 'รายละเอียด']].concat(report).map(function(r){ return r.map(function(x){ return '"' + String(x).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n'), 'utf8');

console.log('\nใบเสนอราคา ' + docs.length + ' ใบ (ใบเดียวกันหลายเครื่องรวมเป็นใบเดียว ' + merged + ' เลข · ออกซ้ำเก็บทุกใบ ' + dupNos + ' เลข)');
console.log('รายชื่อ ' + people.length + ' คน · ตรวจรับ ' + Object.keys(ryOut).length + ' ใบ · เลขถัดไป ' + Object.keys(qNext).map(function(s){ return qNext[s]; }).join(' / '));
if(docs.length > 300) console.log('มีมากกว่า 300 ใบ: กู้คืนในเครื่องที่ยังไม่เชื่อมต่อได้ครบ แต่ส่งออกใบใหม่ก่อนเชื่อมต่อจะตัดเหลือ 300 ให้เชื่อมต่อทันทีหลังกู้คืน');
console.log('\nไฟล์รวม: ' + outFile + '\nรายงาน: ' + csvFile);
