/* ===================================
   PERSONAL DASHBOARD — app.js
   Data tersimpan per user di localStorage
   =================================== */

// ===== STATE =====
let currentUser = null;

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
  'Makanan & Minuman': { icon: '🍜', bg: '#E1F5EE' },
  'Transportasi':      { icon: '🚇', bg: '#E8F0FB' },
  'Hiburan':           { icon: '🎮', bg: '#F2EEFF' },
  'Tagihan':           { icon: '📄', bg: '#FDF3E3' },
  'Kesehatan':         { icon: '💊', bg: '#FAECE7' },
  'Belanja':           { icon: '🛍️', bg: '#FDF0E8' },
  'Tabungan':          { icon: '🏦', bg: '#E1F5EE' },
  'Gaji':              { icon: '💼', bg: '#FDF3E3' },
  'Freelance':         { icon: '💻', bg: '#E8F0FB' },
  'Lainnya':           { icon: '📌', bg: '#F0EDE7' },
};

const TAG_CLASS = {
  'Kerja':     'tag-kerja',
  'Kesehatan': 'tag-kesehatan',
  'Personal':  'tag-personal',
  'Keuangan':  'tag-keuangan',
  'Belajar':   'tag-belajar',
  'Lainnya':   'tag-lainnya',
};

// ===== STORAGE HELPERS =====
function getKey(key) { return `dashku_${currentUser}_${key}`; }

function load(key, fallback = null) {
  try {
    const val = localStorage.getItem(getKey(key));
    return val !== null ? JSON.parse(val) : fallback;
  } catch { return fallback; }
}

function save(key, val) {
  localStorage.setItem(getKey(key), JSON.stringify(val));
}

// ===== LOGIN =====
function handleLogin() {
  const input = document.getElementById('login-input');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  currentUser = name.toLowerCase().replace(/\s+/g, '_');
  localStorage.setItem('dashku_last_user', currentUser);
  localStorage.setItem(`dashku_${currentUser}_display_name`, name);
  startApp(name);
}

document.getElementById('login-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});

function logout() {
  currentUser = null;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-input').value = '';
}

function startApp(displayName) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  // greeting
  const hour = new Date().getHours();
  const salam = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  document.getElementById('greeting-text').textContent = `${salam}, ${displayName}!`;
  document.getElementById('date-text').textContent = formatDateLong(new Date());

  // user pill
  document.getElementById('user-pill').textContent = `👤 ${displayName}`;

  // set today default on modals
  const today = toDateStr(new Date());
  document.getElementById('tx-date').value = today;
  document.getElementById('task-date').value = today;

  renderAll();
  populateMonthFilter();
}

// ===== AUTO-LOGIN if last user exists =====
window.addEventListener('DOMContentLoaded', () => {
  const last = localStorage.getItem('dashku_last_user');
  if (last) {
    currentUser = last;
    const displayName = localStorage.getItem(`dashku_${currentUser}_display_name`) || last;
    document.getElementById('login-input').value = displayName;
  }
});

// ===== TABS =====
function switchTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  if (btn) btn.classList.add('active');
  if (name === 'finance') renderFinance();
  if (name === 'tasks') renderTasks();
  if (name === 'overview') renderOverview();
}

// ===== RENDER ALL =====
function renderAll() {
  renderOverview();
  renderFinance();
  renderTasks();
}

// ===== OVERVIEW =====
function renderOverview() {
  const txs = load('transactions', []);
  const tasks = load('tasks', []);
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const today = toDateStr(now);

  const monthTx = txs.filter(t => t.date.startsWith(thisMonth));
  const income = monthTx.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0);
  const saldo = txs.reduce((s,t) => t.type === 'income' ? s+t.amount : s-t.amount, 0);

  const doneTasks = tasks.filter(t => t.done).length;
  const totalTasks = tasks.length;

  document.getElementById('ov-saldo').textContent = formatRp(saldo);
  document.getElementById('ov-saldo-note').textContent = 'Total semua waktu';
  document.getElementById('ov-income').textContent = formatRp(income);
  document.getElementById('ov-income-note').textContent = formatMonthName(now);
  document.getElementById('ov-expense').textContent = formatRp(expense);
  const pct = income > 0 ? Math.round((expense / income) * 100) : 0;
  document.getElementById('ov-expense-note').textContent = `${pct}% dari pemasukan`;
  document.getElementById('ov-tasks').textContent = `${doneTasks} / ${totalTasks}`;
  document.getElementById('ov-tasks-note').textContent = totalTasks > 0 ? `${Math.round((doneTasks/totalTasks)*100)}% selesai` : '—';

  // recent 5 tx
  const recent = [...txs].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);
  const txEl = document.getElementById('ov-tx-list');
  txEl.innerHTML = recent.length ? recent.map(t => txItemHTML(t, false)).join('') : '<p class="empty-msg">Belum ada transaksi.</p>';

  // today tasks
  const todayTasks = tasks.filter(t => t.date === today).slice(0, 5);
  const taskEl = document.getElementById('ov-task-list');
  taskEl.innerHTML = todayTasks.length ? todayTasks.map(t => taskItemHTML(t, true)).join('') : '<p class="empty-msg">Tidak ada tugas hari ini.</p>';
}

