const STORAGE_KEY = 'haiso_checker';

let state = {
  limit: 2000,
  items: []
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      state = JSON.parse(saved);
    } catch (e) {
      state = { limit: 2000, items: [] };
    }
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getTotal() {
  return state.items.reduce((sum, item) => sum + item.weight, 0);
}

function render() {
  const total = getTotal();
  const remaining = state.limit - total;
  const ratio = state.limit > 0 ? (total / state.limit) * 100 : 0;

  // 上限表示
  document.getElementById('limitDisplay').textContent = state.limit.toFixed(1);

  // 合計・残り
  document.getElementById('totalWeight').textContent = total.toFixed(1);
  document.getElementById('remaining').textContent = remaining.toFixed(1);

  // プログレスバー
  const bar = document.getElementById('progressBar');
  const pct = Math.min(ratio, 100);
  bar.style.width = pct + '%';

  const summarySection = document.querySelector('.summary-section');
  const statusMsg = document.getElementById('statusMsg');

  bar.classList.remove('over', 'warn');
  summarySection.classList.remove('over', 'warn');
  statusMsg.classList.remove('over', 'warn');

  if (total > state.limit) {
    bar.classList.add('over');
    summarySection.classList.add('over');
    statusMsg.classList.add('over');
    statusMsg.textContent = `⚠️ 積載上限を ${(total - state.limit).toFixed(1)} kg オーバーしています！`;
  } else if (ratio >= 90) {
    bar.classList.add('warn');
    summarySection.classList.add('warn');
    statusMsg.classList.add('warn');
    statusMsg.textContent = `上限まで残り ${remaining.toFixed(1)} kg（${ratio.toFixed(0)}%）`;
  } else {
    statusMsg.textContent = total > 0 ? `上限の ${ratio.toFixed(0)}% を使用中` : '';
  }

  // リスト
  const list = document.getElementById('itemList');
  const count = document.getElementById('itemCount');
  count.textContent = state.items.length + '件';

  if (state.items.length === 0) {
    list.innerHTML = '<li class="empty-msg">荷物が登録されていません</li>';
    return;
  }

  list.innerHTML = state.items.map((item, i) => `
    <li>
      <span class="item-name">${escapeHtml(item.name)}</span>
      <span class="item-weight">${item.weight.toFixed(1)} kg</span>
      <button class="del-btn" data-index="${i}">削除</button>
    </li>
  `).join('');

  list.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      state.items.splice(idx, 1);
      saveState();
      render();
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// 積載上限設定
document.getElementById('setLimitBtn').addEventListener('click', () => {
  const val = parseFloat(document.getElementById('limitInput').value);
  if (isNaN(val) || val < 0) {
    alert('正しい数値を入力してください');
    return;
  }
  state.limit = val;
  document.getElementById('limitInput').value = '';
  saveState();
  render();
});

// 荷物追加
document.getElementById('addBtn').addEventListener('click', addItem);

document.getElementById('weightInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

document.getElementById('nameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('weightInput').focus();
});

function addItem() {
  const name = document.getElementById('nameInput').value.trim();
  const weight = parseFloat(document.getElementById('weightInput').value);

  if (!name) {
    alert('荷物名を入力してください');
    document.getElementById('nameInput').focus();
    return;
  }
  if (isNaN(weight) || weight < 0) {
    alert('正しい重量を入力してください');
    document.getElementById('weightInput').focus();
    return;
  }

  state.items.push({ name, weight });
  document.getElementById('nameInput').value = '';
  document.getElementById('weightInput').value = '';
  document.getElementById('nameInput').focus();
  saveState();
  render();
}

// 全削除
document.getElementById('clearBtn').addEventListener('click', () => {
  if (state.items.length === 0) return;
  if (confirm('すべての荷物を削除しますか？')) {
    state.items = [];
    saveState();
    render();
  }
});

// 初期化
loadState();
render();
