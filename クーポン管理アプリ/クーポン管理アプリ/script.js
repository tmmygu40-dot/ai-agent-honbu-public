const STORAGE_KEY = 'coupon_manager_v1';

let coupons = [];

function loadCoupons() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    coupons = data ? JSON.parse(data) : [];
  } catch {
    coupons = [];
  }
}

function saveCoupons() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysUntilExpiry(expiryDate) {
  const now = new Date(today());
  const exp = new Date(expiryDate);
  const diff = Math.floor((exp - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

function renderCoupons() {
  const list = document.getElementById('coupon-list');
  const hideExpired = document.getElementById('hide-expired').checked;

  const todayStr = today();

  const sorted = [...coupons].sort((a, b) => {
    if (a.expiry < b.expiry) return -1;
    if (a.expiry > b.expiry) return 1;
    return 0;
  });

  const filtered = hideExpired ? sorted.filter(c => c.expiry >= todayStr) : sorted;

  const countDisplay = document.getElementById('count-display');
  const validCount = coupons.filter(c => c.expiry >= todayStr).length;
  countDisplay.textContent = `有効：${validCount}件 / 全${coupons.length}件`;

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-msg">クーポンはありません</p>';
    return;
  }

  list.innerHTML = filtered.map(c => {
    const days = daysUntilExpiry(c.expiry);
    const isExpired = days < 0;
    const isUrgent = !isExpired && days <= 3;

    let cardClass = 'coupon-card';
    if (isExpired) cardClass += ' expired';
    else if (isUrgent) cardClass += ' urgent';

    let badge = '';
    if (isExpired) {
      badge = '<span class="expiry-badge badge-expired">期限切れ</span>';
    } else if (isUrgent) {
      const dayLabel = days === 0 ? '今日まで' : `あと${days}日`;
      badge = `<span class="expiry-badge badge-urgent">${dayLabel}</span>`;
    }

    const memo = c.memo ? `<p class="card-memo">📝 ${escapeHtml(c.memo)}</p>` : '';

    return `
      <div class="${cardClass}" data-id="${c.id}">
        <div class="card-top">
          <span class="card-name">${escapeHtml(c.name)}</span>
          <button class="delete-btn" onclick="deleteCoupon('${c.id}')" title="削除">×</button>
        </div>
        <span class="card-discount">${escapeHtml(c.discount)}</span>
        <p class="card-expiry">有効期限：${formatDate(c.expiry)}${badge}</p>
        ${memo}
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function addCoupon() {
  const nameEl = document.getElementById('coupon-name');
  const discountEl = document.getElementById('coupon-discount');
  const expiryEl = document.getElementById('coupon-expiry');
  const memoEl = document.getElementById('coupon-memo');

  const name = nameEl.value.trim();
  const discount = discountEl.value.trim();
  const expiry = expiryEl.value;
  const memo = memoEl.value.trim();

  if (!name) { alert('クーポン名を入力してください'); nameEl.focus(); return; }
  if (!discount) { alert('割引額・内容を入力してください'); discountEl.focus(); return; }
  if (!expiry) { alert('有効期限を入力してください'); expiryEl.focus(); return; }

  coupons.push({
    id: Date.now().toString(),
    name,
    discount,
    expiry,
    memo
  });

  saveCoupons();
  renderCoupons();

  nameEl.value = '';
  discountEl.value = '';
  expiryEl.value = '';
  memoEl.value = '';
  nameEl.focus();
}

function deleteCoupon(id) {
  if (!confirm('このクーポンを削除しますか？')) return;
  coupons = coupons.filter(c => c.id !== id);
  saveCoupons();
  renderCoupons();
}

document.getElementById('add-btn').addEventListener('click', addCoupon);

document.getElementById('coupon-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') addCoupon();
});

document.getElementById('hide-expired').addEventListener('change', renderCoupons);

loadCoupons();
renderCoupons();
