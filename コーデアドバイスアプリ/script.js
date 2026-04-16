'use strict';

const STORAGE_KEY = 'codeAdviceHistory';

const ADVICE_DATA = [
  {
    max: -10,
    label: '極寒コーデ',
    items: ['厚手のコート', 'ニット帽', 'マフラー', '手袋', 'ヒートテック（2枚重ね）', '厚底ブーツ'],
  },
  {
    max: -1,
    label: '真冬コーデ',
    items: ['ダウンジャケット', 'ニット', 'マフラー', '手袋', 'ヒートテック', 'ウールパンツ'],
  },
  {
    max: 4,
    label: '冬コーデ',
    items: ['厚手コート', 'セーター', 'マフラー', '裏起毛パンツ', 'ブーツ'],
  },
  {
    max: 9,
    label: '寒い日コーデ',
    items: ['コート', '長袖カットソー', '厚手ボトムス', 'スカーフ'],
  },
  {
    max: 14,
    label: '肌寒いコーデ',
    items: ['ジャケット or 薄手コート', '長袖トップス', 'デニムやチノパン'],
  },
  {
    max: 19,
    label: '春秋コーデ',
    items: ['カーディガン or ライトアウター', '長袖シャツ', '動きやすいパンツ'],
  },
  {
    max: 23,
    label: '過ごしやすいコーデ',
    items: ['薄手の長袖', 'トレンチコート（念のため）', '軽めのボトムス'],
  },
  {
    max: 27,
    label: '初夏コーデ',
    items: ['半袖Tシャツ', '薄手パンツ or スカート', '羽織り（屋内冷房対策）'],
  },
  {
    max: 31,
    label: '夏コーデ',
    items: ['半袖Tシャツ', 'ショートパンツ or 薄手スカート', 'サンダル or 通気性シューズ'],
  },
  {
    max: Infinity,
    label: '猛暑コーデ',
    items: ['ノースリーブ or 半袖', '超軽量素材ボトムス', '日焼け止め必須', '帽子・日傘推奨'],
  },
];

function getAdvice(temp) {
  return ADVICE_DATA.find(d => temp <= d.max);
}

function formatDate(isoString) {
  const d = new Date(isoString);
  const mo = d.getMonth() + 1;
  const da = d.getDate();
  const ho = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mo}/${da} ${ho}:${mi}`;
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function renderHistory() {
  const history = loadHistory();
  const list = document.getElementById('history-list');
  const noHistory = document.getElementById('no-history');

  list.innerHTML = '';

  if (history.length === 0) {
    noHistory.style.display = 'block';
    return;
  }
  noHistory.style.display = 'none';

  history.slice().reverse().forEach(entry => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="h-temp">${entry.temp}℃</span>
      <span class="h-advice">${entry.label}</span>
      <span class="h-date">${formatDate(entry.date)}</span>
    `;
    list.appendChild(li);
  });
}

function showResult(temp, advice) {
  const result = document.getElementById('result');
  document.getElementById('temp-display').textContent = `${temp}℃`;
  document.getElementById('advice-text').textContent = advice.label;

  const itemsEl = document.getElementById('advice-items');
  itemsEl.innerHTML = '';
  advice.items.forEach(item => {
    const span = document.createElement('span');
    span.className = 'advice-item';
    span.textContent = item;
    itemsEl.appendChild(span);
  });

  result.classList.remove('hidden');
}

document.getElementById('advise-btn').addEventListener('click', () => {
  const input = document.getElementById('temp');
  const raw = input.value.trim();

  if (raw === '') {
    input.focus();
    return;
  }

  const temp = parseFloat(raw);
  if (isNaN(temp)) {
    alert('気温を数値で入力してください');
    return;
  }

  const advice = getAdvice(temp);
  showResult(temp, advice);

  const history = loadHistory();
  history.push({ temp, label: advice.label, date: new Date().toISOString() });
  saveHistory(history);
  renderHistory();
});

document.getElementById('temp').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    document.getElementById('advise-btn').click();
  }
});

document.getElementById('clear-btn').addEventListener('click', () => {
  if (!confirm('履歴を全て削除しますか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
});

// 初期表示
renderHistory();
