'use strict';

const STORAGE_KEY = 'ringi_data';

let applications = [];
let currentFilter = 'all';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    applications = raw ? JSON.parse(raw) : [];
  } catch {
    applications = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function formatAmount(n) {
  return Number(n).toLocaleString('ja-JP') + '円';
}

function render() {
  const tbody = document.getElementById('listBody');
  const emptyMsg = document.getElementById('emptyMsg');
  const summary = document.getElementById('summary');

  const filtered = currentFilter === 'all'
    ? applications
    : applications.filter(a => a.status === currentFilter);

  // サマリー
  const total = applications.length;
  const pending = applications.filter(a => a.status === '申請中').length;
  summary.textContent = `全${total}件 ／ 未決裁 ${pending}件`;

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    emptyMsg.style.display = 'block';
    document.getElementById('listTable').style.display = 'none';
    return;
  }

  emptyMsg.style.display = 'none';
  document.getElementById('listTable').style.display = 'table';

  filtered.slice().reverse().forEach(app => {
    const tr = document.createElement('tr');

    const statusOptions = ['申請中', '承認済み', '却下']
      .map(s => `<option value="${s}"${s === app.status ? ' selected' : ''}>${s}</option>`)
      .join('');

    tr.innerHTML = `
      <td>${formatDate(app.date)}</td>
      <td>${escHtml(app.content)}</td>
      <td>${escHtml(app.applicant)}</td>
      <td class="amount-cell">${formatAmount(app.amount)}</td>
      <td>
        <select class="status-select" data-id="${app.id}">
          ${statusOptions}
        </select>
      </td>
      <td>
        <button class="btn-delete" data-id="${app.id}">削除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addApplication() {
  const content = document.getElementById('content').value.trim();
  const applicant = document.getElementById('applicant').value.trim();
  const amount = document.getElementById('amount').value;
  const status = document.getElementById('status').value;

  if (!content) { alert('申請内容を入力してください'); return; }
  if (!applicant) { alert('申請者を入力してください'); return; }
  if (amount === '' || isNaN(Number(amount)) || Number(amount) < 0) {
    alert('金額を正しく入力してください');
    return;
  }

  applications.push({
    id: Date.now().toString(),
    date: new Date().toISOString(),
    content,
    applicant,
    amount: Number(amount),
    status
  });

  save();
  render();

  document.getElementById('content').value = '';
  document.getElementById('applicant').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('status').value = '申請中';
}

// イベント委任でステータス変更・削除を処理
document.getElementById('listBody').addEventListener('change', e => {
  if (e.target.classList.contains('status-select')) {
    const id = e.target.dataset.id;
    const app = applications.find(a => a.id === id);
    if (app) {
      app.status = e.target.value;
      save();
      render();
    }
  }
});

document.getElementById('listBody').addEventListener('click', e => {
  if (e.target.classList.contains('btn-delete')) {
    const id = e.target.dataset.id;
    if (!confirm('この申請を削除しますか？')) return;
    applications = applications.filter(a => a.id !== id);
    save();
    render();
  }
});

// フィルターボタン
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

// 登録ボタン
document.getElementById('addBtn').addEventListener('click', addApplication);

// Enterキーでも登録
document.querySelectorAll('#content, #applicant, #amount').forEach(el => {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') addApplication();
  });
});

// 初期化
load();
render();
