/* ===== Smart OS Linux Apps (additive): asli Linux apps, WiFi, Desktop button, Power. Sirf SmartOS-Lubuntu ISO me ===== */
(function(){try{
if(window.openLinuxApps)return;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let TOK=null;
const api=async(p,o)=>{if(!TOK){const r=await fetch('/api/token');TOK=(await r.json()).token}
 o=o||{};o.headers=Object.assign({'X-Token':TOK,'Content-Type':'application/json'},o.headers||{});
 const r=await fetch(p,o);if(!r.ok)throw new Error('HTTP '+r.status);return r.json()};
const post=(p,d)=>api(p,{method:'POST',body:JSON.stringify(d||{})});
window.openLinuxApps=function(){
 const w=createWindow('Linux Apps','🐧','<div class="lxa" style="height:100%;overflow:auto;padding:14px;background:#0f1524;color:#dbe7ff;font:13px system-ui"></div>',720,560);
 const R=w.querySelector('.lxa');
 const btn='background:#2563eb;color:#fff;border:0;border-radius:8px;padding:8px 12px;margin:3px;cursor:pointer;font:600 12px system-ui';
 R.innerHTML='<div class="st">⏳ helper se jud raha hoon...</div>';
 (async()=>{
  let apps;try{apps=await api('/api/apps')}catch(e){R.innerHTML='<div style="color:#fbbf24">⚠ Ye app sirf <b>SmartOS-Lubuntu ISO</b> me chalta hai (jahan helper chalu hota hai). Normal browser me asli Linux apps nahi khul sakte.</div>';return}
  R.innerHTML='<b>🐧 Asli Linux apps</b><div class="ap" style="margin:8px 0"></div><div style="margin:8px 0"><button class="pw" style="'+btn+';background:#b91c1c">⏻ Band karo</button> <button class="rb" style="'+btn+';background:#92400e">↻ Restart</button></div>'+
  '<b>📶 WiFi</b><div style="margin:8px 0"><button class="sc" style="'+btn+'">Scan</button> <span class="ws" style="opacity:.7"></span></div><div class="wl"></div>'+
  '<div class="msg" style="margin-top:8px;opacity:.8"></div>';
  const q=s=>R.querySelector(s),msg=t=>q('.msg').textContent=t;
  q('.ap').innerHTML=apps.length?apps.map(a=>'<button data-id="'+esc(a.id)+'" style="'+btn+'">'+esc(a.name)+'</button>').join(''):'<span style="opacity:.7">Koi allowlist app install nahi mili</span>';
  q('.ap').onclick=async e=>{const b=e.target.closest('button');if(!b)return;try{await post('/api/launch',{app:b.dataset.id});msg('✅ '+b.textContent+' khul raha hai')}catch(x){msg('❌ '+x.message)}};
  q('.pw').onclick=()=>{if(confirm('Computer band karna hai?'))post('/api/power',{action:'poweroff'}).catch(x=>msg('❌ '+x.message))};
  q('.rb').onclick=()=>{if(confirm('Restart karna hai?'))post('/api/power',{action:'reboot'}).catch(x=>msg('❌ '+x.message))};
  q('.sc').onclick=async()=>{q('.ws').textContent='scan ho raha hai...';try{const L=await api('/api/wifi/scan');q('.ws').textContent=L.length+' network';
   q('.wl').innerHTML=L.map((n,i)=>'<div style="display:flex;gap:6px;align-items:center;padding:4px 0;border-bottom:1px solid #1b2745"><span style="flex:1">'+(n.on?'✅ ':'')+esc(n.ssid)+' <small style="opacity:.6">'+n.signal+'% '+esc(n.sec)+'</small></span><input type="password" placeholder="password" data-i="'+i+'" style="background:#0b1020;color:#dbe7ff;border:1px solid #2b3a63;border-radius:6px;padding:4px"><button data-s="'+i+'" style="'+btn+'">Jodo</button></div>').join('');
   q('.wl').onclick=async e=>{const b=e.target.closest('button[data-s]');if(!b)return;const n=L[+b.dataset.s],pw=q('input[data-i="'+b.dataset.s+'"]').value;msg('⏳ '+n.ssid+' se jud raha hoon...');
    try{const r=await post('/api/wifi/connect',{ssid:n.ssid,password:pw});msg(r.ok?'✅ Jud gaya: '+n.ssid:'❌ '+(r.msg||'nahi juda'))}catch(x){msg('❌ '+x.message)}}}catch(x){q('.ws').textContent='❌ '+x.message}};
 })();
 return w};

window.openTerminal=function(){
 const w=createWindow('Terminal','💻','<div class="trm" style="height:100%;width:100%;background:#0b1020;box-sizing:border-box;padding:6px;overflow:hidden"></div>',780,480);
 const R=w.querySelector('.trm');let id=null,alive=true,term=null,fit=null,fb=null;
 const b64=t=>btoa(unescape(encodeURIComponent(t)));
 let q=Promise.resolve();const send=d=>{q=q.then(()=>id&&post('/api/term/write',{id,data:b64(d)})).catch(()=>{})};
 const dims=()=>term?{rows:term.rows,cols:term.cols}:{rows:24,cols:90};
 (async()=>{
  try{await api('/api/apps')}catch(e){R.innerHTML='<div style="color:#fbbf24;font:13px system-ui;padding:10px">⚠ Terminal sirf Smart OS ISO me chalta hai (jahan helper chalu hota hai).</div>';return}
  if(window.Terminal){
   term=new Terminal({fontFamily:'DejaVu Sans Mono, monospace',fontSize:14,cursorBlink:true,theme:{background:'#0b1020',foreground:'#e2e8f5',cursor:'#22d3ee'}});
   if(window.FitAddon){fit=new FitAddon.FitAddon();term.loadAddon(fit)}
   term.open(R);if(fit)try{fit.fit()}catch(e){}
   term.onData(send);term.focus();R.addEventListener('click',()=>term.focus());
  }else{
   R.innerHTML='<pre class="o" style="margin:0;height:calc(100% - 34px);overflow:auto;color:#e2e8f5;font:13px DejaVu Sans Mono,monospace;white-space:pre-wrap"></pre><input class="i" autocomplete="off" spellcheck="false" style="width:100%;box-sizing:border-box;background:#121a33;color:#e2e8f5;border:1px solid #2b3a63;border-radius:6px;padding:7px;font:13px DejaVu Sans Mono,monospace" placeholder="command likho, Enter dabao">';
   fb=R.querySelector('.o');const inp=R.querySelector('.i');
   inp.onkeydown=e=>{if(e.key==='Enter'){send(inp.value+'\n');inp.value=''}else if(e.key==='c'&&e.ctrlKey){send('\x03')}};inp.focus();
  }
  const r=await post('/api/term/open',dims());if(!r.ok){(term?term.write('\r\n'+(r.msg||'error')):fb.textContent=r.msg);return}
  id=r.id;
  if(term){const ro=new ResizeObserver(()=>{try{fit&&fit.fit();post('/api/term/resize',Object.assign({id},dims()))}catch(e){}});ro.observe(R)}
  const iv=setInterval(()=>{if(!w.isConnected){clearInterval(iv);alive=false;id&&post('/api/term/close',{id}).catch(()=>{})}},3000);
  while(alive){
   try{const j=await api('/api/term/read?id='+id);
    if(j.data){const bin=atob(j.data),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
     if(term)term.write(u);else{fb.textContent+=new TextDecoder().decode(u).replace(/\x1b\][^\x07]*\x07/g,'').replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g,'').replace(/\r(?!\n)/g,'');fb.scrollTop=fb.scrollHeight}}
    if(!j.alive){if(term)term.write('\r\n[terminal band ho gaya]\r\n');else fb.textContent+='\n[terminal band ho gaya]\n';break}
   }catch(e){await new Promise(r=>setTimeout(r,1500))}
  }
 })();
 return w};
const ci=document.querySelector('.ctx-item[onclick*="openClaudeTools"]')||document.querySelector('.ctx-item[onclick*="openAudioEditor"]');
if(ci)ci.insertAdjacentHTML('afterend','<div class="ctx-item" onclick="openLinuxApps()"><span>🐧</span> Linux Apps</div><div class="ctx-item" onclick="openTerminal()"><span>💻</span> Terminal</div>');
setTimeout(function(){if(!window.smApps)return;if(!window.smApps.some(function(x){return x[0]==='Linux Apps'}))window.smApps.push(['Linux Apps','🐧','#f59e0b','#b45309','System','openLinuxApps']);if(!window.smApps.some(function(x){return x[0]==='Terminal'}))window.smApps.push(['Terminal','💻','#334155','#0f172a','System','openTerminal']);window.smRender&&smRender()},7400);
}catch(e){console.error('Linux Apps',e)}})();
