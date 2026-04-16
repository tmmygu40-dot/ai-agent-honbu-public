// データ
let members = [];
let payments = [];

// 初期化
(function init() {
  const saved = localStorage.getItem('warikan_data');
  if (saved) {
    const data = JSON.parse(saved);
    members = data.members || [];
    payments = data.payments || [];
  }
  renderMembers();
  renderPayments();
  renderPayerSelect();
})();

function save() {
  localStorage.setItem('warikan_data', JSON.stringify({ members, payments }));
}

// ===== 参加者 =====
function addMember() {
  const input = document.getElementById('memberName');
  const name = input.value.trim();
  if (!name) return;
  if (members.includes(name)) {
    alert('同じ名前がすでにいます');
    return;
  }
  members.push(name);
  input.value = '';
  save();
  renderMembers();
  renderPayerSelect();
}

document.getElementById('memberName').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addMember();
});

function removeMember(name) {
  if (!confirm(`「${name}」を削除しますか？\nこの参加者が関わる支払い記録は残ります。`)) return;
  members = members.filter(m => m !== name);
  save();
  renderMembers();
  renderPayerSelect();
}

function renderMembers() {
  const list = document.getElementById('memberList');
  if (members.length === 0) {
    list.innerHTML = '<span style="font-size:0.85rem;color:#aaa;">まだ参加者がいません</span>';
    return;
  }
  list.innerHTML = members.map(m => `
    <span class="tag">
      ${escHtml(m)}
      <button class="remove-btn" onclick="removeMember('${escAttr(m)}')" title="削除">×</button>
    </span>
  `).join('');
}

function renderPayerSelect() {
  const sel = document.getElementById('payerSelect');
  sel.innerHTML = members.length === 0
    ? '<option value="">-- 先に参加者を追加してください --</option>'
    : members.map(m => `<option value="${escAttr(m)}">${escHtml(m)}</option>`).join('');
}

// ===== 支払い =====
function addPayment() {
  const payer = document.getElementById('payerSelect').value;
  const amount = parseInt(document.getElementById('amountInput').value, 10);
  const memo = document.getElementById('memoInput').value.trim();

  if (!payer) { alert('立替者を選んでください'); return; }
  if (!amount || amount <= 0) { alert('正しい金額を入力してください'); return; }

  payments.push({ id: Date.now(), payer, amount, memo });
  document.getElementById('amountInput').value = '';
  document.getElementById('memoInput').value = '';
  save();
  renderPayments();
  clearResult();
}

function removePayment(id) {
  payments = payments.filter(p => p.id !== id);
  save();
  renderPayments();
  clearResult();
}

function renderPayments() {
  const list = document.getElementById('paymentList');
  if (payments.length === 0) {
    list.innerHTML = '<p style="font-size:0.85rem;color:#aaa;margin-top:8px;">まだ支払い記録がありません</p>';
    return;
  }
  const total = payments.reduce((s, p) => s + p.amount, 0);
  list.innerHTML = `
    <div class="summary">
      <div class="summary-row"><span>合計支払額</span><span><strong>${total.toLocaleString()}円</strong></span></div>
      <div class="summary-row"><span>参加者数</span><span>${members.length}人</span></div>
      ${members.length > 0 ? `<div class="summary-row"><span>一人あたり</span><span><strong>${Math.ceil(total / members.length).toLocaleString()}円</strong></span></div>` : ''}
    </div>
    ${payments.map(p => `
      <div class="payment-item">
        <div class="payment-info">
          <span class="payment-payer">${escHtml(p.payer)}</span>
          が立替
          ${p.memo ? `<span class="payment-memo">（${escHtml(p.memo)}）</span>` : ''}
        </div>
        <span class="payment-amount">${p.amount.toLocaleString()}円</span>
        <button class="payment-del" onclick="removePayment(${p.id})" title="削除">🗑</button>
      </div>
    `).join('')}
  `;
}

// ===== 精算計算 =====
function calculate() {
  const resultDiv = document.getElementById('result');

  if (members.length < 2) {
    resultDiv.innerHTML = '<p class="result-error">参加者を2人以上追加してください</p>';
    return;
  }
  if (payments.length === 0) {
    resultDiv.innerHTML = '<p class="result-error">支払い記録がありません</p>';
    return;
  }

  // 各参加者の支払い合計
  const paid = {};
  members.forEach(m => paid[m] = 0);
  payments.forEach(p => {
    if (paid[p.payer] !== undefined) paid[p.payer] += p.amount;
    else paid[p.payer] = p.amount;  // 削除済み参加者の支払いも考慮
  });

  const total = payments.reduce((s, p) => s + p.amount, 0);
  const perPerson = total / members.length;

  // 各人の収支（正 = もらうべき、負 = 払うべき）
  const balance = {};
  members.forEach(m => {
    balance[m] = (paid[m] || 0) - perPerson;
  });

  // 最少回数精算アルゴリズム（貪欲法）
  const transactions = settleMinTransactions(balance);

  if (transactions.length === 0) {
    resultDiv.innerHTML = `
      <div class="result-title">精算結果</div>
      <div class="result-settled">全員が均等に支払っています！<br>精算不要です ✓</div>
    `;
    return;
  }

  resultDiv.innerHTML = `
    <div class="result-title">精算結果（${transactions.length}回の送金で完了）</div>
    ${transactions.map(t => `
      <div class="result-item">
        <span>${escHtml(t.from)}</span>
        <span class="arrow">→</span>
        <span>${escHtml(t.to)}</span>
        <span class="amount">${Math.round(t.amount).toLocaleString()}円</span>
      </div>
    `).join('')}
  `;
}

/**
 * 最少回数精算アルゴリズム
 * 貪欲法：最大債権者と最大債務者を毎回マッチング
 */
function settleMinTransactions(balance) {
  const transactions = [];
  const EPSILON = 0.01;

  // 収支をコピー
  const bal = {};
  Object.keys(balance).forEach(k => bal[k] = balance[k]);

  for (let iter = 0; iter < 1000; iter++) {
    // 最大債権者（受け取るべき人）と最大債務者（払うべき人）を探す
    let maxCreditor = null, maxDebtor = null;
    let maxCredit = EPSILON, maxDebt = EPSILON;

    Object.keys(bal).forEach(name => {
      if (bal[name] > maxCredit) { maxCredit = bal[name]; maxCreditor = name; }
      if (bal[name] < -maxDebt) { maxDebt = -bal[name]; maxDebtor = name; }
    });

    if (!maxCreditor || !maxDebtor) break;

    const amount = Math.min(maxCredit, maxDebt);
    transactions.push({ from: maxDebtor, to: maxCreditor, amount });

    bal[maxCreditor] -= amount;
    bal[maxDebtor] += amount;
  }

  return transactions;
}

function clearResult() {
  document.getElementById('result').innerHTML = '';
}

// ===== リセット =====
function resetAll() {
  if (!confirm('全ての参加者・支払いデータを削除しますか？\nこの操作は取り消せません。')) return;
  members = [];
  payments = [];
  save();
  renderMembers();
  renderPayments();
  renderPayerSelect();
  clearResult();
}

// ===== ユーティリティ =====
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(str) {
  return String(str).replace(/'/g, "\\'");
}
