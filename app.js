// ===== ESTADO GLOBAL =====
let donutMode = 'balance';
let selectedAccountFilter = 'all';
let periodMode = 'month';
let periodOffset = 0; // 0=actual, -1=anterior, etc.

let state = {
  configured: false,
  pin: null,
  users: ['Usuario 1'],
  profiles: ['Personal'],
  accounts: [
    { name: 'Efectivo MXN', currency: 'MXN' },
    { name: 'Efectivo USD', currency: 'USD' },
    { name: 'Débito', currency: 'MXN' },
    { name: 'Crédito', currency: 'MXN' },
  ],
  categoriesGasto: [
    { emoji: '🍔', name: 'Comida' },
    { emoji: '🚗', name: 'Transporte' },
    { emoji: '🏠', name: 'Casa' },
    { emoji: '💊', name: 'Salud' },
    { emoji: '👕', name: 'Ropa' },
    { emoji: '🎬', name: 'Entrete.' },
    { emoji: '📱', name: 'Telecom' },
    { emoji: '🐾', name: 'Mascotas' },
    { emoji: '📚', name: 'Educación' },
    { emoji: '💳', name: 'Deudas' },
    { emoji: '✈️', name: 'Viajes' },
    { emoji: '💼', name: 'Negocio' },
    { emoji: '🔧', name: 'Mantenim.' },
    { emoji: '🎁', name: 'Regalos' },
    { emoji: '❓', name: 'Otros' },
  ],
  categoriesIngreso: [
    { emoji: '💰', name: 'Honorarios' },
    { emoji: '🤝', name: 'Anticipo' },
    { emoji: '📈', name: 'Inversión' },
    { emoji: '🎁', name: 'Transferencia' },
    { emoji: '❓', name: 'Otros' },
  ],
  transactions: [],
  exchangeRate: 17.50,
  theme: 'dark',
  currentProfile: 'Todo',
};

const CAT_COLORS = [
  '#6c63ff','#f87171','#4ade80','#60a5fa','#fbbf24',
  '#f472b6','#34d399','#a78bfa','#fb923c','#38bdf8',
  '#e879f9','#4ade80','#f87171','#818cf8','#94a3b8'
];

// ===== STORAGE =====
function saveState() { try { localStorage.setItem('finanzas_state', JSON.stringify(state)); } catch(e) {} }
function loadState() {
  try {
    const s = localStorage.getItem('finanzas_state');
    if (s) state = { ...state, ...JSON.parse(s) };
  } catch(e) {}
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  applyTheme(state.theme);
  if (!state.configured) { initSetup(); showScreen('screen-setup'); }
  else if (state.pin) { showScreen('screen-pin'); initPinScreen(); }
  else { showScreen('screen-main'); initMain(); }
});

// ===== SCREENS =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'screen-main') initMain();
  if (id === 'screen-transactions') renderAllTransactions();
  if (id === 'screen-search') document.getElementById('search-input').focus();
  if (id === 'screen-settings') initSettings();
}

// ===== THEME =====
function applyTheme(t) {
  document.body.classList.remove('theme-dark','theme-light');
  if (t === 'auto') document.body.classList.add(window.matchMedia('(prefers-color-scheme:dark)').matches ? 'theme-dark' : 'theme-light');
  else document.body.classList.add('theme-' + t);
  // Actualizar color del hoyo de la dona
  const hole = document.getElementById('donut-hole');
  if (hole) hole.setAttribute('fill', t === 'light' ? '#ffffff' : '#0f0f1a');
}
function setTheme(t) {
  state.theme = t; applyTheme(t); saveState();
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}

