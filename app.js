/* ===================================
   DASHKU — app.js
   Discord-style Personal Dashboard
   Data persists per user via localStorage
   =================================== */

// ===== STATE =====
let currentUser = null;
let currentFilter = 'all';

const DEFAULT_BUDGETS = {
  'Makanan & Minuman': 1500000,
  'Transportasi': 800000,
  'Hiburan': 500000,
  'Tagihan': 1200000,
  'Kesehatan': 500000,
  'Belanja': 700000,
  'Tabungan': 2000000,
};

const CAT_ICONS = {
  'Makanan & Minuman': { icon: '🍜', bg: 'rgba(35,165,90,0.15)' },
  'Transportasi':      { icon: '🚇', bg: 'rgba(88,101,242,0.15)' },
  'Hiburan':           { icon: '🎮', bg: 'rgba(235,69,158,0.15)' },
  'Tagihan':           { icon: '📄', bg: 'rgba(240,178,50,0.15)' },
  'Kesehatan':         { icon: '💊', bg: 'rgba(242,63,67,0.15)' },
  'Belanja':           { icon: '🛍️', bg: 'rgba(0,168,252,0.15)' },
  'Tabungan':          { icon: '🏦', bg: 'rgba(35,165,90,0.15)' },
  'Gaji':              { icon: '💼', bg: 'rgba(240,178,50,0.15)' },
  'Freelance':         { icon: '💻', bg: 'rgba(88,101,242,0.15)' },
  'Lainnya':           { icon: '📌', bg: 'rgba(80,80,88,0.2)' },
};

// ===== STORAGE =====
function getKey(k) { return `dashku_${currentUser}_${k}`; }
function load(k, fallback = null) {
  try {
    const v = localStorage.getItem(getKey(k));
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function save(k, v) { localStorage.setItem(getKey(k), JSON.stringify(v)); }

// ===== LOGIN =====
document.addEventListener('DOMContentLoaded', () => {
  const last = localStorage.getItem('dashku_last_user');
  if (last) {
    currentUser = last;
    const dn = localStorage.getItem(`dashku_${last}_display_name`) || last;
    document.getElementById('login-input').value = dn;
  }
  document.getElementById('login-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
});

function handleLogin() {
  const input = document.getElementById('login-input');
  const name = input.value.trim();
  if (!name) { input.focus(); shake(input); return; }
  currentUser = name.toLowerCase().replace(/\s+/g, '_');
  localStorage.setItem('dashku_last_user', currentUser);
  localStorage.setItem(`dashku_${currentUser}_display_name`, name);
  startApp(name);
}

function shake(el) {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shake 0.3s ease';
  setTimeout(() => el.style.animation = '', 300);
}

function logout() {
  currentUser = null;
  closeModal('modal-profile');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

function startApp(displayName) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  // greetings
  const h = new Date().getHours();
  const salam = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  document.getElementById('greeting-text').textContent = `${salam}, ${displayName}! 👋`;
  document.getElementById('date-text').textContent = formatDateLong(new Date());
  document.getElementById('topbar-date').textContent = formatDateLong(new Date());

  // user info
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
  document.getElementById('sidebar-avatar').textContent = initials;
  document.getElementById('sidebar-username').textContent = displayName;
  document.getElementById('sidebar-avatar').style.background = avatarColor(currentUser);

  // profile modal
  const bigAv = document.getElementById('profile-avatar-big');
  if (bigAv) { bigAv.textContent = initials; bigAv.style.background = avatarColor(currentUser); }
  const pn = document.getElementById('profile-name-big');
  if (pn) pn.textContent = displayName;

  document.getElementById('user-pill') && (document.getElementById('user-pill').textContent = displayName);

  // set today defaults
  const today = toDateStr(new Date());
  document.getElementById('tx-date').value = today;
  document.getElementById('task-date').value = today;

  populateMonthFilter();
  renderAll();
}

// ===== TABS =====
function switchTab(name, btn) {
  // tabs
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');

  // sidebar channel btns
  document.querySelectorAll('.channel-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
  });

  // guild icons
  document.querySelectorAll('.guild-icon').forEach((g, i) => {
    const tabs = ['overview', 'finance', 'tasks'];
    g.classList.toggle('active', tabs[i] === name);
  });

  // bottom nav
  document.querySelectorAll('.bnav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
  });

  // topbar title
  const titles = { overview: 'ringkasan', finance: 'keuangan', tasks: 'tugas' };
  document.getElementById('topbar-title').textContent = titles[name] || name;

  closeSidebar();

  if (name === 'finance') renderFinance();
  if (name === 'tasks') renderTasks();
  if (name === 'overview') renderOverview();
}

// ===== SIDEBAR MOBILE =====
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  sb.classList.toggle('open');
  ov.classList.toggle('hidden', !sb.classList.contains('open'));
}

