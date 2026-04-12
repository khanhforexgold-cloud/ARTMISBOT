async function fetchJson(url, options={}){const res=await fetch(url,options);const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Lỗi');return data}
async function loadHomeData(){
 const hero=await fetchJson('/api/hero');
 const packages=await fetchJson('/api/packages');
 const signals=await fetchJson('/api/signals');
 document.getElementById('heroTitle').textContent=hero.title||'ARTEMIS BOT';
 document.getElementById('heroSub').textContent=hero.subtitle||'Premium Trading System';
 document.getElementById('signalGrid').innerHTML=(signals||[]).map(x=>`<div class="card"><b>${x.badge||''}</b><h3>${x.title||''}</h3><p>${x.desc||''}</p><small>${(x.tags||[]).join(' • ')}</small></div>`).join('');
 document.getElementById('packageGrid').innerHTML=(packages||[]).map(x=>`<div class="card"><b>${x.tag||''}</b><h3>${x.name||''}</h3><p style="font-size:28px;font-weight:800">${x.priceMain||''}${x.priceUnit||''}</p><p>${x.desc||''}</p><ul>${(x.features||[]).map(f=>`<li>${f}</li>`).join('')}</ul></div>`).join('');
}
window.ARTEMIS={fetchJson};
