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
 const w=createWindow('WiFi & Power','📶','<div class="lxa" style="height:100%;overflow:auto;padding:14px;background:#0f1524;color:#dbe7ff;font:13px system-ui"></div>',720,560);
 const R=w.querySelector('.lxa');
 const btn='background:#2563eb;color:#fff;border:0;border-radius:8px;padding:8px 12px;margin:3px;cursor:pointer;font:600 12px system-ui';
 R.innerHTML='<div class="st">⏳ helper se jud raha hoon...</div>';
 (async()=>{
  let apps;try{apps=await api('/api/apps')}catch(e){R.innerHTML='<div style="color:#fbbf24">⚠ Ye app sirf <b>SmartOS-Lubuntu ISO</b> me chalta hai (jahan helper chalu hota hai). Normal browser me asli Linux apps nahi khul sakte.</div>';return}
  R.innerHTML='<b>⏻ Power</b><div style="margin:8px 0"><button class="pw" style="'+btn+';background:#b91c1c">⏻ Band karo</button> <button class="rb" style="'+btn+';background:#92400e">↻ Restart</button></div>'+
  '<b>📶 WiFi</b><div style="margin:8px 0"><button class="sc" style="'+btn+'">Scan</button> <span class="ws" style="opacity:.7"></span></div><div class="wl"></div>'+
  '<div class="msg" style="margin-top:8px;opacity:.8"></div>';
  const q=s=>R.querySelector(s),msg=t=>q('.msg').textContent=t;
  q('.pw').onclick=()=>{if(confirm('Computer band karna hai?'))post('/api/power',{action:'poweroff'}).catch(x=>msg('❌ '+x.message))};
  q('.rb').onclick=()=>{if(confirm('Restart karna hai?'))post('/api/power',{action:'reboot'}).catch(x=>msg('❌ '+x.message))};
  q('.sc').onclick=async()=>{q('.ws').textContent='scan ho raha hai...';try{const L=await api('/api/wifi/scan');q('.ws').textContent=L.length+' network';
   q('.wl').innerHTML=L.map((n,i)=>'<div style="display:flex;gap:6px;align-items:center;padding:4px 0;border-bottom:1px solid #1b2745"><span style="flex:1">'+(n.on?'✅ ':'')+esc(n.ssid)+' <small style="opacity:.6">'+n.signal+'% '+esc(n.sec)+'</small></span><input type="password" placeholder="password" data-i="'+i+'" style="background:#0b1020;color:#dbe7ff;border:1px solid #2b3a63;border-radius:6px;padding:4px"><button data-s="'+i+'" style="'+btn+'">Jodo</button></div>').join('');
   q('.wl').onclick=async e=>{const b=e.target.closest('button[data-s]');if(!b)return;const n=L[+b.dataset.s],pw=q('input[data-i="'+b.dataset.s+'"]').value;msg('⏳ '+n.ssid+' se jud raha hoon...');
    try{const r=await post('/api/wifi/connect',{ssid:n.ssid,password:pw});msg(r.ok?'✅ Jud gaya: '+n.ssid:'❌ '+(r.msg||'nahi juda'))}catch(x){msg('❌ '+x.message)}}}catch(x){q('.ws').textContent='❌ '+x.message}};
 })();
 return w};

window.openNativeApp=function(id,name,icon){
 const w=createWindow(name,icon,'<div class="nx" style="height:100%;width:100%;background:#0b1020;color:#9fb0d6;font:13px system-ui;padding:14px;box-sizing:border-box">⏳ '+esc(name)+' khul raha hai...</div>',980,640);
 const R=w.querySelector('.nx');let xid=null,dead=false,last='',since=0,sent='';
 const rect=()=>{const r=R.getBoundingClientRect(),ox=window.screenX,oy=window.screenY+(window.outerHeight-window.innerHeight);
  return {x:Math.round(r.left+ox),y:Math.round(r.top+oy),w:Math.round(r.width),h:Math.round(r.height),cx:r.left+r.width/2,cy:r.top+r.height/2,pts:[[r.left+8,r.top+8],[r.right-8,r.top+8],[r.left+8,r.bottom-8],[r.right-8,r.bottom-8],[r.left+r.width/2,r.top+r.height/2]]}};
 const top=r=>{if(!w.isConnected||r.w<60||r.h<60)return false;const cs=getComputedStyle(w);if(cs.display==='none'||cs.visibility==='hidden')return false;
  return r.pts.every(p=>{const e=document.elementFromPoint(p[0],p[1]);return e&&w.contains(e)})};
 (async()=>{
  try{const r0=rect();const r=await post('/api/x/open',{app:id,x:r0.x,y:r0.y,w:r0.w,h:r0.h});if(!r.ok)throw new Error(r.msg||'error');xid=r.id;R.textContent='';
  }catch(e){R.innerHTML='<div style="color:#fbbf24">⚠ '+esc(e.message)+'</div>';return}
  const iv=setInterval(async()=>{
   if(!w.isConnected){clearInterval(iv);dead=true;post('/api/x/close',{id:xid}).catch(()=>{});return}
   const r=rect(),key=[r.x,r.y,r.w,r.h].join(','),now=Date.now();
   if(key!==last){last=key;since=now}
   const stable=now-since>220,show=stable&&top(r),cmd=show?'s'+key:'h';
   if(!show&&sent==='h')return;
   if(show&&sent===cmd&&(now%1200>150))return;
   sent=cmd;
   try{const j=await post('/api/x/geom',{id:xid,x:r.x,y:r.y,w:r.w,h:r.h,show});if(j&&j.alive===false){clearInterval(iv);R.textContent='[app band ho gaya]';const c=w.querySelector('.win-close,.close,[data-close]');}}catch(e){}
  },120);
 })();
 return w};
