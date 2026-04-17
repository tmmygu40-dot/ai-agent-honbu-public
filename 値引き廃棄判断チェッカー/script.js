const STORAGE_KEY = 'nebi_haiki_history';

let lastResult = null;

function calculate() {
  const cost = parseFloat(document.getElementById('cost').value);
  const price = parseFloat(document.getElementById('price').value);
  const discountPrice = parseFloat(document.getElementById('discountPrice').value);
  const disposalCost = parseFloat(document.getElementById('disposalCost').value) || 0;
  const quantity = parseInt(document.getElementById('quantity').value) || 1;

  if (isNaN(cost) || isNaN(price) || isNaN(discountPrice)) {
    alert('原価・販売価格・値引き後価格は必ず入力してください。');
    return;
  }
  if (cost < 0 || price < 0 || discountPrice < 0 || disposalCost < 0 || quantity < 1) {
    alert('マイナス値は入力できません。数量は1以上にしてください。');
    return;
  }

  // 損失計算
  // 値引き損失 = 原価 − 値引き後価格（マイナスなら損失なし=0）
  const discountLossPerUnit = Math.max(0, cost - discountPrice);
  const discountLossTotal = discountLossPerUnit * quantity;

  // 廃棄損失 = 原価 + 廃棄コスト
  const disposalLossPerUnit = cost + disposalCost;
  const disposalLossTotal = disposalLossPerUnit * quantity;

  lastResult = {
    name: document.getElementById('productName').value.trim() || '（商品名なし）',
    cost, price, discountPrice, disposalCost, quantity,
    discountLoss: discountLossTotal,
    disposalLoss: disposalLossTotal,
    date: new Date().toLocaleString('ja-JP', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
  };

  showResult(lastResult);
}

function showResult(r) {
  document.getElementById('discountLoss').textContent = r.discountLoss.toLocaleString();
  document.getElementById('disposalLoss').textContent = r.disposalLoss.toLocaleString();

  const discountCard = document.getElementById('discountCard');
  const disposalCard = document.getElementById('disposalCard');
  const verdict = document.getElementById('verdict');
  const detail = document.getElementById('detail');

  discountCard.classList.remove('winner');
  disposalCard.classList.remove('winner');
  verdict.className = 'verdict';

  let verdictText = '';
  let detailText = '';

  if (r.discountLoss < r.disposalLoss) {
    discountCard.classList.add('winner');
    verdict.classList.add('discount-wins');
    verdictText = '✅ 値引き販売の方が損失が少ない！';
    detailText = `差額：${(r.disposalLoss - r.discountLoss).toLocaleString()}円 値引き販売の方が得`;
  } else if (r.disposalLoss < r.discountLoss) {
    disposalCard.classList.add('winner');
    verdict.classList.add('disposal-wins');
    verdictText = '🗑️ 廃棄の方が損失が少ない！';
    detailText = `差額：${(r.discountLoss - r.disposalLoss).toLocaleString()}円 廃棄の方が得`;
  } else {
    verdict.classList.add('tie');
    verdictText = '🟰 値引き販売・廃棄で損失は同じ';
    detailText = '損失額が同じため、在庫スペース等で判断してください';
  }

  if (r.discountLoss === 0) {
    detailText += '\n※ 値引き後価格が原価以上のため、値引き販売は損失ゼロ';
  }

  verdict.textContent = verdictText;
  detail.textContent = detailText;

  document.getElementById('resultSection').style.display = '';
}

function saveHistory() {
  if (!lastResult) return;

  const history = getHistory();
  history.unshift({ ...lastResult, id: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  renderHistory();

  const btn = document.querySelector('.btn-save');
  btn.textContent = '保存しました！';
  setTimeout(() => { btn.textContent = '履歴に保存'; }, 1500);
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = getHistory();
  const list = document.getElementById('historyList');

  if (history.length === 0) {
    list.innerHTML = '<p class="empty">履歴はありません</p>';
    return;
  }

  list.innerHTML = history.map(r => {
    let verdictClass = '';
    let verdictText = '';
    if (r.discountLoss < r.disposalLoss) {
      verdictClass = 'discount-wins';
      verdictText = '→ 値引き販売が有利';
    } else if (r.disposalLoss < r.discountLoss) {
      verdictClass = 'disposal-wins';
      verdictText = '→ 廃棄が有利';
    } else {
      verdictClass = 'tie';
      verdictText = '→ 損失は同額';
    }
    return `
      <div class="history-item">
        <button class="h-delete" onclick="deleteHistory(${r.id})" title="削除">✕</button>
        <div class="h-date">${r.date}</div>
        <div class="h-name">${escapeHtml(r.name)}（${r.quantity}個）</div>
        <div class="h-result">
          <div class="h-cell"><span>原価</span><span>${r.cost.toLocaleString()}円</span></div>
          <div class="h-cell"><span>値引き後</span><span>${r.discountPrice.toLocaleString()}円</span></div>
          <div class="h-cell"><span>廃棄コスト</span><span>${r.disposalCost.toLocaleString()}円</span></div>
          <div class="h-cell"><span>値引き損失</span><span>${r.discountLoss.toLocaleString()}円</span></div>
          <div class="h-cell"><span>廃棄損失</span><span>${r.disposalLoss.toLocaleString()}円</span></div>
        </div>
        <div class="h-verdict ${verdictClass}">${verdictText}</div>
      </div>
    `;
  }).join('');
}

function deleteHistory(id) {
  const history = getHistory().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  renderHistory();
}

function clearHistory() {
  if (!confirm('履歴をすべて削除しますか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// 起動時に履歴を表示
renderHistory();
