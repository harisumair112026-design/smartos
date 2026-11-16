const { chromium, firefox, webkit } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const html = process.argv[2];
function rssFor(pattern){ // KB me total RSS un processes ka jinki cmd me pattern ho
  try{ const out = execSync("ps -eo rss=,args=").toString().split('\n'); let t=0,n=0;
    for(const l of out){ if(l.includes(pattern) && !l.includes('ps -eo')){ t+=parseInt(l.trim().split(/\s+/)[0])||0; n++; } } return {mb:Math.round(t/1024), procs:n}; }catch(e){ return {mb:-1,procs:0}; }
}
(async()=>{
  const res = {};
  const engines = [
    ['chromium', chromium, {}, 'ms-playwright/chromium'],
    ['chromium-lowmem', chromium, {args:['--single-process','--no-zygote','--disable-gpu','--disable-dev-shm-usage','--renderer-process-limit=1','--disable-extensions','--js-flags=--max-old-space-size=256']}, 'ms-playwright/chromium'],
    ['firefox', firefox, {}, 'ms-playwright/firefox'],
    ['webkit', webkit, {}, 'ms-playwright/webkit'],
  ];
  for(const [name, eng, opts, pat] of engines){
    const r = {errors:[], logs:0};
    try{
      const b = await eng.launch(opts);
      const p = await b.newPage({viewport:{width:1280,height:720}});
      p.on('pageerror', e=>r.errors.push(String(e).slice(0,160)));
      p.on('console', m=>{ r.logs++; });
      const t0=Date.now();
      await p.goto('http://127.0.0.1:8099/'+html, {waitUntil:'load', timeout:60000});
      r.loadMs = Date.now()-t0;
      await p.waitForTimeout(8000);
      r.feat = await p.evaluate(()=>({
        AudioContext: typeof (window.AudioContext||window.webkitAudioContext),
        MediaRecorder: typeof window.MediaRecorder,
        OffscreenCanvas: typeof window.OffscreenCanvas,
        WebGL: !!document.createElement('canvas').getContext('webgl'),
        WebGL2: !!document.createElement('canvas').getContext('webgl2'),
        speech: typeof (window.SpeechRecognition||window.webkitSpeechRecognition),
        serviceWorker: 'serviceWorker' in navigator,
        webcodecs: typeof window.VideoEncoder,
        fileSystemAccess: typeof window.showOpenFilePicker,
        title: document.title, bodyLen: document.body.innerText.length,
        windowsApi: typeof window.openClaudeTools
      }));
      await p.screenshot({path:`shot-${name}.png`});
      r.rss = rssFor(pat);
      await b.close();
    }catch(e){ r.fatal = String(e).slice(0,300); }
    res[name]=r; console.log(name, JSON.stringify(r));
  }
  fs.writeFileSync('results.json', JSON.stringify(res,null,1));
})();
