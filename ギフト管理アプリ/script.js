'use strict';

const STORAGE_KEY = 'giftManagerData';

let gifts = [];

// --- データ管理 ---
function loadGifts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    gifts = raw ? JSON.parse(raw) : [];
  } catch {
    gifts = [];
  }
}

function saveGifts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gifts));
}

// --- お返し目安計算 ---
function getReturnHint(gift) {
  if (gift.direction !== 'received') return null;

  const amount = Number(gift.amount);
  if (!amount) return null;

  const minReturn = Math.round(amount * 0.5);
  const maxReturn = amount;
  const giftDate = new Date(gift.date);
  const returnDeadline = new Date(giftDate);
  returnDeadline.setMonth(returnDeadline.getMonth() + 1);

  const deadlineStr = formatDate(returnDeadline);
  const amountStr = minReturn === maxReturn
    ? `${maxReturn.toLocaleString()}円`
    : `${minReturn.toLocaleString()}〜${maxReturn.toLocaleString()}円`;

  return `お返し目安：${amountStr}　期限の目安：${deadlineStr}まで`;
}

// --- 日付フォーマット ---
function formatDate(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '不明';
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// --- カード生成 ---
function createCard(gift) {
  const card = document.createElement('div');
  card.className = 'gift-card' + (gift.returned ? ' returned' : '');
  card.dataset.id = gift.id;

  const hint = getReturnHint(gift);
  const directionLabel = gift.direction === 'received' ? 'もらった' : 'あげた';
  const directionClass = gift.direction === 'received' ? 'received' : 'gave';

  card.innerHTML = `
    <div class="card-top">
      <span class="card-partner">${escapeHtml(gift.partner)}</span>
      <span class="card-direction ${directionClass}">${directionLabel}</span>
    </div>
    <div class="card-content">${escapeHtml(gift.content)}</div>
    <div class="card-meta">
      <span class="card-amount">${Number(gift.amount).toLocaleString()}円</span>
      <span>${formatDate(gift.date)}</span>
      ${gift.returned ? '<span style="color:#4caf80;font-weight:600;">✓ お返し済み</span>' : ''}
    </div>
    ${hint && !gift.returned ? `<div class="card-hint">${hint}</div>` : ''}
    ${gift.memo ? `<div class="card-memo">📝 ${escapeHtml(gift.memo)}</div>` : ''}
    <div class="card-actions">
      ${gift.direction === 'received'
        ? `<button class="btn-return ${gift.returned ? 'undo' : ''}" data-action="toggleReturn">
            ${gift.returned ? 'お返し済みを取り消す' : 'お返し済みにする'}
           </button>`
        : ''}
      <button class="btn-delete" data-action="delete">削除</button>
    </div>
  `;

  return card;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- 描画 ---
function render() {
  const listEl = document.getElementById('giftList');
  const showOnlyUnreturned = document.getElementById('showOnlyUnreturned').checked;

  let filtered = [...gifts];
  if (showOnlyUnreturned) {
    filtered = filtered.filter(g => !(g.direction === 'received' && g.returned));
  }

  // 新しい順
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  listEl.innerHTML = '';

  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  filtered.forEach(gift => {
    listEl.appendChild(createCard(gift));
  });
}

// --- イベント委譲（一覧） ---
document.getElementById('giftList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const card = btn.closest('.gift-card');
  const id = card.dataset.id;
  const action = btn.dataset.action;

  if (action === 'delete') {
    if (confirm('この記録を削除しますか？')) {
      gifts = gifts.filter(g => g.id !== id);
      saveGifts();
      render();
    }
  } else if (action === 'toggleReturn') {
    const gift = gifts.find(g => g.id === id);
    if (gift) {
      gift.returned = !gift.returned;
      saveGifts();
      render();
    }
  }
});

// --- フィルターチェックボックス ---
document.getElementById('showOnlyUnreturned').addEventListener('change', render);

// --- 追加ボタン ---
document.getElementById('addBtn').addEventListener('click', () => {
  const partner = document.getElementById('partner').value.trim();
  const giftContent = document.getElementById('giftContent').value.trim();
  const amount = document.getElementById('amount').value.trim();
  const giftDate = document.getElementById('giftDate').value;
  const direction = document.getElementById('direction').value;
  const memo = document.getElementById('memo').value.trim();

  if (!partner || !giftContent || !amount || !giftDate) {
    alert('相手・内容・金額・日付は必須です');
    return;
  }

  const gift = {
    id: Date.now().toString(),
    partner,
    content: giftContent,
    amount: Number(amount),
    date: giftDate,
    direction,
    memo,
    returned: false,
  };

  gifts.push(gift);
  saveGifts();
  render();

  // フォームをリセット
  document.getElementById('partner').value = '';
  document.getElementById('giftContent').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('giftDate').value = '';
  document.getElementById('memo').value = '';
  document.getElementById('partner').focus();
});

// --- 今日の日付をデフォルト設定 ---
function setTodayAsDefault() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('giftDate').value = `${yyyy}-${mm}-${dd}`;
}

// --- 初期化 ---
loadGifts();
setTodayAsDefault();
render();