// ===== PIN =====
let pinInput = '';
function initPinScreen() {
  pinInput = '';
  updatePinDots('pin-dots', 0);
  document.getElementById('pin-error').textContent = '';
  document.querySelectorAll('.numpad .num-btn').forEach(btn => {
    const num = btn.dataset.num;
    if (num !== undefined) btn.onclick = () => enterPin(num);
  });
  document.getElementById('pin-delete').onclick = () => { pinInput = pinInput.slice(0,-1); updatePinDots('pin-dots', pinInput.length); };
  document.getElementById('skip-pin-btn').onclick = () => { showScreen('screen-main'); initMain(); };
}
function enterPin(num) {
  if (pinInput.length >= 4) return;
  pinInput += num;
  updatePinDots('pin-dots', pinInput.length);
  if (pinInput.length === 4) {
    setTimeout(() => {
      if (pinInput === state.pin) { showScreen('screen-main'); initMain(); }
      else { document.getElementById('pin-error').textContent = 'PIN incorrecto'; pinInput = ''; updatePinDots('pin-dots', 0); }
    }, 200);
  }
}
function updatePinDots(id, count) {
  document.getElementById(id).querySelectorAll('.dot').forEach((d,i) => d.classList.toggle('filled', i < count));
}

// ===== SETUP =====
let currentStep = 1;
let currentCatTab = 'gastos';
function initSetup() { renderSetupAccounts(); renderSetupCategories(); }
function nextStep(step) {
  if (currentStep === 1) {
    const u1 = document.getElementById('user1-name').value.trim();
    if (!u1) { showToast('Ingresa tu nombre'); return; }
    state.users[0] = u1;
    const u2 = document.getElementById('user2-name').value.trim();
    if (u2) state.users[1] = u2; else state.users = state.users.slice(0,1);
  }
  document.getElementById('step-' + currentStep).classList.remove('active');
  currentStep = step;
  document.getElementById('step-' + step).classList.add('active');
}
function addProfile() {
  const n = document.getElementById('new-profile-name').value.trim();
  if (!n) return;
  if (state.profiles.includes(n)) { showToast('Ya existe'); return; }
  state.profiles.push(n);
  document.getElementById('new-profile-name').value = '';
  renderProfileList();
}
function renderProfileList() {
  const list = document.getElementById('profile-list');
  list.innerHTML = '<div class="profile-item fixed"><span>👤</span><span>Personal</span><span class="fixed-badge">Fijo</span></div>';
  state.profiles.slice(1).forEach((p,i) => {
    const div = document.createElement('div');
    div.className = 'profile-item';
    div.innerHTML = `<span>💼</span><span>${p}</span><button class="remove-profile-btn" onclick="removeProfile(${i+1})">✕</button>`;
    list.appendChild(div);
  });
}
function removeProfile(i) { state.profiles.splice(i,1); renderProfileList(); }
function renderSetupAccounts() {
  const list = document.getElementById('accounts-list');
  list.innerHTML = '';
  state.accounts.forEach((a,i) => {
    const div = document.createElement('div');
    div.className = 'account-item';
    div.innerHTML = `<span>🏦</span><span contenteditable="true" onblur="state.accounts[${i}].name=this.textContent.trim()">${a.name}</span><span class="account-currency-badge">${a.currency}</span><button class="remove-profile-btn" onclick="removeAccount(${i})">✕</button>`;
    list.appendChild(div);
  });
}
function addAccount() {
  const n = document.getElementById('new-account-name').value.trim();
  const c = document.getElementById('new-account-currency').value;
  if (!n) return;
  state.accounts.push({ name: n, currency: c });
  document.getElementById('new-account-name').value = '';
  renderSetupAccounts();
}
function removeAccount(i) { state.accounts.splice(i,1); renderSetupAccounts(); }
function renderSetupCategories() { renderCatList('gastos'); renderCatList('ingresos'); }
function renderCatList(type) {
  const cats = type === 'gastos' ? state.categoriesGasto : state.categoriesIngreso;
  const list = document.getElementById('cat-' + type);
  list.innerHTML = '';
  cats.forEach((c,i) => {
    const div = document.createElement('div');
    div.className = 'cat-item';
    div.innerHTML = `<span class="cat-emoji">${c.emoji}</span><span contenteditable="true" onblur="updateCatName('${type}',${i},this.textContent)">${c.name}</span><button class="remove-profile-btn" onclick="removeCat('${type}',${i})">✕</button>`;
    list.appendChild(div);
  });
}
function addCategory() {
  const n = document.getElementById('new-cat-name').value.trim();
  if (!n) return;
  const cat = { emoji: '📌', name: n };
  if (currentCatTab === 'gastos') state.categoriesGasto.push(cat);
  else state.categoriesIngreso.push(cat);
  document.getElementById('new-cat-name').value = '';
  renderCatList(currentCatTab);
}
function removeCat(type, i) {
  if (type === 'gastos') state.categoriesGasto.splice(i,1);
  else state.categoriesIngreso.splice(i,1);
  renderCatList(type);
}
function updateCatName(type, i, name) {
  if (type === 'gastos') state.categoriesGasto[i].name = name.trim();
  else state.categoriesIngreso[i].name = name.trim();
}
function showCatTab(tab, btn) {
  currentCatTab = tab;
  document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('cat-gastos').classList.toggle('hidden', tab !== 'gastos');
  document.getElementById('cat-ingresos').classList.toggle('hidden', tab !== 'ingresos');
}
let setupPinEntry = '';
function setupPinInput(num) {
  if (setupPinEntry.length >= 4) return;
  setupPinEntry += num;
  updatePinDots('setup-pin-dots', setupPinEntry.length);
  if (setupPinEntry.length === 4) { state.pin = setupPinEntry; finishSetup(); }
}
function setupPinDelete() { setupPinEntry = setupPinEntry.slice(0,-1); updatePinDots('setup-pin-dots', setupPinEntry.length); }
function finishSetup() {
  state.configured = true;
  state.currentProfile = 'Todo';
  saveState();
  showScreen('screen-main');
  initMain();
  showToast('¡App configurada! 🎉');
}

