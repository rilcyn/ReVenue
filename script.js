
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const DB = {spaces:[], bookings:[], analytics:{}};

async function init(){
  const res = await fetch('data.json'); DB.spaces = await res.json();
  bind(); route('home'); renderHome(); renderExplore(); sparkle();
}
function bind(){
  $$('#tabs .tab-btn').forEach(b=>b.addEventListener('click',()=>route(b.dataset.section)));
  $('#search').addEventListener('input', renderExplore);
  $('#type').addEventListener('change', renderExplore);
  $('#city').addEventListener('change', renderExplore);
  ['date','start','end','people'].forEach(id=>$('#'+id).addEventListener('change',updateQuote));
  $('#insurance').addEventListener('change',updateQuote);
  $('#bookBtn').addEventListener('click', onCheckout);
  $('#closePay').addEventListener('click',()=>$('#pay').style.display='none');
  $('#confirmPay').addEventListener('click', onConfirm);
  $('#closeContract').addEventListener('click',()=>$('#contract').style.display='none');
  $('#signContract').addEventListener('click',()=>{ $('#contract').style.display='none'; renderDashboard(); route('dashboard'); });
  $('#hostForm').addEventListener('submit', e=>{
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    const equip = (d.equipment||'').split(',').map(x=>x.trim()).filter(Boolean).map(n=>({name:n, rate:2}));
    DB.spaces.unshift({id:'new-'+Date.now(), name:d.name, type:d.type, city:d.city, price_hr:Number(d.price)||25, util:0, verified:true, rating:5, offhours:d.offhours||'8:00 PM – 5:00 AM', img:'assets/ph_5.svg', host:d.host||'New Host', equipment:equip, rules:(d.rules||'Respect space, Clean after use').split(',').map(s=>s.trim()), insurance_required:!!d.insreq});
    alert('Listing created!'); route('explore'); renderExplore(); e.target.reset();
  });
  $('#bulkBtn').addEventListener('click',()=>{
    const csv = `name,type,city,price_hr\nCampus Gym,Gym,New Brunswick,28\nInnovation Kitchen,Kitchen,Newark,34`;
    const lines = csv.trim().split(/\r?\n/);
    for(let i=1;i<lines.length;i++){const [name,type,city,price_hr]=lines[i].split(',').map(x=>x.trim());
      DB.spaces.unshift({id:'bulk-'+Date.now()+'-'+i,name,type,city,price_hr:Number(price_hr)||20,util:0,verified:true,rating:5,offhours:'8:00 PM – 5:00 AM',img:'assets/ph_6.svg',host:'Enterprise Upload',equipment:[],rules:[],insurance_required:false});}
    alert('Enterprise CSV uploaded'); renderExplore();
  });
  $('#subscribeBtn').addEventListener('click',()=>{ alert('ReVenue Pass: Plus activated'); });
  $('#connectIoT').addEventListener('click',()=>{ if(!window._sel) return; alert('IoT connected to '+window._sel.id); });
}
function route(tab){ $$('.section').forEach(s=>s.classList.remove('active')); $('#section-'+tab).classList.add('active'); window.scrollTo({top:0,behavior:'smooth'}); if(tab==='dashboard') renderDashboard(); }
function renderHome(){
  $('#statRevenue').textContent = '$'+(DB.analytics.revenue||12480).toLocaleString();
  $('#statHours').textContent = (DB.analytics.hours||382)+' hrs';
  $('#statSpaces').textContent = DB.spaces.length;
}
function renderExplore(){
  const q = ($('#search').value||'').toLowerCase(); const type=$('#type').value, city=$('#city').value;
  const list = $('#cards'); list.innerHTML='';
  const items = DB.spaces.filter(s=>(!q|| s.name.toLowerCase().includes(q) || s.equipment.map(e=>e.name).join(' ').toLowerCase().includes(q)) && (!type||s.type===type) && (!city||s.city===city));
  for(const s of items){
    const el = document.createElement('div'); el.className='card';
    el.innerHTML = `
      <img src="${s.img}" alt="${s.name}"/>
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><div style="font-weight:800;font-size:18px">${s.name}</div><div class="small">${s.type} • ${s.city}</div></div>
          <div class="pill">$${s.price_hr}/hr</div>
        </div>
        <div class="small">Off-hours: ${s.offhours}</div>
        <div class="tags">${s.equipment.slice(0,4).map(x=>`<span class="tag">${x.name}</span>`).join('')}</div>
        <div style="display:flex;gap:8px"><span class="pill">${s.verified?'Verified ✅':'New'}</span><span class="pill">⭐ ${s.rating.toFixed(1)}</span><span class="pill">Util ${s.util}%</span></div>
        <div style="display:flex;gap:8px;margin-top:6px"><button class="btn btn-primary">View & Book</button><button class="btn">Save</button></div>
      </div>`;
    el.querySelector('.btn-primary').addEventListener('click',()=>openDetail(s));
    list.appendChild(el);
  }
}
function openDetail(s){
  window._sel = s;
  $('#dImg').src = s.img; $('#dName').textContent=s.name; $('#dMeta').textContent=`${s.type} • ${s.city} • Host: ${s.host}`;
  $('#dEquip').innerHTML = s.equipment.map(x=>`<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" value="${x.name}" data-rate="${x.rate}">${x.name} (+$${x.rate}/hr)</label>`).join('');
  $('#dRules').innerHTML = s.rules.map(r=>`<li>${r}</li>`).join('');
  $('#dPrice').textContent = `$${s.price_hr}/hr`; $('#dOff').textContent=s.offhours; $('#dIns').textContent=s.insurance_required?'Insurance required':'Insurance optional';
  const days=[0,1,2].map(d=>{const dt=new Date(Date.now()+d*86400000);return dt.toISOString().slice(0,10)});
  $('#pred').innerHTML = days.map(d=>`<span class="pill">${d} • 21:00-23:00 • ${(70+Math.random()*25|0)}%</span>`).join(' ');
  route('detail'); updateQuote();
}
function hoursBetween(a,b){ const [ah,am]=a.split(':').map(Number), [bh,bm]=b.split(':').map(Number); let d=(bh*60+bm)-(ah*60+am); if(d<0)d+=1440; return d/60; }
function updateQuote(){
  const s = window._sel; if(!s) return;
  const hrs = hoursBetween($('#start').value, $('#end').value);
  const base = s.price_hr*hrs;
  const eq = [...document.querySelectorAll('#dEquip input:checked')].reduce((sum,el)=>sum + Number(el.dataset.rate||0), 0)*hrs;
  const clean = Math.ceil(base*0.07);
  const ins = (s.insurance_required || $('#insurance').checked) ? Math.ceil(Math.max(5,(base+eq)*0.05)) : 0;
  const fee = Math.ceil((base+eq)*0.06);
  const total = base+eq+clean+ins+fee;
  $('#quote').innerHTML = `
    <div class="kpi"><span>Base (${hrs.toFixed(1)} h)</span><b>$${base.toFixed(2)}</b></div>
    <div class="kpi"><span>Equipment</span><b>$${eq.toFixed(2)}</b></div>
    <div class="kpi"><span>Cleaning</span><b>$${clean.toFixed(2)}</b></div>
    <div class="kpi"><span>${ins? 'Insurance (partner)':'Insurance (optional)'}</span><b>$${ins.toFixed(2)}</b></div>
    <div class="kpi"><span>Platform fee</span><b>$${fee.toFixed(2)}</b></div>
    <div class="kpi"><span>Total</span><b>$${total.toFixed(2)}</b></div>`;
  window._cart = {total, hrs};
}
function onCheckout(){
  if(!window._sel || !window._cart) return alert('Choose date/time first');
  $('#paySummary').textContent = `${window._sel.name} • ${$('#date').value||'[date]'} • ${$('#start').value}-${$('#end').value}`;
  $('#payTotal').textContent = '$'+window._cart.total.toFixed(2);
  $('#pay').style.display='flex';
}
function onConfirm(){
  $('#pay').style.display='none';
  const s = window._sel;
  const checked = [...document.querySelectorAll('#dEquip input:checked')].map(el=>el.value);
  const code = 'RV-' + Math.random().toString(36).slice(2,6).toUpperCase() + '-' + Math.floor(1000+Math.random()*9000);
  const b = {id:'b'+Date.now(), spaceId:s.id, date:$('#date').value||'[date]', start:$('#start').value, end:$('#end').value, equipment:checked, insurance:$('#insurance').checked, total:window._cart.total, accessCode:code};
  DB.bookings.unshift(b);
  DB.analytics.revenue = (DB.analytics.revenue||0) + window._cart.total;
  DB.analytics.hours = (DB.analytics.hours||0) + hoursBetween(b.start,b.end);
  $('#contractText').innerHTML = `
    <h3 style="margin:0 0 6px">ReVenue License Agreement</h3>
    <p class="small">Booking #${b.id}</p>
    <p>This Agreement licenses <b>${s.name}</b> in <b>${s.city}</b> on <b>${b.date}</b> from <b>${b.start}</b> to <b>${b.end}</b>. This is a revocable, non-lease license.</p>
    <ol>
      <li>Follow House Rules and lawful use.</li>
      <li>${s.insurance_required?'Proof of general liability insurance required.':'Insurance recommended; partner coverage available.'}</li>
      <li>Damages and overtime may be charged.</li>
      <li>Time-bound access code will be issued: <b>${b.accessCode}</b>.</li>
      <li>Disputes: arbitration in host’s state.</li>
    </ol>`;
  $('#contract').style.display='flex';
}
function renderDashboard(){
  const wrap = $('#bookings');
  if(!DB.bookings.length){ wrap.innerHTML='<div class="small">No bookings yet.</div>'; return; }
  wrap.innerHTML = `<table class="table">
    <thead><tr><th>Booking</th><th>When</th><th>Location</th><th>Total</th><th>Access</th></tr></thead>
    <tbody>${DB.bookings.map(x=>{
      const s = DB.spaces.find(y=>y.id===x.spaceId)||{};
      return `<tr><td>${s.name||x.spaceId}</td><td>${x.date} ${x.start}-${x.end}</td><td>${s.city||''}</td><td>$${x.total.toFixed(2)}</td><td>${x.accessCode}</td></tr>`
    }).join('')}</tbody></table>`;
  drawChart('#revChart', DB.bookings.map(b=>b.total), 'Revenue');
  drawChart('#hrsChart', DB.bookings.map(b=>hoursBetween(b.start,b.end)), 'Hours');
}
function drawChart(sel, arr, label){
  const c = document.querySelector(sel); const ctx = c.getContext('2d'); const w=c.width=360, h=c.height=120;
  ctx.clearRect(0,0,w,h); const max = Math.max(1, ...arr);
  arr.forEach((v,i)=>{ const x=i*(w/(arr.length||1)); const bar=(v/max)*(h-22); ctx.fillStyle='rgba(255,122,61,.9)'; ctx.fillRect(x+8,h-bar-12,20,bar); });
  ctx.fillStyle='#9fb1cc'; ctx.fillText(label, 8, 12);
}
function sparkle(){ const s=$('#spark'); for(let i=0;i<22;i++){ const d=document.createElement('span'); d.style.left=(Math.random()*100)+'%'; d.style.top=(Math.random()*140-20)+'px'; d.style.animationDelay=(Math.random()*4)+'s'; s.appendChild(d);} }
init();
