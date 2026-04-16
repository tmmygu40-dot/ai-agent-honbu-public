'use strict';

const STORAGE_KEY = 'contracts_v1';

let contracts = [];
let currentFilter = 'all';
let currentSort = 'renewal-asc';

// ---------- 初期化 ----------
function init() {
  load();
  render();
  bindEvents();
}

// ---------- localStorage ----------
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    contracts = raw ? JSON.parse(raw) : [];
  } catch {
    contracts = [];
  }
}

// ---------- 状態判定 ----------
function getStatus(renewalDate) {
  if (!renewalDate) return 'normal';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rd = new Date(renewalDate);
  const diff = Math.ceil((rd - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'expired';
  if (diff <= 30) return 'warning';
  return 'normal';
}

function getDaysLabel(renewalDate) {
  if (!renewalDate) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rd = new Date(renewalDate);
  const diff = Math.ceil((rd - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `（${Math.abs(diff)}日超過）`;
  if (diff === 0) return '（今日）';
  return `（あと${diff}日）`;
}

// ---------- ソート ----------
function sortedContracts(list) {
  return [...list].sort((a, b) => {
    if (currentSort === 'renewal-asc') {
      return (a.renewalDate || '9999') > (b.renewalDate || '9999') ? 1 : -1;
    }
    if (currentSort === 'renewal-desc') {
      return (a.renewalDate || '0000') < (b.renewalDate || '0000') ? 1 : -1;
    }
    if (currentSort === 'client-asc') {
      return a.clientName.localeCompare(b.clientName, 'ja');
    }
    return 0;
  });
}

// ---------- フィルター ----------
function filteredContracts() {
  if (currentFilter === 'all') return sortedContracts(contracts);
  return sortedContracts(contracts.filter(c => getStatus(c.renewalDate) === currentFilter));
}

// ---------- レンダリング ----------
function render() {
  renderList();
  renderSummary();
}

function renderSummary() {
  const expired = contracts.filter(c => getStatus(c.renewalDate) === 'expired').length;
  const warning = contracts.filter(c => getStatus(c.renewalDate) === 'warning').length;
  const normal  = contracts.filter(c => getStatus(c.renewalDate) === 'normal').length;
  document.getElementById('expiredCount').textContent = expired;
  document.getElementById('warningCount').textContent = warning;
  document.getElementById('normalCount').textContent  = normal;
  document.getElementById('totalCount').textContent   = contracts.length;
}

function renderList() {
  const list = filteredContracts();
  const el = document.getElementById('contractList');

  if (list.length === 0) {
    el.innerHTML = '<p class="empty-msg">該当する契約はありません</p>';
    return;
  }

  el.innerHTML = list.map(c => cardHTML(c)).join('');
}

function cardHTML(c) {
  const status = getStatus(c.renewalDate);
  const badgeText = status === 'expired' ? '期限切れ' : status === 'warning' ? '要注意' : '正常';
  const badgeClass = `badge-${status}`;
  const daysLabel = getDaysLabel(c.renewalDate);

  const startStr = c.startDate ? `開始：<span>${fmtDate(c.startDate)}</span>` : '';
  const endStr   = c.endDate   ? `終了：<span>${fmtDate(c.endDate)}</span>`   : '';
  const memoStr  = c.memo ? `<div class="card-memo">📝 ${escHtml(c.memo)}</div>` : '';

  return `
    <div class="contract-card ${status}" data-id="${c.id}">
      <div class="card-header">
        <div class="client-name">${escHtml(c.clientName)}</div>
        <span class="status-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="contract-content">${escHtml(c.contractContent)}</div>
      <div class="card-dates">
        ${startStr}
        ${endStr}
      </div>
      <div class="renewal-date">
        更新日：${c.renewalDate ? fmtDate(c.renewalDate) : '未設定'}
        <span class="days-label">${daysLabel}</span>
      </div>
      ${memoStr}
      <div class="card-actions">
        <button class="btn-edit" onclick="openEdit('${c.id}')">編集</button>
        <button class="btn-delete" onclick="deleteContract('${c.id}')">削除</button>
      </div>
    </div>
  `;
}

function fmtDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${y}/${m}/${d}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------- 追加 ----------
function addContract(e) {
  e.preventDefault();
  const clientName      = document.getElementById('clientName').value.trim();
  const contractContent = document.getElementById('contractContent').value.trim();
  const startDate       = document.getElementById('startDate').value;
  const endDate         = document.getElementById('endDate').value;
  const renewalDate     = document.getElementById('renewalDate').value;
  const memo            = document.getElementById('memo').value.trim();

  if (!clientName || !contractContent || !renewalDate) return;

  contracts.push({
    id: Date.now().toString(),
    clientName,
    contractContent,
    startDate,
    endDate,
    renewalDate,
    memo,
    createdAt: new Date().toISOString()
  });

  save();
  render();
  document.getElementById('contractForm').reset();
}

// ---------- 削除 ----------
function deleteContract(id) {
  if (!confirm('この契約を削除しますか？')) return;
  contracts = contracts.filter(c => c.id !== id);
  save();
  render();
}

// ---------- 編集 ----------
function openEdit(id) {
  const c = contracts.find(c => c.id === id);
  if (!c) return;
  document.getElementById('editId').value            = c.id;
  document.getElementById('editClientName').value    = c.clientName;
  document.getElementById('editContractContent').value = c.contractContent;
  document.getElementById('editStartDate').value     = c.startDate || '';
  document.getElementById('editEndDate').value       = c.endDate   || '';
  document.getElementById('editRenewalDate').value   = c.renewalDate;
  document.getElementById('editMemo').value          = c.memo || '';
  document.getElementById('editModal').classList.remove('hidden');
}

function closeEdit() {
  document.getElementById('editModal').classList.add('hidden');
}

function saveEdit(e) {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const idx = contracts.findIndex(c => c.id === id);
  if (idx === -1) return;

  contracts[idx] = {
    ...contracts[idx],
    clientName:      document.getElementById('editClientName').value.trim(),
    contractContent: document.getElementById('editContractContent').value.trim(),
    startDate:       document.getElementById('editStartDate').value,
    endDate:         document.getElementById('editEndDate').value,
    renewalDate:     document.getElementById('editRenewalDate').value,
    memo:            document.getElementById('editMemo').value.trim(),
  };

  save();
  render();
  closeEdit();
}

// ---------- イベント ----------
function bindEvents() {
  document.getElementById('contractForm').addEventListener('submit', addContract);
  document.getElementById('editForm').addEventListener('submit', saveEdit);
  document.getElementById('cancelEdit').addEventListener('click', closeEdit);

  document.getElementById('editModal').addEventListener('click', function(e) {
    if (e.target === this) closeEdit();
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderList();
    });
  });

  document.getElementById('sortSelect').addEventListener('change', function() {
    currentSort = this.value;
    renderList();
  });
}

// グローバル公開（onclick用）
window.openEdit = openEdit;
window.deleteContract = deleteContract;

init();
