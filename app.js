let donutMode = 'balance';
let selectedAccountFilter = 'all';
let periodMode = 'month';
let periodOffset = 0;

let state = {
  configured: false, pin: null,
  users: ['Usuario 1'], profiles: ['Personal'],
  accounts: [
    {name:'Efectivo MXN',currency:'MXN'},{name:'Efectivo USD',currency:'USD'},
    {name:'Debito',currency:'MXN'},{name:'Credito',currency:'MXN'}
  ],
  categoriesGasto: [
    {emoji:'🍔',name:'Comida'},{emoji:'🚗',name:'Transporte'},{emoji:'🏠',name:'Casa'},
    {emoji:'💊',name:'Salud'},{emoji:'👕',name:'Ropa'},{emoji:'🎬',name:'Entrete.'},
    {emoji:'📱',name:'Telecom'},{emoji:'🐾',name:'Mascotas'},{emoji:'📚',name:'Educacion'},
    {emoji:'💳',name:'Deudas'},{emoji:'✈️',name:'Viajes'},{emoji:'💼',name:'Negocio'},
    {emoji:'🔧',name:'Mantenim.'},{emoji:'🎁',name:'Regalos'},{emoji:'❓',name:'Otros'}
  ],
  categoriesIngreso: [
    {emoji:'💰',name:'Honorarios'},{emoji:'🤝',name:'Anticipo'},
    {emoji:'📈',name:'Inversion'},{emoji:'🎁',name:'Transferencia'},{emoji:'❓',name:'Otros'}
  ],
  transactions: [], exchangeRate: 17.50, theme: 'dark', currentProfile: 'Todo'
};

const CAT_COLORS=['#6c63ff','#f87171','#4ade80','#60a5fa','#fbbf24','#f472b6','#34d399','#a78bfa','#fb923c','#38bdf8','#e879f9','#818cf8','#94a3b8'];

function saveState(){try{localStorage.setItem('mf_state',JSON.stringify(state));}catch(e){}}
function loadState(){try{const s=localStorage.getItem('mf_state');if(s)state={...state,...JSON.parse(s)};}catch(e){}}

document.addEventListener('DOMContentLoaded',()=>{
  loadState(); applyTheme(state.theme);
  if(!state.configured){initSetup();showScreen('screen-setup');}
  else if(state.pin){showScreen('screen-pin');initPinScreen();}
  else{
    showScreen('screen-main');initMain();
    if(state.transactions.length===0 && state.sheetsURL && navigator.onLine){
      loadFromSheets();
    }
  }
});

async function loadFromSheets(){
  try{
    showToast('Cargando datos desde Sheets...');
    const res = await fetch(state.sheetsURL);
    const data = await res.json();
    if(data.ok){
      if(data.transactions && data.transactions.length > 0)
        state.transactions = data.transactions;
      if(data.config){
        state.users = data.config.users || state.users;
        state.profiles = data.config.profiles || state.profiles;
        state.accounts = data.config.accounts || state.accounts;
        state.categoriesGasto = data.config.categoriesGasto || state.categoriesGasto;
        state.categoriesIngreso = data.config.categoriesIngreso || state.categoriesIngreso;
        state.exchangeRate = data.config.exchangeRate || state.exchangeRate;
        state.budgets = data.config.budgets || {};
        state.dailyLimit = data.config.dailyLimit || 0;
      }
      saveState();
      initMain();
      showToast('Datos cargados desde Sheets ✓');
    }
  }catch(e){
    showToast('No se pudo cargar desde Sheets');
  }
}

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(id==='screen-main')initMain();
  if(id==='screen-transactions')renderAllTransactions();
  if(id==='screen-search')document.getElementById('search-input').focus();
  if(id==='screen-settings'){initSettings();updateTravelModeBtn();updatePendingCount();}
  if(id==='screen-budget')initBudget();
  if(id==='screen-recurring')initRecurring();
  if(id==='screen-add-recurring')initAddRecurring();
  if(id==='screen-tdc')initTDC();
  if(id==='screen-tdc-form'){}
  if(id==='screen-tdc-detail'){}
  if(id==='screen-charts')initCharts();
  if(id==='screen-sync')initSync();
}

function applyTheme(t){
  document.body.classList.remove('theme-dark','theme-light');
  if(t==='auto')document.body.classList.add(window.matchMedia('(prefers-color-scheme:dark)').matches?'theme-dark':'theme-light');
  else document.body.classList.add('theme-'+t);
  updateDonutHole();
}
function updateDonutHole(){
  const hole=document.getElementById('donut-hole');
  if(!hole)return;
  const isDark=document.body.classList.contains('theme-dark');
  hole.setAttribute('fill',isDark?'#0f0f1a':'#f0f0f8');
}
function setTheme(t){
  state.theme=t; applyTheme(t); saveState();
  document.querySelectorAll('.theme-btn').forEach(b=>b.classList.remove('active'));
  event.target.classList.add('active');
}

let pinInput='';
function initPinScreen(){
  pinInput=''; updatePinDots('pin-dots',0);
  document.getElementById('pin-error').textContent='';
  document.querySelectorAll('.numpad .num-btn').forEach(btn=>{
    const n=btn.dataset.num;
    if(n!==undefined)btn.onclick=()=>enterPin(n);
  });
  document.getElementById('pin-delete').onclick=()=>{pinInput=pinInput.slice(0,-1);updatePinDots('pin-dots',pinInput.length);};
  document.getElementById('skip-pin-btn').onclick=()=>{showScreen('screen-main');initMain();};
}
function enterPin(n){
  if(pinInput.length>=4)return;
  pinInput+=n; updatePinDots('pin-dots',pinInput.length);
  if(pinInput.length===4){
    setTimeout(()=>{
      if(pinInput===state.pin){showScreen('screen-main');initMain();}
      else{document.getElementById('pin-error').textContent='PIN incorrecto';pinInput='';updatePinDots('pin-dots',0);}
    },200);
  }
}
function updatePinDots(id,count){
  document.getElementById(id).querySelectorAll('.dot').forEach((d,i)=>d.classList.toggle('filled',i<count));
}