function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  sb.classList.remove('open');
  ov.classList.add('hidden');
}

function openMobileProfile() {
  openModal('modal-profile');
}

// ===== RENDER ALL =====
function renderAll() {
  renderOverview();
  renderSidebarBudgetMini();
}

// ===== OVERVIEW =====
function renderOverview() {
  const txs = load('transactions', []);
  const tasks = load('tasks', []);
  const now = new Date();
  const thisMonth = monthKey(now);
  const today = toDateStr(now);

  const monthTx = txs.filter(t => t.date.startsWith(thisMonth));
  const income  = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const saldo   = txs.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0);
  const done    = tasks.filter(t => t.done).length;
  const total   = tasks.length;

  setText('ov-saldo',   formatRp(saldo));
  setText('ov-income',  formatRp(income));
  setText('ov-expense', formatRp(expense));
  setText('ov-tasks',   `${done}/${total}`);

  // recent 5 tx
  const recent = [...txs].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);
  const txEl = document.getElementById('ov-tx-list');
  txEl.innerHTML = recent.length
    ? recent.map(t => txHTML(t, false)).join('')
    : '<p class="empty">Belum ada transaksi.</p>';

  // today tasks
  const todayTasks = tasks.filter(t => t.date === today).slice(0, 5);
  const tkEl = document.getElementById('ov-task-list');
  tkEl.innerHTML = todayTasks.length
    ? todayTasks.map(t => taskHTML(t, false)).join('')
    : '<p class="empty">Tidak ada tugas hari ini.</p>';
}

