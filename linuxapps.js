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

window.openSysInfo=function(){
 const w=createWindow('System Info','ℹ️','<div class="si" style="padding:18px;font:14px/1.7 system-ui;color:#e2e8f5;background:#0b1020;height:100%;box-sizing:border-box;overflow:auto">⏳</div>',460,420);
 const R=w.querySelector('.si');
 (async()=>{try{const i=await api('/api/sysinfo');const row=(k,v)=>'<div style="display:flex;gap:10px;padding:5px 0;border-bottom:1px solid #1f2b4d"><b style="width:120px;color:#9fb0d6">'+k+'</b><span>'+esc(String(v))+'</span></div>';
  R.innerHTML='<div style="font:700 22px system-ui;margin-bottom:10px">Smart OS</div>'+row('Kernel',i.kernel_brand+' (Linux '+i.kernel+')')+row('Base',i.base)+row('Mode',i.mode==='live'?'Live (restart par data nahi bachta)':'Installed (data save rehta hai)')+row('CPU',i.cpu+' x'+i.cores)+row('RAM',i.ram_free_mb+' MB free / '+i.ram_total_mb+' MB')+row('Disk',i.disk_free_gb+' GB free / '+i.disk_total_gb+' GB')+row('Uptime',i.uptime_min+' min')
 }catch(e){R.textContent='⚠ System info sirf Smart OS ISO me milti hai'}})();
 return w};
window.openAppStore=function(){
 const w=createWindow('App Store','🛍️','<div class="as" style="padding:16px;font:14px system-ui;color:#e2e8f5;background:#0b1020;height:100%;box-sizing:border-box;overflow:auto"><div style="color:#9fb0d6">⏳ list aa rahi hai...</div></div>',560,560);
 const R=w.querySelector('.as');let busy=false;
 const draw=async()=>{if(busy||!w.isConnected)return;busy=true;try{const L=await api('/api/pkg/list');
  R.innerHTML='<div style="font:700 20px system-ui;margin-bottom:4px">App Store</div><div style="color:#9fb0d6;margin-bottom:12px">Install hone par app menu me apne aap aa jati hai. Internet chahiye.</div>'+L.map(a=>{
   const btn=a.installed?'<span style="color:#4ade80">✔ Installed</span>':a.status==='running'?'<span style="color:#fbbf24">⏳ Install ho raha hai...</span>':'<button data-k="'+a.key+'" style="background:#3b82f6;color:#fff;border:0;border-radius:8px;padding:7px 14px;cursor:pointer">Install</button>';
   return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;margin:6px 0;background:#121a33;border:1px solid #26345f;border-radius:10px"><div><b>'+esc(a.name)+'</b> <span style="color:#9fb0d6">~'+a.mb+' MB</span><div style="color:#9fb0d6;font-size:13px">'+esc(a.desc)+'</div>'+(a.status==='fail'?'<div style="color:#fca5a5;font-size:13px">❌ '+esc(a.msg)+'</div>':'')+'</div><div>'+btn+'</div></div>'}).join('')
 }catch(e){R.textContent='⚠ App Store sirf Smart OS ISO me chalta hai'}busy=false};
 R.addEventListener('click',async e=>{const b=e.target.closest('button[data-k]');if(!b)return;b.disabled=true;const r=await post('/api/pkg/install',{key:b.dataset.k});if(!r.ok)alert(r.msg||'error');draw()});
 draw();const iv=setInterval(()=>{if(!w.isConnected){clearInterval(iv);return}draw()},2500);
 return w};
window.smLock=async function(){
 if(document.getElementById('sm-lock'))return;
 const H=async t=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('smartos:'+t)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 let hp='';try{hp=localStorage.getItem('sm-pin')||''}catch(e){}
 const o=document.createElement('div');o.id='sm-lock';
 o.style.cssText='position:fixed;inset:0;z-index:2147483000;background:linear-gradient(160deg,#0b1020,#17275a);color:#e2e8f5;display:flex;flex-direction:column;align-items:center;justify-content:center;font:16px system-ui;text-align:center';
 o.innerHTML='<div id="lk-t" style="font:700 72px system-ui"></div><div id="lk-d" style="color:#9fb0d6;margin-bottom:28px"></div><div id="lk-m" style="margin-bottom:10px;min-height:22px"></div><input id="lk-i" type="password" inputmode="numeric" autocomplete="off" style="font-size:20px;text-align:center;padding:10px;border-radius:12px;border:1px solid #3b82f6;background:#0f1a3a;color:#e2e8f5;width:220px"><button id="lk-b" style="margin-top:14px;background:#3b82f6;color:#fff;border:0;border-radius:10px;padding:10px 26px;font-size:16px;cursor:pointer"></button><div style="position:absolute;bottom:18px;color:#6b7aa8;font-size:13px">Smart OS - Smart Miner Hubs</div>';
 document.body.appendChild(o);
 const q=i=>o.querySelector(i),tick=()=>{const n=new Date();q('#lk-t').textContent=n.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});q('#lk-d').textContent=n.toLocaleDateString([], {weekday:'long',day:'numeric',month:'long'})};tick();const iv=setInterval(()=>{if(!o.isConnected)clearInterval(iv);else tick()},10000);
 const i=q('#lk-i'),m=q('#lk-m'),b=q('#lk-b');
 const fix=()=>{try{o.querySelectorAll('*');}catch(e){}};
 if(!hp){m.textContent='Pehli baar: apna PIN set karo (kam se kam 4)';b.textContent='PIN set karo';
  b.onclick=async()=>{if(i.value.length<4){m.textContent='PIN chhota hai';return}try{localStorage.setItem('sm-pin',await H(i.value))}catch(e){m.textContent='PIN save nahi hua';return}o.remove()};
 }else{m.textContent='Locked';b.textContent='Unlock';
  b.onclick=async()=>{if(await H(i.value)===hp){o.remove()}else{m.textContent='Galat PIN';i.value=''}}}
 i.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')b.click()});i.focus();
 o.addEventListener('contextmenu',e=>e.preventDefault())};
