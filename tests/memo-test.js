/* Word memo exports (ภย. / ภว. · ขย. / ขว. · ย. / ยว. · รย. / รยว.): build each one from made-up people and items,
   unzip the .docx and check the layout rules พี่โอม asked for (table widths, alignment, spacing, signature blocks).
   No HIS files and no real names: runs anywhere.   Usage: node memo-test.js   (exits 1 on a failed check)
   When a rule changes on purpose, change the matching check here in the same commit. */
var h = require('./harness');
var XLSX = require('xlsx');

var fails = 0, passes = 0, scope = '';
function ok(cond, msg){ if(cond) passes++; else { fails++; console.log('  FAIL ' + scope + ': ' + msg); } }
function eq(a, b, msg){ ok(a === b, msg + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }

/* ---- made-up data ---- */
var PEOPLE = [
  { id:'a', name:'นางสาวทดสอบหนึ่ง    นามสกุลหนึ่ง', pos:'เภสัชกรชำนาญการ', roles:{ chair:1, committee:1 } },
  { id:'b', name:'นายทดสอบสอง     นามสกุลสอง', pos:'เภสัชกรชำนาญการ', roles:{ chair:1, committee:1 } },
  { id:'c', name:'นางทดสอบสาม      สาม', pos:'เจ้าพนักงานเภสัชกรรมชำนาญงาน', roles:{ committee:1 } },
  { id:'h', name:'นางสาวหัวหน้า   ทดสอบ   ', pos:'เภสัชกรชำนาญการพิเศษ', roles:{} },          /* trailing spaces on purpose */
  { id:'d', name:'นายผู้อำนวยการ   ทดสอบ', pos:'ผู้อำนวยการโรงพยาบาล', roles:{} }
];
var PNG = [137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,13,73,68,65,84,120,156,99,248,15,0,0,1,1,0,5,24,216,77,0,0,0,0,73,69,78,68,174,66,96,130];
function lines(){
  return [1, 2, 3, 4].map(function(i){
    /* only item 4 is long (XML escaping): four long names in the narrow DKSH / Zuellig column fill the page and leave no filler row */
    return { id:'T000' + i, name:'TEST ITEM ' + i + (i === 4 ? ' "QUOTED" & <ANGLE> 15.5"-16.5"' : ''), unit:'ชิ้น', stock:i, rate:i * 3, pack:'1 ชิ้น',
      qty:i * 10, price:220, ref:i === 4 ? '' : 210, last:200, gpu:'G' + i, tpu:'T' + i, unspsc:'4214' + i };
  });
}
function memoData(layout){
  return { pNo:'0104/2569', pDate:'2026-10-27', kNo:'0005/2570', kDate:'2026-10-28', yDate:'2026-11-13', bill:'INV-1', billDate:'2026-11-10',
    lines:lines(), committee:['a', 'b', 'c'], head:'h', officer:'c', supHead:'h', exec:'h', director:'d', days:5, layout:layout, planRef:'ที่ ทด 1/2569' };
}
var WANT_TOTAL = '22,000.00';    /* (10 + 20 + 30 + 40) × 220 */

/* ---- reading the .docx ---- */
function blobBytes(w, blob){
  return new Promise(function(res, rej){
    var fr = new w.FileReader(); fr.onload = function(){ res(Buffer.from(fr.result)); }; fr.onerror = rej; fr.readAsArrayBuffer(blob);
  });
}
function unzip(buf){
  var cfb = XLSX.CFB.read(buf, { type:'buffer' }), out = {};
  cfb.FullPaths.forEach(function(p, i){ var e = cfb.FileIndex[i]; if(e.type === 2) out[p.replace(/^Root Entry\//, '')] = Buffer.from(e.content); });
  return out;
}
function kids(el, tag){ return [].filter.call(el.childNodes, function(n){ return n.nodeName === tag; }); }
function kid(el, tag){ return kids(el, tag)[0] || null; }
function attr(el, tag, a){ var n = el && el.getElementsByTagName(tag)[0]; return n ? n.getAttribute(a || 'w:val') : null; }
/* paragraph text with \t for tabs and \n for line breaks */
function ptext(p){
  var s = '';
  (function walk(n){ [].forEach.call(n.childNodes, function(c){
    if(c.nodeName === 'w:t') s += c.textContent; else if(c.nodeName === 'w:tab' && n.nodeName === 'w:r') s += '\t'; else if(c.nodeName === 'w:br') s += '\n'; else walk(c);
  }); })(p);
  return s;
}
function pInfo(p){
  var pPr = kid(p, 'w:pPr'), ind = pPr && kid(pPr, 'w:ind');
  return { text:ptext(p), jc:attr(pPr, 'w:jc'), left:ind && +ind.getAttribute('w:left') || 0, hang:ind && +ind.getAttribute('w:hanging') || 0,
    first:ind && +ind.getAttribute('w:firstLine') || 0, tabs:pPr ? [].map.call(pPr.getElementsByTagName('w:tab'), function(t){ return t.getAttribute('w:val') + ':' + t.getAttribute('w:pos'); }) : [],
    pageBreak:!!(pPr && kid(pPr, 'w:pageBreakBefore')) };
}
function tInfo(t){
  var pr = kid(t, 'w:tblPr'), grid = [].map.call(kid(t, 'w:tblGrid').getElementsByTagName('w:gridCol'), function(g){ return +g.getAttribute('w:w'); });
  return { el:t, w:+attr(pr, 'w:tblW', 'w:w'), ind:+(attr(pr, 'w:tblInd', 'w:w') || 0), grid:grid,
    rows:kids(t, 'w:tr').map(function(tr){
      return { head:!!tr.getElementsByTagName('w:tblHeader')[0], h:attr(tr, 'w:trHeight'),
        cells:kids(tr, 'w:tc').map(function(tc){
          var pr = kid(tc, 'w:tcPr');
          return { text:kids(tc, 'w:p').map(ptext).join('\n'), v:attr(pr, 'w:vAlign'), span:+(attr(pr, 'w:gridSpan') || 1),
            jc:kids(tc, 'w:p').map(function(p){ return pInfo(p).jc; })[0], noTop:!!(pr && pr.getElementsByTagName('w:top')[0]), paras:kids(tc, 'w:p').map(pInfo) };
        }) };
    }) };
}
function parse(w, files){
  var xml = files['word/document.xml'].toString('utf8'), dom = new w.DOMParser().parseFromString(xml, 'application/xml');
  ok(!dom.getElementsByTagName('parsererror').length, 'document.xml is well-formed XML');
  ['[Content_Types].xml', '_rels/.rels', 'word/styles.xml', 'word/settings.xml', 'word/_rels/document.xml.rels'].forEach(function(f){
    ok(!!files[f], 'has ' + f);
    if(files[f]) ok(!new w.DOMParser().parseFromString(files[f].toString('utf8'), 'application/xml').getElementsByTagName('parsererror').length, f + ' is well-formed');
  });
  var body = dom.getElementsByTagName('w:body')[0];
  return { xml:xml, paras:kids(body, 'w:p').map(pInfo), tables:kids(body, 'w:tbl').map(tInfo) };
}
function find(paras, re){ return paras.filter(function(p){ return re.test(p.text); })[0]; }
function sum(a){ return a.reduce(function(x, y){ return x + y; }, 0); }

/* ---- checks shared by ภย. and ขย. ---- */
function checkItemTable(t, layout){
  eq(t.w, 10916, 'item table width');
  eq(t.ind, -998, 'item table indent');
  eq(sum(t.grid), t.w, 'columns add up to the table width');
  var body = t.rows.filter(function(r){ return !r.head; }), items = body.slice(0, 4);
  ok(t.rows[0].head, 'first row repeats as the header');
  ok(t.rows[0].cells.every(function(c){ return c.v === 'center'; }), 'header cells centred vertically');
  ok(body.every(function(r){ return r.cells.every(function(c){ return c.v === 'top'; }); }), 'body cells aligned to the top');
  ok(items.every(function(r){ return r.cells.length === t.grid.length; }), 'item rows have one cell per column');
  var cols = t.rows[0].cells.length;
  eq(cols, 7 + 1 + 1 + (layout === 'other' ? 0 : 1) + 1, 'column count for layout ' + layout + ' (item 4 has no ราคากลาง, so the last-price column shows)');
  ok(items.every(function(r){ return r.cells.every(function(c, i){ return i === 1 || c.jc === 'center'; }); }), 'every cell except the item name is centred');
  eq(items[3].cells[1].text, 'TEST ITEM 4 "QUOTED" & <ANGLE> 15.5"-16.5"', 'item name survives XML escaping');
  ok(/วงเงิน\s*\((ไม่รวม|รวม) VAT\)/.test(t.rows[0].cells[cols - 1].text.replace(/\n/g, ' ')), 'last header is วงเงิน');
  if(layout === 'zuellig') ok(/ไม่รวม VAT/.test(t.rows[0].cells[cols - 1].text), 'Zuellig วงเงิน excludes VAT');
  else eq(find(body.map(function(r){ return { text:r.cells.map(function(c){ return c.text; }).join('|') }; }), /^รวมจำนวนเงินทั้งสิ้น/).text.split('|')[1], WANT_TOTAL, 'grand total');
  var words = body[body.length - 1].cells[0];
  ok(/^จำนวนรวม 4 รายการ รวมเป็นเงินทั้งสิ้น\t\(.+บาท.*\)$/.test(words.text), 'amount in words line');
  eq(words.paras[0].tabs.join(), 'right:' + (10916 - 160), 'amount in words tabbed to the right edge');
}
function checkCommittee(paras){
  var rows = paras.filter(function(p){ return /^\d\. .+\tตำแหน่ง/.test(p.text); });
  eq(rows.length, 3, 'three committee lines');
  if(rows.length !== 3) return;
  ok(rows.every(function(r){ return r.tabs.join() === rows[0].tabs.join() && r.left === rows[0].left; }), '"ตำแหน่ง" lines up on all three lines');
  eq(rows[0].tabs[1], 'right:' + (11906 - 2880), 'role tabbed to the right margin');
  ok(/^1\. .+\tตำแหน่ง {1,4}\S.*\tประธานกรรมการ$/.test(rows[0].text) && /\tกรรมการ$/.test(rows[2].text), 'roles: ประธานกรรมการ, กรรมการ, กรรมการ');
  ok(rows.every(function(r){ return !/ \t/.test(r.text); }), 'no space left before a tab (names trimmed)');
  ok(rows[0].left <= 1418, 'committee indent at most the paragraph indent');
}
function checkHead(paras, no, dateRe){
  var d = find(paras, /^ที่ /);
  ok(d && d.text.indexOf(no) >= 0, 'number ' + no + ' in the header');
  ok(d && dateRe.test(d.text), 'date spaced like a printed memo');
}

var GOT = {};
h.load({ inside:true }).then(function(p){
  var w = p.window, I = p.inside;
  if(!I) throw new Error('harness inside hook missing');
  w.TextEncoder = w.TextEncoder || require('util').TextEncoder;
  var set = I.get('memoSeed')();
  set.people = PEOPLE; set.garuda = { ext:'png', bytes:PNG, cx:914400, cy:914400 };
  I.set('memoSet', set);

  var jobs = [];
  [['W', 'drug'], ['WM', 'non']].forEach(function(sk){
    ['other', 'dksh', 'zuellig'].forEach(function(layout){
      var doc = { no:sk[0] + '009-70', series:sk[0], company:'บริษัท ทดสอบ จำกัด', lines:[] };
      ['P', 'K', 'Y'].forEach(function(m){
        var name = m + ' ' + sk[0] + ' ' + layout;
        jobs.push(Promise.resolve().then(function(){ return blobBytes(w, I.get('buildMemo' + m)(doc, memoData(layout))); })
          .then(function(buf){ GOT[name] = { m:m, kind:sk[1], layout:layout, files:unzip(buf) }; }, function(e){ GOT[name] = { err:e }; }));
      });
    });
  });
  /* รย. from one made-up delivery */
  var g = { no:'R001', date:20261115, company:'บริษัท ทดสอบ จำกัด', inv:'INV-9', rows:[
    { id:'T0001', name:'TEST ITEM 1', qty:10, value:1000.5 }, { id:'T0002', name:'TEST ITEM 2', qty:5, value:499.5 }, { id:'T0003', name:'SKIPPED', qty:1, value:999 }] };
  var ry = { no:'R001', kind:'drug', rNo:'0007/2569', rDate:'2026-11-16', kNo:'0005/2570', kDate:'2026-10-28', company:g.company, bill:g.inv, billDate:'2026-11-10',
    inspect:'2026-11-15', subj:'รายงานผลการตรวจรับยาและเวชภัณฑ์', cat:'หมวดค่าวัสดุ', committee:['a', 'b', 'c'], skip:{ 2:1 } };
  jobs.push(Promise.resolve().then(function(){ return blobBytes(w, I.get('buildMemoR')(g, ry)); })
    .then(function(buf){ GOT.R = { m:'R', files:unzip(buf) }; }, function(e){ GOT.R = { err:e }; }));

  /* totals typed on the screen (question 48): an ex-VAT typed, VAT follows; a stale entry (items changed) falls back to the calculated values */
  var amtD = memoData('dksh'), amtAuto = I.get('memoTotalsAuto')(amtD), AMT = {};
  amtD.amt = { base:I.get('memoAmtBase')(amtAuto), ex:'20,561.00' };
  AMT.t = I.get('memoTotals')(amtD);
  var stale = memoData('dksh'); stale.amt = { base:'1|1', ex:'1' }; AMT.stale = I.get('memoTotals')(stale);
  jobs.push(Promise.resolve().then(function(){ return blobBytes(w, I.get('buildMemoK')({ no:'W009-70', series:'W', company:'บริษัท ทดสอบ จำกัด', lines:[] }, amtD)); })
    .then(function(buf){ AMT.files = unzip(buf); }, function(e){ AMT.err = e; }));

  return Promise.all(jobs).then(function(){
    Object.keys(GOT).forEach(function(name){
      var r = GOT[name]; scope = name;
      if(r.err){ ok(false, 'build threw: ' + (r.err.stack || r.err)); return; }
      var d = parse(w, r.files), P = d.paras;
      if(r.m !== 'Y'){
        ok(!!r.files['word/media/garuda.png'] && /media\/garuda\.png/.test(r.files['word/_rels/document.xml.rels'].toString()), 'Garuda image packed and linked');
      }
      if(r.m === 'P'){
        checkHead(P, (r.kind === 'drug' ? 'ภย' : 'ภว') + '.0104/2569', /วันที่ {7}27 {3}ตุลาคม {3}2569\t/);
        checkItemTable(d.tables[0], r.layout);
        checkCommittee(P);
        var hn = find(P, /^\t\(นางสาวหัวหน้า/);
        ok(hn && /ทดสอบ\)$/.test(hn.text), 'head of department name trimmed');
      }
      if(r.m === 'K'){
        checkHead(P, (r.kind === 'drug' ? 'ขย' : 'ขว') + '.0005/2570', /วันที่ {7}28 {3}ตุลาคม {3}2569\t/);
        var t = d.tables[0]; checkItemTable(t, r.layout);
        ok(t.rows.some(function(row){ return row.h && row.cells.every(function(c){ return c.noTop && c.text === ''; }); }), 'blank filler row (no top line) runs the table to the page end');
        var buy = find(P, /^ซื้อจาก /); eq(buy && buy.left, 960, '"ซื้อจาก" lines up with the text after "2. "');
        ok(!!find(P.filter(function(x){ return x.pageBreak; }), /^3\. ราคากลาง/), 'item 3 starts a new page');
        checkCommittee(P);
        var sign = d.tables[1].rows[0].cells, right = sign[1].paras;
        ok(/^ลงชื่อ\.+\(เจ้าหน้าที่พัสดุ\)/.test(sign[0].text), 'left signature: เจ้าหน้าที่พัสดุ');
        eq(right[0].jc, 'center', 'right signature line centred in its cell');
        eq(right[1] && right[1].tabs.join(), 'center:1737', 'right name / position centred under the dotted line');
        ok(right[1] && /^\t\(นางสาวหัวหน้า {3}ทดสอบ\)\n\t\S/.test(right[1].text), 'right name trimmed, position below it');
        var dir = d.tables[2].rows[0].cells[1].text;
        ok(/^อนุมัติลงนามแล้ว\n{6}ลงนาม\.+\n\(นายผู้อำนวยการ {3}ทดสอบ\)/.test(dir), 'director block: ลงนาม on the 7th line');
      }
      if(r.m === 'Y'){
        var no = find(P, /^เลขที่  /); ok(no && no.text === 'เลขที่  ' + (r.kind === 'drug' ? 'ย' : 'ยว') + '.0005/2570', 'ย. number = ขย. number');
        var t = d.tables[0];
        eq(t.w, 10226, 'ย. table width'); eq(t.ind, -600, 'ย. table indent'); eq(sum(t.grid), 10226, 'ย. columns add up');
        var head = t.rows[0].cells.map(function(c){ return c.text.replace(/\n/g, ' '); });
        eq(head.some(function(x){ return /ไม่รวม VAT\)$/.test(x) && /^ราคาต่อ/.test(x); }), r.layout !== 'other', 'ex-VAT price column only for DKSH / Zuellig');
        ok(head[1] === (r.kind === 'drug' ? 'รายการยา' : 'รายการเวชภัณฑ์ที่มิใช่ยา'), 'item column title');
        var foot = t.rows[t.rows.length - 1].cells[0];
        eq(foot.paras[0].tabs.join(), 'right:' + (10226 - 160), 'amount in words tabbed to the right edge');
        ['2.1', '2.2'].forEach(function(n){
          var c = find(P, new RegExp('^' + n.replace('.', '\\.') + '\\t'));
          ok(c && c.left === 1620 && c.hang === 540, n + ': number, tab, wrapped lines in line with the first');
        });
        var dirCell = d.tables[1].rows[1].cells[0].text;
        ok(/^\n\nลงชื่อ\.+\n\(นายผู้อำนวยการ {3}ทดสอบ\)/.test(dirCell), 'director: two blank lines before ลงชื่อ');
        ok(/^\n\n\nลงชื่อ\.+ ผู้รับใบสั่งซื้อ/.test(d.tables[1].rows[1].cells[1].text), 'seller signature block');
        ok(!r.files['word/media/garuda.png'], 'no Garuda on ย.');
      }
      if(r.m === 'R'){
        checkHead(P, 'รย.0007/2569', /วันที่ {7}16 {3}พฤศจิกายน {3}2569\t/);
        var body = find(P, /^ตามบันทึก/);
        ok(body && body.text.indexOf('ขย.0005/2570') >= 0 && body.text.indexOf('1,500.00') >= 0, 'refers to ขย. and totals only the ticked rows');
        ok(/\(นางสาวทดสอบหนึ่ง {4}นามสกุลหนึ่ง\)/.test(d.xml.replace(/<[^>]+>/g, '')), 'chair name in the signatures');
        eq(d.tables[0].ind, -431, 'payment box indent');
        ok(d.tables[0].rows.every(function(row){ return row.cells.every(function(c){ return c.v === 'top'; }); }), 'payment box cells aligned to the top');
      }
    });
    scope = 'typed totals';
    eq(amtAuto.ex, 20560.75, 'DKSH ex-VAT = total ÷ 1.07 like the W sheet (his choice ข, question 48)');
    ok(AMT.t.ex === 20561 && AMT.t.vat === 1439 && AMT.t.total === 22000 && AMT.t.edited, 'typed ex-VAT used, VAT follows, total unchanged');
    ok(AMT.stale.ex === 20560.75 && !AMT.stale.edited, 'stale typed value ignored');
    if(AMT.err) ok(false, 'build threw: ' + (AMT.err.stack || AMT.err));
    else {
      var rowsT = parse(w, AMT.files).tables[0].rows.map(function(r){ return r.cells.map(function(c){ return c.text; }).join('|'); });
      ok(rowsT.indexOf('มูลค่าที่ไม่รวมภาษี|20,561.00') >= 0 && rowsT.indexOf('ภาษีมูลค่าเพิ่ม 7%|1,439.00') >= 0 && rowsT.indexOf('รวมจำนวนเงินทั้งสิ้น|22,000.00') >= 0, 'typed totals printed in the ขย. table');
    }
    scope = 'page';
    ok(!p.errors.length, 'no script errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''));
    console.log((fails ? 'FAILED ' + fails + ' of ' : 'passed all ') + (passes + fails) + ' checks on ' + Object.keys(GOT).length + ' documents');
    process.exit(fails ? 1 : 0);
  });
}).catch(function(e){ console.error(e && e.stack || e); process.exit(1); });