// ===== FINANCE =====
function renderFinance() {
  renderBudgetBars();
  renderAllTx();
}

function renderBudgetBars() {
  const txs = load('transactions', []);
  const budgets = load('budgets', DEFAULT_BUDGETS);
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthExpenses = txs.filter(t => t.type === 'expense' && t.date.startsWith(thisMonth));

  const spentByCat = {};
  monthExpenses.forEach(t => {
    spentByCat[t.category] = (spentByCat[t.category] || 0) + t.amount;
  });

  const budgetCats = Object.keys(budgets).filter(k => k !== 'Gaji' && k !== 'Freelance' && k !== 'Lainnya');
  const el = document.getElementById('budget-bars');
  el.innerHTML = budgetCats.map(cat => {
    const spent = spentByCat[cat] || 0;
    const limit = budgets[cat];
    const pct = Math.min(Math.round((spent / limit) * 100), 100);
    const cls = pct >= 100 ? 'bar-over' : pct >= 80 ? 'bar-warn' : 'bar-ok';
    return `
      <div class="budget-row">
        <div class="budget-label-row">
          <span>${cat}</span>
          <span>${formatRp(spent)} / ${formatRp(limit)}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill ${cls}" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');
}

function populateMonthFilter() {
  const txs = load('transactions', []);
  const months = [...new Set(txs.map(t => t.date.substring(0,7)))].sort().reverse();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  if (!months.includes(thisMonth)) months.unshift(thisMonth);
  const sel = document.getElementById('filter-month');
  sel.innerHTML = months.map(m => `<option value="${m}">${formatMonthShort(m)}</option>`).join('');
  sel.value = thisMonth;
}

function renderAllTx() {
  const txs = load('transactions', []);
  const selectedMonth = document.getElementById('filter-month').value;
  const filtered = txs.filter(t => t.date.startsWith(selectedMonth)).sort((a,b) => b.date.localeCompare(a.date));
  const el = document.getElementById('all-tx-list');
  el.innerHTML = filtered.length ? filtered.map(t => txItemHTML(t, true)).join('') : '<p class="empty-msg">Tidak ada transaksi bulan ini.</p>';
}

function txItemHTML(t, showDelete) {
  const ci = CAT_ICONS[t.category] || CAT_ICONS['Lainnya'];
  const deleteBtn = showDelete ? `<button class="tx-delete" onclick="deleteTx('${t.id}', event)" title="Hapus">✕</button>` : '';
  return `
    <div class="tx-item" id="tx-${t.id}">
      <div class="tx-left">
        <div class="tx-icon" style="background:${ci.bg}">${ci.icon}</div>
        <div class="tx-info">
          <div class="tx-name">${escHtml(t.name)}</div>
          <div class="tx-meta">${t.category} · ${formatDateShort(t.date)}</div>
        </div>
      </div>
      <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatRp(t.amount)}</div>
      ${deleteBtn}
    </div>`;
}

function saveTx() {
  const name = document.getElementById('tx-name').value.trim();
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const cat = document.getElementById('tx-cat').value;
  const date = document.getElementById('tx-date').value;
  const type = document.querySelector('input[name="tx-type"]:checked').value;
  if (!name || !amount || !date) { alert('Lengkapi semua field!'); return; }

  const txs = load('transactions', []);
  txs.push({ id: uid(), name, amount, category: cat, date, type, createdAt: Date.now() });
  save('transactions', txs);

  closeModal('modal-tx');
  document.getElementById('tx-name').value = '';
  document.getElementById('tx-amount').value = '';
  populateMonthFilter();
  renderAll();
}

function deleteTx(id, e) {
  e.stopPropagation();
  if (!confirm('Hapus transaksi ini?')) return;
  const txs = load('transactions', []).filter(t => t.id !== id);
  save('transactions', txs);
  renderAll();
  populateMonthFilter();
}

// ===== BUDGET MODAL =====
function openBudgetModal() {
  const budgets = load('budgets', DEFAULT_BUDGETS);
  const cats = Object.keys(DEFAULT_BUDGETS);
  document.getElementById('budget-form').innerHTML = cats.map(cat => `
    <div class="budget-input-row">
      <span class="budget-input-label">${cat}</span>
      <input type="number" id="bgt-${cat.replace(/\s/g,'_')}" value="${budgets[cat] || 0}" min="0" placeholder="0" />
    </div>`).join('');
}

function saveBudget() {
  const cats = Object.keys(DEFAULT_BUDGETS);
  const budgets = {};
  cats.forEach(cat => {
    const val = parseFloat(document.getElementById(`bgt-${cat.replace(/\s/g,'_')}`).value) || 0;
    budgets[cat] = val;
  });
  save('budgets', budgets);
  closeModal('modal-budget');
  renderFinance();
}

// ===== TASKS =====
let currentFilter = 'all';

function renderTasks() {
  filterTasks(currentFilter, document.querySelector(`.filter-chip[data-filter="${currentFilter}"]`));
}

function filterTasks(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const tasks = load('tasks', []);
  const today = toDateStr(new Date());
  let filtered;

  if (filter === 'today') filtered = tasks.filter(t => t.date === today && !t.done);
  else if (filter === 'upcoming') filtered = tasks.filter(t => t.date > today && !t.done);
  else if (filter === 'done') filtered = tasks.filter(t => t.done);
  else filtered = [...tasks];

  filtered.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.date.localeCompare(b.date);
  });

  const el = document.getElementById('task-list-main');
  if (!filtered.length) { el.innerHTML = '<p class="empty-msg">Tidak ada tugas.</p>'; return; }

  // Group by date
  const groups = {};
  filtered.forEach(t => {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  });

  el.innerHTML = Object.keys(groups).sort().map(date => `
    <div class="section-date">${formatDateLabel(date)}</div>
    ${groups[date].map(t => taskItemHTML(t, true)).join('')}
  `).join('');
}

function taskItemHTML(t, showDelete) {
  const tagClass = TAG_CLASS[t.category] || 'tag-lainnya';
  const prioClass = `priority-${t.priority || 'normal'}`;
  const deleteBtn = showDelete ? `<button class="task-delete" onclick="deleteTask('${t.id}', event)" title="Hapus">✕</button>` : '';
  return `
    <div class="task-item ${t.done ? 'done' : ''}" onclick="toggleTask('${t.id}', event)" id="task-${t.id}">
      <div class="task-check"><div class="check-mark"></div></div>
      <div class="task-body">
        <div class="task-text">${escHtml(t.name)}</div>
        <div class="task-meta">
          <span class="priority-dot ${prioClass}"></span>
          <span>${formatDateShort(t.date)}</span>
        </div>
      </div>
      <span class="task-tag ${tagClass}">${t.category}</span>
      ${deleteBtn}
    </div>`;
}

function toggleTask(id, e) {
  if (e.target.classList.contains('task-delete')) return;
  const tasks = load('tasks', []);
  const task = tasks.find(t => t.id === id);
  if (task) task.done = !task.done;
  save('tasks', tasks);
  renderAll();
}

function saveTask() {
  const name = document.getElementById('task-name').value.trim();
  const date = document.getElementById('task-date').value;
  const cat = document.getElementById('task-cat').value;
  const priority = document.getElementById('task-priority').value;
  if (!name || !date) { alert('Lengkapi nama dan tanggal tugas!'); return; }

  const tasks = load('tasks', []);
  tasks.push({ id: uid(), name, date, category: cat, priority, done: false, createdAt: Date.now() });
  save('tasks', tasks);

  closeModal('modal-task');
  document.getElementById('task-name').value = '';
  renderAll();
}

function deleteTask(id, e) {
  e.stopPropagation();
  if (!confirm('Hapus tugas ini?')) return;
  const tasks = load('tasks', []).filter(t => t.id !== id);
  save('tasks', tasks);
  renderAll();
}

// ===== MODALS =====
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  if (id === 'modal-budget') openBudgetModal();
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function closeModalOutside(e, id) {
  if (e.target.id === id) closeModal(id);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['modal-tx', 'modal-budget', 'modal-task'].forEach(closeModal);
  }
});

// ===== UTILS =====
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function formatRp(n) {
  if (n >= 1000000) return 'Rp ' + (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'jt';
  if (n >= 1000) return 'Rp ' + Math.round(n / 1000) + 'rb';
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

function formatDateLong(d) {
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateShort(dateStr) {
  const [y,m,dd] = dateStr.split('-').map(Number);
  return `${dd} ${BULAN[m-1].substr(0,3)} ${y}`;
}

function formatDateLabel(dateStr) {
  const today = toDateStr(new Date());
  const tomorrow = toDateStr(new Date(Date.now() + 86400000));
  if (dateStr === today) return 'Hari ini';
  if (dateStr === tomorrow) return 'Besok';
  return formatDateShort(dateStr);
}

function formatMonthName(d) {
  return `${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function formatMonthShort(ym) {
  const [y,m] = ym.split('-').map(Number);
  return `${BULAN[m-1].substr(0,3)} ${y}`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