window.openLock=function(){window.smLock()};
window.openHardware=function(){
 const w=createWindow('Hardware','🧩','<div class="hw" style="padding:16px;font:14px/1.55 system-ui;color:#e2e8f5;background:#0b1020;height:100%;box-sizing:border-box;overflow:auto">⏳ Hardware dhoondh raha hoon...</div>',560,600);
 const R=w.querySelector('.hw');let busy=false;
 const card=(t,items)=>'<div style="background:#121a33;border:1px solid #24305a;border-radius:12px;padding:12px;margin:10px 0"><b>'+t+'</b>'+items+'</div>';
 const b=(id,t,c)=>'<button data-k="'+id+'" style="background:'+(c||'#3b82f6')+';color:#fff;border:0;border-radius:9px;padding:8px 14px;margin:8px 8px 0 0;cursor:pointer">'+t+'</button>';
 const draw=async()=>{if(busy||!w.isConnected)return;busy=true;try{
  const h=await api('/api/hw/scan'),st=await api('/api/hw/status');
  let o='<div style="font:700 20px system-ui">Hardware Service</div><div style="color:#9fb0d6">WiFi aur GPU apne aap pehchane jate hain, aur sahi driver lagaya ja sakta hai.</div>';
  let w1='';
  (h.wifi||[]).forEach((x,i)=>{const ok=x.driver&&x.iface;
   w1+='<div style="margin-top:8px"><div>'+esc(x.name)+'</div><div style="color:#9fb0d6;font-size:13px">ID '+esc(x.id)+' &nbsp; Driver: <b>'+(x.driver?esc(x.driver):'nahi mila')+'</b> &nbsp; Interface: <b>'+(x.iface?esc(x.iface):'nahi')+'</b>'+(x.state?' &nbsp; '+esc(x.state):'')+'</div>'+
   (ok?'<div style="color:#4ade80">✔ WiFi taiyar hai</div>':'<div style="color:#fbbf24">⚠ Driver ya firmware nahi laga</div>')+
   (x.blocked?'<div style="color:#fbbf24">WiFi band hai (rfkill)</div>'+b('rf','WiFi chalu karo','#16a34a'):'')+
   (x.fix&&x.fix.length?b('wf'+i,'Driver install karo ('+x.fix.join(', ')+')','#16a34a'):'')+'</div>'});
  (h.usb_wifi||[]).forEach(x=>{w1+='<div style="margin-top:8px">USB WiFi: '+esc(x)+'</div>'});
  o+=card('📶 WiFi',w1||'<div style="color:#fbbf24;margin-top:6px">Koi WiFi adapter nahi mila.</div>');
  let g1='';
  (h.gpu||[]).forEach((x,i)=>{g1+='<div style="margin-top:8px"><div>'+esc(x.name)+'</div><div style="color:#9fb0d6;font-size:13px">ID '+esc(x.id)+' &nbsp; Driver: <b>'+(x.driver?esc(x.driver):'nahi mila')+'</b> &nbsp; 3D/DRM: <b>'+(x.drm?'haan':'nahi')+'</b></div>'+
   (x.fix&&x.fix.length?'<div style="color:#fbbf24">⚠ Behtar driver mil sakta hai</div>'+b('gf'+i,'GPU driver install karo ('+x.fix.join(', ')+')','#16a34a'):'<div style="color:#4ade80">✔ GPU driver theek hai</div>')+'</div>'});
  o+=card('🖥 GPU',g1||'<div style="color:#fbbf24;margin-top:6px">Koi GPU nahi mila.</div>');
  if(st.status==='running')o+='<div style="color:#fbbf24">⏳ '+esc(st.msg)+'</div>';
  else if(st.status)o+='<div style="color:'+(st.status==='done'?'#4ade80':'#fca5a5')+'">'+esc(st.msg)+'</div>';
  o+=b('rs','Dobara scan karo','#334155')+'<div style="color:#9fb0d6;font-size:12px;margin-top:10px">Driver Linux kernel ke hote hain; ye service unhe pehchan kar sahi package lagati hai. Internet chahiye.</div>';
  R.innerHTML=o;
  const fixes=[].concat((h.wifi||[]).map(x=>x.fix||[]),(h.gpu||[]).map(x=>x.fix||[]));
  R.querySelectorAll('button').forEach(bt=>bt.onclick=async()=>{const k=bt.dataset.k;busy=false;
   if(k==='rs'){draw();return}
   if(k==='rf'){await post('/api/hw/fix',{kind:'rfkill'});draw();return}
   const wl=(h.wifi||[]).length,i=parseInt(k.slice(2));const pk=k[0]==='w'?(h.wifi[i].fix||[]):(h.gpu[i].fix||[]);
   const r=await post('/api/hw/fix',{kind:'pkgs',pkgs:pk});if(!r.ok)alert(r.msg||'error');draw()});
 }catch(e){R.textContent='⚠ Hardware service chal nahi rahi'}busy=false};
 draw();const iv=setInterval(()=>{if(!w.isConnected){clearInterval(iv);return}api('/api/hw/status').then(s=>{if(s.status==='running')draw()}).catch(()=>{})},3000);
 return w};
