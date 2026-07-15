// ===== ESTADO GLOBAL =====
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
  currentPeriod: 'month',
};

// ===== COLORES CATEGORÍAS =====
const CAT_COLORS = [
  '#6c63ff','#f87171','#4ade80','#60a5fa','#fbbf24',
  '#f472b6','#34d399','#a78bfa','#fb923c','#38bdf8',
  '#e879f9','#4ade80','#f87171','#818cf8','#94a3b8'
];

// ===== STORAGE =====
function saveState() {
  localStorage.setItem('finanzas_state', JSON.stringify(state));
}
function loadState() {
  const saved = localStorage.getItem('finanzas_state');
  if (saved) {
    try { state = { ...state, ...JSON.parse(saved) }; } catch(e) {}
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  applyTheme(state.theme);

  if (!state.configured) {
    initSetup();
    showScreen('screen-setup');
  } else if (state.pin) {
    showScreen('screen-pin');
    initPinScreen();
  } else {
    showScreen('screen-main');
    initMain();
  }
});

// ===== SCREENS =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'screen-main') { initMain(); }
  if (id === 'screen-transactions') { renderAllTransactions(); }
  if (id === 'screen-search') { document.getElementById('search-input').focus(); }
  if (id === 'screen-settings') { initSettings(); }
}

// ===== THEME =====
function applyTheme(theme) {
  const body = document.body;
  body.classList.remove('theme-dark','theme-light');
  if (theme === 'auto') {
    body.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light');
  } else {
    body.classList.add('theme-' + theme);
  }
}
function setTheme(theme) {
  state.theme = theme;
  applyTheme(theme);
  saveState();
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}

// ===== PIN SCREEN =====
let pinInput = '';
function initPinScreen() {
  pinInput = '';
  updatePinDots('pin-dots', 0);
  document.getElementById('pin-error').textContent = '';
  document.querySelectorAll('.numpad .num-btn').forEach(btn => {
    const num = btn.dataset.num;
    if (num !== undefined) btn.onclick = () => enterPin(num);
  });
  document.getElementById('pin-delete').onclick = () => {
    pinInput = pinInput.slice(0, -1);
    updatePinDots('pin-dots', pinInput.length);
  };
  document.getElementById('skip-pin-btn').onclick = () => {
    showScreen('screen-main');
    initMain();
  };
}
function enterPin(num) {
  if (pinInput.length >= 4) return;
  pinInput += num;
  updatePinDots('pin-dots', pinInput.length);
  if (pinInput.length === 4) {
    setTimeout(() => {
      if (pinInput === state.pin) {
        showScreen('screen-main');
        initMain();
      } else {
        document.getElementById('pin-error').textContent = 'PIN incorrecto';
        pinInput = '';
        updatePinDots('pin-dots', 0);
      }
    }, 200);
  }
}
function updatePinDots(id, count) {
  const dots = document.getElementById(id).querySelectorAll('.dot');
  dots.forEach((d, i) => d.classList.toggle('filled', i < count));
}

// ===== SETUP =====
let currentStep = 1;
let setupPin = '';
let currentCatTab = 'gastos';

function initSetup() {
  renderSetupAccounts();
  renderSetupCategories();
  document.getElementById('user1-name').value = state.users[0] || '';
}

function nextStep(step) {
  // Validar y guardar paso actual
  if (currentStep === 1) {
    const u1 = document.getElementById('user1-name').value.trim();
    if (!u1) { showToast('Ingresa al menos tu nombre'); return; }
    state.users[0] = u1;
    const u2 = document.getElementById('user2-name').value.trim();
    if (u2) state.users[1] = u2; else state.users = state.users.slice(0,1);
  }
  document.getElementById('step-' + currentStep).classList.remove('active');
  currentStep = step;
  document.getElementById('step-' + step).classList.add('active');
}

