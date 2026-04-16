const STORAGE_KEY = 'furusato_v2_donations';
const LIMIT_KEY = 'furusato_v2_limit';

let donations = [];
let limitAmount = 0;

function load() {
  const saved = localStorage.getItem(STORAGE_KEY);
  donations = saved ? JSON.parse(saved) : [];

  const savedLimit = localStorage.getItem(LIMIT_KEY);
  limitAmount = savedLimit ? parseInt(savedLimit, 10) : 0;

  if (limitAmount > 0) {
    document.getElementById('limitInput').value = limitAmount;
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(donations));
  localStorage.setItem(LIMIT_KEY, String(limitAmount));
}

function formatYen(n) {
  return n.toLocaleString('ja-JP') + ' 円';
}

function updateSummary() {
  const total = donations.reduce((sum, d) => sum + d.amount, 0);
  document.getElementById('totalAmount').textContent = formatYen(total);

  if (limitAmount > 0) {
    document.getElementById('limitAmount').textContent = formatYen(limitAmount);
    const remain = limitAmount - total;
    const el = document.getElementById('remainAmount');
    el.textContent = formatYen(remain);
    el.style.color = remain < 0 ? '#ff6b6b' : '#fff';

    // プログレスバー
    const progressWrap = document.getElementById('progressWrap');
    const progressBar = document.getElementById('progressBar');
    progressWrap.style.display = 'block';
    const pct = Math.min((total / limitAmount) * 100, 100);
    progressBar.style.width = pct + '%';
    progressBar.style.background = pct >= 100 ? '#ff6b6b' : '#fff';
  } else {
    document.getElementById('limitAmount').textContent = '未設定';
    document.getElementById('remainAmount').textContent = '—';
    document.getElementById('progressWrap').style.display = 'none';
  }
}

function renderList() {
  const list = document.getElementById('donationList');
  const count = document.getElementById('listCount');
  count.textContent = `（${donations.length}件）`;

  if (donations.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだ登録されていません</p>';
    return;
  }

  list.innerHTML = '';
  // 新しい順に表示
  [...donations].reverse().forEach((d, revIdx) => {
    const idx = donations.length - 1 - revIdx;
    const item = document.createElement('div');
    item.className = 'donation-item';
    item.innerHTML = `
      <div class="donation-info">
        <div class="donation-dest">${escHtml(d.dest)}</div>
        <div class="donation-amount">${formatYen(d.amount)}</div>
        ${d.gift ? `<div class="donation-gift">返礼品：${escHtml(d.gift)}</div>` : ''}
        ${d.date ? `<div class="donation-date">${escHtml(d.date)}</div>` : ''}
      </div>
      <button class="delete-btn" data-idx="${idx}" title="削除">✕</button>
    `;
    list.appendChild(item);
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render() {
  updateSummary();
  renderList();
}

document.getElementById('setLimitBtn').addEventListener('click', () => {
  const val = parseInt(document.getElementById('limitInput').value, 10);
  if (isNaN(val) || val < 0) {
    alert('正しい金額を入力してください');
    return;
  }
  limitAmount = val;
  save();
  render();
});

document.getElementById('addBtn').addEventListener('click', () => {
  const dest = document.getElementById('destInput').value.trim();
  const amountRaw = document.getElementById('amountInput').value;
  const gift = document.getElementById('giftInput').value.trim();
  const date = document.getElementById('dateInput').value;

  if (!dest) {
    alert('寄付先を入力してください');
    return;
  }
  const amount = parseInt(amountRaw, 10);
  if (isNaN(amount) || amount <= 0) {
    alert('正しい金額を入力してください');
    return;
  }

  donations.push({ dest, amount, gift, date });
  save();
  render();

  document.getElementById('destInput').value = '';
  document.getElementById('amountInput').value = '';
  document.getElementById('giftInput').value = '';
  document.getElementById('dateInput').value = '';
});

document.getElementById('donationList').addEventListener('click', (e) => {
  const btn = e.target.closest('.delete-btn');
  if (!btn) return;
  const idx = parseInt(btn.dataset.idx, 10);
  if (confirm(`「${donations[idx].dest}」の寄付記録を削除しますか？`)) {
    donations.splice(idx, 1);
    save();
    render();
  }
});

load();
render();