// ===== MAIN =====
function initMain() {
  renderProfileMenu();
  updateProfileDisplay();
  renderExchangeRate();
  updatePeriodLabel();
  renderBalance();
  renderDonut();
  renderAccountsBar();
  renderRecentTransactions();
}

// ===== PERÍODO =====
function setPeriodMode(mode, btn) {
  periodMode = mode;
  periodOffset = 0;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updatePeriodLabel();
  renderBalance(); renderDonut(); renderRecentTransactions();
}
function changePeriod(dir) {
  periodOffset += dir;
  updatePeriodLabel();
  renderBalance(); renderDonut(); renderRecentTransactions();
}
function updatePeriodLabel() {
  const now = new Date();
  let label = '';
  if (periodMode === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth() + periodOffset, 1);
    label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    label = label.charAt(0).toUpperCase() + label.slice(1);
  } else if (periodMode === 'week') {
    const d = new Date(now);
    d.setDate(now.getDate() + periodOffset * 7);
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    const end = new Date(start); end.setDate(start.getDate() + 6);
    label = `${start.getDate()}/${start.getMonth()+1} – ${end.getDate()}/${end.getMonth()+1}`;
  } else if (periodMode === 'today') {
    const d = new Date(now);
    d.setDate(now.getDate() + periodOffset);
    label = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
    label = label.charAt(0).toUpperCase() + label.slice(1);
  } else {
    label = 'Rango personalizado';
  }
  document.getElementById('period-label').textContent = label;
}

function getFilteredTx() {
  const now = new Date();
  return state.transactions.filter(tx => {
    const txDate = new Date(tx.date);
    let inPeriod = true;
    if (periodMode === 'today') {
      const d = new Date(now); d.setDate(now.getDate() + periodOffset);
      inPeriod = txDate.toDateString() === d.toDateString();
    } else if (periodMode === 'week') {
      const d = new Date(now); d.setDate(now.getDate() + periodOffset * 7);
      const start = new Date(d); start.setDate(d.getDate() - d.getDay()); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
      inPeriod = txDate >= start && txDate <= end;
    } else if (periodMode === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth() + periodOffset, 1);
      inPeriod = txDate.getMonth() === d.getMonth() && txDate.getFullYear() === d.getFullYear();
    }
    const inProfile = state.currentProfile === 'Todo' || tx.profile === state.currentProfile;
    const inAccount = selectedAccountFilter === 'all' || tx.account === selectedAccountFilter;
    return inPeriod && inProfile && inAccount;
  });
}

