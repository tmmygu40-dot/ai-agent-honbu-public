'use strict';

const STORAGE_KEY = 'card_usage_data';

let cards = [];

// --- 初期化 ---
function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { cards = JSON.parse(saved); } catch(e) { cards = []; }
  }
  render();
  document.getElementById('addBtn').addEventListener('click', addCard);
}

// --- 保存 ---
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

// --- カード追加 ---
function addCard() {
  const name = document.getElementById('cardName').value.trim();
  const limit = parseInt(document.getElementById('cardLimit').value, 10);
  const used = parseInt(document.getElementById('cardUsed').value, 10);

  if (!name) { alert('カード名を入力してください'); return; }
  if (isNaN(limit) || limit <= 0) { alert('利用限度額を正しく入力してください'); return; }
  if (isNaN(used) || used < 0) { alert('利用額を正しく入力してください'); return; }
  if (used > limit) { alert('利用額が限度額を超えています'); return; }

  cards.push({ id: Date.now(), name, limit, used });
  save();
  render();

  document.getElementById('cardName').value = '';
  document.getElementById('cardLimit').value = '';
  document.getElementById('cardUsed').value = '';
}

// --- カード削除 ---
function deleteCard(id) {
  if (!confirm('このカードを削除しますか？')) return;
  cards = cards.filter(c => c.id !== id);
  save();
  render();
}

// --- 使用率でクラスを決める ---
function getLevel(pct) {
  if (pct >= 80) return 'red';
  if (pct >= 60) return 'yellow';
  return 'green';
}

// --- レンダリング ---
function render() {
  const list = document.getElementById('cardList');
  const emptyMsg = document.getElementById('emptyMsg');
  const summary = document.getElementById('summary');

  list.innerHTML = '';

  if (cards.length === 0) {
    emptyMsg.style.display = 'block';
    summary.classList.remove('show');
    return;
  }

  emptyMsg.style.display = 'none';

  // サマリー計算
  const totalLimit = cards.reduce((s, c) => s + c.limit, 0);
  const totalUsed = cards.reduce((s, c) => s + c.used, 0);
  const totalRemaining = totalLimit - totalUsed;

  summary.classList.add('show');
  summary.innerHTML = `
    <div class="summary-row"><span>合計限度額</span><span>${fmt(totalLimit)}円</span></div>
    <div class="summary-row"><span>合計利用額</span><span>${fmt(totalUsed)}円</span></div>
    <div class="summary-row"><span>合計残り枠</span><span>${fmt(totalRemaining)}円</span></div>
  `;

  // カード描画
  cards.forEach(card => {
    const remaining = card.limit - card.used;
    const pct = Math.round((card.used / card.limit) * 100);
    const level = getLevel(pct);

    const item = document.createElement('div');
    item.className = `card-item${level !== 'green' ? ' alert-' + level : ''}`;
    item.innerHTML = `
      <div class="card-header">
        <span class="card-name">${escHtml(card.name)}</span>
        <button class="delete-btn" data-id="${card.id}" title="削除">×</button>
      </div>
      <div class="card-amounts">
        <span>限度額：${fmt(card.limit)}円</span>
        <span>利用額：${fmt(card.used)}円</span>
      </div>
      <div class="card-remaining">
        <span class="remaining-label">残り使用枠 </span>${fmt(remaining)}円
      </div>
      <div class="progress-wrap">
        <div class="progress-bar ${level}" style="width:${Math.min(pct,100)}%"></div>
      </div>
      <div class="usage-label ${level !== 'green' ? level : ''}">使用率 ${pct}%</div>
    `;

    item.querySelector('.delete-btn').addEventListener('click', e => {
      deleteCard(Number(e.currentTarget.dataset.id));
    });

    list.appendChild(item);
  });
}

// --- ユーティリティ ---
function fmt(n) {
  return n.toLocaleString('ja-JP');
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.addEventListener('DOMContentLoaded', init);
