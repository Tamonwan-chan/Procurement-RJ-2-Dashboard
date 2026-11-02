/* Load mockup/dashboard-mockup.html headlessly and drop files on it, the way พี่โอม does in the browser.
   Usage from an ad-hoc check:
     var h = require('./harness');
     h.load().then(function(p){ return p.drop(['../ลาก/Meditem.xls']).then(function(){ ...p.window.document... }); });
   Each load() gets a fresh, empty IndexedDB; pass the same `idb` to load({ idb }) to reopen with saved data. */
var fs = require('fs');
var path = require('path');
var JSDOM = require('jsdom').JSDOM;
var VirtualConsole = require('jsdom').VirtualConsole;
var IDBFactory = require('fake-indexeddb').IDBFactory;
var XLSX = require('xlsx');

var ROOT = path.resolve(__dirname, '..');
var PAGE = path.join(ROOT, 'mockup', 'dashboard-mockup.html');
var DATA_DIR = path.join(ROOT, 'ลาก');

/* SheetJS lives in Node's realm, the page's ArrayBuffers in jsdom's: hand it a Buffer instead */
var shimXLSX = Object.assign({}, XLSX, {
  read: function(d, o){
    if(o && o.type === 'array' && d && d.byteLength !== undefined) return XLSX.read(Buffer.from(new Uint8Array(d)), Object.assign({}, o, { type:'buffer' }));
    return XLSX.read(d, o);
  }
});

function load(opts){
  opts = opts || {};
  var errors = [];
  var vc = new VirtualConsole();
  vc.on('jsdomError', function(e){ errors.push(e.message + (e.detail ? ' ' + e.detail : '')); });
  vc.on('error', function(){ errors.push([].slice.call(arguments).join(' ')); });
  if(opts.verbose) vc.on('log', function(){ console.log.apply(console, ['[page]'].concat([].slice.call(arguments))); });
  var idb = opts.idb || new IDBFactory();
  /* the page loads SheetJS from cdnjs; inject the local copy instead */
  var html = fs.readFileSync(PAGE, 'utf8').replace(/<script src="https:\/\/cdnjs[^"]*xlsx[^"]*"><\/script>/, '');
  var dom = new JSDOM(html, {
    url: 'http://localhost/mockup/dashboard-mockup.html',
    runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse: function(w){
      w.XLSX = shimXLSX;
      w.indexedDB = idb;
      w.alert = function(m){ errors.push('alert: ' + m); };
      w.confirm = function(){ return true; };
      w.prompt = function(){ return null; };
      w.scrollTo = function(){};
      w.matchMedia = w.matchMedia || function(){ return { matches:false, addListener:function(){}, removeListener:function(){}, addEventListener:function(){}, removeEventListener:function(){} }; };
      w.addEventListener('error', function(e){ errors.push((e.error && e.error.stack) || e.message); });
      w.addEventListener('unhandledrejection', function(e){ errors.push('unhandled rejection: ' + (e.reason && e.reason.stack || e.reason)); });
    }
  });
  var w = dom.window;
  var page = {
    window: w, document: w.document, errors: errors, idb: idb,
    text: function(sel){ var el = w.document.querySelector(sel); return el ? el.textContent.trim() : ''; },
    /* drop files on the drop zone; resolves when the import note or the error bar shows a result */
    drop: function(paths){
      var files = paths.map(function(p){ return new w.File([fs.readFileSync(p)], path.basename(p)); });
      var note = w.document.getElementById('importnote'), bar = w.document.getElementById('errorbar');
      note.textContent = ''; bar.textContent = '';
      var ev = new w.Event('drop', { bubbles:true, cancelable:true });
      Object.defineProperty(ev, 'dataTransfer', { value:{ files:files } });
      w.document.getElementById('dropzone').dispatchEvent(ev);
      return waitFor(function(){ return /นำเข้าแล้ว|ย้อนหลัง|Inventory Status|ตราครุฑ/.test(note.textContent) || bar.textContent; }, opts.timeout || 120000)
        .then(function(){ return { note: note.textContent, error: bar.textContent }; });
    },
    close: function(){ w.close(); }
  };
  /* let the page finish reading IndexedDB and its first render */
  return new Promise(function(r){ setTimeout(r, 300); }).then(function(){ return page; });
}

function waitFor(cond, ms){
  var t0 = Date.now();
  return new Promise(function(resolve, reject){
    (function tick(){
      if(cond()) return resolve();
      if(Date.now() - t0 > ms) return reject(new Error('timed out after ' + ms + ' ms'));
      setTimeout(tick, 100);
    })();
  });
}

/* HIS exports at the top of ลาก/ (subfolders hold history, samples and unused files) */
function dataFiles(){
  if(!fs.existsSync(DATA_DIR)) return [];
  return fs.readdirSync(DATA_DIR).filter(function(f){ return /\.xlsx?$/i.test(f); }).map(function(f){ return path.join(DATA_DIR, f); });
}

module.exports = { load:load, waitFor:waitFor, dataFiles:dataFiles, ROOT:ROOT, DATA_DIR:DATA_DIR };
