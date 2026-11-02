/* Smoke test: open the page, drop HIS files, report what each slot picked up and any script errors.
     node smoke.js                 → every .xls / .xlsx at the top of ../ลาก/ (none there: page load only)
     node smoke.js a.xls b.xlsx    → just these files
   Exit code 1 on a script error or an unrecognised file. Prints no data values, only slot names and row counts. */
var h = require('./harness');

var files = process.argv.slice(2);
if(!files.length) files = h.dataFiles();

h.load().then(function(p){
  var loadErrors = p.errors.slice();
  console.log('page loaded: ' + (loadErrors.length ? loadErrors.length + ' error(s)' : 'no errors'));
  if(!files.length){
    console.log('no files in ลาก/ to drop (data never travels with the repo)');
    return finish(p, '');
  }
  console.log('dropping ' + files.length + ' file(s)…');
  return p.drop(files).then(function(r){
    console.log('note : ' + r.note);
    if(r.error) console.log('error: ' + r.error);
    [].forEach.call(p.document.querySelectorAll('#file-slots .fs-slot'), function(s){
      var name = s.querySelector('.fs-name').textContent.trim();
      var meta = s.querySelectorAll('.fs-meta');
      console.log((s.classList.contains('missing') ? '  - ' : '  ✓ ') + name + (meta.length > 1 ? '  ' + meta[meta.length - 1].textContent.trim() : ''));
    });
    return finish(p, r.error);
  });
}).catch(function(e){ console.error(e && e.stack || e); process.exit(1); });

function finish(p, importError){
  if(p.errors.length){ console.log('\nscript errors:'); p.errors.forEach(function(e){ console.log('  ' + e); }); }
  p.close();
  process.exit(p.errors.length || /ไม่รู้จักไฟล์/.test(importError) ? 1 : 0);
}
