(function () {
  const targetInput = document.getElementById('targetSales');
  const actualInput = document.getElementById('actualSales');
  const calcBtn = document.getElementById('calcBtn');
  const resultCard = document.getElementById('resultCard');

  const resTarget = document.getElementById('resTarget');
  const resActual = document.getElementById('resActual');
  const resRemaining = document.getElementById('resRemaining');
  const resDaysLeft = document.getElementById('resDaysLeft');
  const resDailyPace = document.getElementById('resDailyPace');
  const resProgress = document.getElementById('resProgress');
  const progressBar = document.getElementById('progressBar');
  const resDate = document.getElementById('resDate');

  // localStorage から復元
  const saved = JSON.parse(localStorage.getItem('salesPaceData') || '{}');
  if (saved.target) targetInput.value = saved.target;
  if (saved.actual) actualInput.value = saved.actual;

  function formatYen(num) {
    return '¥' + Math.round(num).toLocaleString('ja-JP');
  }

  function getDaysLeftInMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return lastDay - today;
  }

  function calculate() {
    const target = parseFloat(targetInput.value);
    const actual = parseFloat(actualInput.value);

    if (isNaN(target) || target <= 0) {
      alert('目標売上を正しく入力してください。');
      targetInput.focus();
      return;
    }
    if (isNaN(actual) || actual < 0) {
      alert('実績を正しく入力してください（0以上）。');
      actualInput.focus();
      return;
    }

    // localStorage に保存
    localStorage.setItem('salesPaceData', JSON.stringify({ target, actual }));

    const remaining = target - actual;
    const daysLeft = getDaysLeftInMonth();
    const dailyPace = daysLeft > 0 ? remaining / daysLeft : 0;
    const progressPct = Math.min(100, (actual / target) * 100);

    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 時点`;

    resTarget.textContent = formatYen(target);
    resActual.textContent = formatYen(actual);

    if (remaining <= 0) {
      resRemaining.textContent = '達成済み！';
      resRemaining.style.color = '#1a7f4b';
      resDailyPace.textContent = '目標達成！';
      resDailyPace.style.color = '#1a7f4b';
    } else {
      resRemaining.textContent = formatYen(remaining);
      resRemaining.style.color = '';
      if (daysLeft <= 0) {
        resDailyPace.textContent = '月末です';
        resDailyPace.style.color = '#c0392b';
      } else {
        resDailyPace.textContent = formatYen(dailyPace) + ' / 日';
        resDailyPace.style.color = '';
      }
    }

    resDaysLeft.textContent = daysLeft + ' 日';
    resProgress.textContent = progressPct.toFixed(1) + '%';
    progressBar.style.width = progressPct + '%';
    resDate.textContent = dateStr;

    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  calcBtn.addEventListener('click', calculate);

  // Enter キーでも計算
  [targetInput, actualInput].forEach(function (el) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') calculate();
    });
  });

  // 初期表示：保存済みデータがあれば自動計算
  if (saved.target && saved.actual !== undefined) {
    calculate();
  }
})();
