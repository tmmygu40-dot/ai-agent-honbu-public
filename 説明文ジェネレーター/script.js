const STORAGE_KEY = 'setsumeibun_history';

const $ = id => document.getElementById(id);

// 状態ごとの説明文
const conditionText = {
  '新品・未使用': '購入後、一度も使用しておりません。新品・未使用品です。',
  '未使用に近い': '購入後、ほとんど使用していない美品です。',
  '目立った傷や汚れなし': '使用感はありますが、目立った傷や汚れはなく、きれいな状態です。',
  'やや傷や汚れあり': 'ご使用に問題はありませんが、細かな傷や汚れが見受けられます。',
  '傷や汚れあり': '使用感があり、傷や汚れが確認できますが、まだご使用いただけます。',
  '全体的に状態が悪い': '使用感が強く、全体的に傷や汚れがあります。ジャンク品としてご理解ください。',
};

// カテゴリごとの追加文
const categoryText = {
  'ファッション': '素材やサイズ感にこだわったアイテムです。',
  '家電': '動作確認済みです。',
  'インテリア': 'お部屋を素敵に彩ってくれるアイテムです。',
  '本・音楽・ゲーム': '大切に保管しておりました。',
  'スポーツ': 'アクティブなシーンで活躍するアイテムです。',
  'おもちゃ': '丁寧に使用・保管しておりました。',
  'コスメ': '衛生面に配慮して保管しておりました。',
  'その他': '',
};

function generateText() {
  const name = $('itemName').value.trim();
  const category = $('itemCategory').value;
  const condition = $('itemCondition').value;
  const features = $('itemFeatures').value.trim();
  const defects = $('itemDefects').value.trim();
  const price = $('itemPrice').value;
  const noReturn = $('chkNoReturn').checked;
  const nego = $('chkNego').checked;
  const quickShip = $('chkQuickShip').checked;

  if (!name || !condition || !features) {
    alert('商品名・商品の状態・特徴は必須です。');
    return;
  }

  let lines = [];

  // タイトル
  lines.push(`【${name}】出品します`);
  lines.push('');

  // 商品説明
  lines.push('▼ 商品説明');
  lines.push(features);
  lines.push('');

  // カテゴリ追加文
  if (category && categoryText[category]) {
    lines.push(categoryText[category]);
    lines.push('');
  }

  // 状態
  lines.push('▼ 商品の状態');
  lines.push(`【${condition}】`);
  lines.push(conditionText[condition] || '');
  lines.push('');

  // 傷・汚れ
  if (defects) {
    lines.push('▼ 傷・汚れ・注意点');
    lines.push(defects);
    lines.push('');
  }

  // 価格
  if (price) {
    lines.push('▼ 価格');
    const formattedPrice = Number(price).toLocaleString();
    lines.push(`¥${formattedPrice}`);
    if (nego) lines.push('※ 価格交渉はお気軽にどうぞ！');
    lines.push('');
  }

  // 発送
  let shippingLines = [];
  if (quickShip) shippingLines.push('即日発送可能です。');
  shippingLines.push('梱包はしっかり行いますので、安心してお買い求めください。');
  lines.push('▼ 発送について');
  lines.push(...shippingLines);
  lines.push('');

  // 返品
  lines.push('▼ ご注意');
  if (noReturn) {
    lines.push('返品・交換はお受けできません。');
  } else {
    lines.push('商品の状態についてご不明な点はお気軽にコメントください。');
  }
  lines.push('');
  lines.push('最後までご覧いただきありがとうございます。よろしくお願いいたします。');

  const result = lines.join('\n');
  $('resultText').value = result;
  $('resultSection').style.display = 'block';
  $('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 履歴に保存
  saveHistory({ name, category, condition, features, defects, price, noReturn, nego, quickShip, result });
  renderHistory();
}

function saveHistory(entry) {
  const history = loadHistory();
  entry.date = new Date().toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  history.unshift(entry);
  // 最大20件
  if (history.length > 20) history.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = loadHistory();
  const list = $('historyList');
  if (history.length === 0) {
    list.innerHTML = '<p class="empty-msg">履歴はありません</p>';
    return;
  }
  list.innerHTML = history.map((item, i) => `
    <div class="history-item" onclick="loadHistoryItem(${i})">
      <div class="history-item-title">${escapeHtml(item.name)}</div>
      <div class="history-item-meta">${escapeHtml(item.condition)} | ${item.date}</div>
      <div class="history-item-preview">${escapeHtml(item.result)}</div>
    </div>
  `).join('');
}

function loadHistoryItem(index) {
  const history = loadHistory();
  const item = history[index];
  if (!item) return;

  $('itemName').value = item.name || '';
  $('itemCategory').value = item.category || '';
  $('itemCondition').value = item.condition || '';
  $('itemFeatures').value = item.features || '';
  $('itemDefects').value = item.defects || '';
  $('itemPrice').value = item.price || '';
  $('chkNoReturn').checked = item.noReturn || false;
  $('chkNego').checked = item.nego || false;
  $('chkQuickShip').checked = item.quickShip || false;
  $('resultText').value = item.result || '';
  $('resultSection').style.display = 'block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearHistory() {
  if (!confirm('履歴を全て削除しますか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}

function copyResult() {
  const text = $('resultText').value;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const msg = $('copyMsg');
    msg.textContent = 'コピーしました！';
    setTimeout(() => { msg.textContent = ''; }, 2000);
  }).catch(() => {
    $('resultText').select();
    document.execCommand('copy');
    const msg = $('copyMsg');
    msg.textContent = 'コピーしました！';
    setTimeout(() => { msg.textContent = ''; }, 2000);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Events
$('generateBtn').addEventListener('click', generateText);
$('copyBtn').addEventListener('click', copyResult);
$('clearHistoryBtn').addEventListener('click', clearHistory);

// Init
renderHistory();