function addProfile() {
  const name = document.getElementById('new-profile-name').value.trim();
  if (!name) return;
  if (state.profiles.includes(name)) { showToast('Ya existe ese perfil'); return; }
  state.profiles.push(name);
  document.getElementById('new-profile-name').value = '';
  renderProfileList();
}
function renderProfileList() {
  const list = document.getElementById('profile-list');
  list.innerHTML = `<div class="profile-item fixed"><span class="profile-icon">👤</span><span>Personal</span><span class="fixed-badge">Fijo</span></div>`;
  state.profiles.slice(1).forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'profile-item';
    div.innerHTML = `<span class="profile-icon">💼</span><span>${p}</span><button class="remove-profile-btn" onclick="removeProfile(${i+1})">✕</button>`;
    list.appendChild(div);
  });
}
function removeProfile(i) {
  state.profiles.splice(i, 1);
  renderProfileList();
}

function renderSetupAccounts() {
  const list = document.getElementById('accounts-list');
  list.innerHTML = '';
  state.accounts.forEach((a, i) => {
    const div = document.createElement('div');
    div.className = 'account-item';
    div.innerHTML = `<span>🏦</span><span contenteditable="true" onblur="updateAccountName(${i}, this.textContent)">${a.name}</span><span class="account-currency-badge">${a.currency}</span><button class="remove-profile-btn" onclick="removeAccount(${i})">✕</button>`;
    list.appendChild(div);
  });
}
function addAccount() {
  const name = document.getElementById('new-account-name').value.trim();
  const currency = document.getElementById('new-account-currency').value;
  if (!name) return;
  state.accounts.push({ name, currency });
  document.getElementById('new-account-name').value = '';
  renderSetupAccounts();
}
function removeAccount(i) {
  state.accounts.splice(i, 1);
  renderSetupAccounts();
}
function updateAccountName(i, name) {
  state.accounts[i].name = name.trim();
}

