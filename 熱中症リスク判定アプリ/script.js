// リスクレベル定義（WBGT基準：環境省ガイドライン）
const RISK_LEVELS = [
  {
    min: -Infinity, max: 21,
    key: 'safe',
    label: 'ほぼ安全',
    icon: '🟢',
    cautions: [
      '通常の作業は問題なし',
      '適宜水分補給を行う',
      '体調に異変があればすぐに報告する'
    ]
  },
  {
    min: 21, max: 25,
    key: 'caution',
    label: '注意',
    icon: '🟡',
    cautions: [
      '激しい作業を行う際はこまめな休憩を取る',
      '1時間ごとに水分・塩分を補給する',
      '日陰や涼しい場所での休憩を心がける',
      '体調の変化に注意する'
    ]
  },
  {
    min: 25, max: 28,
    key: 'warning',
    label: '警戒',
    icon: '🟠',
    cautions: [
      '積極的に水分・塩分を補給する（30分ごと）',
      '作業中は監視者を置くことが望ましい',
      '休憩は日陰・冷房のある場所で行う',
      '激しい作業は避け、軽作業に切り替える',
      'めまい・頭痛・吐き気に注意する'
    ]
  },
  {
    min: 28, max: 31,
    key: 'severe',
    label: '厳重警戒',
    icon: '🔴',
    cautions: [
      '激しい作業・屋外作業は原則中止または短時間に限る',
      '20〜30分ごとに涼しい場所で休憩を取る',
      '水分・塩分・経口補水液を積極的に補給する',
      '2人以上で行動し、互いの体調を確認し合う',
      '熱中症の初期症状（めまい・倦怠感等）が出たら即休憩',
      '医療機関への連絡手段を確保しておく'
    ]
  },
  {
    min: 31, max: Infinity,
    key: 'danger',
    label: '危険',
    icon: '🚨',
    cautions: [
      '屋外・高温環境での作業は原則禁止',
      'やむを得ない場合は短時間（15分以内）に留め監視者を置く',
      '作業前に体温・体調を確認し、異常があれば即中止',
      '熱中症が疑われる場合は直ちに救護・救急要請',
      '涼しい場所への避難・体を冷やすことを最優先にする',
      '現場責任者は作業継続の可否を判断する'
    ]
  }
];

// WBGT簡易計算（気温・相対湿度から）
// 参考：WBGT ≈ 0.735×T + 0.0374×H + 0.00292×T×H + 7.619×AT - 4.557×AT² - 0.0572×WS - 4.064
// 風速・日射なしの室内・日陰想定の簡易式を使用
// 簡易式：WBGT = 0.99×Tw（湿球温度の近似）
// 湿球温度近似：Tw ≈ T × atan(0.151977 × (RH + 8.313659)^0.5)
//              + atan(T + RH) - atan(RH - 1.676331)
//              + 0.00391838 × RH^1.5 × atan(0.023101 × RH) - 4.686035
function calcWBGT(temp, humidity) {
  // Roland Stull (2011) の湿球温度近似式
  const RH = humidity;
  const T = temp;
  const Tw = T * Math.atan(0.151977 * Math.pow(RH + 8.313659, 0.5))
    + Math.atan(T + RH)
    - Math.atan(RH - 1.676331)
    + 0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH)
    - 4.686035;
  // 日陰（屋外）でのWBGT近似
  // WBGT ≈ 0.7×Tw + 0.3×T（自然湿球 70%、乾球温度 30%）
  const wbgt = 0.7 * Tw + 0.3 * T;
  return Math.round(wbgt * 10) / 10;
}

function getRiskLevel(wbgt) {
  return RISK_LEVELS.find(r => wbgt >= r.min && wbgt < r.max);
}

function judge() {
  const tempInput = document.getElementById('temperature');
  const humInput = document.getElementById('humidity');
  const temp = parseFloat(tempInput.value);
  const humidity = parseFloat(humInput.value);

  if (isNaN(temp) || isNaN(humidity)) {
    alert('気温と湿度を入力してください');
    return;
  }
  if (temp < -10 || temp > 50) {
    alert('気温は -10〜50 ℃ の範囲で入力してください');
    return;
  }
  if (humidity < 0 || humidity > 100) {
    alert('湿度は 0〜100 % の範囲で入力してください');
    return;
  }

  const wbgt = calcWBGT(temp, humidity);
  const risk = getRiskLevel(wbgt);

  // 結果表示
  const resultEl = document.getElementById('result');
  resultEl.classList.remove('hidden');

  document.getElementById('wbgtValue').textContent = wbgt + ' ℃';

  const riskCard = document.getElementById('riskCard');
  riskCard.className = 'risk-card risk-' + risk.key;
  document.getElementById('riskLevel').textContent = risk.icon;
  document.getElementById('riskLabel').textContent = risk.label;

  const cautionsEl = document.getElementById('cautions');
  cautionsEl.innerHTML = '<h3>作業上の注意事項</h3><ul>'
    + risk.cautions.map(c => `<li>${c}</li>`).join('')
    + '</ul>';

  // 履歴に保存
  saveHistory(temp, humidity, wbgt, risk);
  renderHistory();

  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function saveHistory(temp, humidity, wbgt, risk) {
  const history = loadHistory();
  const now = new Date();
  const timeStr = now.getMonth() + 1 + '/' + now.getDate() + ' '
    + String(now.getHours()).padStart(2, '0') + ':'
    + String(now.getMinutes()).padStart(2, '0');
  history.unshift({ time: timeStr, temp, humidity, wbgt, key: risk.key, label: risk.label });
  if (history.length > 20) history.pop();
  localStorage.setItem('heatstroke_history', JSON.stringify(history));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('heatstroke_history')) || [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const history = loadHistory();
  if (history.length === 0) {
    list.innerHTML = '<li class="history-empty">計測履歴はありません</li>';
    return;
  }
  list.innerHTML = history.map(h =>
    `<li>
      <span class="hist-info">${h.time}｜${h.temp}℃ / ${h.humidity}% → WBGT ${h.wbgt}℃</span>
      <span class="hist-badge hist-${h.key}">${h.label}</span>
    </li>`
  ).join('');
}

function clearHistory() {
  if (!confirm('計測履歴をクリアしますか？')) return;
  localStorage.removeItem('heatstroke_history');
  renderHistory();
}

// Enterキーで判定
document.addEventListener('DOMContentLoaded', () => {
  renderHistory();
  document.getElementById('temperature').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('humidity').focus();
  });
  document.getElementById('humidity').addEventListener('keydown', e => {
    if (e.key === 'Enter') judge();
  });
});
