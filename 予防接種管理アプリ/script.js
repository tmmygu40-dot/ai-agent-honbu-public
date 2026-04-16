// 次回接種の推奨間隔（日数）と注意書き
const NEXT_SCHEDULE = {
  'BCG': { days: null, note: '1回のみ（生後5ヶ月未満に接種）' },
  'B型肝炎': { doses: [0, 28, 180], note: '3回接種（0・1・6ヶ月）' },
  'ヒブ（Hib）': { doses: [0, 28, 56, 365], note: '4回接種（2・3・4ヶ月・1歳）' },
  '小児用肺炎球菌': { doses: [0, 28, 56, 365], note: '4回接種（2・3・4ヶ月・1歳）' },
  '四種混合（DPT-IPV）': { doses: [0, 28, 56, 180], note: '4回接種（3・4・5ヶ月・18ヶ月）' },
  '水痘（水ぼうそう）': { doses: [0, 180], note: '2回接種（1歳・1歳6ヶ月）' },
  '麻しん風しん（MR）': { doses: [0, 365], note: '2回接種（1歳・就学前）' },
  '日本脳炎': { doses: [0, 7, 365], note: '3回接種（3歳・2週後・1年後）' },
  '二種混合（DT）': { days: null, note: '1回のみ（11歳）' },
  'ロタウイルス': { doses: [0, 28], note: '2〜3回接種（生後2ヶ月〜）' },
  'HPV': { doses: [0, 60, 180], note: '3回接種（0・2・6ヶ月）' },
  'インフルエンザ': { days: 365, note: '毎年（13歳未満は2〜4週間隔で2回）' },
  'おたふくかぜ': { doses: [0, 365], note: '2回接種（1歳・就学前）' },
  'A型肝炎': { doses: [0, 28, 180], note: '3回接種（0・1・6ヶ月）' },
};

function getIntervalDays(vaccineName) {
  const sched = NEXT_SCHEDULE[vaccineName];
  if (!sched) return null;
  if (sched.days) return sched.days;
  if (sched.doses && sched.doses.length > 1) return sched.doses[1];
  return null;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// localStorage
function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem('vaccination_records') || '[]');
  } catch { return []; }
}

function saveRecords(records) {
  localStorage.setItem('vaccination_records', JSON.stringify(records));
}

// 描画
function renderRecords() {
  const records = loadRecords();
  const list = document.getElementById('record-list');

  if (records.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだ記録がありません</p>';
  } else {
    list.innerHTML = records.map((r, i) => `
      <div class="record-item">
        <div class="record-info">
          <div class="record-vaccine">💉 ${escHtml(r.vaccine)}</div>
          <div class="record-date">📅 ${formatDate(r.date)}</div>
          ${r.memo ? `<div class="record-memo">📝 ${escHtml(r.memo)}</div>` : ''}
        </div>
        <button class="delete-btn" onclick="deleteRecord(${i})" title="削除">✕</button>
      </div>
    `).join('');
  }

  renderNext(records);
}

function renderNext(records) {
  const nextList = document.getElementById('next-list');
  if (records.length === 0) {
    nextList.innerHTML = '<p class="empty-msg">記録を追加すると次回目安が表示されます</p>';
    return;
  }

  // ワクチンごとに最新接種日を集約
  const latestByVaccine = {};
  records.forEach(r => {
    if (!latestByVaccine[r.vaccine] || r.date > latestByVaccine[r.vaccine]) {
      latestByVaccine[r.vaccine] = r.date;
    }
  });

  const today = new Date().toISOString().split('T')[0];
  const items = [];

  Object.entries(latestByVaccine).forEach(([vaccine, lastDate]) => {
    const sched = NEXT_SCHEDULE[vaccine];
    const note = sched ? sched.note : '要確認';
    const interval = getIntervalDays(vaccine);

    if (interval === null) {
      // 完了系（1回のみなど）
      items.push({ vaccine, nextDate: null, note, done: true, lastDate });
    } else {
      const nextDate = addDays(lastDate, interval);
      items.push({ vaccine, nextDate, note, done: nextDate < today, lastDate });
    }
  });

  // 次回日付が近い順にソート（nullは末尾）
  items.sort((a, b) => {
    if (!a.nextDate && !b.nextDate) return 0;
    if (!a.nextDate) return 1;
    if (!b.nextDate) return -1;
    return a.nextDate.localeCompare(b.nextDate);
  });

  nextList.innerHTML = items.map(item => {
    if (item.done || !item.nextDate) {
      return `
        <div class="next-item" style="border-color:#b0d4b0;">
          <div class="next-vaccine">${escHtml(item.vaccine)} <span class="badge-done">接種済</span></div>
          <div class="next-date">最終接種：${formatDate(item.lastDate)}</div>
          <div class="next-note">${escHtml(item.note)}</div>
        </div>
      `;
    }
    return `
      <div class="next-item">
        <div class="next-vaccine">${escHtml(item.vaccine)}</div>
        <div class="next-date">次回目安：${formatDate(item.nextDate)}</div>
        <div class="next-note">${escHtml(item.note)}</div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function deleteRecord(index) {
  const records = loadRecords();
  records.splice(index, 1);
  saveRecords(records);
  renderRecords();
}

// フォーム
document.getElementById('vaccine-name').addEventListener('change', function() {
  const custom = document.getElementById('vaccine-custom');
  custom.style.display = this.value === 'その他' ? 'block' : 'none';
  if (this.value !== 'その他') custom.value = '';
});

document.getElementById('add-btn').addEventListener('click', function() {
  const selectEl = document.getElementById('vaccine-name');
  const customEl = document.getElementById('vaccine-custom');
  const dateEl = document.getElementById('vaccine-date');
  const memoEl = document.getElementById('vaccine-memo');

  let vaccine = selectEl.value;
  if (vaccine === 'その他') vaccine = customEl.value.trim();
  const date = dateEl.value;
  const memo = memoEl.value.trim();

  if (!vaccine) { alert('ワクチン種類を選択または入力してください'); return; }
  if (!date) { alert('接種日を入力してください'); return; }

  const records = loadRecords();
  records.push({ vaccine, date, memo });
  // 日付の新しい順に並べる
  records.sort((a, b) => b.date.localeCompare(a.date));
  saveRecords(records);

  // フォームリセット
  selectEl.value = '';
  customEl.value = '';
  customEl.style.display = 'none';
  dateEl.value = '';
  memoEl.value = '';

  renderRecords();
});

// 初期描画
renderRecords();
