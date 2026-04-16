'use strict';

const STORAGE_KEY = 'invoices_v1';

let invoices = loadData();
let currentFilter = 'all';

// --- データ管理 ---

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

function addInvoice(client, amount, dueDate, memo) {
  invoices.push({
    id: Date.now(),
    client,
    amount,
    dueDate,
    memo,
    paid: false,
    createdAt: new Date().toISOString()
  });
  saveData();
}

function togglePaid(id) {
  const inv = invoices.find(i => i.id === id);
  if (inv) {
    inv.paid = !inv.paid;
    saveData();
  }
}

function deleteInvoice(id) {
  invoices = invoices.filter(i => i.id !== id);
  saveData();
}

// --- 表示 ---

function getFilteredInvoices() {
  if (currentFilter === 'unpaid') return invoices.filter(i => !i.paid);
  if (currentFilter === 'paid')   return invoices.filter(i => i.paid);
  return invoices;
}

function formatAmount(n) {
  return '¥' + Number(n).toLocaleString('ja-JP');
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function isOverdue(dueDateStr, paid) {
  if (paid || !dueDateStr) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  const due = new Date(dueDateStr + 'T00:00:00');
  return due < today;
}

function updateSummary() {
  const unpaid = invoices.filter(i => !i.paid).reduce((s, i) => s + Number(i.amount), 0);
  const paid   = invoices.filter(i =>  i.paid).reduce((s, i) => s + Number(i.amount), 0);
  document.getElementById('unpaidTotal').textContent = formatAmount(unpaid);
  document.getElementById('paidTotal').textContent   = formatAmount(paid);
}

function render() {
  const list = document.getElementById('invoiceList');
  const filtered = getFilteredInvoices();

  updateSummary();

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-message">該当する請求書がありません</p>';
    return;
  }

  // 未回収→過去期日順、回収済み→後ろ
  const sorted = [...filtered].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1;
    return (a.dueDate || '').localeCompare(b.dueDate || '');
  });

  list.innerHTML = sorted.map(inv => {
    const overdue = isOverdue(inv.dueDate, inv.paid);
    const dueDateLabel = overdue
      ? `<span class="overdue-label">期日超過 ${formatDate(inv.dueDate)}</span>`
      : formatDate(inv.dueDate);

    return `
      <div class="invoice-card ${inv.paid ? 'paid' : ''}" data-id="${inv.id}">
        <div class="invoice-info">
          <div class="invoice-client">${escHtml(inv.client)}</div>
          <div class="invoice-amount">${formatAmount(inv.amount)}</div>
          <div class="invoice-meta">支払い期日：${dueDateLabel}</div>
          ${inv.memo ? `<div class="invoice-memo">${escHtml(inv.memo)}</div>` : ''}
        </div>
        <span class="badge ${inv.paid ? 'badge-paid' : 'badge-unpaid'}">
          ${inv.paid ? '回収済み' : '未回収'}
        </span>
        <div class="invoice-actions">
          <button class="btn-toggle" data-action="toggle">${inv.paid ? '未回収に戻す' : '回収済みにする'}</button>
          <button class="btn-delete" data-action="delete">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// --- イベント ---

document.getElementById('addBtn').addEventListener('click', () => {
  const client  = document.getElementById('client').value.trim();
  const amount  = document.getElementById('amount').value;
  const dueDate = document.getElementById('dueDate').value;
  const memo    = document.getElementById('memo').value.trim();

  if (!client) { alert('送付先を入力してください'); return; }
  if (!amount || Number(amount) < 0) { alert('金額を正しく入力してください'); return; }

  addInvoice(client, amount, dueDate, memo);
  document.getElementById('client').value  = '';
  document.getElementById('amount').value  = '';
  document.getElementById('dueDate').value = '';
  document.getElementById('memo').value    = '';
  render();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

document.getElementById('invoiceList').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const card = btn.closest('.invoice-card');
  const id = Number(card.dataset.id);
  if (btn.dataset.action === 'toggle') {
    togglePaid(id);
    render();
  } else if (btn.dataset.action === 'delete') {
    if (confirm('この請求書を削除しますか？')) {
      deleteInvoice(id);
      render();
    }
  }
});

// 初期表示
render();