let currentStep=1, currentCatTab='gastos';
function initSetup(){renderSetupAccounts();renderSetupCategories();}
function nextStep(s){
  if(currentStep===1){
    const u1=document.getElementById('user1-name').value.trim();
    if(!u1){showToast('Ingresa tu nombre');return;}
    state.users[0]=u1;
    const u2=document.getElementById('user2-name').value.trim();
    if(u2)state.users[1]=u2;else state.users=state.users.slice(0,1);
  }
  document.getElementById('step-'+currentStep).classList.remove('active');
  currentStep=s;
  document.getElementById('step-'+s).classList.add('active');
}
function addProfile(){
  const n=document.getElementById('new-profile-name').value.trim();
  if(!n)return;
  if(state.profiles.includes(n)){showToast('Ya existe');return;}
  state.profiles.push(n); document.getElementById('new-profile-name').value=''; renderProfileList();
}
function renderProfileList(){
  const list=document.getElementById('profile-list');
  list.innerHTML='<div class="profile-item fixed"><span>Personal</span><span class="fixed-badge">Fijo</span></div>';
  state.profiles.slice(1).forEach((p,i)=>{
    const d=document.createElement('div'); d.className='profile-item';
    d.innerHTML=`<span>${p}</span><button class="remove-profile-btn" onclick="removeProfile(${i+1})">✕</button>`;
    list.appendChild(d);
  });
}
function removeProfile(i){state.profiles.splice(i,1);renderProfileList();}
function renderSetupAccounts(){
  const list=document.getElementById('accounts-list'); list.innerHTML='';
  state.accounts.forEach((a,i)=>{
    const d=document.createElement('div'); d.className='account-item';
    d.innerHTML=`<span contenteditable="true" onblur="state.accounts[${i}].name=this.textContent.trim()">${a.name}</span><span class="account-currency-badge">${a.currency}</span><button class="remove-profile-btn" onclick="removeAccount(${i})">✕</button>`;
    list.appendChild(d);
  });
}
function addAccount(){
  const n=document.getElementById('new-account-name').value.trim();
  const c=document.getElementById('new-account-currency').value;
  if(!n)return;
  state.accounts.push({name:n,currency:c}); document.getElementById('new-account-name').value=''; renderSetupAccounts();
}
function removeAccount(i){state.accounts.splice(i,1);renderSetupAccounts();}
function renderSetupCategories(){renderCatList('gastos');renderCatList('ingresos');}
function renderCatList(type){
  const cats=type==='gastos'?state.categoriesGasto:state.categoriesIngreso;
  const list=document.getElementById('cat-'+type); list.innerHTML='';
  cats.forEach((c,i)=>{
    const d=document.createElement('div'); d.className='cat-item';
    d.innerHTML=`<span>${c.emoji}</span><span contenteditable="true" onblur="updateCatName('${type}',${i},this.textContent)">${c.name}</span><button class="remove-profile-btn" onclick="removeCat('${type}',${i})">✕</button>`;
    list.appendChild(d);
  });
}
function addCategory(){
  const n=document.getElementById('new-cat-name').value.trim(); if(!n)return;
  const cat={emoji:'📌',name:n};
  if(currentCatTab==='gastos')state.categoriesGasto.push(cat); else state.categoriesIngreso.push(cat);
  document.getElementById('new-cat-name').value=''; renderCatList(currentCatTab);
}
function removeCat(type,i){
  if(type==='gastos')state.categoriesGasto.splice(i,1); else state.categoriesIngreso.splice(i,1); renderCatList(type);
}
function updateCatName(type,i,name){
  if(type==='gastos')state.categoriesGasto[i].name=name.trim(); else state.categoriesIngreso[i].name=name.trim();
}
function showCatTab(tab,btn){
  currentCatTab=tab;
  document.querySelectorAll('.cat-tab').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  document.getElementById('cat-gastos').classList.toggle('hidden',tab!=='gastos');
  document.getElementById('cat-ingresos').classList.toggle('hidden',tab!=='ingresos');
}
let setupPinEntry='';
function setupPinInput(n){
  if(setupPinEntry.length>=4)return;
  setupPinEntry+=n; updatePinDots('setup-pin-dots',setupPinEntry.length);
  if(setupPinEntry.length===4){state.pin=setupPinEntry;finishSetup();}
}
function setupPinDelete(){setupPinEntry=setupPinEntry.slice(0,-1);updatePinDots('setup-pin-dots',setupPinEntry.length);}
function finishSetup(){
  state.configured=true; state.currentProfile='Todo'; saveState();
  showScreen('screen-main'); initMain(); showToast('App configurada!');
}

function initMain(){
  renderProfileMenu(); updateProfileDisplay(); renderExchangeRate();
  updatePeriodLabel(); renderBalance(); renderDonut();
  renderAccountsBar(); renderRecentTransactions(); updateDonutHole();
}

function setPeriodMode(mode,btn){
  periodMode=mode; periodOffset=0;
  document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  updatePeriodLabel(); renderBalance(); renderDonut(); renderRecentTransactions();
}
function changePeriod(dir){
  periodOffset+=dir; updatePeriodLabel(); renderBalance(); renderDonut(); renderRecentTransactions();
}
function updatePeriodLabel(){
  const now=new Date(); let label='';
  if(periodMode==='month'){
    const d=new Date(now.getFullYear(),now.getMonth()+periodOffset,1);
    label=d.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
    label=label.charAt(0).toUpperCase()+label.slice(1);
  }else if(periodMode==='week'){
    const d=new Date(now); d.setDate(now.getDate()+periodOffset*7);
    const start=new Date(d); start.setDate(d.getDate()-d.getDay());
    const end=new Date(start); end.setDate(start.getDate()+6);
    label=`${start.getDate()}/${start.getMonth()+1} - ${end.getDate()}/${end.getMonth()+1}`;
  }else{
    const d=new Date(now); d.setDate(now.getDate()+periodOffset);
    label=d.toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'});
    label=label.charAt(0).toUpperCase()+label.slice(1);
  }
  document.getElementById('period-label').textContent=label;
}

