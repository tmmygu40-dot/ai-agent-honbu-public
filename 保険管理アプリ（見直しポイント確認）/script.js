'use strict';

const STORAGE_KEY = 'insurance_list_v1';
let insurances = [];
let editingId = null;

// --- 初期化 ---
function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  insurances = saved ? JSON.parse(saved) : [];
  setupEvents();
  render();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(insurances));
}

// --- イベント設定 ---
function setupEvents() {
  document.getElementById('insuranceForm').addEventListener('submit', handleSubmit);
  document.getElementById('cancelBtn').addEventListener('click', resetForm);
  document.getElementById('sortSelect').addEventListener('change', renderList);
}

// --- フォーム送信 ---
function handleSubmit(e) {
  e.preventDefault();
  const type = document.getElementById('insType').value;
  const company = document.getElementById('insCompany').value.trim();
  const premium = parseInt(document.getElementById('insPremium').value, 10);
  const expiry = document.getElementById('insExpiry').value;
  const note = document.getElementById('insNote').value.trim();

  if (!type || !company || isNaN(premium)) return;

  if (editingId !== null) {
    const idx = insurances.findIndex(i => i.id === editingId);
    if (idx !== -1) {
      insurances[idx] = { ...insurances[idx], type, company, premium, expiry, note };
    }
    editingId = null;
  } else {
    insurances.push({
      id: Date.now(),
      type,
      company,
      premium,
      expiry,
      note,
      addedAt: new Date().toISOString()
    });
  }

  save();
  resetForm();
  render();
}

function resetForm() {
  document.getElementById('insuranceForm').reset();
  document.getElementById('submitBtn').textContent = '登録する';
  document.getElementById('cancelBtn').style.display = 'none';
  editingId = null;
}

// --- 満期関連 ---
function getDaysUntilExpiry(expiryStr) {
  if (!expiryStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(days) {
  if (days === null) return 'none';
  if (days < 0) return 'expired';
  if (days <= 30) return 'danger';
  if (days <= 90) return 'warning';
  return 'ok';
}

// --- サマリー更新 ---
function renderSummary() {
  const totalMonthly = insurances.reduce((sum, i) => sum + (i.premium || 0), 0);
  document.getElementById('totalMonthly').textContent = '¥' + totalMonthly.toLocaleString();
  document.getElementById('totalYearly').textContent = '¥' + (totalMonthly * 12).toLocaleString();
  document.getElementById('totalCount').textContent = insurances.length + '件';

  const expiringSoon = insurances.filter(i => {
    const days = getDaysUntilExpiry(i.expiry);
    return days !== null && days >= 0 && days <= 90;
  }).length;
  document.getElementById('expiringSoon').textContent = expiringSoon + '件';

  const card = document.getElementById('expiringSoonCard');
  card.style.background = expiringSoon > 0 ? '#fff7ed' : '#f0f4ff';
  document.getElementById('expiringSoon').style.color = expiringSoon > 0 ? '#ea580c' : '#2563eb';

  // 種類別集計
  const categoryMap = {};
  insurances.forEach(i => {
    if (!categoryMap[i.type]) categoryMap[i.type] = { count: 0, total: 0 };
    categoryMap[i.type].count++;
    categoryMap[i.type].total += i.premium || 0;
  });

  const catEl = document.getElementById('categorySummary');
  catEl.innerHTML = Object.entries(categoryMap).map(([type, data]) =>
    `<span class="category-tag">${type}：${data.count}件 / 月¥${data.total.toLocaleString()}</span>`
  ).join('');
}

// --- 一覧表示 ---
function renderList() {
  const sortKey = document.getElementById('sortSelect').value;
  const list = [...insurances];

  if (sortKey === 'expiry') {
    list.sort((a, b) => {
      const da = getDaysUntilExpiry(a.expiry);
      const db = getDaysUntilExpiry(b.expiry);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
  } else if (sortKey === 'type') {
    list.sort((a, b) => a.type.localeCompare(b.type, 'ja'));
  } else if (sortKey === 'premium') {
    list.sort((a, b) => b.premium - a.premium);
  } else {
    list.sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt));
  }

  const container = document.getElementById('insuranceList');

  if (list.length === 0) {
    container.innerHTML = '<p class="empty-msg">保険が登録されていません</p>';
    return;
  }

  container.innerHTML = list.map(ins => {
    const days = getDaysUntilExpiry(ins.expiry);
    const status = getExpiryStatus(days);

    let cardClass = 'insurance-card';
    if (status === 'danger' || status === 'expired') cardClass += ' status-danger';
    else if (status === 'warning') cardClass += ' status-warning';

    let expiryText = '満期日：未設定';
    let badgeClass = 'expiry-badge none';
    let badgeText = '';

    if (ins.expiry) {
      const d = new Date(ins.expiry);
      expiryText = '満期：' + d.toLocaleDateString('ja-JP');
      if (status === 'expired') {
        badgeClass = 'expiry-badge danger';
        badgeText = '満期切れ';
      } else if (status === 'danger') {
        badgeClass = 'expiry-badge danger';
        badgeText = `あと${days}日`;
      } else if (status === 'warning') {
        badgeClass = 'expiry-badge warning';
        badgeText = `あと${days}日`;
      } else {
        badgeClass = 'expiry-badge ok';
        badgeText = `あと${days}日`;
      }
    }

    return `
      <div class="${cardClass}" data-id="${ins.id}">
        <div class="card-top">
          <div class="card-title">${escHtml(ins.company)}</div>
          <span class="card-type-badge">${escHtml(ins.type)}</span>
        </div>
        <div class="card-details">
          <div class="card-detail-item">
            <span class="detail-label">月払い：</span>
            <strong>¥${(ins.premium || 0).toLocaleString()}</strong>
          </div>
          <div class="card-detail-item">
            <span class="detail-label">${expiryText}</span>
          </div>
        </div>
        ${badgeText ? `<span class="${badgeClass}">${badgeText}</span>` : ''}
        ${ins.note ? `<div class="card-note">📝 ${escHtml(ins.note)}</div>` : ''}
        <div class="card-actions">
          <button class="btn-edit" onclick="startEdit(${ins.id})">編集</button>
          <button class="btn-delete" onclick="deleteIns(${ins.id})">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function render() {
  renderSummary();
  renderList();
}

// --- 編集 ---
function startEdit(id) {
  const ins = insurances.find(i => i.id === id);
  if (!ins) return;

  document.getElementById('insType').value = ins.type;
  document.getElementById('insCompany').value = ins.company;
  document.getElementById('insPremium').value = ins.premium;
  document.getElementById('insExpiry').value = ins.expiry || '';
  document.getElementById('insNote').value = ins.note || '';

  document.getElementById('submitBtn').textContent = '更新する';
  document.getElementById('cancelBtn').style.display = 'inline-block';
  editingId = id;

  window.scrollTo({ top: document.querySelector('.form-section').offsetTop - 10, behavior: 'smooth' });
}

// --- 削除 ---
function deleteIns(id) {
  if (!confirm('この保険を削除しますか？')) return;
  insurances = insurances.filter(i => i.id !== id);
  save();
  render();
}

// --- XSS対策 ---
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- 起動 ---
init();
