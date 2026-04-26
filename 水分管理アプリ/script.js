(function () {
  const STORAGE_KEY = 'suibun_data';
  const TODAY_KEY = 'suibun_today';

  let goalAmount = 2000;
  let records = [];

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function loadData() {
    const today = getTodayStr();
    const savedToday = localStorage.getItem(TODAY_KEY);

    if (savedToday !== today) {
      // 日付が変わったらリセット
      localStorage.setItem(TODAY_KEY, today);
      records = [];
      saveRecords();
    } else {
      const raw = localStorage.getItem(STORAGE_KEY);
      records = raw ? JSON.parse(raw) : [];
    }

    const savedGoal = localStorage.getItem('suibun_goal');
    if (savedGoal) {
      goalAmount = parseInt(savedGoal, 10);
      document.getElementById('goalInput').value = goalAmount;
    }
  }

  function saveRecords() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function saveGoal() {
    localStorage.setItem('suibun_goal', String(goalAmount));
  }

  function getTotalAmount() {
    return records.reduce((sum, r) => sum + r.amount, 0);
  }

  function updateDisplay() {
    const total = getTotalAmount();
    const remaining = Math.max(0, goalAmount - total);
    const pct = Math.min(100, (total / goalAmount) * 100);

    document.getElementById('currentAmount').textContent = total;
    document.getElementById('goalAmount').textContent = goalAmount;

    const bar = document.getElementById('progressBar');
    bar.style.width = pct + '%';
    bar.classList.toggle('complete', pct >= 100);

    const remainingText = document.getElementById('remainingText');
    if (pct >= 100) {
      remainingText.textContent = '目標達成！';
      remainingText.classList.add('complete');
    } else {
      remainingText.textContent = `残り ${remaining} mL`;
      remainingText.classList.remove('complete');
    }
  }

  function renderList() {
    const list = document.getElementById('recordList');
    const emptyMsg = document.getElementById('emptyMsg');

    list.innerHTML = '';

    if (records.length === 0) {
      emptyMsg.style.display = 'block';
      return;
    }

    emptyMsg.style.display = 'none';

    // 新しい順に表示
    [...records].reverse().forEach((rec, i) => {
      const realIdx = records.length - 1 - i;
      const li = document.createElement('li');
      li.className = 'record-item';
      li.innerHTML = `
        <div class="record-info">
          <span class="record-name">${escapeHtml(rec.name || '水')}</span>
          <span class="record-time">${rec.time}</span>
        </div>
        <div class="record-right">
          <span class="record-amount">${rec.amount} mL</span>
          <button class="delete-btn" data-index="${realIdx}" title="削除">×</button>
        </div>
      `;
      list.appendChild(li);
    });

    list.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const idx = parseInt(this.dataset.index, 10);
        records.splice(idx, 1);
        saveRecords();
        renderList();
        updateDisplay();
      });
    });
  }

  function addRecord(name, amount) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    records.push({ name: name || '水', amount, time: timeStr });
    saveRecords();
    renderList();
    updateDisplay();
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function setDateDisplay() {
    const d = new Date();
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    document.getElementById('dateDisplay').textContent =
      `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
  }

  // 初期化
  loadData();
  setDateDisplay();
  renderList();
  updateDisplay();

  // 目標設定
  document.getElementById('setGoalBtn').addEventListener('click', function () {
    const val = parseInt(document.getElementById('goalInput').value, 10);
    if (!val || val < 100) return;
    goalAmount = val;
    saveGoal();
    updateDisplay();
  });

  document.getElementById('goalInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('setGoalBtn').click();
  });

  // クイックボタン
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.getElementById('drinkAmount').value = this.dataset.amount;
    });
  });

  // 追加ボタン
  document.getElementById('addBtn').addEventListener('click', function () {
    const name = document.getElementById('drinkName').value.trim();
    const amountStr = document.getElementById('drinkAmount').value;
    const amount = parseInt(amountStr, 10);

    if (!amount || amount <= 0) {
      alert('量を入力してください');
      return;
    }

    addRecord(name, amount);
    document.getElementById('drinkName').value = '';
    document.getElementById('drinkAmount').value = '';
  });

  // Enterキーで追加
  document.getElementById('drinkAmount').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('addBtn').click();
  });

  // リセットボタン
  document.getElementById('resetBtn').addEventListener('click', function () {
    if (!confirm('今日の記録をすべてリセットしますか？')) return;
    records = [];
    saveRecords();
    renderList();
    updateDisplay();
  });
})();