function getFilteredTx(){
  const now=new Date();
  return state.transactions.filter(tx=>{
    const txDate=new Date(tx.date); let inPeriod=true;
    if(periodMode==='today'){
      const d=new Date(now); d.setDate(now.getDate()+periodOffset);
      inPeriod=txDate.toDateString()===d.toDateString();
    }else if(periodMode==='week'){
      const d=new Date(now); d.setDate(now.getDate()+periodOffset*7);
      const start=new Date(d); start.setDate(d.getDate()-d.getDay()); start.setHours(0,0,0,0);
      const end=new Date(start); end.setDate(start.getDate()+6); end.setHours(23,59,59,999);
      inPeriod=txDate>=start&&txDate<=end;
    }else if(periodMode==='month'){
      const d=new Date(now.getFullYear(),now.getMonth()+periodOffset,1);
      inPeriod=txDate.getMonth()===d.getMonth()&&txDate.getFullYear()===d.getFullYear();
    }
    const inProfile=state.currentProfile==='Todo'||tx.profile===state.currentProfile;
    const inAccount=selectedAccountFilter==='all'||tx.account===selectedAccountFilter;
    return inPeriod&&inProfile&&inAccount;
  });
}
function toMXN(amount,currency){return currency==='USD'?amount*state.exchangeRate:amount;}
function fmt(amount){return '$'+Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');}

function renderProfileMenu(){
  const menu=document.getElementById('profile-menu');
  const all=['Todo',...state.profiles];
  menu.innerHTML=all.map(p=>{
    const icon=p==='Todo'?'🌐':p==='Personal'?'👤':'💼';
    return `<button class="profile-menu-item ${state.currentProfile===p?'active':''}" onclick="selectProfile('${p}')">${icon} ${p}</button>`;
  }).join('');
}
function toggleProfileMenu(){document.getElementById('profile-menu').classList.toggle('hidden');}
function selectProfile(p){
  state.currentProfile=p; document.getElementById('profile-menu').classList.add('hidden');
  updateProfileDisplay(); renderBalance(); renderDonut(); renderRecentTransactions(); saveState();
}
function updateProfileDisplay(){
  const p=state.currentProfile;
  document.getElementById('current-profile-icon').textContent=p==='Todo'?'🌐':p==='Personal'?'👤':'💼';
  document.getElementById('current-profile-name').textContent=p;
  renderProfileMenu();
}
function renderExchangeRate(){
  document.getElementById('exchange-rate-display').textContent=state.exchangeRate.toFixed(2);
  const el=document.getElementById('settings-exchange'); if(el)el.value=state.exchangeRate;
}
function editExchangeRate(){
  document.getElementById('modal-exchange-input').value=state.exchangeRate;
  document.getElementById('modal-exchange').classList.remove('hidden');
}
function saveExchangeRateModal(){
  const v=parseFloat(document.getElementById('modal-exchange-input').value);
  if(v>0){state.exchangeRate=v;saveState();renderExchangeRate();}
  closeModal('modal-exchange');
}
function saveExchangeRate(){
  const v=parseFloat(document.getElementById('settings-exchange').value);
  if(v>0){state.exchangeRate=v;saveState();renderExchangeRate();showToast('Tipo de cambio guardado');}
}
function closeModal(id){document.getElementById(id).classList.add('hidden');}

function renderBalance(){
  const txs=getFilteredTx(); let income=0,expense=0;
  txs.forEach(tx=>{
    if(tx.type==='ingreso')income+=toMXN(tx.amount,tx.currency);
    else if(tx.type==='gasto')expense+=toMXN(tx.amount,tx.currency);
  });
  document.getElementById('total-income').textContent=fmt(income);
  document.getElementById('total-expense').textContent=fmt(expense);
  const diff=income-expense;
  const el=document.getElementById('total-diff');
  el.textContent=(diff<0?'-':'')+fmt(diff);
  el.style.color=diff>=0?'var(--income)':'var(--expense)';
}

function svgArc(cx,cy,outerR,innerR,a1,a2){
  const ox1=cx+outerR*Math.cos(a1),oy1=cy+outerR*Math.sin(a1);
  const ox2=cx+outerR*Math.cos(a2),oy2=cy+outerR*Math.sin(a2);
  const ix1=cx+innerR*Math.cos(a2),iy1=cy+innerR*Math.sin(a2);
  const ix2=cx+innerR*Math.cos(a1),iy2=cy+innerR*Math.sin(a1);
  const lg=a2-a1>Math.PI?1:0;
  return `M${ox1} ${oy1} A${outerR} ${outerR} 0 ${lg} 1 ${ox2} ${oy2} L${ix1} ${iy1} A${innerR} ${innerR} 0 ${lg} 0 ${ix2} ${iy2} Z`;
}

function setDonutMode(mode,btn){
  donutMode=mode;
  document.querySelectorAll('.donut-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  renderDonut();
}

function renderDonut(){
  const txs=getFilteredTx();
  const seg=document.getElementById('donut-segments');
  const legend=document.getElementById('cat-legend');
  const lblEl=document.getElementById('donut-label-text');
  const amtEl=document.getElementById('donut-amount-text');
  seg.innerHTML=''; legend.innerHTML='';
  let entries=[],total=0,labelText='',amountText='';
  if(donutMode==='balance'){
    const ing=txs.filter(t=>t.type==='ingreso').reduce((s,t)=>s+toMXN(t.amount,t.currency),0);
    const gas=txs.filter(t=>t.type==='gasto').reduce((s,t)=>s+toMXN(t.amount,t.currency),0);
    entries=[['Ingresos',ing,'#4ade80'],['Gastos',gas,'#f87171']];
    total=ing+gas; labelText='Balance';
    const diff=ing-gas; amountText=(diff<0?'-':'')+fmt(diff);
  }else{
    const tipo=donutMode==='gastos'?'gasto':'ingreso';
    const catMap={};
    txs.filter(t=>t.type===tipo).forEach(tx=>{
      const k=tx.category||'Otros'; catMap[k]=(catMap[k]||0)+toMXN(tx.amount,tx.currency);
    });
    const sorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
    entries=sorted.map(([cat,val],i)=>[cat,val,CAT_COLORS[i%CAT_COLORS.length]]);
    total=sorted.reduce((s,[,v])=>s+v,0);
    labelText=donutMode==='gastos'?'Gastos':'Ingresos';
    amountText=fmt(total);
  }
  lblEl.textContent=labelText; amtEl.textContent=amountText;
  if(total===0){
    const p=document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d',svgArc(70,70,60,39,-Math.PI/2,Math.PI*1.499));
    p.setAttribute('fill','#2a2a4a');
    seg.appendChild(p);
    return;
  }
  let angle=-Math.PI/2; const G=0.04; const legendItems=[];
  entries.forEach(([cat,val,color])=>{
    if(val<=0)return;
    const sl=(val/total)*Math.PI*2;
    const p=document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d',svgArc(70,70,60,39,angle+G,angle+sl-G));
    p.setAttribute('fill',color);
    p.setAttribute('stroke','var(--bg)');
    p.setAttribute('stroke-width','1.5');
    p.style.cursor='pointer';
    const thisCat=cat,thisVal=val,thisColor=color;
    p.addEventListener('click',()=>onSegmentClick(p,thisCat,thisVal,lblEl,amtEl));
    seg.appendChild(p);
    angle+=sl;
    legendItems.push({cat,val,color,pct:Math.round(val/total*100)});
  });
  legend.innerHTML=legendItems.slice(0,6).map(l=>
    `<div class="legend-item"><div class="legend-dot" style="background:${l.color}"></div><span>${l.cat} ${l.pct}%</span></div>`
  ).join('');
  updateDonutHole();
}

function onSegmentClick(path,cat,val,lblEl,amtEl){
  const paths=document.getElementById('donut-segments').querySelectorAll('path');
  if(path.getAttribute('opacity')==='1'&&lblEl.textContent===cat){
    paths.forEach(p=>p.removeAttribute('opacity')); renderDonut(); return;
  }
  paths.forEach(p=>p.setAttribute('opacity','0.35'));
  path.setAttribute('opacity','1');
  lblEl.textContent=cat; amtEl.textContent=fmt(val);
}

function renderAccountsBar(){
  const bar=document.getElementById('accounts-bar'); bar.innerHTML='';
  const all=document.createElement('button');
  all.className='account-chip-btn'+(selectedAccountFilter==='all'?' active':'');
  all.textContent='Todas';
  all.onclick=()=>{selectedAccountFilter='all';renderAccountsBar();renderBalance();renderDonut();renderRecentTransactions();};
  bar.appendChild(all);
  state.accounts.forEach(a=>{
    const btn=document.createElement('button');
    btn.className='account-chip-btn'+(selectedAccountFilter===a.name?' active':'');
    btn.textContent=a.name;
    btn.onclick=()=>{selectedAccountFilter=a.name;renderAccountsBar();renderBalance();renderDonut();renderRecentTransactions();};
    bar.appendChild(btn);
  });
}

function renderRecentTransactions(){
  const txs=getFilteredTx().filter(t=>!t.deleted).slice().reverse().slice(0,8);
  const el=document.getElementById('recent-transactions');
  el.innerHTML=txs.length?txs.map(txHTML).join(''):
    '<div class="empty-state"><span class="empty-icon">💸</span>Sin movimientos en este periodo.<br>Toca + Gasto o + Ingreso para empezar.</div>';
}

function txHTML(tx){
  const cats=tx.type==='ingreso'?state.categoriesIngreso:state.categoriesGasto;
  const cat=cats.find(c=>c.name===tx.category)||{emoji:'💸',name:tx.category||'Sin cat.'};
  const sign=tx.type==='gasto'?'−':tx.type==='ingreso'?'+':'⇄';
  const dateStr=new Date(tx.date).toLocaleDateString('es-MX',{day:'2-digit',month:'short'});
  return `<div class="tx-item">
    <div class="tx-emoji">${cat.emoji}</div>
    <div class="tx-info">
      <div class="tx-cat">${cat.name}</div>
      <div class="tx-meta">${dateStr} · ${tx.profile||''}${tx.note?' · '+tx.note:''}</div>
      ${tx.deducible?'<div class="tx-deducible">⭐ Deducible</div>':''}
    </div>
    <div class="tx-right">
      <div class="tx-amount ${tx.type}">${sign}${tx.currency==='USD'?'USD ':' $'}${tx.amount.toFixed(2)}</div>
      <div class="tx-account">${tx.account||''}</div>
      <button onclick="openTransaction('${tx.type}',${tx.id})" style="background:none;border:none;color:var(--accent);font-size:16px;padding:4px;cursor:pointer" title="Editar">✎</button> <button onclick="deleteTx(${tx.id})" style="background:none;border:none;color:var(--expense);font-size:16px;padding:4px;cursor:pointer" title="Eliminar">✕</button>
    </div>
  </div>`;
}

function deleteTx(id){
  if(confirm('¿Eliminar esta transaccion?')){
    const index = state.transactions.findIndex(t=>t.id===id);
    if(index>=0) state.transactions[index]={...state.transactions[index], deleted:true, synced:false};
    saveState();
    initMain();
    renderAllTransactions();
    showToast('Transaccion eliminada');
    if(navigator.onLine && state.sheetsURL) syncToSheets();
  }
}

let currentTxType='gasto',currentAmountStr='0',selectedCategory=null,selectedAccount=null,selectedProfile=null,selectedUser=null,deducible=false; let editingTxId=null;

function openTransaction(type, txId=null){
  currentTxType=type;
  editingTxId=txId;
  selectedCategory=null;
  deducible=false;

  if(txId!==null){
    const tx=state.transactions.find(t=>t.id===txId);
    if(!tx){showToast('Transaccion no encontrada');return;}

    currentAmountStr=String(tx.amount);
    selectedAccount=tx.account||state.accounts[0]?.name||null;
    selectedProfile=tx.profile||state.profiles[0]||null;
    selectedUser=tx.user||state.users[0];
    selectedCategory=tx.category==='Transferencia'?null:tx.category;
    deducible=!!tx.deducible;

    document.getElementById('transaction-title').textContent='Editar '+(
      type==='gasto'?'Gasto':type==='ingreso'?'Ingreso':'Transferencia'
    );
    document.getElementById('tx-amount-display').textContent=currentAmountStr;
    document.getElementById('tx-currency').value=tx.currency||'MXN';
    document.getElementById('tx-date').value=tx.date||new Date().toISOString().split('T')[0];
    document.getElementById('tx-note').value=tx.note||'';
    document.getElementById('tx-deducible-toggle').classList.toggle('active',deducible);
  }else{
    currentAmountStr='0';
    selectedCategory=null;
    selectedAccount=state.accounts[0]?.name||null;
    selectedProfile=state.currentProfile==='Todo'?state.profiles[0]:state.currentProfile;
    selectedUser=state.users[0];
    deducible=false;

    document.getElementById('transaction-title').textContent=
      type==='gasto'?'Nuevo Gasto':type==='ingreso'?'Nuevo Ingreso':'Transferencia';

    document.getElementById('tx-amount-display').textContent='0';
    document.getElementById('tx-currency').value='MXN';
    document.getElementById('tx-date').value=new Date().toISOString().split('T')[0];
    document.getElementById('tx-note').value='';
    document.getElementById('tx-deducible-toggle').classList.remove('active');
  }

  updateCurrencySymbol();
  renderTxCategories();
  renderTxAccounts();
  renderTxProfiles();
  renderTxUsers();
  showScreen('screen-transaction');
}
function amountInput(c){
  const ops = ['+','-','×','÷'];
  if(c==='.' && currentAmountStr.split(/[+\-×÷]/).pop().includes('.')) return;
  if(currentAmountStr==='0' && c!=='.' && !ops.includes(c)) currentAmountStr=c;
  else if(currentAmountStr.length<20) currentAmountStr+=c;
  document.getElementById('tx-amount-display').textContent=currentAmountStr;
}

function amountDelete(){
  currentAmountStr=currentAmountStr.slice(0,-1)||'0';
  document.getElementById('tx-amount-display').textContent=currentAmountStr;
}

function amountCalc(){
  try{
    const expr=currentAmountStr.replace(/×/g,'*').replace(/÷/g,'/');
    const result=Function('"use strict";return ('+expr+')')();
    if(!isFinite(result)) return;
    currentAmountStr=parseFloat(result.toFixed(2)).toString();
    document.getElementById('tx-amount-display').textContent=currentAmountStr;
  }catch(e){}
}
function amountDelete(){currentAmountStr=currentAmountStr.slice(0,-1)||'0';document.getElementById('tx-amount-display').textContent=currentAmountStr;}
function updateCurrencySymbol(){document.getElementById('tx-currency-symbol').textContent=document.getElementById('tx-currency').value==='USD'?'US$':'$';}
function renderTxCategories(){
  const grid=document.getElementById('tx-categories');
  if(currentTxType==='transferencia'){grid.innerHTML='<p style="color:var(--text2);font-size:14px">Transferencia entre cuentas</p>';return;}
  const cats=currentTxType==='ingreso'?state.categoriesIngreso:state.categoriesGasto;
  grid.innerHTML=cats.map(c=>`<div class="cat-chip ${selectedCategory===c.name?'selected':''}" onclick="selectCat('${c.name}')"><span class="chip-emoji">${c.emoji}</span><span>${c.name}</span></div>`).join('');
}
function selectCat(n){selectedCategory=n;renderTxCategories();}
function renderTxAccounts(){
  document.getElementById('tx-accounts').innerHTML=state.accounts.map(a=>`<div class="chip ${selectedAccount===a.name?'selected':''}" onclick="selectAccount('${a.name}')">${a.name}</div>`).join('');
}
function selectAccount(n){selectedAccount=n;renderTxAccounts();}
function renderTxProfiles(){
  document.getElementById('tx-profiles').innerHTML=state.profiles.map(p=>`<div class="chip ${selectedProfile===p?'selected':''}" onclick="selectTxProfile('${p}')">${p}</div>`).join('');
}
function selectTxProfile(p){selectedProfile=p;renderTxProfiles();}
function renderTxUsers(){
  document.getElementById('tx-users').innerHTML=state.users.map(u=>`<div class="chip ${selectedUser===u?'selected':''}" onclick="selectUser('${u}')">${u}</div>`).join('');
}
function selectUser(u){selectedUser=u;renderTxUsers();}
function toggleDeducible(){deducible=!deducible;document.getElementById('tx-deducible-toggle').classList.toggle('active',deducible);}
function saveTransaction(){
  const amount=parseFloat(currentAmountStr);

  if(!amount||amount<=0){
    showToast('Ingresa un monto valido');
    return;
  }

  if(currentTxType!=='transferencia'&&!selectedCategory){
    showToast('Selecciona una categoria');
    return;
  }

  if(!selectedAccount){
    showToast('Selecciona una cuenta');
    return;
  }

  const data={
    type:currentTxType,
    amount,
    currency:document.getElementById('tx-currency').value,
    category:selectedCategory||'Transferencia',
    account:selectedAccount,
    profile:selectedProfile,
    user:selectedUser,
    date:document.getElementById('tx-date').value,
    note:document.getElementById('tx-note').value.trim(),
    deducible,
  };

  if(editingTxId!==null){
    const index=state.transactions.findIndex(t=>t.id===editingTxId);

    if(index===-1){
      showToast('Transaccion no encontrada');
      return;
    }

    state.transactions[index]={
      ...state.transactions[index],
      ...data,
      synced:false
    };

    showToast('Transaccion actualizada');
  }else{
    state.transactions.push({
      id:Date.now(),
      ...data,
      synced:false
    });

    showToast('Guardado');
  }

  editingTxId=null;
  saveState();
  showScreen('screen-main');
  if(navigator.onLine && state.sheetsURL) syncToSheets();
}

function renderAllTransactions(){
  const sel=document.getElementById('filter-profile');
  sel.innerHTML='<option value="all">Todos los perfiles</option>'+state.profiles.map(p=>`<option value="${p}">${p}</option>`).join('');
  filterTransactions();
}
function filterTransactions(){
  const pv=document.getElementById('filter-profile').value;
  const tv=document.getElementById('filter-type').value;
  let txs=state.transactions.filter(t=>!t.deleted).slice().reverse();
  if(pv!=='all')txs=txs.filter(t=>t.profile===pv);
  if(tv!=='all')txs=txs.filter(t=>t.type===tv);
  document.getElementById('all-transactions').innerHTML=txs.length?txs.map(txHTML).join(''):
    '<div class="empty-state"><span class="empty-icon">🔍</span>Sin resultados</div>';
}
function searchTransactions(){
  const q=document.getElementById('search-input').value.toLowerCase().trim();
  const el=document.getElementById('search-results');
  if(!q){el.innerHTML='';return;}
  const results=state.transactions.filter(tx=>
    (tx.category||'').toLowerCase().includes(q)||(tx.note||'').toLowerCase().includes(q)||
    (tx.account||'').toLowerCase().includes(q)||(tx.profile||'').toLowerCase().includes(q)||
    tx.amount?.toString().includes(q)
  ).slice().reverse();
  el.innerHTML=results.length?results.map(txHTML).join(''):
    `<div class="empty-state"><span class="empty-icon">🔍</span>Sin resultados para "${q}"</div>`;
}

function initSettings(){
  document.getElementById('settings-exchange').value=state.exchangeRate;
  document.querySelectorAll('.theme-btn').forEach(b=>b.classList.remove('active'));
  const idx={light:0,dark:1,auto:2}[state.theme]||1;
  document.querySelectorAll('.theme-btn')[idx]?.classList.add('active');
}
function showChangePIN(){
  state.pin=null; setupPinEntry=''; saveState();
  showScreen('screen-setup');
  document.querySelectorAll('.setup-step').forEach(s=>s.classList.remove('active'));
  document.getElementById('step-5').classList.add('active');
  currentStep=5; state.configured=true;
}
function exportCSV(){
  const headers=['Fecha','Tipo','Categoria','Monto','Moneda','Cuenta','Perfil','Usuario','Nota','Deducible'];
  const rows=state.transactions.map(tx=>[tx.date,tx.type,tx.category,tx.amount,tx.currency,tx.account,tx.profile,tx.user,tx.note||'',tx.deducible?'Si':'No']);
  const csv=[headers,...rows].map(r=>r.join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='mis_finanzas.csv'; a.click();
  URL.revokeObjectURL(url); showToast('CSV descargado');
}
function clearAllData(){
  if(confirm('Borrar TODOS los datos? No se puede deshacer.')){localStorage.clear();location.reload();}
}

let toastTimer;
function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.add('hidden'),2500);
}
// Sincronización automática al recuperar internet
window.addEventListener('online', () => {
  showToast('Conexión restaurada — sincronizando...');
  if (state.sheetsURL) syncToSheets();
});
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}

