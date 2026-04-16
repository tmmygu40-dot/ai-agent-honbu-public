const STORAGE_KEY = 'subscriptions_v1';

let subscriptions = loadData();

const nameInput = document.getElementById('subName');
const amountInput = document.getElementById('subAmount');
const renewalInput = document.getElementById('subRenewal');
const addBtn = document.getElementById('addBtn');
const subList = document.getElementById('subList');
const totalAmountEl = document.getElementById('totalAmount');
const subCountEl = document.getElementById('subCount');

addBtn.addEventListener('click', addSubscription);

[nameInput, amountInput, renewalInput].forEach(el => {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') addSubscription();
  });
});

function addSubscription() {
  const name = nameInput.value.trim();
  const amount = parseInt(amountInput.value, 10);
  const renewal = parseInt(renewalInput.value, 10);

  if (!name) {
    nameInput.focus();
    nameInput.style.borderColor = '#e74c3c';
    setTimeout(() => nameInput.style.borderColor = '', 1200);
    return;
  }
  if (isNaN(amount) || amount < 0) {
    amountInput.focus();
    amountInput.style.borderColor = '#e74c3c';
    setTimeout(() => amountInput.style.borderColor = '', 1200);
    return;
  }

  const sub = {
    id: Date.now(),
    name,
    amount,
    renewal: isNaN(renewal) ? null : Math.min(31, Math.max(1, renewal)),
  };

  subscriptions.push(sub);
  saveData();
  render();

  nameInput.value = '';
  amountInput.value = '';
  renewalInput.value = '';
  nameInput.focus();
}

function deleteSubscription(id) {
  subscriptions = subscriptions.filter(s => s.id !== id);
  saveData();
  render();
}

function isNearRenewal(day) {
  if (!day) return false;
  const today = new Date();
  const todayDay = today.getDate();
  const diff = day - todayDay;
  // 今月の更新日まで7日以内、または今月分は過ぎて来月まで残り少ない場合
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const normalizedDiff = diff < 0 ? diff + daysInMonth : diff;
  return normalizedDiff >= 0 && normalizedDiff <= 7;
}

function render() {
  // Count & total
  subCountEl.textContent = `${subscriptions.length}件`;
  const total = subscriptions.reduce((sum, s) => sum + s.amount, 0);
  totalAmountEl.textContent = `¥${total.toLocaleString()}`;

  if (subscriptions.length === 0) {
    subList.innerHTML = '<p class="empty-msg">まだ登録がありません</p>';
    return;
  }

  const sorted = [...subscriptions].sort((a, b) => {
    const da = a.renewal ?? 99;
    const db = b.renewal ?? 99;
    return da - db;
  });

  subList.innerHTML = sorted.map(s => {
    const near = isNearRenewal(s.renewal);
    const renewalText = s.renewal
      ? `毎月${s.renewal}日更新${near ? ' ⚠ あと7日以内' : ''}`
      : '更新日未設定';
    return `
      <div class="sub-item">
        <div class="sub-info">
          <div class="sub-name">${escapeHtml(s.name)}</div>
          <div class="sub-renewal${near ? ' near' : ''}">${renewalText}</div>
        </div>
        <div class="sub-amount">¥${s.amount.toLocaleString()}</div>
        <button class="btn-delete" onclick="deleteSubscription(${s.id})" aria-label="削除">×</button>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

render();
