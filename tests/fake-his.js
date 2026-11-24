/* Made-up HIS exports: same headers the page reads (extractRows in index.html), invented items, companies and figures.
   Nothing here comes from a real export, so the files, and screenshots made from them, are safe to publish.
   Run: node fake-his.js [outDir]   (default: <tmp>/rj2-fake-his) · used by screens.js; also works with smoke.js <files…>
   The same seed always gives the same files, so screenshots of two releases are comparable. */
const XLSX = require('xlsx'), fs = require('fs'), path = require('path'), os = require('os');

function rng(seed){ return function(){ seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; }

function build(opts){
  opts = opts || {};
  const rnd = rng(opts.seed || 20261124), pick = a => a[Math.floor(rnd() * a.length)], int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const today = opts.today || new Date(), ty = today.getFullYear(), tm = today.getMonth() + 1;
  const iso = (y, m, d) => y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  /* months from Oct two fiscal years back up to this month, so both year comparisons have data */
  const months = []; for(let y = ty - 2, m = 10; y * 100 + m <= ty * 100 + tm; m === 12 ? (y++, m = 1) : m++) months.push([y, m]);
  const companies = ['บริษัท ตัวอย่างเภสัช จำกัด', 'บริษัท สมมติฟาร์มา จำกัด', 'บริษัท ทดลองเมดิคอล จำกัด', 'บริษัท จำลองการแพทย์ จำกัด', 'องค์การทดสอบ'];
  const makers = ['FAKE LAB', 'DEMO PHARMA', 'SAMPLE CO', 'MOCK HEALTH'];
  const forms = [['TAB', 'MG'], ['CAP', 'MG'], ['INJ', 'MG/ML'], ['SYR', 'MG/5 ML'], ['CREAM', '%']];
  const acc = ['1', '1', '2', '3', '4', '9', '9', '10'], gpsc = ['01', '02', '03', '04', '05', '06'];
  const items = [];
  for(let i = 0; i < 48; i++){
    const id = String(1001 + i), f = pick(forms), str = pick([5, 10, 20, 50, 100, 250, 500]);
    const rgt = i < 38 ? '1' : i < 44 ? '2' : '3', a = rgt === '2' ? '10' : pick(acc);
    const gen = 'DEMODRUG ' + String.fromCharCode(65 + (i % 26)) + (i >= 26 ? '2' : '');
    items.push({ id, gen, trade: 'Fakeol-' + (i + 1), name: (rgt === '2' ? 'SUPPLY ITEM ' + (i + 1) : gen + ' ' + str + ' ' + f[1] + ' ' + f[0]),
      str: str + ' ' + f[1], form: f[0], pack: pick([10, 30, 50, 100, 500]), cost: int(2, 60) + int(0, 99) / 100, acc: a, rgt,
      gpsc: pick(gpsc), company: pick(companies), maker: pick(makers), use: int(50, 4000) });
  }
  const accName = { '1':'b:basic list (EDก)', '2':'b:basic list (EDข)', '3':'s:supplemental list (EDค)', '4':'ex:exclusive list (EDง)', '9':'NED', '10':'เวชภัณฑ์มิใช่ยา' };
  const rgtName = { '1':'ทะเบียนยา', '2':'ทะเบียนเวชภัณฑ์ที่มิใช่ยา', '3':'ทะเบียนเภสัชเคมีภัณฑ์' };
  const files = {};
  files['Meditem.xlsx'] = [['meditem','medname','packqty','costrate','accnation','gpscode','medrgttype','ised','drugcode','tpucode','gpucode','content','gnrname','medunit','medunitsml']]
    .concat(items.map(x => [x.id, x.name, x.pack, x.cost * x.pack, x.acc, x.gpsc, x.rgt, x.acc === '9' ? 'N' : 'E', 'D' + x.id, '9' + x.id, '8' + x.id, x.str, x.gen, 'BOX', x.form]));
  files['Medical Product Registration.xlsx'] = [['hospdrugid','medrgttype_name','medaccnation_name','gpucode','tmtcode']]
    .concat(items.map(x => [x.id, rgtName[x.rgt], accName[x.acc], '8' + x.id, '7' + x.id]));
  files['gpsc.xlsx'] = [['gpsc','detail']].concat(gpsc.map(g => [g, 'กลุ่มยาสมมติ ' + g]));
  files['DrugCatNow.xlsx'] = [['hospcode','generic','tradename','content','packsize','distribute','manufact','ndc24','strength','dosageform']]
    .concat(items.map(x => [x.id, x.gen, x.trade, x.str, x.pack, x.company, x.maker, '24' + x.id, x.str, x.form]));
  files['inventory_exp.xlsx'] = [['meditem','medname','sumqty','unitcost','packqty','lot','expdate','tdate']]
    .concat(items.map(x => [x.id, x.name, int(0, 40), x.cost * x.pack, x.pack, 'L' + int(100, 999), iso(ty + int(0, 2), int(1, 12), int(1, 28)), iso(ty, tm, Math.min(today.getDate(), 28))]));
  files['list.xlsx'] = [['meditem','medname','lowrate','highrate','userate','sumqty']]
    .concat(items.map(x => [x.id, x.name, Math.round(x.use * 0.6), Math.round(x.use * 1.4), x.use, int(0, 3000)]));
  [['ห้องจ่ายยา ชั้น G.xlsx', 'ห้องจ่ายยา ชั้น G'], ['ห้องจ่ายยา ชั้น 1.xlsx', 'ห้องจ่ายยา ชั้น 1']].forEach(([fn, dsp]) => {
    files[fn] = [['meditem','medname','stkqty','dspname','lot','expdate']]
      .concat(items.map(x => [x.id, x.name, int(0, 300), dsp, 'L' + int(100, 999), iso(ty + 1, int(1, 12), int(1, 28))]));
  });
  /* planfin: this fiscal year and the one before (fiscal year starts in October, พ.ศ.) */
  const fy = (tm >= 10 ? ty + 1 : ty) + 543;
  [fy - 1, fy].forEach(y => {
    files['planfin ' + String(y).slice(2) + '.xlsx'] = [['meditem','yearplan','buytotalamount','buytotalvalue','medname','gpucode','tpucode','packqty','unitname','cost','medgroup','medtype']]
      .concat(items.filter(x => x.rgt === '1').map(x => { const q = Math.round(x.use * 12 / x.pack * (0.8 + rnd() * 0.5)); return [x.id, y, q, Math.round(q * x.cost * x.pack), x.name, '8' + x.id, '9' + x.id, x.pack, 'BOX', x.cost * x.pack, '1', '1']; }));
  });
  const kinds = ['จ่ายตามใบเบิก', 'จ่ายตามใบเบิก', 'จ่ายตามใบเบิก', 'แลกเปลี่ยน', 'จ่ายทั่วไป', 'เบิกฉุกเฉิน'];
  const units = [['U1', 'ห้องจ่ายยาสมมติ ชั้น 1'], ['U2', 'ห้องจ่ายยาสมมติ ชั้น G'], ['U3', 'หอผู้ป่วยสมมติ']];
  const disp = [['motpdate','meditem','payqty','unitcost','mednm','rqtlct','rqtnm','name','packqty','name2','gpscnm']];
  const po = [['minpdate','meditem','rcvqty','minpunitcost','unitcost','medname','company_dspname','note','name','packqty','invno','minpno','minptype']];
  let pno = 1;
  months.forEach(([y, m]) => {
    items.forEach(x => {
      if(rnd() < 0.7){ const u = pick(units), q = Math.round(x.use * (0.6 + rnd() * 0.8)); disp.push([iso(y, m, int(1, 28)), x.id, q, x.cost, x.name, u[0], u[1], pick(kinds), x.pack, x.form, 'กลุ่มยาสมมติ ' + x.gpsc]); }
      if(rnd() < 0.25){ const b = int(5, 60), p = x.cost * x.pack; po.push([iso(y, m, int(1, 28)), x.id, b, p, b * p, x.name, x.company, '', 'BOX', x.pack, 'INV-' + pno, 'P' + String(pno++).padStart(5, '0'), rnd() < 0.9 ? '101' : '102']); }
    });
  });
  files['dispen_inven.xlsx'] = disp;
  files['PO_Inventory.xlsx'] = po;
  return files;
}

function write(outDir, opts){
  outDir = outDir || path.join(os.tmpdir(), 'rj2-fake-his');
  fs.mkdirSync(outDir, { recursive:true });
  const files = build(opts);
  return Object.keys(files).map(name => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(files[name]), 'Sheet1');
    const p = path.join(outDir, name);
    XLSX.writeFile(wb, p);
    return p;
  });
}

module.exports = { build, write };
if(require.main === module) console.log(write(process.argv[2]).join('\n'));