document.addEventListener('click',e=>{
  const menu=document.getElementById('profile-menu');
  const btn=document.getElementById('profile-selector-btn');
  if(menu&&!menu.classList.contains('hidden')&&!menu.contains(e.target)&&!btn.contains(e.target))
    menu.classList.add('hidden');
});
// ===== FASE 2 =====

// --- PRESUPUESTO ---
function initBudget() {
  const dailyEl = document.getElementById('daily-limit-input');
  if (dailyEl) dailyEl.value = state.dailyLimit || '';
  renderBudgetCategories();
}

function saveDailyLimit() {
  const v = parseFloat(document.getElementById('daily-limit-input').value);
  state.dailyLimit = v > 0 ? v : 0;
  saveState(); showToast('Limite diario guardado');
}

function renderBudgetCategories() {
  const list = document.getElementById('budget-categories-list');
  if (!list) return;
  const now = new Date();
  const txs = state.transactions.filter(tx => {
    const d = new Date(tx.date);
    return tx.type === 'gasto' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  list.innerHTML = state.categoriesGasto.map((cat, i) => {
    const spent = txs.filter(t => t.category === cat.name).reduce((s, t) => s + toMXN(t.amount, t.currency), 0);
    const limit = (state.budgets && state.budgets[cat.name]) || 0;
    const pct = limit > 0 ? Math.min(Math.round(spent / limit * 100), 100) : 0;
    const color = pct >= 100 ? 'progress-red' : pct >= 80 ? 'progress-yellow' : 'progress-green';
    return `
      <div class="budget-cat-row">
        <span>${cat.emoji} ${cat.name}</span>
        <input type="number" min="0" step="100" placeholder="Sin limite"
          value="${limit || ''}"
          onchange="saveBudget('${cat.name}', this.value)" />
      </div>
      ${limit > 0 ? `
        <div class="budget-progress-bar"><div class="budget-progress-fill ${color}" style="width:${pct}%"></div></div>
        <div class="budget-pct">${fmt(spent)} de ${fmt(limit)} (${pct}%)</div>
      ` : ''}
    `;
  }).join('');
}

function saveBudget(catName, value) {
  if (!state.budgets) state.budgets = {};
  const v = parseFloat(value);
  state.budgets[catName] = v > 0 ? v : 0;
  saveState();
  renderBudgetCategories();
  checkBudgetAlerts();
}

function checkBudgetAlerts() {
  if (!state.budgets) return;
  const now = new Date();
  const txs = state.transactions.filter(tx => {
    const d = new Date(tx.date);
    return tx.type === 'gasto' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  Object.entries(state.budgets).forEach(([cat, limit]) => {
    if (!limit) return;
    const spent = txs.filter(t => t.category === cat).reduce((s, t) => s + toMXN(t.amount, t.currency), 0);
    const pct = spent / limit * 100;
    if (pct >= 100) showToast(`⚠️ ${cat}: superaste el presupuesto`);
    else if (pct >= 80) showToast(`⚠️ ${cat}: 80% del presupuesto usado`);
  });
}

// --- GASTOS RECURRENTES ---
function initRecurring() {
  renderRecurringList();
}

function renderRecurringList() {
  const list = document.getElementById('recurring-list');
  if (!list) return;
  const items = state.recurring || [];
  if (!items.length) {
    list.innerHTML = '<div class="empty-state"><span class="empty-icon">🔄</span>Sin gastos recurrentes.<br>Agrega uno con el boton de arriba.</div>';
    return;
  }
  const freqLabel = { daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual', annual: 'Anual' };
  list.innerHTML = items.map((r, i) => `
    <div class="recurring-item">
      <div class="recurring-item-info">
        <div class="recurring-item-name">${r.name}</div>
        <div class="recurring-item-meta">${r.category} · ${r.account} · ${r.profile}</div>
        ${r.day ? `<div class="recurring-item-meta">Dia ${r.day} de cada mes</div>` : ''}
      </div>
      <div>
        <div class="recurring-item-amount">-${r.currency === 'USD' ? 'USD ' : '$'}${parseFloat(r.amount).toFixed(2)}</div>
        <div class="recurring-item-freq">${freqLabel[r.frequency] || r.frequency}</div>
        <button class="btn-delete" onclick="deleteRecurring(${i})">✕</button>
      </div>
    </div>
  `).join('');
}

function initAddRecurring() {
  const catSel = document.getElementById('rec-category');
  const accSel = document.getElementById('rec-account');
  const profSel = document.getElementById('rec-profile');
  if (catSel) catSel.innerHTML = state.categoriesGasto.map(c => `<option value="${c.name}">${c.emoji} ${c.name}</option>`).join('');
  if (accSel) accSel.innerHTML = state.accounts.map(a => `<option value="${a.name}">${a.name} ${a.currency}</option>`).join('');
  if (profSel) profSel.innerHTML = state.profiles.map(p => `<option value="${p}">${p}</option>`).join('');
  document.getElementById('rec-name').value = '';
  document.getElementById('rec-amount').value = '';
  document.getElementById('rec-day').value = '';
}

function saveRecurring() {
  const name = document.getElementById('rec-name').value.trim();
  const amount = parseFloat(document.getElementById('rec-amount').value);
  if (!name) { showToast('Ingresa un nombre'); return; }
  if (!amount || amount <= 0) { showToast('Ingresa un monto valido'); return; }
  if (!state.recurring) state.recurring = [];
  state.recurring.push({
    name,
    amount,
    currency: document.getElementById('rec-currency').value,
    category: document.getElementById('rec-category').value,
    account: document.getElementById('rec-account').value,
    frequency: document.getElementById('rec-frequency').value,
    day: parseInt(document.getElementById('rec-day').value) || null,
    profile: document.getElementById('rec-profile').value,
  });
  saveState();
  showToast('Recurrente guardado');
  showScreen('screen-recurring');
}

function deleteRecurring(i) {
  if (confirm('Eliminar este gasto recurrente?')) {
    state.recurring.splice(i, 1);
    saveState(); renderRecurringList();
  }
}

// --- TDC ---
let editingTDCIndex = -1;

function initTDC() {
  renderTDCList();
}

function renderTDCList() {
  const list = document.getElementById('tdc-list');
  if (!list) return;
  const cards = state.tdcCards || [];
  if (!cards.length) {
    list.innerHTML = '<div class="empty-state"><span class="empty-icon">💳</span>Sin tarjetas de credito.<br>Agrega una con el boton de arriba.</div>';
    return;
  }
  list.innerHTML = cards.map((c, i) => {
    const vars = c.vars || {};
    const balance = vars.balance || 0;
    const used = limit => limit > 0 ? Math.round(balance / limit * 100) : 0;
    return `
      <div class="tdc-card">
        <div class="tdc-card-header">
          <span class="tdc-card-bank">💳 ${c.bank}</span>
          <span class="tdc-card-limit">${c.currency} ${c.limit ? fmt(c.limit) : '—'}</span>
        </div>
        <div class="tdc-card-dates">
          <div class="tdc-date-item"><strong>Dia ${c.cutDay || '—'}</strong>Corte</div>
          <div class="tdc-date-item"><strong>Dia ${c.payDay || '—'}</strong>Pago</div>
          <div class="tdc-date-item"><strong>${c.cat || '—'}%</strong>CAT anual</div>
        </div>
        ${balance > 0 ? `<div class="tdc-card-dates"><div class="tdc-date-item"><strong style="color:var(--expense)">${fmt(balance)}</strong>Saldo actual</div></div>` : ''}
        <div class="tdc-card-actions">
          <button class="btn-tdc-action" onclick="openTDCDetail(${i})">Ver detalle</button>
          <button class="btn-tdc-action" onclick="editTDC(${i})">Editar</button>
          <button class="btn-tdc-action" style="color:var(--expense)" onclick="deleteTDC(${i})">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

function showAddTDC() {
  editingTDCIndex = -1;
  document.getElementById('tdc-form-title').textContent = 'Nueva TDC';
  ['tdc-bank','tdc-limit','tdc-cut-day','tdc-pay-day','tdc-cat','tdc-min-pct'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('tdc-currency').value = 'MXN';
  showScreen('screen-tdc-form');
}

function editTDC(i) {
  editingTDCIndex = i;
  const c = state.tdcCards[i];
  document.getElementById('tdc-form-title').textContent = 'Editar TDC';
  document.getElementById('tdc-bank').value = c.bank || '';
  document.getElementById('tdc-limit').value = c.limit || '';
  document.getElementById('tdc-currency').value = c.currency || 'MXN';
  document.getElementById('tdc-cut-day').value = c.cutDay || '';
  document.getElementById('tdc-pay-day').value = c.payDay || '';
  document.getElementById('tdc-cat').value = c.cat || '';
  document.getElementById('tdc-min-pct').value = c.minPct || '';
  showScreen('screen-tdc-form');
}

function saveTDC() {
  const bank = document.getElementById('tdc-bank').value.trim();
  if (!bank) { showToast('Ingresa el nombre del banco'); return; }
  const card = {
    bank,
    limit: parseFloat(document.getElementById('tdc-limit').value) || 0,
    currency: document.getElementById('tdc-currency').value,
    cutDay: parseInt(document.getElementById('tdc-cut-day').value) || null,
    payDay: parseInt(document.getElementById('tdc-pay-day').value) || null,
    cat: parseFloat(document.getElementById('tdc-cat').value) || 0,
    minPct: parseFloat(document.getElementById('tdc-min-pct').value) || 10,
    vars: editingTDCIndex >= 0 ? (state.tdcCards[editingTDCIndex].vars || {}) : {}
  };
  if (!state.tdcCards) state.tdcCards = [];
  if (editingTDCIndex >= 0) state.tdcCards[editingTDCIndex] = card;
  else state.tdcCards.push(card);
  saveState(); showToast('TDC guardada');
  showScreen('screen-tdc');
}

function deleteTDC(i) {
  if (confirm('Eliminar esta tarjeta?')) {
    state.tdcCards.splice(i, 1);
    saveState(); renderTDCList();
  }
}

function openTDCDetail(i) {
  editingTDCIndex = i;
  const c = state.tdcCards[i];
  const vars = c.vars || {};
  document.getElementById('tdc-detail-title').textContent = c.bank;
  document.getElementById('tdc-detail-info').innerHTML = `
    <div class="setting-row"><span>Limite de credito</span><span>${c.currency} ${fmt(c.limit || 0)}</span></div>
    <div class="setting-row"><span>Fecha de corte</span><span>Dia ${c.cutDay || '—'}</span></div>
    <div class="setting-row"><span>Fecha limite de pago</span><span>Dia ${c.payDay || '—'}</span></div>
    <div class="setting-row"><span>CAT anual</span><span>${c.cat || 0}%</span></div>
    <div class="setting-row"><span>Pago minimo</span><span>${c.minPct || 10}%</span></div>
  `;
  document.getElementById('tdc-var-balance').value = vars.balance || '';
  document.getElementById('tdc-var-min').value = vars.minPayment || '';
  document.getElementById('tdc-var-msi').value = vars.msi || '';
  document.getElementById('tdc-var-paid').value = vars.paid || '';
  document.getElementById('sim-payment').value = '';
  document.getElementById('sim-results').style.display = 'none';
  showScreen('screen-tdc-detail');
}

function saveTDCVars() {
  if (editingTDCIndex < 0) return;
  state.tdcCards[editingTDCIndex].vars = {
    balance: parseFloat(document.getElementById('tdc-var-balance').value) || 0,
    minPayment: parseFloat(document.getElementById('tdc-var-min').value) || 0,
    msi: parseFloat(document.getElementById('tdc-var-msi').value) || 0,
    paid: parseFloat(document.getElementById('tdc-var-paid').value) || 0,
  };
  saveState(); showToast('Datos del mes actualizados');
  runSimulator();
}

function runSimulator() {
  if (editingTDCIndex < 0) return;
  const c = state.tdcCards[editingTDCIndex];
  const vars = c.vars || {};
  const balance = parseFloat(document.getElementById('tdc-var-balance').value) || vars.balance || 0;
  const payment = parseFloat(document.getElementById('sim-payment').value) || 0;
  if (!balance || !payment) { document.getElementById('sim-results').style.display = 'none'; return; }
  const monthlyRate = (c.cat || 0) / 100 / 12;
  const interest = balance * monthlyRate;
  const capital = Math.max(payment - interest, 0);
  const newBalance = Math.max(balance - capital, 0);
  let months = 0;
  let total = 0;
  if (payment > interest && balance > 0) {
    let b = balance;
    while (b > 0 && months < 600) {
      const i = b * monthlyRate;
      b = b + i - payment;
      total += payment;
      months++;
      if (b < 0) { total += b; b = 0; }
    }
  }
  const minPayment = balance * (c.minPct || 10) / 100;
  let totalMin = 0;
  if (minPayment > interest && balance > 0) {
    let b = balance;
    let m = 0;
    while (b > 0 && m < 600) {
      const i = b * monthlyRate;
      const mp = b * (c.minPct || 10) / 100;
      b = b + i - mp;
      totalMin += mp;
      m++;
      if (b < 0) { totalMin += b; b = 0; }
    }
  }
  document.getElementById('sim-interest').textContent = fmt(interest);
  document.getElementById('sim-capital').textContent = fmt(capital);
  document.getElementById('sim-months').textContent = months > 0 ? `${months} meses` : 'No liquidas';
  document.getElementById('sim-total-min').textContent = totalMin > 0 ? fmt(totalMin) : '—';
  document.getElementById('sim-results').style.display = 'block';
}

// ===== FASE 3 =====


// ===== FASE 3 =====

// --- MODO VIAJE ---
function toggleTravelMode() {
  state.travelMode = !state.travelMode;
  state.travelStart = state.travelMode ? new Date().toISOString().split('T')[0] : null;
  saveState();
  updateTravelModeBtn();
  showToast(state.travelMode ? '✈️ Modo viaje activado' : 'Modo viaje desactivado');
}
function updateTravelModeBtn() {
  const btn = document.getElementById('travel-mode-btn');
  if (btn) btn.textContent = state.travelMode ? 'Desactivar ✈️' : 'Activar';
}

// --- GRÁFICAS ---
let currentChartTab = 'trend';

function initCharts() {
  const profSel = document.getElementById('chart-profile');
  if (profSel) {
    profSel.innerHTML = '<option value="all">Todos los perfiles</option>' +
      state.profiles.map(p => `<option value="${p}">${p}</option>`).join('');
  }
  const compCat = document.getElementById('compare-cat');
  if (compCat) {
    compCat.innerHTML = state.categoriesGasto.map(c => `<option value="${c.name}">${c.emoji} ${c.name}</option>`).join('');
  }
  renderCharts();
}

function showChartTab(tab, btn) {
  currentChartTab = tab;
  document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.chart-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('chart-' + tab).classList.remove('hidden');
  renderCharts();
}

function renderCharts() {
  if (currentChartTab === 'trend') renderTrend();
  if (currentChartTab === 'evolution') renderEvolution();
  if (currentChartTab === 'compare') renderCompare();
}

function getMonthTxs(year, month, profile, type) {
  return state.transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getFullYear() === year && d.getMonth() === month &&
      tx.type === type && (profile === 'all' || tx.profile === profile);
  });
}

function renderTrend() {
  const container = document.getElementById('bar-chart');
  if (!container) return;
  const profile = document.getElementById('chart-profile')?.value || 'all';
  const type = document.getElementById('chart-type')?.value || 'gasto';
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('es-MX', { month: 'short' }) });
  }
  const values = months.map(m => {
    return getMonthTxs(m.year, m.month, profile, type).reduce((s, t) => s + toMXN(t.amount, t.currency), 0);
  });
  const max = Math.max(...values, 1);
  const colorClass = type === 'gasto' ? 'bar-fill-expense' : 'bar-fill-income';
  container.innerHTML = months.map((m, i) => `
    <div class="bar-row">
      <span class="bar-label">${m.label}</span>
      <div class="bar-track"><div class="bar-fill ${colorClass}" style="width:${Math.round(values[i]/max*100)}%"></div></div>
      <span class="bar-value">${values[i] > 0 ? fmt(values[i]) : '—'}</span>
    </div>
  `).join('');
}

function renderEvolution() {
  const canvas = document.getElementById('line-chart');
  if (!canvas) return;
  const profile = document.getElementById('chart-profile')?.value || 'all';
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('es-MX', { month: 'short' }) });
  }
  const balances = months.map(m => {
    const txs = state.transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getFullYear() === m.year && d.getMonth() === m.month &&
        (profile === 'all' || tx.profile === profile);
    });
    const ing = txs.filter(t => t.type === 'ingreso').reduce((s, t) => s + toMXN(t.amount, t.currency), 0);
    const gas = txs.filter(t => t.type === 'gasto').reduce((s, t) => s + toMXN(t.amount, t.currency), 0);
    return ing - gas;
  });
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = 30;
  ctx.clearRect(0, 0, W, H);
  const max = Math.max(...balances.map(Math.abs), 1);
  const midY = H / 2;
  ctx.strokeStyle = '#2e2e50'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, midY); ctx.lineTo(W - pad, midY); ctx.stroke();
  ctx.beginPath();
  balances.forEach((v, i) => {
    const x = pad + i * (W - pad * 2) / (balances.length - 1);
    const y = midY - (v / max) * (H / 2 - 20);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#6c63ff'; ctx.lineWidth = 2.5; ctx.stroke();
  balances.forEach((v, i) => {
    const x = pad + i * (W - pad * 2) / (balances.length - 1);
    const y = midY - (v / max) * (H / 2 - 20);
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = v >= 0 ? '#4ade80' : '#f87171'; ctx.fill();
    if (i % 3 === 0) {
      ctx.fillStyle = '#9090b0'; ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(months[i].label, x, H - 4);
    }
  });
}

function renderCompare() {
  const container = document.getElementById('compare-chart');
  if (!container) return;
  const cat = document.getElementById('compare-cat')?.value;
  if (!cat) return;
  const profile = document.getElementById('chart-profile')?.value || 'all';
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('es-MX', { month: 'short' }) });
  }
  const values = months.map(m => {
    return state.transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getFullYear() === m.year && d.getMonth() === m.month &&
        tx.type === 'gasto' && tx.category === cat &&
        (profile === 'all' || tx.profile === profile);
    }).reduce((s, t) => s + toMXN(t.amount, t.currency), 0);
  });
  const max = Math.max(...values, 1);
  container.innerHTML = months.map((m, i) => `
    <div class="bar-row">
      <span class="bar-label">${m.label}</span>
      <div class="bar-track"><div class="bar-fill bar-fill-expense" style="width:${Math.round(values[i]/max*100)}%"></div></div>
      <span class="bar-value">${values[i] > 0 ? fmt(values[i]) : '—'}</span>
    </div>
  `).join('');
}

// --- EXPORTAR PDF ---
function exportPDF() {
  const now = new Date();
  const profile = state.currentProfile;
  const txs = state.transactions.filter(tx => profile === 'Todo' || tx.profile === profile).slice().reverse();
  const income = txs.filter(t => t.type === 'ingreso').reduce((s, t) => s + toMXN(t.amount, t.currency), 0);
  const expense = txs.filter(t => t.type === 'gasto').reduce((s, t) => s + toMXN(t.amount, t.currency), 0);
  const rows = txs.map(tx => `<tr><td>${tx.date}</td><td>${tx.type}</td><td>${tx.category||''}</td><td style="text-align:right;color:${tx.type==='gasto'?'#c0392b':'#27ae60'}">${tx.currency==='USD'?'USD ':'$'}${tx.amount.toFixed(2)}</td><td>${tx.account||''}</td><td>${tx.profile||''}</td><td>${tx.note||''}</td></tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>MisFinanzas</title><style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}h1{color:#6c63ff}.summary{display:flex;gap:20px;margin:16px 0;padding:12px;background:#f5f5f5;border-radius:8px}.sum-item{flex:1;text-align:center}.sum-label{font-size:11px;color:#666}.sum-value{font-size:16px;font-weight:bold;margin-top:4px}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#6c63ff;color:white;padding:8px;text-align:left;font-size:11px}td{padding:6px 8px;border-bottom:1px solid #eee;font-size:11px}tr:nth-child(even){background:#f9f9f9}</style></head><body><h1>MisFinanzas</h1><p>Reporte: ${now.toLocaleDateString('es-MX')} | Perfil: ${profile}</p><div class="summary"><div class="sum-item"><div class="sum-label">Ingresos</div><div class="sum-value" style="color:#27ae60">${fmt(income)}</div></div><div class="sum-item"><div class="sum-label">Gastos</div><div class="sum-value" style="color:#c0392b">${fmt(expense)}</div></div><div class="sum-item"><div class="sum-label">Diferencia</div><div class="sum-value" style="color:${income-expense>=0?'#27ae60':'#c0392b'}">${(income-expense<0?'-':'')+fmt(income-expense)}</div></div></div><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Categoria</th><th>Monto</th><th>Cuenta</th><th>Perfil</th><th>Nota</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `reporte_${now.toISOString().split('T')[0]}.html`;
  a.click(); URL.revokeObjectURL(url);
  showToast('Reporte descargado');
}

// --- SINCRONIZACIÓN SHEETS ---
function initSync() {
  const urlEl = document.getElementById('sheets-url');
  if (urlEl) urlEl.value = state.sheetsURL || '';
  updatePendingCount();
}

function saveSheetURL() {
  const url = document.getElementById('sheets-url').value.trim();
  if (!url) { showToast('Ingresa una URL'); return; }
  state.sheetsURL = url;
  saveState();
  showToast('URL guardada ✓');
  updatePendingCount();
}

function updatePendingCount(){
  const pending=state.transactions.filter(t=>!t.synced&&!t.deleted).length;
  const el=document.getElementById('pending-sync-count');
  if(el) el.textContent=`${pending} transaccion${pending!==1?'es':''} pendiente${pending!==1?'s':''}`;
  const bar=document.getElementById('sync-bar');
  const barText=document.getElementById('sync-bar-text');
  if(bar&&barText){
    if(pending>0){
      bar.style.display='flex';
      barText.textContent=`☁️ ${pending} pendiente${pending!==1?'s':''} de sincronizar`;
      bar.style.background='rgba(251,191,36,0.15)';
      bar.style.color='var(--warning)';
    }else{
      bar.style.display='flex';
      barText.textContent='✅ Todo sincronizado';
      bar.style.background='rgba(74,222,128,0.1)';
      bar.style.color='var(--income)';
      setTimeout(()=>{bar.style.display='none';},3000);
    }
  }
}

async function syncToSheets() {
  const urlEl = document.getElementById('sheets-url');
  const url = (urlEl && urlEl.value.trim()) || state.sheetsURL;
  if (!url) { showToast('Primero guarda la URL del Apps Script'); return; }
  state.sheetsURL = url;
  saveState();
  const statusEl = document.getElementById('sync-status');
  if (statusEl) statusEl.textContent = 'Sincronizando...';

  const pending = state.transactions.filter(t => !t.synced || t.deleted);
  const config = {
    users: state.users, profiles: state.profiles,
    accounts: state.accounts, categoriesGasto: state.categoriesGasto,
    categoriesIngreso: state.categoriesIngreso,
    exchangeRate: state.exchangeRate, budgets: state.budgets || {},
    dailyLimit: state.dailyLimit || 0
  };

  try {
    // 1. Subir cambios pendientes
    if (pending.length > 0) {
      await fetch(url, {
        method: 'POST', mode: 'no-cors',
        body: JSON.stringify({ transactions: pending, config }),
        headers: { 'Content-Type': 'application/json' }
      });
      state.transactions = state.transactions
        .filter(t => !t.deleted)
        .map(t => ({ ...t, synced: true }));
      saveState();
    }

    // 2. Descargar lo que hay en Sheets
    const res = await fetch(url);
    const data = await res.json();
    if (data.ok && data.transactions) {
      const localIds = new Set(state.transactions.map(t => String(t.id)));
      const newFromServer = data.transactions.filter(t => !localIds.has(String(t.id)));
      if (newFromServer.length > 0) {
        state.transactions = [...state.transactions, ...newFromServer];
        saveState();
      }
      if (data.config && state.transactions.length === 0) {
        state.users = data.config.users || state.users;
        state.profiles = data.config.profiles || state.profiles;
        state.accounts = data.config.accounts || state.accounts;
        state.categoriesGasto = data.config.categoriesGasto || state.categoriesGasto;
        state.categoriesIngreso = data.config.categoriesIngreso || state.categoriesIngreso;
      }
      saveState();
    }

    updatePendingCount();
    initMain();
    const pendingCount = state.transactions.filter(t => !t.synced).length;
    if (statusEl) statusEl.textContent = pendingCount === 0 ? 'Todo sincronizado ✓' : pendingCount + ' pendientes';
    showToast('Sincronizacion completada ✓');

  } catch (e) {
    if (statusEl) statusEl.textContent = 'Error de conexion';
    showToast('Error de conexion');
  }
}

// --- NOTA DE VOZ ---
function startVoiceNote(targetInputId) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Tu navegador no soporta nota de voz');
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SR();
  recognition.lang = 'es-MX';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  showToast('Habla ahora...');
  recognition.start();
  recognition.onresult = e => {
    const text = e.results[0][0].transcript;
    const input = document.getElementById(targetInputId);
    if (input) input.value = text;
    showToast('Nota transcrita ✓');
  };
  recognition.onerror = () => showToast('No se pudo transcribir');
}