window.openClassic=function(){if(!confirm('Classic desktop (XFCE) par jana hai? Screen dobara shuru hogi.'))return;post('/api/session/mode',{mode:'classic'})};
window.openSync=function(){
 const w=createWindow('Account & Sync','🔗','<div class="sy" style="padding:16px;font:14px/1.55 system-ui;color:#e2e8f5;background:#0b1020;height:100%;box-sizing:border-box;overflow:auto"></div>',540,620);
 const R=w.querySelector('.sy');
 const SKIP=['smartos_password','sm-pin','sm-notice','smh_cid'];
 const b64=u=>btoa(String.fromCharCode.apply(null,Array.from(u))),ub=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const key=async(pw,salt)=>{const m=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:salt,iterations:200000,hash:'SHA-256'},m,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])};
 const pack=async pw=>{const d={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(SKIP.indexOf(k)<0)d[k]=localStorage.getItem(k)}
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},await key(pw,salt),new TextEncoder().encode(JSON.stringify({v:1,t:Date.now(),n:Object.keys(d).length,d:d}))));
  return 'SMOS1:'+btoa(JSON.stringify({s:b64(salt),i:b64(iv),c:b64(ct)}))};
 const unpack=async(txt,pw)=>{txt=txt.trim();if(txt.indexOf('SMOS1:')!==0)throw new Error('Ye Smart OS backup nahi hai');
  const o=JSON.parse(atob(txt.slice(6)));let pt;try{pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:ub(o.i)},await key(pw,ub(o.s)),ub(o.c))}catch(e){throw new Error('Password galat hai ya code kharab hai')}
  return JSON.parse(new TextDecoder().decode(pt))};
 const inp='width:100%;box-sizing:border-box;background:#0f1a3a;color:#e2e8f5;border:1px solid #24305a;border-radius:9px;padding:9px;font:inherit;margin:4px 0';
 const btn='background:#3b82f6;color:#fff;border:0;border-radius:9px;padding:9px 16px;margin:8px 8px 0 0;cursor:pointer';
 R.innerHTML='<div style="font:700 20px system-ui">Account &amp; Sync</div><div style="color:#9fb0d6">Apna data (settings, apps, notes) password se lock karke doosre phone ya PC par le jao. Server nahi chahiye.</div>'+
 '<div style="background:#121a33;border:1px solid #24305a;border-radius:12px;padding:12px;margin:12px 0"><b>⬆ Is device se bhejo (Export)</b><input id="sp1" type="password" placeholder="Ek password chuno" style="'+inp+'"><button id="sx" style="'+btn+'">Code banao</button><button id="sd" style="'+btn+'background:#334155">File save karo</button><textarea id="so" readonly placeholder="Code yahan aayega" style="'+inp+'height:70px"></textarea><div id="sm1" style="color:#9fb0d6"></div></div>'+
 '<div style="background:#121a33;border:1px solid #24305a;border-radius:12px;padding:12px"><b>⬇ Is device par lo (Import)</b><textarea id="si" placeholder="Code yahan paste karo (SMOS1:...)" style="'+inp+'height:70px"></textarea><input id="sf" type="file" style="color:#9fb0d6;margin:4px 0"><input id="sp2" type="password" placeholder="Wahi password" style="'+inp+'"><button id="sm" style="'+btn+'background:#16a34a">Import karo</button><div id="sm2" style="color:#9fb0d6"></div></div>'+
 '<div style="color:#6b7aa8;font-size:12px;margin-top:12px">Dhyan: sirf settings aur chhota data jata hai (badi files aur login password nahi). Live sync (apne aap) ke liye server chahiye, wo agla kadam hai. Password bhool gaye to code khul nahi sakta.</div>';
 const q=i=>R.querySelector(i);let last='';
 q('#sx').onclick=async()=>{const pw=q('#sp1').value;if(pw.length<6){q('#sm1').textContent='Password kam se kam 6 akshar ka rakho';return}q('#sm1').textContent='⏳ ban raha hai...';try{last=await pack(pw);q('#so').value=last;q('#sm1').textContent='✔ Ho gaya. Ye code doosre device par Import me paste karo.'}catch(e){q('#sm1').textContent='Error: '+e.message}};
 q('#sd').onclick=()=>{if(!last){q('#sm1').textContent='Pehle "Code banao" dabao';return}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([last],{type:'text/plain'}));a.download='smartos-backup.txt';document.body.appendChild(a);a.click();a.remove()};
 q('#sf').onchange=e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=()=>{q('#si').value=r.result};r.readAsText(f)}};
 q('#sm').onclick=async()=>{try{const o=await unpack(q('#si').value,q('#sp2').value);const n=Object.keys(o.d).length;
  q('#sm2').innerHTML='Mile: <b>'+n+'</b> cheezein. <button id="sy2" style="'+btn+'background:#dc2626">Haan, badal do</button> (is device ka purana data isse badal jayega)';
  q('#sy2').onclick=()=>{Object.keys(o.d).forEach(k=>{try{localStorage.setItem(k,o.d[k])}catch(e){}});q('#sm2').textContent='✔ Ho gaya. Smart OS dobara khul raha hai...';setTimeout(()=>location.reload(),900)}}catch(e){q('#sm2').textContent='❌ '+e.message}};
 return w};