// ===== SIDEBAR BUDGET MINI =====
function renderSidebarBudgetMini() {
  const txs = load('transactions', []);
  const budgets = load('budgets', DEFAULT_BUDGETS);
  const now = new Date();
  const thisMonth = monthKey(now);
  const monthExp = txs.filter(t => t.type === 'expense' && t.date.startsWith(thisMonth));
  const spent = {};
  monthExp.forEach(t => { spent[t.category] = (spent[t.category] || 0) + t.amount; });

  const cats = ['Makanan & Minuman', 'Transportasi', 'Hiburan', 'Tagihan', 'Tabungan'];
  const el = document.getElementById('sidebar-budget-mini');
  if (!el) return;
  el.innerHTML = cats.map(cat => {
    const s = spent[cat] || 0;
    const l = budgets[cat] || 1;
    const pct = Math.min(Math.round((s / l) * 100), 100);
    const cls = pct >= 100 ? 'bmi-over' : pct >= 80 ? 'bmi-warn' : 'bmi-ok';
    const shortCat = cat.replace('Makanan & Minuman', 'Makanan').replace('Transportasi', 'Transport');
    return `
      <div class="budget-mini-item">
        <div class="bmi-label"><span>${shortCat}</span><span>${pct}%</span></div>
        <div class="bmi-track"><div class="bmi-fill ${cls}" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}

// ===== FINANCE =====
function renderFinance() {
  renderBudgetBars();
  renderAllTx();
  renderSidebarBudgetMini();
}

function renderBudgetBars() {
  const txs = load('transactions', []);
  const budgets = load('budgets', DEFAULT_BUDGETS);
  const now = new Date();
  const thisMonth = monthKey(now);
  const monthExp = txs.filter(t => t.type === 'expense' && t.date.startsWith(thisMonth));
  const spent = {};
  monthExp.forEach(t => { spent[t.category] = (spent[t.category] || 0) + t.amount; });

  const cats = Object.keys(budgets).filter(k => !['Gaji','Freelance','Lainnya'].includes(k));
  document.getElementById('budget-bars').innerHTML = cats.map(cat => {
    const s = spent[cat] || 0;
    const l = budgets[cat];
    const pct = Math.min(Math.round((s / l) * 100), 100);
    const cls = pct >= 100 ? 'bar-over' : pct >= 80 ? 'bar-warn' : 'bar-ok';
    return `
      <div class="budget-row">
        <div class="budget-label-row">
          <span>${cat}</span><span>${formatRp(s)} / ${formatRp(l)}</span>
        </div>
        <div class="bar-track"><div class="bar-fill ${cls}" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}

function populateMonthFilter() {
  const txs = load('transactions', []);
  const now = new Date();
  const tm = monthKey(now);
  const months = [...new Set([tm, ...txs.map(t => t.date.substring(0,7))])].sort().reverse();
  const sel = document.getElementById('filter-month');
  sel.innerHTML = months.map(m => `<option value="${m}">${formatMonthShort(m)}</option>`).join('');
  sel.value = tm;
}

function renderAllTx() {
  const txs = load('transactions', []);
  const sel = document.getElementById('filter-month').value;
  const filtered = txs.filter(t => t.date.startsWith(sel)).sort((a,b) => b.date.localeCompare(a.date));
  document.getElementById('all-tx-list').innerHTML = filtered.length
    ? filtered.map(t => txHTML(t, true)).join('')
    : '<p class="empty">Tidak ada transaksi bulan ini.</p>';
}

function txHTML(t, showDel) {
  const ci = CAT_ICONS[t.category] || CAT_ICONS['Lainnya'];
  const del = showDel ? `<button class="tx-delete" onclick="deleteTx('${t.id}',event)">✕</button>` : '';
  return `
    <div class="tx-item" id="tx-${t.id}">
      <div class="tx-icon" style="background:${ci.bg}">${ci.icon}</div>
      <div class="tx-info">
        <div class="tx-name">${esc(t.name)}</div>
        <div class="tx-meta">${t.category} · ${formatDateShort(t.date)}</div>
      </div>
      <div class="tx-amount ${t.type}">${t.type==='income'?'+':'-'}${formatRp(t.amount)}</div>
      ${del}
    </div>`;
}

function saveTx() {
  const name   = document.getElementById('tx-name').value.trim();
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const cat    = document.getElementById('tx-cat').value;
  const date   = document.getElementById('tx-date').value;
  const type   = document.querySelector('input[name="tx-type"]:checked').value;
  if (!name || !amount || !date) { alert('Lengkapi semua field!'); return; }

  const txs = load('transactions', []);
  txs.push({ id: uid(), name, amount, category: cat, date, type, createdAt: Date.now() });
  save('transactions', txs);
  closeModal('modal-tx');
  document.getElementById('tx-name').value = '';
  document.getElementById('tx-amount').value = '';
  populateMonthFilter();
  renderAll();
  renderFinance();
}

function deleteTx(id, e) {
  e.stopPropagation();
  if (!confirm('Hapus transaksi ini?')) return;
  save('transactions', load('transactions',[]).filter(t => t.id !== id));
  renderAll();
  renderFinance();
  populateMonthFilter();
}

// ===== BUDGET MODAL =====
function openBudgetModal() {
  const budgets = load('budgets', DEFAULT_BUDGETS);
  document.getElementById('budget-form').innerHTML =
    Object.keys(DEFAULT_BUDGETS).map(cat => `
      <div class="budget-input-row">
        <span class="budget-input-label">${cat}</span>
        <input type="number" id="bgt-${css(cat)}" value="${budgets[cat]||0}" min="0" class="form-group input" style="width:130px;padding:6px 10px;font-size:13px;"/>
      </div>`).join('');
}

function saveBudget() {
  const b = {};
  Object.keys(DEFAULT_BUDGETS).forEach(cat => {
    b[cat] = parseFloat(document.getElementById(`bgt-${css(cat)}`).value) || 0;
  });
  save('budgets', b);
  closeModal('modal-budget');
  renderFinance();
}

// ===== TASKS =====
function renderTasks() {
  filterTasks(currentFilter, document.querySelector(`.pill[data-filter="${currentFilter}"]`));
}

function filterTasks(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const tasks = load('tasks', []);
  const today = toDateStr(new Date());
  let filtered;

  switch (filter) {
    case 'today':    filtered = tasks.filter(t => t.date === today && !t.done); break;
    case 'upcoming': filtered = tasks.filter(t => t.date > today && !t.done); break;
    case 'done':     filtered = tasks.filter(t => t.done); break;
    default:         filtered = [...tasks];
  }

  filtered.sort((a,b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.date.localeCompare(b.date);
  });

  const el = document.getElementById('task-list-main');
  if (!filtered.length) { el.innerHTML = '<p class="empty">Tidak ada tugas di sini.</p>'; return; }

  // group by date
  const groups = {};
  filtered.forEach(t => { (groups[t.date] = groups[t.date]||[]).push(t); });

  el.innerHTML = Object.keys(groups).sort().map(date =>
    `<div class="section-date">${dateLabel(date)}</div>` +
    groups[date].map(t => taskHTML(t, true)).join('')
  ).join('');
}

function taskHTML(t, showDel) {
  const tagCls = `tag-${t.category}`;
  const prioCls = `priority-${t.priority||'normal'}`;
  const del = showDel ? `<button class="task-delete" onclick="deleteTask('${t.id}',event)">✕</button>` : '';
  return `
    <div class="task-item ${t.done?'done':''}" id="task-${t.id}" onclick="toggleTask('${t.id}',event)">
      <div class="task-check"><div class="check-mark"></div></div>
      <div class="task-body">
        <div class="task-text">${esc(t.name)}</div>
        <div class="task-meta">
          <span class="priority-dot ${prioCls}"></span>
          <span>${formatDateShort(t.date)}</span>
        </div>
      </div>
      <span class="task-tag ${tagCls}">${t.category}</span>
      ${del}
    </div>`;
}

function toggleTask(id, e) {
  if (e.target.classList.contains('task-delete')) return;
  const tasks = load('tasks', []);
  const t = tasks.find(x => x.id === id);
  if (t) t.done = !t.done;
  save('tasks', tasks);
  renderOverview();
  renderTasks();
}

function saveTask() {
  const name     = document.getElementById('task-name').value.trim();
  const date     = document.getElementById('task-date').value;
  const cat      = document.getElementById('task-cat').value;
  const priority = document.getElementById('task-priority').value;
  if (!name || !date) { alert('Lengkapi nama dan tanggal!'); return; }

  const tasks = load('tasks', []);
  tasks.push({ id: uid(), name, date, category: cat, priority, done: false, createdAt: Date.now() });
  save('tasks', tasks);
  closeModal('modal-task');
  document.getElementById('task-name').value = '';
  renderOverview();
  renderTasks();
}

function deleteTask(id, e) {
  e.stopPropagation();
  if (!confirm('Hapus tugas ini?')) return;
  save('tasks', load('tasks',[]).filter(t => t.id !== id));
  renderOverview();
  renderTasks();
}

// ===== MODALS =====
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  if (id === 'modal-budget') openBudgetModal();
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function closeModalOutside(e, id) { if (e.target.id === id) closeModal(id); }
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') ['modal-tx','modal-budget','modal-task','modal-profile'].forEach(closeModal);
});