function renderSetupCategories() {
  renderCatList('gastos');
  renderCatList('ingresos');
}
function renderCatList(type) {
  const cats = type === 'gastos' ? state.categoriesGasto : state.categoriesIngreso;
  const list = document.getElementById('cat-' + type);
  list.innerHTML = '';
  cats.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'cat-item';
    div.innerHTML = `<span class="cat-emoji">${c.emoji}</span><span contenteditable="true" onblur="updateCatName('${type}',${i},this.textContent)">${c.name}</span><button class="remove-profile-btn" onclick="removeCat('${type}',${i})">✕</button>`;
    list.appendChild(div);
  });
}
function addCategory() {
  const name = document.getElementById('new-cat-name').value.trim();
  if (!name) return;
  const cat = { emoji: '📌', name };
  if (currentCatTab === 'gastos') state.categoriesGasto.push(cat);
  else state.categoriesIngreso.push(cat);
  document.getElementById('new-cat-name').value = '';
  renderCatList(currentCatTab);
}
function removeCat(type, i) {
  if (type === 'gastos') state.categoriesGasto.splice(i, 1);
  else state.categoriesIngreso.splice(i, 1);
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

// PIN SETUP
let setupPinEntry = '';
function setupPinInput(num) {
  if (setupPinEntry.length >= 4) return;
  setupPinEntry += num;
  updatePinDots('setup-pin-dots', setupPinEntry.length);
  if (setupPinEntry.length === 4) {
    state.pin = setupPinEntry;
    finishSetup();
  }
}
function setupPinDelete() {
  setupPinEntry = setupPinEntry.slice(0, -1);
  updatePinDots('setup-pin-dots', setupPinEntry.length);
}
function finishSetup() {
  state.configured = true;
  state.currentProfile = 'Todo';
  saveState();
  showScreen('screen-main');
  initMain();
  showToast('¡App configurada! 🎉');
}

// ===== MAIN SCREEN =====
function initMain() {
  renderProfileMenu();
  updateProfileDisplay();
  renderExchangeRate();
  renderBalance();
  renderDonut();
  renderRecentTransactions();
}

function renderProfileMenu() {
  const menu = document.getElementById('profile-menu');
  const allProfiles = ['Todo', ...state.profiles];
  menu.innerHTML = allProfiles.map(p => {
    const icon = p === 'Todo' ? '🌐' : p === 'Personal' ? '👤' : '💼';
    return `<button class="profile-menu-item ${state.currentProfile === p ? 'active' : ''}" onclick="selectProfile('${p}')">${icon} ${p}</button>`;
  }).join('');
}
function toggleProfileMenu() {
  document.getElementById('profile-menu').classList.toggle('hidden');
}
function selectProfile(profile) {
  state.currentProfile = profile;
  document.getElementById('profile-menu').classList.add('hidden');
  updateProfileDisplay();
  renderBalance();
  renderDonut();
  renderRecentTransactions();
  saveState();
}
function updateProfileDisplay() {
  const p = state.currentProfile;
  document.getElementById('current-profile-icon').textContent = p === 'Todo' ? '🌐' : p === 'Personal' ? '👤' : '💼';
  document.getElementById('current-profile-name').textContent = p;
  renderProfileMenu();
}

function renderExchangeRate() {
  document.getElementById('exchange-rate-display').textContent = state.exchangeRate.toFixed(2);
  const input = document.getElementById('settings-exchange');
  if (input) input.value = state.exchangeRate;
}
function editExchangeRate() {
  document.getElementById('modal-exchange-input').value = state.exchangeRate;
  document.getElementById('modal-exchange').classList.remove('hidden');
}
function saveExchangeRateModal() {
  const val = parseFloat(document.getElementById('modal-exchange-input').value);
  if (val > 0) { state.exchangeRate = val; saveState(); renderExchangeRate(); }
  closeModal('modal-exchange');
}
function saveExchangeRate() {
  const val = parseFloat(document.getElementById('settings-exchange').value);
  if (val > 0) { state.exchangeRate = val; saveState(); renderExchangeRate(); showToast('Tipo de cambio guardado'); }
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function setPeriod(period, btn) {
  state.currentPeriod = period;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderBalance();
  renderDonut();
  renderRecentTransactions();
}

function getFilteredTx() {
  const now = new Date();
  return state.transactions.filter(tx => {
    const txDate = new Date(tx.date);
    // Filtro período
    let inPeriod = true;
    if (state.currentPeriod === 'today') {
      inPeriod = txDate.toDateString() === now.toDateString();
    } else if (state.currentPeriod === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      inPeriod = txDate >= weekAgo;
    } else if (state.currentPeriod === 'month') {
      inPeriod = txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    // Filtro perfil
    let inProfile = state.currentProfile === 'Todo' || tx.profile === state.currentProfile;
    return inPeriod && inProfile;
  });
}

function toMXN(amount, currency) {
  return currency === 'USD' ? amount * state.exchangeRate : amount;
}
function formatMXN(amount) {
  return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

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
  const diffEl = document.getElementById('total-diff');
  diffEl.textContent = formatMXN(diff);
  diffEl.style.color = diff >= 0 ? 'var(--income)' : 'var(--expense)';
}

function setDonutMode(mode, btn) {
  donutMode = mode;
  document.querySelectorAll('.donut-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDonut();
}

function renderDonut() {
  const txs = getFilteredTx();
  const canvas = document.getElementById('donut-chart');
  const ctx = canvas.getContext('2d');
  const size = 180; const cx = size/2; const cy = size/2;
const outer = 80; const inner = 45;
  ctx.clearRect(0, 0, size, size);

  let entries = [];
  let total = 0;
  let label = 'Balance';

  if (donutMode === 'balance') {
    const ingresos = txs.filter(t => t.type === 'ingreso').reduce((s,t) => s + toMXN(t.amount, t.currency), 0);
    const gastos = txs.filter(t => t.type === 'gasto').reduce((s,t) => s + toMXN(t.amount, t.currency), 0);
    entries = [['Ingresos', ingresos, '#4ade80'], ['Gastos', gastos, '#f87171']];
    total = ingresos + gastos;
    label = 'Balance';
    document.getElementById('donut-total').textContent = formatMXN(ingresos - gastos);
  } else {
    const tipo = donutMode === 'gastos' ? 'gasto' : 'ingreso';
    const catMap = {};
    txs.filter(t => t.type === tipo).forEach(tx => {
      const key = tx.category || 'Otros';
      catMap[key] = (catMap[key] || 0) + toMXN(tx.amount, tx.currency);
    });
    const sorted = Object.entries(catMap).sort((a,b) => b[1]-a[1]);
    entries = sorted.map(([cat, val], i) => [cat, val, CAT_COLORS[i % CAT_COLORS.length]]);
    total = sorted.reduce((s,[,v]) => s+v, 0);
    label = donutMode === 'gastos' ? 'Gastos' : 'Ingresos';
    document.getElementById('donut-total').textContent = formatMXN(total);
  }

  document.getElementById('donut-label').textContent = label;

  if (total === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI*2);
    ctx.arc(cx, cy, inner, 0, Math.PI*2, true);
    ctx.fillStyle = '#2a2a4a';
    ctx.fill();
    document.getElementById('cat-legend').innerHTML = '';
    return;
  }

  let startAngle = -Math.PI / 2;
  const legend = [];
  entries.forEach(([cat, val, color]) => {
    if (val <= 0) return;
    const slice = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, outer, startAngle, startAngle + slice);
    ctx.arc(cx, cy, inner, startAngle + slice, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, outer+1, startAngle, startAngle + slice);
    ctx.arc(cx, cy, inner-1, startAngle + slice, startAngle, true);
    ctx.strokeStyle = '#0f0f1a';
    ctx.lineWidth = 2;
    ctx.stroke();
    startAngle += slice;
    legend.push({ cat, val, color, pct: Math.round(val/total*100) });
  });

  document.getElementById('cat-legend').innerHTML = legend.map(l =>
    `<div class="legend-item"><div class="legend-dot" style="background:${l.color}"></div><span>${l.cat} ${l.pct}%</span></div>`
  ).join('');
}

function renderRecentTransactions() {
  const txs = getFilteredTx().slice().reverse().slice(0, 8);
  const el = document.getElementById('recent-transactions');
  el.innerHTML = txs.length ? txs.map(txHTML).join('') :
    `<div class="empty-state"><span class="empty-icon">💸</span>Sin movimientos en este período.<br>Toca + Gasto o + Ingreso para empezar.</div>`;
}

function txHTML(tx) {
  const cats = tx.type === 'ingreso' ? state.categoriesIngreso : state.categoriesGasto;
  const cat = cats.find(c => c.name === tx.category) || { emoji: '💸', name: tx.category };
  const sign = tx.type === 'gasto' ? '−' : tx.type === 'ingreso' ? '+' : '⇄';
  const dateStr = new Date(tx.date).toLocaleDateString('es-MX', { day:'2-digit', month:'short' });
  return `<div class="tx-item">
    <div class="tx-emoji">${cat.emoji}</div>
    <div class="tx-info">
      <div class="tx-cat">${cat.name}</div>
      <div class="tx-meta">${dateStr} · ${tx.profile}${tx.note ? ' · ' + tx.note : ''}</div>
      ${tx.deducible ? '<div class="tx-deducible">⭐ Deducible</div>' : ''}
    </div>
    <div class="tx-right">
      <div class="tx-amount ${tx.type}">${sign}${tx.currency === 'USD' ? 'USD ' : '$'}${tx.amount.toFixed(2)}</div>
      <div class="tx-account">${tx.account}</div>
    </div>
  </div>`;
}

// ===== TRANSACTION FORM =====
let donutMode = 'balance';
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
  selectedProfile = state.currentProfile === 'Todo' ? state.profiles[0] : state.currentProfile;
  selectedUser = state.users[0];
  deducible = false;

  document.getElementById('transaction-title').textContent =
    type === 'gasto' ? 'Nuevo Gasto' : type === 'ingreso' ? 'Nuevo Ingreso' : 'Transferencia';
  document.getElementById('tx-amount-display').textContent = '0';
  document.getElementById('tx-currency').value = 'MXN';
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('tx-note').value = '';
  document.getElementById('tx-deducible-toggle').classList.remove('active');

  renderTxCategories();
  renderTxAccounts();
  renderTxProfiles();
  renderTxUsers();
  showScreen('screen-transaction');
}

function amountInput(char) {
  if (char === '.' && currentAmountStr.includes('.')) return;
  if (currentAmountStr === '0' && char !== '.') currentAmountStr = char;
  else if (currentAmountStr.length < 10) currentAmountStr += char;
  document.getElementById('tx-amount-display').textContent = currentAmountStr;
}
function amountDelete() {
  currentAmountStr = currentAmountStr.slice(0, -1) || '0';
  document.getElementById('tx-amount-display').textContent = currentAmountStr;
}
function updateCurrencySymbol() {
  const cur = document.getElementById('tx-currency').value;
  document.getElementById('tx-currency-symbol').textContent = cur === 'USD' ? 'US$' : '$';
}

function renderTxCategories() {
  const cats = currentTxType === 'ingreso' ? state.categoriesIngreso : state.categoriesGasto;
  const grid = document.getElementById('tx-categories');
  if (currentTxType === 'transferencia') {
    grid.innerHTML = '<p style="color:var(--text2);font-size:14px;">Transferencia entre cuentas</p>';
    return;
  }
  grid.innerHTML = cats.map(c =>
    `<div class="cat-chip ${selectedCategory === c.name ? 'selected' : ''}" onclick="selectCat('${c.name}')">
      <span class="chip-emoji">${c.emoji}</span><span>${c.name}</span>
    </div>`
  ).join('');
}
function selectCat(name) {
  selectedCategory = name;
  renderTxCategories();
}

function renderTxAccounts() {
  const chips = document.getElementById('tx-accounts');
  chips.innerHTML = state.accounts.map(a =>
    `<div class="chip ${selectedAccount === a.name ? 'selected' : ''}" onclick="selectAccount('${a.name}')">${a.name} <small>${a.currency}</small></div>`
  ).join('');
}
function selectAccount(name) {
  selectedAccount = name;
  renderTxAccounts();
}

function renderTxProfiles() {
  const chips = document.getElementById('tx-profiles');
  chips.innerHTML = state.profiles.map(p =>
    `<div class="chip ${selectedProfile === p ? 'selected' : ''}" onclick="selectTxProfile('${p}')">${p}</div>`
  ).join('');
}
function selectTxProfile(p) {
  selectedProfile = p;
  renderTxProfiles();
}

function renderTxUsers() {
  const chips = document.getElementById('tx-users');
  chips.innerHTML = state.users.map(u =>
    `<div class="chip ${selectedUser === u ? 'selected' : ''}" onclick="selectUser('${u}')">${u}</div>`
  ).join('');
}
function selectUser(u) {
  selectedUser = u;
  renderTxUsers();
}

function toggleDeducible() {
  deducible = !deducible;
  document.getElementById('tx-deducible-toggle').classList.toggle('active', deducible);
}

function saveTransaction() {
  const amount = parseFloat(currentAmountStr);
  if (!amount || amount <= 0) { showToast('Ingresa un monto válido'); return; }
  if (currentTxType !== 'transferencia' && !selectedCategory) { showToast('Selecciona una categoría'); return; }
  if (!selectedAccount) { showToast('Selecciona una cuenta'); return; }

  const tx = {
    id: Date.now(),
    type: currentTxType,
    amount,
    currency: document.getElementById('tx-currency').value,
    category: selectedCategory || 'Transferencia',
    account: selectedAccount,
    profile: selectedProfile,
    user: selectedUser,
    date: document.getElementById('tx-date').value,
    note: document.getElementById('tx-note').value.trim(),
    deducible,
    synced: false,
  };

  state.transactions.push(tx);
  saveState();
  showScreen('screen-main');
  showToast('Guardado ✓');
}

// ===== TODOS LOS MOVIMIENTOS =====
function renderAllTransactions() {
  // Llenar filtro perfiles
  const sel = document.getElementById('filter-profile');
  sel.innerHTML = `<option value="all">Todos los perfiles</option>` +
    state.profiles.map(p => `<option value="${p}">${p}</option>`).join('');
  filterTransactions();
}
function filterTransactions() {
  const profileVal = document.getElementById('filter-profile').value;
  const typeVal = document.getElementById('filter-type').value;
  let txs = state.transactions.slice().reverse();
  if (profileVal !== 'all') txs = txs.filter(tx => tx.profile === profileVal);
  if (typeVal !== 'all') txs = txs.filter(tx => tx.type === typeVal);
  const el = document.getElementById('all-transactions');
  el.innerHTML = txs.length ? txs.map(txHTML).join('') :
    `<div class="empty-state"><span class="empty-icon">🔍</span>Sin resultados</div>`;
}

// ===== BÚSQUEDA =====
function searchTransactions() {
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  const el = document.getElementById('search-results');
  if (!q) { el.innerHTML = ''; return; }
  const results = state.transactions.filter(tx =>
    tx.category?.toLowerCase().includes(q) ||
    tx.note?.toLowerCase().includes(q) ||
    tx.account?.toLowerCase().includes(q) ||
    tx.profile?.toLowerCase().includes(q) ||
    tx.amount?.toString().includes(q)
  ).slice().reverse();
  el.innerHTML = results.length ? results.map(txHTML).join('') :
    `<div class="empty-state"><span class="empty-icon">🔍</span>Sin resultados para "${q}"</div>`;
}

// ===== SETTINGS =====
function initSettings() {
  document.getElementById('settings-exchange').value = state.exchangeRate;
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  const themeMap = { light: 0, dark: 1, auto: 2 };
  document.querySelectorAll('.theme-btn')[themeMap[state.theme] || 1]?.classList.add('active');
}
function showChangePIN() {
  state.pin = null;
  setupPinEntry = '';
  saveState();
  showToast('Configura tu nuevo PIN');
  // Ir a setup paso 5
  showScreen('screen-setup');
  document.querySelectorAll('.setup-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-5').classList.add('active');
  currentStep = 5;
  state.configured = true;
}
function exportCSV() {
  const headers = ['Fecha','Tipo','Categoría','Monto','Moneda','Cuenta','Perfil','Usuario','Nota','Deducible'];
  const rows = state.transactions.map(tx => [
    tx.date, tx.type, tx.category, tx.amount, tx.currency,
    tx.account, tx.profile, tx.user, tx.note || '', tx.deducible ? 'Sí' : 'No'
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'mis_finanzas.csv';
  a.click(); URL.revokeObjectURL(url);
  showToast('CSV descargado ✓');
}
function clearAllData() {
  if (confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')) {
    localStorage.clear();
    location.reload();
  }
}

// ===== TOAST =====
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2500);
}

// ===== SERVICE WORKER (PWA OFFLINE) =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// Cerrar menú perfil al tocar fuera
document.addEventListener('click', e => {
  const menu = document.getElementById('profile-menu');
  const btn = document.getElementById('profile-selector-btn');
  if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && !btn.contains(e.target)) {
    menu.classList.add('hidden');
  }
});
