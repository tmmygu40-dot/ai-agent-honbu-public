const questions = [
  // 難読漢字
  { category: '難読漢字', word: '蛸',     reading: 'たこ',       meaning: 'イカに似た軟体動物。英語ではoctopus。' },
  { category: '難読漢字', word: '鰹',     reading: 'かつお',     meaning: 'スズキ目サバ科の海水魚。だしや刺身に使われる。' },
  { category: '難読漢字', word: '蒲公英', reading: 'たんぽぽ',   meaning: '春に黄色い花を咲かせるキク科の植物。' },
  { category: '難読漢字', word: '薔薇',   reading: 'ばら',       meaning: 'バラ科の花木。美しく香り高いが棘がある。' },
  { category: '難読漢字', word: '鸚鵡',   reading: 'おうむ',     meaning: '人の言葉をまねることができる鳥。' },
  { category: '難読漢字', word: '海豚',   reading: 'いるか',     meaning: 'クジラ目の哺乳類。知能が高く人懐っこい。' },
  { category: '難読漢字', word: '林檎',   reading: 'りんご',     meaning: 'バラ科の果樹またはその実。赤や黄緑色の果物。' },
  { category: '難読漢字', word: '向日葵', reading: 'ひまわり',   meaning: '夏に大きな黄色い花を咲かせるキク科の植物。' },
  { category: '難読漢字', word: '蝸牛',   reading: 'かたつむり', meaning: '陸生の貝類。雨の日によく見られる。' },
  { category: '難読漢字', word: '木乃伊', reading: 'ミイラ',     meaning: '乾燥などにより腐敗しなかった遺体。エジプトが有名。' },
  // 四字熟語
  { category: '四字熟語', word: '一石二鳥', reading: 'いっせきにちょう', meaning: 'ひとつの行動で二つの利益を得ること。' },
  { category: '四字熟語', word: '七転八起', reading: 'しちてんはっき',   meaning: '何度失敗しても諦めずに立ち上がること。' },
  { category: '四字熟語', word: '以心伝心', reading: 'いしんでんしん',   meaning: '言葉を使わずに心が通じ合うこと。' },
  { category: '四字熟語', word: '臥薪嘗胆', reading: 'がしんしょうたん', meaning: '目的のために苦労を重ねて耐え忍ぶこと。' },
  { category: '四字熟語', word: '四面楚歌', reading: 'しめんそか',       meaning: '周囲が敵だらけで、孤立無援の状態。' },
  { category: '四字熟語', word: '竜頭蛇尾', reading: 'りゅうとうだび',   meaning: '始めは盛んだが終わりになると振るわないこと。' },
  { category: '四字熟語', word: '温故知新', reading: 'おんこちしん',     meaning: '古いことを学び直して新しい知識や知見を得ること。' },
  { category: '四字熟語', word: '馬耳東風', reading: 'ばじとうふう',     meaning: '人の意見や批評を全く気にしないこと。' },
  { category: '四字熟語', word: '有象無象', reading: 'うぞうむぞう',     meaning: '数は多いが取るに足らない人々のこと。' },
  { category: '四字熟語', word: '一期一会', reading: 'いちごいちえ',     meaning: '一生に一度の出会いを大切にすること。' },
];

let shuffled = [];
let currentIndex = 0;
let answered = false;

function loadStats() {
  return {
    correct: parseInt(localStorage.getItem('vocab_correct') || '0'),
    wrong:   parseInt(localStorage.getItem('vocab_wrong')   || '0'),
  };
}

function saveStats(stats) {
  localStorage.setItem('vocab_correct', stats.correct);
  localStorage.setItem('vocab_wrong',   stats.wrong);
}

function updateStatsDisplay() {
  const stats = loadStats();
  const total = stats.correct + stats.wrong;
  document.getElementById('correct-count').textContent = stats.correct;
  document.getElementById('wrong-count').textContent   = stats.wrong;
  document.getElementById('accuracy').textContent =
    total > 0 ? Math.round((stats.correct / total) * 100) + '%' : '-%';
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadQuestion() {
  if (currentIndex >= shuffled.length) {
    shuffled = shuffle(questions);
    currentIndex = 0;
  }

  const q = shuffled[currentIndex];
  answered = false;

  document.getElementById('category').textContent     = q.category;
  document.getElementById('question').textContent     = q.word;
  document.getElementById('reading').textContent      = q.reading;
  document.getElementById('meaning').textContent      = q.meaning;

  document.getElementById('answer-section').classList.add('hidden');
  document.getElementById('show-answer-btn').classList.remove('hidden');
  document.getElementById('correct-btn').classList.add('hidden');
  document.getElementById('wrong-btn').classList.add('hidden');
  document.getElementById('next-btn').style.display = 'none';

  document.getElementById('progress-text').textContent =
    `問題 ${currentIndex + 1} / ${shuffled.length}`;
}

function showAnswer() {
  document.getElementById('answer-section').classList.remove('hidden');
  document.getElementById('show-answer-btn').classList.add('hidden');
  document.getElementById('correct-btn').classList.remove('hidden');
  document.getElementById('wrong-btn').classList.remove('hidden');
}

function answer(isCorrect) {
  if (answered) return;
  answered = true;

  const stats = loadStats();
  if (isCorrect) {
    stats.correct++;
  } else {
    stats.wrong++;
  }
  saveStats(stats);
  updateStatsDisplay();

  document.getElementById('correct-btn').classList.add('hidden');
  document.getElementById('wrong-btn').classList.add('hidden');
  document.getElementById('next-btn').style.display = 'block';

  document.getElementById('progress-text').textContent =
    isCorrect ? '✓ 正解！' : '✗ 不正解';
}

function nextQuestion() {
  currentIndex++;
  loadQuestion();
}

function resetStats() {
  if (!confirm('記録をリセットしますか？')) return;
  localStorage.removeItem('vocab_correct');
  localStorage.removeItem('vocab_wrong');
  updateStatsDisplay();
}

// 初期化
shuffled = shuffle(questions);
loadQuestion();
updateStatsDisplay();