window.openUpdate=function(){
 const w=createWindow('Update','🔄','<div class="up" style="padding:18px;font:14px/1.6 system-ui;color:#e2e8f5;background:#0b1020;height:100%;box-sizing:border-box;overflow:auto">⏳</div>',500,480);
 const R=w.querySelector('.up');let busy=false,ist=null;
 const bar=(p)=>'<div style="height:12px;border-radius:7px;background:#121a33;overflow:hidden;margin:10px 0"><i style="display:block;height:100%;width:'+p+'%;background:linear-gradient(90deg,#3b82f6,#22d3ee)"></i></div>';
 const btn=(id,t,c)=>'<button id="'+id+'" style="background:'+(c||'#3b82f6')+';color:#fff;border:0;border-radius:9px;padding:9px 16px;margin:4px 6px 4px 0;cursor:pointer">'+t+'</button>';
 const draw=async()=>{if(busy||!w.isConnected)return;busy=true;try{
  const c=await api('/api/update/check'),st=await api('/api/update/status');
  let h='<div style="font:700 21px system-ui;margin-bottom:6px">Smart OS Update</div>';
  h+='<div style="color:#9fb0d6">Abhi ka version: <b style="color:#e2e8f5">'+c.current+'</b>'+(c.ok?' &nbsp; Naya: <b style="color:#e2e8f5">'+c.latest+'</b>':'')+'</div>';
  if(!c.ok)h+='<div style="margin:12px 0;color:#fbbf24">⚠ '+esc(c.msg||'Check nahi ho paya')+'</div>'+btn('uc','Dobara check karo');
  else if(c.live)h+='<div style="margin:12px 0;color:#fbbf24">Live mode me update nahi lagta (restart par sab chala jata hai).'+(c.available?' Naya version aaya hai: naya ISO download karo ya Smart OS ko disk par install karo.':'')+'</div>'+btn('uc','Check karo');
  else if(st.app.status==='running')h+='<div style="margin:12px 0">'+esc(st.app.msg)+'</div>'+bar(st.app.pct);
  else if(st.app.status==='done')h+='<div style="margin:12px 0;color:#4ade80">✔ '+esc(st.app.msg)+'</div>'+btn('ur','Smart OS restart karo','#16a34a');
  else if(c.available)h+='<div style="margin:12px 0"><b>Naya update mil gaya</b>'+(c.notes?'<div style="color:#9fb0d6">'+esc(c.notes)+'</div>':'')+(c.size?'<div style="color:#9fb0d6">Size ~'+Math.max(1,Math.round(c.size/1048576))+' MB</div>':'')+(st.app.status==='fail'?'<div style="color:#fca5a5">❌ '+esc(st.app.msg)+'</div>':'')+'</div>'+btn('ua','Update karo','#16a34a');
  else h+='<div style="margin:12px 0;color:#4ade80">✔ Aap latest version par ho</div>'+btn('uc','Dobara check karo');
  h+='<hr style="border:0;border-top:1px solid #1f2b4d;margin:16px 0"><div style="font-weight:600">Debian security updates</div><div style="color:#9fb0d6;margin-bottom:6px">System ke packages (Chrome, Firefox waghera) naye karta hai. Internet chahiye.</div>';
  if(st.apt.status==='running')h+='<div style="color:#fbbf24">⏳ '+esc(st.apt.msg)+'</div>';
  else{if(st.apt.status)h+='<div style="color:'+(st.apt.status==='done'?'#4ade80':'#fca5a5')+'">'+esc(st.apt.msg)+'</div>';h+=btn('up','Debian updates lagao','#6366f1')}
  R.innerHTML=h;ist=st;
  const on=(id,f)=>{const e=R.querySelector('#'+id);if(e)e.onclick=f};
  on('uc',()=>{busy=false;draw()});
  on('ua',async()=>{const r=await post('/api/update/apply',{});if(!r.ok)alert(r.msg||'error');busy=false;draw()});
  on('ur',()=>{post('/api/update/restart',{});R.innerHTML='<div style="padding:20px">Smart OS dobara khul raha hai...</div>'});
  on('up',async()=>{const r=await post('/api/update/apt',{});if(!r.ok)alert(r.msg||'error');busy=false;draw()});
 }catch(e){R.textContent='⚠ Update sirf Smart OS ISO me chalta hai'}busy=false};
 draw();const iv=setInterval(()=>{if(!w.isConnected){clearInterval(iv);return}if(ist&&(ist.app.status==='running'||ist.apt.status==='running'))draw()},2000);
 return w};
