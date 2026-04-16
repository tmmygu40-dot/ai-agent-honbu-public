'use strict';

const STORAGE_KEY = 'toolLendRecords';
let currentFilter = 'unreturned';

// --- データ管理 ---

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function addRecord(toolName, personName, lendDate, memo) {
  const records = loadRecords();
  const newRecord = {
    id: Date.now(),
    toolName,
    personName,
    lendDate,
    memo,
    returned: false,
    returnDate: null,
  };
  records.push(newRecord);
  saveRecords(records);
}

function returnRecord(id) {
  const records = loadRecords();
  const record = records.find(r => r.id === id);
  if (record) {
    record.returned = true;
    record.returnDate = todayStr();
    saveRecords(records);
  }
}

function deleteRecord(id) {
  const records = loadRecords().filter(r => r.id !== id);
  saveRecords(records);
}

// --- ユーティリティ ---

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function getDaysAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return '今日';
  if (diff === 1) return '1日前';
  return `${diff}日前`;
}

// --- UI ---

function getFilteredRecords() {
  const records = loadRecords();
  if (currentFilter === 'unreturned') return records.filter(r => !r.returned);
  if (currentFilter === 'returned') return records.filter(r => r.returned);
  return records;
}

function render() {
  const records = getFilteredRecords();
  const allRecords = loadRecords();
  const unreturnedCount = allRecords.filter(r => !r.returned).length;

  // 件数表示
  const summary = document.getElementById('summary');
  const labels = { unreturned: '未返却', all: 'すべて', returned: '返却済み' };
  summary.textContent = `${labels[currentFilter]}：${records.length}件　（未返却合計：${unreturnedCount}件）`;

  const list = document.getElementById('list');

  if (records.length === 0) {
    list.innerHTML = '<p class="empty-msg">該当する記録はありません</p>';
    return;
  }

  // 未返却は持ち出し日の古い順、返却済み/全件は返却日の新しい順
  const sorted = [...records].sort((a, b) => {
    if (currentFilter === 'returned') {
      return (b.returnDate || '').localeCompare(a.returnDate || '');
    }
    return (a.lendDate || '').localeCompare(b.lendDate || '');
  });

  list.innerHTML = sorted.map(r => {
    const statusClass = r.returned ? 'returned' : 'unreturned';
    const statusLabel = r.returned ? '返却済み' : '未返却';
    const returnInfo = r.returned
      ? `<div class="record-meta">返却日：${formatDate(r.returnDate)}</div>`
      : `<div class="record-meta">持ち出しから <strong>${getDaysAgo(r.lendDate)}</strong></div>`;
    const returnBtn = r.returned
      ? ''
      : `<button class="btn-return" onclick="handleReturn(${r.id})">返却済みにする</button>`;

    return `
      <div class="record-card ${r.returned ? 'returned' : ''}">
        <span class="status-badge ${statusClass}">${statusLabel}</span>
        <div class="record-info">
          <div class="record-tool">${escHtml(r.toolName)}</div>
          <div class="record-meta">担当：${escHtml(r.personName)}　持ち出し：${formatDate(r.lendDate)}</div>
          ${returnInfo}
          ${r.memo ? `<div class="record-memo">${escHtml(r.memo)}</div>` : ''}
        </div>
        <div class="record-actions">
          ${returnBtn}
          <button class="btn-delete" onclick="handleDelete(${r.id})">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- イベントハンドラ ---

function handleReturn(id) {
  returnRecord(id);
  render();
}

function handleDelete(id) {
  if (!confirm('この記録を削除しますか？')) return;
  deleteRecord(id);
  render();
}

// --- 初期化 ---

document.addEventListener('DOMContentLoaded', () => {
  // 今日の日付をデフォルト設定
  document.getElementById('lendDate').value = todayStr();

  // 登録ボタン
  document.getElementById('addBtn').addEventListener('click', () => {
    const toolName = document.getElementById('toolName').value.trim();
    const personName = document.getElementById('personName').value.trim();
    const lendDate = document.getElementById('lendDate').value;
    const memo = document.getElementById('memo').value.trim();

    if (!toolName) { alert('工具・備品名を入力してください'); return; }
    if (!personName) { alert('担当者名を入力してください'); return; }
    if (!lendDate) { alert('持ち出し日を選択してください'); return; }

    addRecord(toolName, personName, lendDate, memo);

    // フォームをリセット
    document.getElementById('toolName').value = '';
    document.getElementById('personName').value = '';
    document.getElementById('lendDate').value = todayStr();
    document.getElementById('memo').value = '';

    // 未返却タブに戻って再描画
    setFilter('unreturned');
  });

  // フィルタタブ
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      setFilter(tab.dataset.filter);
    });
  });

  render();
});

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.filter === filter);
  });
  render();
}