function toMXN(amount, currency) { return currency === 'USD' ? amount * state.exchangeRate : amount; }
function formatMXN(amount) { return '$' + Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

// ===== PERFIL =====
function renderProfileMenu() {
  const menu = document.getElementById('profile-menu');
  const all = ['Todo', ...state.profiles];
  menu.innerHTML = all.map(p => {
    const icon = p === 'Todo' ? '🌐' : p === 'Personal' ? '👤' : '💼';
    return `<button class="profile-menu-item ${state.currentProfile===p?'active':''}" onclick="selectProfile('${p}')">${icon} ${p}</button>`;
  }).join('');
}
function toggleProfileMenu() { document.getElementById('profile-menu').classList.toggle('hidden'); }
function selectProfile(p) {
  state.currentProfile = p;
  document.getElementById('profile-menu').classList.add('hidden');
  updateProfileDisplay();
  renderBalance(); renderDonut(); renderRecentTransactions();
  saveState();
}
function updateProfileDisplay() {
  const p = state.currentProfile;
  document.getElementById('current-profile-icon').textContent = p==='Todo'?'🌐':p==='Personal'?'👤':'💼';
  document.getElementById('current-profile-name').textContent = p;
  renderProfileMenu();
}

// ===== EXCHANGE =====
function renderExchangeRate() {
  document.getElementById('exchange-rate-display').textContent = state.exchangeRate.toFixed(2);
  const el = document.getElementById('settings-exchange');
  if (el) el.value = state.exchangeRate;
}
function editExchangeRate() {
  document.getElementById('modal-exchange-input').value = state.exchangeRate;
  document.getElementById('modal-exchange').classList.remove('hidden');
}
function saveExchangeRateModal() {
  const v = parseFloat(document.getElementById('modal-exchange-input').value);
  if (v > 0) { state.exchangeRate = v; saveState(); renderExchangeRate(); }
  closeModal('modal-exchange');
}
function saveExchangeRate() {
  const v = parseFloat(document.getElementById('settings-exchange').value);
  if (v > 0) { state.exchangeRate = v; saveState(); renderExchangeRate(); showToast('Tipo de cambio guardado'); }
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ===== BALANCE =====
function renderBalance() {
  const txs = getFilteredTx();
  let income = 0, expense = 0;
  txs.forEach(tx => {
    if (tx.type === 'ingreso') income += toMXN(tx.amount, tx.currency);
    else if (tx.type === 'gasto') expense += toMXN(tx.amount, tx.currency);
  });
  document.getElementById('total-income').textContent = formatMXN(income);
  document.getElementById('total-expense').textContent = formatMXN(expense);
  const diff = income - expense;
  const el = document.getElementById('total-diff');
  el.textContent = (diff < 0 ? '-' : '') + formatMXN(diff);
  el.style.color = diff >= 0 ? 'var(--income)' : 'var(--expense)';
}

// ===== DONA SVG INTERACTIVA =====
function svgArcPath(cx, cy, outerR, innerR, startAngle, endAngle) {
  const ox1 = cx + outerR * Math.cos(startAngle);
  const oy1 = cy + outerR * Math.sin(startAngle);
  const ox2 = cx + outerR * Math.cos(endAngle);
  const oy2 = cy + outerR * Math.sin(endAngle);
  const ix1 = cx + innerR * Math.cos(endAngle);
  const iy1 = cy + innerR * Math.sin(endAngle);
  const ix2 = cx + innerR * Math.cos(startAngle);
  const iy2 = cy + innerR * Math.sin(startAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${ox1} ${oy1} A ${outerR} ${outerR} 0 ${large} 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`;
}

function setDonutMode(mode, btn) {
  donutMode = mode;
  document.querySelectorAll('.donut-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDonut();
}

function renderDonut() {
  const txs = getFilteredTx();
  const seg = document.getElementById('donut-segments');
  const legend = document.getElementById('cat-legend');
  const labelEl = document.getElementById('donut-label-text');
  const amountEl = document.getElementById('donut-amount-text');
  seg.innerHTML = '';
  legend.innerHTML = '';

  let entries = [], total = 0, labelText = '', amountText = '';

  if (donutMode === 'balance') {
    const ing = txs.filter(t => t.type==='ingreso').reduce((s,t) => s+toMXN(t.amount,t.currency), 0);
    const gas = txs.filter(t => t.type==='gasto').reduce((s,t) => s+toMXN(t.amount,t.currency), 0);
    entries = [['Ingresos', ing, '#4ade80'], ['Gastos', gas, '#f87171']];
    total = ing + gas;
    labelText = 'Balance';
    const diff = ing - gas;
    amountText = (diff < 0 ? '-' : '') + formatMXN(diff);
  } else {
    const tipo = donutMode === 'gastos' ? 'gasto' : 'ingreso';
    const catMap = {};
    txs.filter(t => t.type===tipo).forEach(tx => {
      const k = tx.category || 'Otros';
      catMap[k] = (catMap[k] || 0) + toMXN(tx.amount, tx.currency);
    });
    const sorted = Object.entries(catMap).sort((a,b) => b[1]-a[1]);
    entries = sorted.map(([cat,val],i) => [cat, val, CAT_COLORS[i % CAT_COLORS.length]]);
    total = sorted.reduce((s,[,v]) => s+v, 0);
    labelText = donutMode === 'gastos' ? 'Gastos' : 'Ingresos';
    amountText = formatMXN(total);
  }

  labelEl.textContent = labelText;
  amountEl.textContent = amountText;

  if (total === 0) {
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d', svgArcPath(100,100,88,54,-Math.PI/2, Math.PI*1.499));
    path.setAttribute('fill', '#2a2a4a');
    seg.appendChild(path);
    return;
  }

  let angle = -Math.PI / 2;
  const GAP = 0.03;
  const legendItems = [];

  entries.forEach(([cat, val, color], idx) => {
    if (val <= 0) return;
    const slice = (val / total) * Math.PI * 2;
    const start = angle + GAP;
    const end = angle + slice - GAP;
    if (end > start) {
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', svgArcPath(100,100,88,54,start,end));
      path.setAttribute('fill', color);
      path.style.cursor = 'pointer';
      path.addEventListener('click', () => onSegmentClick(idx, cat, val, color, entries, labelText));
      seg.appendChild(path);
    }
    angle += slice;
    legendItems.push({ cat, val, color, pct: Math.round(val/total*100) });
  });

  legend.innerHTML = legendItems.slice(0,6).map(l =>
    `<div class="legend-item"><div class="legend-dot" style="background:${l.color}"></div><span>${l.cat} ${l.pct}%</span></div>`
  ).join('');
}

function onSegmentClick(idx, cat, val, color, entries, labelText) {
  const paths = document.getElementById('donut-segments').querySelectorAll('path');
  const labelEl = document.getElementById('donut-label-text');
  const amountEl = document.getElementById('donut-amount-text');

  // Si ya está seleccionado, deseleccionar
  if (paths[idx] && paths[idx].classList.contains('highlighted')) {
    paths.forEach(p => { p.classList.remove('highlighted','dimmed'); });
    // Restaurar texto original
    renderDonut();
    return;
  }

  paths.forEach((p, i) => {
    p.classList.remove('highlighted','dimmed');
    if (i === idx) p.classList.add('highlighted');
    else p.classList.add('dimmed');
  });
  labelEl.textContent = cat;
  amountEl.textContent = formatMXN(val);
}

// ===== BARRA DE CUENTAS =====
function renderAccountsBar() {
  const bar = document.getElementById('accounts-bar');
  bar.innerHTML = '';
  const all = document.createElement('button');
  all.className = 'account-chip-btn' + (selectedAccountFilter==='all'?' active':'');
  all.textContent = 'Todas';
  all.onclick = () => { selectedAccountFilter='all'; renderAccountsBar(); renderBalance(); renderDonut(); renderRecentTransactions(); };
  bar.appendChild(all);
  state.accounts.forEach(a => {
    const btn = document.createElement('button');
    btn.className = 'account-chip-btn' + (selectedAccountFilter===a.name?' active':'');
    btn.textContent = `${a.name} ${a.currency}`;
    btn.onclick = () => { selectedAccountFilter=a.name; renderAccountsBar(); renderBalance(); renderDonut(); renderRecentTransactions(); };
    bar.appendChild(btn);
  });
}

// ===== TRANSACCIONES =====
function renderRecentTransactions() {
  const txs = getFilteredTx().slice().reverse().slice(0,8);
  const el = document.getElementById('recent-transactions');
  el.innerHTML = txs.length ? txs.map(txHTML).join('') :
    `<div class="empty-state"><span class="empty-icon">💸</span>Sin movimientos en este período.<br>Toca + Gasto o + Ingreso para empezar.</div>`;
}

function txHTML(tx) {
  const cats = tx.type==='ingreso' ? state.categoriesIngreso : state.categoriesGasto;
  const cat = cats.find(c => c.name===tx.category) || { emoji:'💸', name: tx.category||'Sin cat.' };
  const sign = tx.type==='gasto'?'−':tx.type==='ingreso'?'+':'⇄';
  const dateStr = new Date(tx.date).toLocaleDateString('es-MX',{day:'2-digit',month:'short'});
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
    </div>
  </div>`;
}

// ===== FORMULARIO TRANSACCIÓN =====
let currentTxType = 'gasto';
let currentAmountStr = '0';
let selectedCategory = null;
let selectedAccount = null;
let selectedProfile = null;
let selectedUser = null;
let deducible = false;

function openTransaction(type) {
  currentTxType = type;
  currentAmountStr = '0';
  selectedCategory = null;
  selectedAccount = state.accounts[0]?.name || null;
  selectedProfile = state.currentProfile==='Todo' ? state.profiles[0] : state.currentProfile;
  selectedUser = state.users[0];
  deducible = false;
  document.getElementById('transaction-title').textContent = type==='gasto'?'Nuevo Gasto':type==='ingreso'?'Nuevo Ingreso':'Transferencia';
  document.getElementById('tx-amount-display').textContent = '0';
  document.getElementById('tx-currency').value = 'MXN';
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('tx-note').value = '';
  document.getElementById('tx-deducible-toggle').classList.remove('active');
  renderTxCategories(); renderTxAccounts(); renderTxProfiles(); renderTxUsers();
  showScreen('screen-transaction');
}

function amountInput(c) {
  if (c==='.' && currentAmountStr.includes('.')) return;
  if (currentAmountStr==='0' && c!=='.') currentAmountStr = c;
  else if (currentAmountStr.length < 10) currentAmountStr += c;
  document.getElementById('tx-amount-display').textContent = currentAmountStr;
}
function amountDelete() {
  currentAmountStr = currentAmountStr.slice(0,-1) || '0';
  document.getElementById('tx-amount-display').textContent = currentAmountStr;
}
function updateCurrencySymbol() {
  document.getElementById('tx-currency-symbol').textContent = document.getElementById('tx-currency').value==='USD'?'US$':'$';
}

function renderTxCategories() {
  const grid = document.getElementById('tx-categories');
  if (currentTxType==='transferencia') { grid.innerHTML='<p style="color:var(--text2);font-size:14px">Transferencia entre cuentas</p>'; return; }
  const cats = currentTxType==='ingreso' ? state.categoriesIngreso : state.categoriesGasto;
  grid.innerHTML = cats.map(c =>
    `<div class="cat-chip ${selectedCategory===c.name?'selected':''}" onclick="selectCat('${c.name}')"><span class="chip-emoji">${c.emoji}</span><span>${c.name}</span></div>`
  ).join('');
}
function selectCat(n) { selectedCategory=n; renderTxCategories(); }
function renderTxAccounts() {
  document.getElementById('tx-accounts').innerHTML = state.accounts.map(a =>
    `<div class="chip ${selectedAccount===a.name?'selected':''}" onclick="selectAccount('${a.name}')">${a.name} <small>${a.currency}</small></div>`
  ).join('');
}
function selectAccount(n) { selectedAccount=n; renderTxAccounts(); }
function renderTxProfiles() {
  document.getElementById('tx-profiles').innerHTML = state.profiles.map(p =>
    `<div class="chip ${selectedProfile===p?'selected':''}" onclick="selectTxProfile('${p}')">${p}</div>`
  ).join('');
}
function selectTxProfile(p) { selectedProfile=p; renderTxProfiles(); }
function renderTxUsers() {
  document.getElementById('tx-users').innerHTML = state.users.map(u =>
    `<div class="chip ${selectedUser===u?'selected':''}" onclick="selectUser('${u}')">${u}</div>`
  ).join('');
}
function selectUser(u) { selectedUser=u; renderTxUsers(); }
function toggleDeducible() { deducible=!deducible; document.getElementById('tx-deducible-toggle').classList.toggle('active',deducible); }

function saveTransaction() {
  const amount = parseFloat(currentAmountStr);
  if (!amount || amount<=0) { showToast('Ingresa un monto válido'); return; }
  if (currentTxType!=='transferencia' && !selectedCategory) { showToast('Selecciona una categoría'); return; }
  if (!selectedAccount) { showToast('Selecciona una cuenta'); return; }
  state.transactions.push({
    id: Date.now(), type: currentTxType, amount,
    currency: document.getElementById('tx-currency').value,
    category: selectedCategory||'Transferencia',
    account: selectedAccount, profile: selectedProfile,
    user: selectedUser, date: document.getElementById('tx-date').value,
    note: document.getElementById('tx-note').value.trim(),
    deducible, synced: false,
  });
  saveState();
  showScreen('screen-main');
  showToast('Guardado ✓');
}

// ===== TODOS LOS MOVIMIENTOS =====
function renderAllTransactions() {
  const sel = document.getElementById('filter-profile');
  sel.innerHTML = '<option value="all">Todos los perfiles</option>' +
    state.profiles.map(p => `<option value="${p}">${p}</option>`).join('');
  filterTransactions();
}
function filterTransactions() {
  const pv = document.getElementById('filter-profile').value;
  const tv = document.getElementById('filter-type').value;
  let txs = state.transactions.slice().reverse();
  if (pv!=='all') txs = txs.filter(t => t.profile===pv);
  if (tv!=='all') txs = txs.filter(t => t.type===tv);
  document.getElementById('all-transactions').innerHTML = txs.length ? txs.map(txHTML).join('') :
    '<div class="empty-state"><span class="empty-icon">🔍</span>Sin resultados</div>';
}

// ===== BÚSQUEDA =====
function searchTransactions() {
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  const el = document.getElementById('search-results');
  if (!q) { el.innerHTML=''; return; }
  const results = state.transactions.filter(tx =>
    (tx.category||'').toLowerCase().includes(q) ||
    (tx.note||'').toLowerCase().includes(q) ||
    (tx.account||'').toLowerCase().includes(q) ||
    (tx.profile||'').toLowerCase().includes(q) ||
    tx.amount?.toString().includes(q)
  ).slice().reverse();
  el.innerHTML = results.length ? results.map(txHTML).join('') :
    `<div class="empty-state"><span class="empty-icon">🔍</span>Sin resultados para "${q}"</div>`;
}

// ===== SETTINGS =====
function initSettings() {
  document.getElementById('settings-exchange').value = state.exchangeRate;
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  const idx = {light:0,dark:1,auto:2}[state.theme]||1;
  document.querySelectorAll('.theme-btn')[idx]?.classList.add('active');
}
function showChangePIN() {
  state.pin = null; setupPinEntry = ''; saveState();
  showToast('Configura tu nuevo PIN');
  showScreen('screen-setup');
  document.querySelectorAll('.setup-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-5').classList.add('active');
  currentStep = 5; state.configured = true;
}
function exportCSV() {
  const headers = ['Fecha','Tipo','Categoría','Monto','Moneda','Cuenta','Perfil','Usuario','Nota','Deducible'];
  const rows = state.transactions.map(tx => [tx.date,tx.type,tx.category,tx.amount,tx.currency,tx.account,tx.profile,tx.user,tx.note||'',tx.deducible?'Sí':'No']);
  const csv = [headers,...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='mis_finanzas.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV descargado ✓');
}
function clearAllData() {
  if (confirm('¿Borrar TODOS los datos? No se puede deshacer.')) { localStorage.clear(); location.reload(); }
}
function installShortcut() {
  showToast('Abre el menú ⋮ de Chrome y toca "Agregar a pantalla de inicio"');
}

// ===== TOAST =====
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2500);
}

// ===== SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
}

// Cerrar menú perfil al tocar fuera
document.addEventListener('click', e => {
  const menu = document.getElementById('profile-menu');
  const btn = document.getElementById('profile-selector-btn');
  if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && !btn.contains(e.target))
    menu.classList.add('hidden');
});