window.openInstaller=function(){
 return createWindow('Install Smart OS','💽','<iframe src="/install.html" style="width:100%;height:100%;border:0;background:#0b1020"></iframe>',720,640)};
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
 if(!has('Lock'))window.smApps.push(['Lock','🔒','#64748b','#334155','System','openLock']);
 if(!has('Hardware'))window.smApps.push(['Hardware','🧩','#10b981','#047857','System','openHardware']);
 if(!has('Classic Desktop'))window.smApps.push(['Classic Desktop','🖥️','#475569','#1e293b','System','openClassic']);
 if(!has('Account & Sync'))window.smApps.push(['Account & Sync','🔗','#8b5cf6','#6d28d9','System','openSync']);
 if(!has('Update'))window.smApps.push(['Update','🔄','#0ea5e9','#0369a1','System','openUpdate']);
 if(!has('App Store'))window.smApps.push(['App Store','🛍️','#ec4899','#be185d','System','openAppStore']);
 if(!has('System Info'))window.smApps.push(['System Info','ℹ️','#6366f1','#4338ca','System','openSysInfo']);
 try{var nt=await api('/api/notice');var seen='';try{seen=localStorage.getItem('sm-notice')||''}catch(e){}
  if(!window.__native&&nt.ok&&!nt.none&&nt.id!==seen&&(nt.live!==false||true)){var o=document.createElement('div');o.style.cssText='position:fixed;inset:0;z-index:100000;background:#000a;display:flex;align-items:center;justify-content:center;padding:16px';
   var bx=document.createElement('div');bx.style.cssText='max-width:440px;width:100%;max-height:90vh;overflow:auto;background:#0f1a3a;color:#e2e8f5;border:1px solid #3b82f6;border-radius:16px;padding:20px;font:15px/1.5 system-ui;box-shadow:0 20px 60px #000a';
   if(nt.image){var im=document.createElement('img');im.src=nt.image;im.style.cssText='width:100%;border-radius:10px;margin-bottom:12px';bx.appendChild(im)}
   var h=document.createElement('div');h.style.cssText='font:700 20px system-ui;margin-bottom:8px';h.textContent=nt.title;bx.appendChild(h);
   var t=document.createElement('div');t.style.cssText='white-space:pre-wrap;color:#c7d3ee';t.textContent=nt.text;bx.appendChild(t);
   var row=document.createElement('div');row.style.cssText='margin-top:16px;display:flex;gap:10px;justify-content:flex-end';
   var done=function(){try{localStorage.setItem('sm-notice',nt.id)}catch(e){}o.remove()};
   var c=document.createElement('button');c.textContent='Band karo';c.style.cssText='background:none;color:#9fb0d6;border:1px solid #2a3a66;border-radius:9px;padding:8px 14px;cursor:pointer';c.onclick=done;row.appendChild(c);
   if(nt.button&&nt.url){var g=document.createElement('button');g.textContent=nt.button;g.style.cssText='background:#3b82f6;color:#fff;border:0;border-radius:9px;padding:8px 16px;cursor:pointer';g.onclick=function(){done();if(window.openNativeApp)openNativeApp('chrome','Chrome','🌐');window.open(nt.url,'_blank')};row.appendChild(g)}
   bx.appendChild(row);o.appendChild(bx);document.body.appendChild(o)}
 }catch(e){}
 try{var inf=await api('/api/info');if(!inf.live){try{var uc=window.__native?{}:await api('/api/update/check');if(uc.ok&&uc.available&&!document.getElementById('sm-upd')){var bn=document.createElement('div');bn.id='sm-upd';bn.style.cssText='position:fixed;right:16px;bottom:64px;z-index:99999;background:#0f1a3a;color:#e2e8f5;border:1px solid #3b82f6;border-radius:12px;padding:12px 14px;font:14px system-ui;box-shadow:0 10px 30px #0008;display:flex;gap:10px;align-items:center';bn.innerHTML='<span>🔄 Smart OS update aaya hai</span><button style="background:#3b82f6;color:#fff;border:0;border-radius:8px;padding:6px 12px;cursor:pointer">Dekho</button><button style="background:none;color:#9fb0d6;border:0;cursor:pointer">✕</button>';bn.children[1].onclick=function(){bn.remove();openUpdate()};bn.children[2].onclick=function(){bn.remove()};document.body.appendChild(bn)}}catch(e){}}if(inf.live&&!has('Install Smart OS'))window.smApps.push(['Install Smart OS','💽','#22c55e','#15803d','System','openInstaller'])}catch(e){}
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
