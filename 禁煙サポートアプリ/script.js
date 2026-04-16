const MILESTONES = [
  { minutes: 20,        icon: '💓', title: '血圧・脈拍が正常に',   desc: '血圧と心拍数が禁煙前の正常値に近づきます。' },
  { minutes: 480,       icon: '🩸', title: '血中CO濃度が半減',      desc: '血中の一酸化炭素濃度が半分に下がり、酸素供給が改善します。' },
  { minutes: 1440,      icon: '👃', title: '味覚・嗅覚の回復開始', desc: '嗅覚と味覚の神経が回復し始め、食べ物の味がより鮮明になります。' },
  { minutes: 2880,      icon: '🫁', title: '肺機能の向上',          desc: '気道が広がり、呼吸が楽になります。運動時の息切れが軽減します。' },
  { minutes: 10080,     icon: '🏃', title: '血行が大幅に改善',      desc: '末梢血管の血流が改善し、手足の冷えが和らぎます。' },
  { minutes: 43200,     icon: '❤️', title: '心臓病リスクが半減',    desc: '心臓発作のリスクが非喫煙者の半分程度まで下がります。' },
  { minutes: 131400,    icon: '🦷', title: '口腔の健康が向上',      desc: '歯茎の血行が回復し、口腔内の健康状態が改善します。' },
  { minutes: 525600,    icon: '🎉', title: '1年達成！冠動脈リスク半減', desc: '虚血性心疾患のリスクが喫煙者の半分になります。おめでとうございます！' },
  { minutes: 2628000,   icon: '🌟', title: '5年：脳卒中リスクが大幅低下', desc: '脳卒中のリスクが非喫煙者とほぼ同じ水準になります。' },
  { minutes: 5256000,   icon: '🏆', title: '10年：肺がんリスクが半減', desc: '肺がんのリスクが喫煙者の約半分まで下がります。' },
];

let timer = null;

const setupSection  = document.getElementById('setupSection');
const statsSection  = document.getElementById('statsSection');
const timelineSection = document.getElementById('timelineSection');
const startDateInput = document.getElementById('startDate');
const cigarettePriceInput = document.getElementById('cigarettePrice');
const elapsedDaysEl = document.getElementById('elapsedDays');
const savedMoneyEl  = document.getElementById('savedMoney');
const detailTimeEl  = document.getElementById('detailTime');
const timelineEl    = document.getElementById('timeline');

function pad(n) { return String(n).padStart(2, '0'); }

function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const days    = Math.floor(totalSec / 86400);
  const hours   = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const secs    = totalSec % 60;
  return { days, hours, minutes, secs, totalMin: Math.floor(ms / 60000) };
}

function renderTimeline(elapsedMin) {
  timelineEl.innerHTML = '';
  MILESTONES.forEach(m => {
    const achieved = elapsedMin >= m.minutes;
    const item = document.createElement('div');
    item.className = `timeline-item ${achieved ? 'achieved' : 'pending'}`;

    const totalMin = m.minutes;
    let timeLabel;
    if (totalMin < 60) {
      timeLabel = `${totalMin}分後`;
    } else if (totalMin < 1440) {
      timeLabel = `${totalMin / 60}時間後`;
    } else if (totalMin < 43200) {
      timeLabel = `${totalMin / 1440}日後`;
    } else if (totalMin < 525600) {
      timeLabel = `${Math.round(totalMin / 43200)}ヶ月後`;
    } else {
      timeLabel = `${Math.round(totalMin / 525600)}年後`;
    }

    item.innerHTML = `
      <div class="timeline-icon">${achieved ? '✓' : m.icon}</div>
      <div class="timeline-content">
        <div class="timeline-time">${timeLabel}</div>
        <div class="timeline-title">${m.title}</div>
        <div class="timeline-desc">${m.desc}</div>
      </div>
      <div class="timeline-badge">${achieved ? '達成' : '未達成'}</div>
    `;
    timelineEl.appendChild(item);
  });
}

function update() {
  const startDate = localStorage.getItem('kinen_start');
  const pricePerDay = parseFloat(localStorage.getItem('kinen_price')) || 500;
  if (!startDate) return;

  const elapsed = Date.now() - new Date(startDate).getTime();
  if (elapsed < 0) {
    detailTimeEl.textContent = '開始日時が未来に設定されています';
    elapsedDaysEl.textContent = '0';
    savedMoneyEl.textContent = '0';
    renderTimeline(0);
    return;
  }

  const { days, hours, minutes, secs, totalMin } = formatElapsed(elapsed);

  elapsedDaysEl.textContent = days;
  const saved = Math.floor((elapsed / 86400000) * pricePerDay);
  savedMoneyEl.textContent = saved.toLocaleString();

  detailTimeEl.innerHTML = `
    <strong>${days}日 ${pad(hours)}時間 ${pad(minutes)}分 ${pad(secs)}秒</strong><br>
    1日あたり ${pricePerDay.toLocaleString()}円 設定
  `;

  renderTimeline(totalMin);
}

function showStats() {
  setupSection.style.display = 'none';
  statsSection.style.display = 'block';
  timelineSection.style.display = 'block';
  if (timer) clearInterval(timer);
  timer = setInterval(update, 1000);
  update();
}

function showSetup() {
  if (timer) clearInterval(timer);
  statsSection.style.display = 'none';
  timelineSection.style.display = 'none';
  setupSection.style.display = 'block';

  const saved = localStorage.getItem('kinen_start');
  if (saved) {
    const d = new Date(saved);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    startDateInput.value = local;
  } else {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    startDateInput.value = local;
  }
  const price = localStorage.getItem('kinen_price');
  if (price) cigarettePriceInput.value = price;
}

document.getElementById('startBtn').addEventListener('click', () => {
  const dateVal = startDateInput.value;
  const price = parseFloat(cigarettePriceInput.value);
  if (!dateVal) { alert('禁煙開始日時を入力してください'); return; }
  if (!price || price <= 0) { alert('1日あたりの煙草代を入力してください'); return; }
  localStorage.setItem('kinen_start', new Date(dateVal).toISOString());
  localStorage.setItem('kinen_price', String(price));
  showStats();
});

document.getElementById('resetBtn').addEventListener('click', () => {
  showSetup();
});

// 初期表示
if (localStorage.getItem('kinen_start')) {
  showStats();
} else {
  showSetup();
}