// ===== UTILS =====
function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2,6); }
function setText(id, v) { const el = document.getElementById(id); if(el) el.textContent = v; }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function css(s) { return s.replace(/\s+/g,'_').replace(/&/g,'and'); }

function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function toDateStr(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

function formatDateLong(d) { return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; }
function formatDateShort(s) { const [y,m,dd] = s.split('-').map(Number); return `${dd} ${BULAN[m-1].substr(0,3)} ${y}`; }
function formatMonthShort(ym) { const [y,m] = ym.split('-').map(Number); return `${BULAN[m-1].substr(0,3)} ${y}`; }

function dateLabel(s) {
  const today    = toDateStr(new Date());
  const tomorrow = toDateStr(new Date(Date.now()+86400000));
  if (s === today)    return '— Hari ini';
  if (s === tomorrow) return '— Besok';
  return '— ' + formatDateShort(s);
}

function formatRp(n) {
  n = Math.round(n);
  if (n >= 1000000) return 'Rp ' + (n/1000000).toFixed(n%1000000===0?0:1) + 'jt';
  if (n >= 1000)    return 'Rp ' + Math.round(n/1000) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

// deterministic avatar color from username
function avatarColor(username) {
  const colors = ['#5865F2','#23A55A','#EB459E','#F0B232','#00A8FC','#ED4245'];
  let h = 0;
  for (let c of username) h = (h * 31 + c.charCodeAt(0)) % colors.length;
  return colors[Math.abs(h)];
}