window.openGuiApp=function(id,name,icon){
 const w=createWindow(name,icon,'<div class="gui" style="height:100%;width:100%;background:#000"><div style="color:#9fb0d6;padding:14px;font:13px system-ui">⏳ '+esc(name)+' khul raha hai...</div></div>',980,640);
 const R=w.querySelector('.gui');let gid=null;
 (async()=>{
  try{const r=await post('/api/gui/open',{app:id,w:1024,h:640});if(!r.ok)throw new Error(r.msg||'error');gid=r.id;
   await new Promise(x=>setTimeout(x,1800));
   R.innerHTML='<iframe allow="clipboard-read; clipboard-write" style="width:100%;height:100%;border:0;background:#000" src="http://127.0.0.1:'+r.port+'/vnc.html?autoconnect=1&resize=scale&reconnect=1&reconnect_delay=1000&show_dot=1&password='+r.pw+'&path=websockify"></iframe>';
  }catch(e){R.innerHTML='<div style="color:#fbbf24;padding:14px;font:13px system-ui">⚠ '+esc(e.message)+'</div>'}
  const iv=setInterval(()=>{if(!w.isConnected){clearInterval(iv);gid&&post('/api/gui/close',{id:gid}).catch(()=>{})}},3000);
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
if(ci)ci.insertAdjacentHTML('afterend','<div class="ctx-item" onclick="openLinuxApps()"><span>📶</span> WiFi &amp; Power</div><div class="ctx-item" onclick="openTerminal()"><span>💻</span> Terminal</div>');
setTimeout(async function(){if(!window.smApps)return;
 var has=function(n){return window.smApps.some(function(x){return x[0]===n})};
 if(!has('WiFi & Power'))window.smApps.push(['WiFi & Power','📶','#14b8a6','#0f766e','System','openLinuxApps']);
 if(!has('Terminal'))window.smApps.push(['Terminal','💻','#334155','#0f172a','System','openTerminal']);
 var IC={chrome:'🧭',firefox:'🦊',files:'📂',editor:'📝',office:'📄',vlc:'🔶',settings:'🔧',software:'🛍️',net:'🌐',media:'🎬',gfx:'🎨',dev:'🛠️',game:'🎮',sys:'⚙️',util:'🧰'};
 window.__lx=window.__lx||{};
 var sync=async function(){try{var L=await api('/api/apps');var names={};
  L.forEach(function(a){if(a.id==='xterm'||a.id==='terminal')return;names[a.name]=1;
   if(window.__lx[a.name]||has(a.name))return;window.__lx[a.name]=1;
   window.smApps.push([a.name,IC[a.id]||IC[a.cat]||'🐧','#f59e0b','#b45309','Linux',function(){openNativeApp(a.id,a.name,IC[a.id]||IC[a.cat]||'🐧')}])});
  Object.keys(window.__lx).forEach(function(n){if(!names[n]){delete window.__lx[n];for(var i=window.smApps.length-1;i>=0;i--)if(window.smApps[i][0]===n)window.smApps.splice(i,1)}});
  window.smRender&&smRender()}catch(e){}};
 await sync();setInterval(sync,20000);
 window.smRender&&smRender()},7400);
// right-click baar baar na ho: 700ms ke andar dobara aaya contextmenu ignore
(function(){var last=0;window.addEventListener('contextmenu',function(e){var n=Date.now();if(n-last<700){e.preventDefault();e.stopImmediatePropagation();return}last=n},true)})();
}catch(e){console.error('Linux Apps',e)}})();
