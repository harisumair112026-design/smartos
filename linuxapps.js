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
  R.innerHTML='<b>🐧 Asli Linux apps</b><div class="ap" style="margin:8px 0"></div><div style="margin:8px 0"><button class="dk" style="'+btn+';background:#7c3aed">🖥 Asli Desktop dikhao</button> <button class="pw" style="'+btn+';background:#b91c1c">⏻ Band karo</button> <button class="rb" style="'+btn+';background:#92400e">↻ Restart</button></div>'+
  '<b>📶 WiFi</b><div style="margin:8px 0"><button class="sc" style="'+btn+'">Scan</button> <span class="ws" style="opacity:.7"></span></div><div class="wl"></div>'+
  '<div class="msg" style="margin-top:8px;opacity:.8"></div>';
  const q=s=>R.querySelector(s),msg=t=>q('.msg').textContent=t;
  q('.ap').innerHTML=apps.length?apps.map(a=>'<button data-id="'+esc(a.id)+'" style="'+btn+'">'+esc(a.name)+'</button>').join(''):'<span style="opacity:.7">Koi allowlist app install nahi mili</span>';
  q('.ap').onclick=async e=>{const b=e.target.closest('button');if(!b)return;try{await post('/api/launch',{app:b.dataset.id});msg('✅ '+b.textContent+' khul raha hai (Asli Desktop me dikhega)')}catch(x){msg('❌ '+x.message)}};
  q('.dk').onclick=()=>post('/api/desktop').catch(x=>msg('❌ '+x.message));
  q('.pw').onclick=()=>{if(confirm('Computer band karna hai?'))post('/api/power',{action:'poweroff'}).catch(x=>msg('❌ '+x.message))};
  q('.rb').onclick=()=>{if(confirm('Restart karna hai?'))post('/api/power',{action:'reboot'}).catch(x=>msg('❌ '+x.message))};
  q('.sc').onclick=async()=>{q('.ws').textContent='scan ho raha hai...';try{const L=await api('/api/wifi/scan');q('.ws').textContent=L.length+' network';
   q('.wl').innerHTML=L.map((n,i)=>'<div style="display:flex;gap:6px;align-items:center;padding:4px 0;border-bottom:1px solid #1b2745"><span style="flex:1">'+(n.on?'✅ ':'')+esc(n.ssid)+' <small style="opacity:.6">'+n.signal+'% '+esc(n.sec)+'</small></span><input type="password" placeholder="password" data-i="'+i+'" style="background:#0b1020;color:#dbe7ff;border:1px solid #2b3a63;border-radius:6px;padding:4px"><button data-s="'+i+'" style="'+btn+'">Jodo</button></div>').join('');
   q('.wl').onclick=async e=>{const b=e.target.closest('button[data-s]');if(!b)return;const n=L[+b.dataset.s],pw=q('input[data-i="'+b.dataset.s+'"]').value;msg('⏳ '+n.ssid+' se jud raha hoon...');
    try{const r=await post('/api/wifi/connect',{ssid:n.ssid,password:pw});msg(r.ok?'✅ Jud gaya: '+n.ssid:'❌ '+(r.msg||'nahi juda'))}catch(x){msg('❌ '+x.message)}}}catch(x){q('.ws').textContent='❌ '+x.message}};
 })();
 return w};
const ci=document.querySelector('.ctx-item[onclick*="openClaudeTools"]')||document.querySelector('.ctx-item[onclick*="openAudioEditor"]');
if(ci)ci.insertAdjacentHTML('afterend','<div class="ctx-item" onclick="openLinuxApps()"><span>🐧</span> Linux Apps</div>');
setTimeout(function(){if(!window.smApps)return;if(!window.smApps.some(function(x){return x[0]==='Linux Apps'}))window.smApps.push(['Linux Apps','🐧','#f59e0b','#b45309','System','openLinuxApps']);window.smRender&&smRender()},7400);
}catch(e){console.error('Linux Apps',e)}})();
