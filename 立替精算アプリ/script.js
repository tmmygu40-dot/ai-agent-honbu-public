'use strict';

// ── State ──────────────────────────────────────────────
let members = [];  // ['Alice', 'Bob', ...]
let payments = []; // [{id, payer, desc, amount, targets:[...]}]

const STORAGE_KEY = 'tatemae_app_v1';

// ── Persistence ────────────────────────────────────────
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ members, payments }));
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (d) {
      members = d.members || [];
      payments = d.payments || [];
    }
  } catch (e) {
    members = [];
    payments = [];
  }
}

// ── DOM helpers ────────────────────────────────────────
const $  = id => document.getElementById(id);
const fmt = n => n.toLocaleString('ja-JP') + '円';

// ── Render ─────────────────────────────────────────────
function renderMembers() {
  const ul = $('memberList');
  ul.innerHTML = '';
  members.forEach((m, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${escHtml(m)}</span><span class="del" data-i="${i}" title="削除">×</span>`;
    ul.appendChild(li);
  });

  // update payer select
  const payer = $('payer');
  const prev = payer.value;
  payer.innerHTML = members.length
    ? members.map(m => `<option value="${escHtml(m)}">${escHtml(m)}</option>`).join('')
    : '<option value="">（メンバーを登録してください）</option>';
  if (members.includes(prev)) payer.value = prev;

  // update target checkboxes
  const targets = $('payTargets');
  targets.innerHTML = members.length
    ? members.map(m =>
        `<label><input type="checkbox" value="${escHtml(m)}" checked> ${escHtml(m)}</label>`
      ).join('')
    : '<span class="empty-msg">メンバーを登録してください</span>';
}

function renderPayments() {
  const ul = $('payList');
  const sec = $('payListSection');
  if (payments.length === 0) {
    sec.style.display = 'none';
    return;
  }
  sec.style.display = '';
  ul.innerHTML = '';
  payments.forEach((p, i) => {
    const li = document.createElement('li');
    const targetStr = p.targets.length === members.length
      ? '全員'
      : p.targets.join('、');
    li.innerHTML = `
      <div class="pay-info">
        <div class="pay-main">${escHtml(p.payer)}が支払い ― ${escHtml(p.desc)}</div>
        <div class="pay-sub">対象：${escHtml(targetStr)}</div>
      </div>
      <span class="pay-amount">${fmt(p.amount)}</span>
      <span class="pay-del" data-i="${i}" title="削除">🗑</span>`;
    ul.appendChild(li);
  });
}

function renderResult(settlements, balances) {
  const sec = $('resultSection');
  sec.style.display = '';

  // summary
  const sumEl = $('summaryArea');
  sumEl.innerHTML = '<div style="font-size:.8rem;color:#6b7280;margin-bottom:6px">各自の立替超過／不足</div>';
  Object.entries(balances).sort((a, b) => b[1] - a[1]).forEach(([name, val]) => {
    const row = document.createElement('div');
    row.className = 'summary-row';
    const cls = val >= 0 ? '' : ' negative';
    row.innerHTML = `<span class="summary-name">${escHtml(name)}</span>
      <span class="summary-val${cls}">${val >= 0 ? '+' : ''}${fmt(val)}</span>`;
    sumEl.appendChild(row);
  });

  // settlements
  const ul = $('settlementList');
  if (settlements.length === 0) {
    ul.innerHTML = '<li style="background:#f9fafb;border-color:#d1d5db;color:#6b7280">精算の必要はありません</li>';
  } else {
    ul.innerHTML = settlements.map(s =>
      `<li>${escHtml(s.from)} → ${escHtml(s.to)} に <span class="amount">${fmt(s.amount)}</span> 支払う</li>`
    ).join('');
  }
}

// ── Calculation ────────────────────────────────────────
function calculate() {
  if (members.length < 2) {
    alert('メンバーを2人以上登録してください');
    return;
  }
  if (payments.length === 0) {
    alert('支払いを1件以上入力してください');
    return;
  }

  // 各人の残高を計算（プラス=もらう権利、マイナス=払う義務）
  const balance = {};
  members.forEach(m => { balance[m] = 0; });

  payments.forEach(p => {
    const targets = p.targets.length > 0 ? p.targets : [...members];
    const share = p.amount / targets.length;
    balance[p.payer] += p.amount;          // 立て替えた分はプラス
    targets.forEach(t => { balance[t] -= share; }); // 割り勘分はマイナス
  });

  // 端数処理（整数化）
  const roundedBalance = {};
  Object.keys(balance).forEach(k => {
    roundedBalance[k] = Math.round(balance[k]);
  });

  // 最小送金数アルゴリズム
  const creditors = []; // もらう側（balance > 0）
  const debtors = [];   // 払う側（balance < 0）

  Object.entries(roundedBalance).forEach(([name, val]) => {
    if (val > 0) creditors.push({ name, amount: val });
    else if (val < 0) debtors.push({ name, amount: -val });
  });

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let ci = 0, di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amount = Math.min(c.amount, d.amount);
    if (amount > 0) {
      settlements.push({ from: d.name, to: c.name, amount });
    }
    c.amount -= amount;
    d.amount -= amount;
    if (c.amount === 0) ci++;
    if (d.amount === 0) di++;
  }

  renderResult(settlements, roundedBalance);
}

// ── Events ─────────────────────────────────────────────
$('addMemberBtn').addEventListener('click', () => {
  const name = $('memberName').value.trim();
  if (!name) return;
  if (members.includes(name)) {
    alert('同じ名前のメンバーが既にいます');
    return;
  }
  members.push(name);
  $('memberName').value = '';
  save();
  renderMembers();
});

$('memberName').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('addMemberBtn').click();
});

$('memberList').addEventListener('click', e => {
  const btn = e.target.closest('.del');
  if (!btn) return;
  const i = parseInt(btn.dataset.i);
  const name = members[i];
  // remove related payments
  members.splice(i, 1);
  payments = payments.filter(p => p.payer !== name && p.targets.every(t => t !== name));
  payments = payments.map(p => ({
    ...p,
    targets: p.targets.filter(t => t !== name)
  }));
  save();
  renderMembers();
  renderPayments();
  $('resultSection').style.display = 'none';
});

$('addPayBtn').addEventListener('click', () => {
  const payer = $('payer').value;
  if (!payer) { alert('支払った人を選んでください'); return; }
  const desc = $('payDesc').value.trim() || '支払い';
  const amount = parseInt($('payAmount').value);
  if (!amount || amount <= 0) { alert('金額を入力してください'); return; }

  const checkedBoxes = $('payTargets').querySelectorAll('input[type=checkbox]:checked');
  const targets = Array.from(checkedBoxes).map(cb => cb.value);
  if (targets.length === 0) { alert('対象メンバーを1人以上選んでください'); return; }

  payments.push({
    id: Date.now(),
    payer,
    desc,
    amount,
    targets
  });

  $('payDesc').value = '';
  $('payAmount').value = '';
  // reset checkboxes to all checked
  $('payTargets').querySelectorAll('input[type=checkbox]').forEach(cb => { cb.checked = true; });

  save();
  renderPayments();
  $('resultSection').style.display = 'none';
});

$('payList').addEventListener('click', e => {
  const btn = e.target.closest('.pay-del');
  if (!btn) return;
  const i = parseInt(btn.dataset.i);
  payments.splice(i, 1);
  save();
  renderPayments();
  $('resultSection').style.display = 'none';
});

$('calcBtn').addEventListener('click', calculate);

$('resetBtn').addEventListener('click', () => {
  if (!confirm('全データをリセットしますか？')) return;
  members = [];
  payments = [];
  save();
  renderMembers();
  renderPayments();
  $('resultSection').style.display = 'none';
});

// ── Utility ────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ───────────────────────────────────────────────
load();
renderMembers();
renderPayments();
