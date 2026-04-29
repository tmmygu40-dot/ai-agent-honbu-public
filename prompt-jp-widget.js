/* prompt-jp-widget.js
 * 既存のプロンプト生成アプリに「英語→自然な日本語」変換UIを追加するウィジェット。
 *
 * 使い方: 各アプリの index.html 末尾に以下を追加するだけ
 *   <script src="../prompt-jp-widget.js"></script>
 *
 * 動作:
 *   - prompt 出力候補要素 (#prompt-text, #promptText, #promptOutput, #promptOut,
 *     #positive, #negative, .prompt-box) を自動検出
 *   - 各要素の直前に「🇯🇵 日本語に変換」ボタン + JP表示枠 + コピーボタンを挿入
 *   - クリック時に内蔵辞書で英語→日本語にフレーズ単位で置換
 *
 * 翻訳は静的辞書 (画像生成プロンプト語彙) ベース。フレーズ長一致優先。
 * 辞書に無いトークンはそのまま残る。
 */
(function () {
  'use strict';

  if (window.__promptJpWidgetMounted) return;
  window.__promptJpWidgetMounted = true;

  /* ===== 辞書: 画像生成プロンプト語彙 (phrase → 自然な日本語) ===== */
  var DICT = {
    /* Quality / common tags */
    'best quality, masterpiece': '最高品質・傑作',
    'best quality': '最高品質',
    'high quality': '高品質',
    'masterpiece': '傑作',
    'highly detailed': '繊細に描き込まれた',
    'extremely detailed': '極めて繊細',
    'ultra detailed': '超繊細',
    'ultra realistic': '超リアル',
    'photorealistic': '写実的',
    'realistic': 'リアル',
    'detailed': '詳細',
    'intricate': '精緻',
    '8k uhd': '8K高解像度',
    '8k': '8K',
    '4k': '4K',
    'hdr': 'HDR',
    'sharp focus': 'シャープなピント',

    /* Lighting */
    'cinematic lighting': '映画のような照明',
    'dramatic lighting': 'ドラマチックな光',
    'soft lighting': '柔らかい光',
    'natural lighting': '自然光',
    'volumetric lighting': '空気感のある光',
    'golden hour': '夕陽の時間帯',
    'neon lighting': 'ネオンの光',
    'neon glow': 'ネオンの輝き',
    'rim light': 'リムライト',
    'backlight': '逆光',
    'glow': '発光',

    /* Styles */
    'watercolor painting': '水彩画',
    'watercolor': '水彩',
    'oil painting': '油絵',
    'pixel art': 'ピクセルアート',
    '8bit pixel art': '8bitピクセルアート',
    '16bit pixel art': '16bitピクセルアート',
    '8bit style': '8bit風',
    '16bit style': '16bit風',
    '8bit': '8bit',
    '16bit': '16bit',
    '8-bit': '8bit',
    '16-bit': '16bit',
    'anime style': 'アニメ風',
    'anime': 'アニメ',
    'studio ghibli style': 'ジブリ風',
    'studio ghibli': 'ジブリ',
    'ghibli style': 'ジブリ風',
    'ghibli': 'ジブリ',
    'cyberpunk style': 'サイバーパンク',
    'cyberpunk': 'サイバーパンク',
    'vaporwave': 'ヴェイパーウェーブ',
    'synthwave': 'シンセウェーブ',
    'retro': 'レトロ',
    'retro game': 'レトロゲーム',
    'minimalist': 'ミニマル',
    'japanese ukiyo-e': '浮世絵',
    'ukiyo-e': '浮世絵',
    'manga style': 'マンガ風',
    'manga': 'マンガ',
    '3d render': '3Dレンダー',
    'octane render': 'Octaneレンダー',
    'octane': 'Octane',
    'unreal engine 5': 'Unreal Engine 5',
    'unreal engine': 'Unreal Engine',
    'monochrome with one neon color accent': 'モノクロ×ワンポイントネオン',

    /* Subjects */
    'rpg': 'RPG',
    'monster': 'モンスター',
    'character': 'キャラクター',
    'young woman': '若い女性',
    'young man': '若い男性',
    'beautiful girl': '美しい少女',
    'cute girl': '可愛い女の子',
    'girl': '女の子',
    'boy': '男の子',
    'woman': '女性',
    'man': '男性',
    'cat': '猫',
    'dog': '犬',
    'puppy': '子犬',
    'kitten': '子猫',
    'pet': 'ペット',
    'robot': 'ロボット',
    'android': 'アンドロイド',
    'samurai': 'サムライ',
    'ninja': '忍者',
    'warrior': '戦士',
    'knight': '騎士',
    'wizard': '魔法使い',
    'dragon': 'ドラゴン',

    /* Camera / framing */
    'close up portrait': 'クローズアップポートレート',
    'close-up portrait': 'クローズアップポートレート',
    'close up': 'クローズアップ',
    'close-up': 'クローズアップ',
    'wide shot': 'ワイドショット',
    'medium shot': 'ミディアムショット',
    'full body shot': '全身ショット',
    'full body': '全身',
    'portrait': 'ポートレート',
    'low angle': 'ローアングル',
    'high angle': 'ハイアングル',
    "bird's eye view": '俯瞰視点',
    'top-down view': '見下ろし視点',
    'side view': '横から見た視点',
    'from above': '上から',
    'from below': '下から',
    'from behind': '後ろから',

    /* Poses / actions */
    'looking back over shoulder': '振り返るポーズ',
    'looking back': '振り返る',
    'looking at viewer': 'こちらを見る',
    'looking at camera': 'カメラ目線',
    'looking away': '視線を外している',
    'sitting': '座っている',
    'standing': '立っている',
    'running': '走っている',
    'walking': '歩いている',
    'smiling': '微笑む',
    'laughing': '笑う',
    'fighting': '戦う',
    'holding sword': '剣を持つ',
    'holding weapon': '武器を持つ',
    'jumping': 'ジャンプ',
    'dancing': '踊る',

    /* Settings / scenes */
    'neon city': 'ネオン街',
    'neon street': 'ネオン通り',
    'rainy street': '雨の通り',
    'wet street': '濡れた路面',
    'rainy night': '雨の夜',
    'night city': '夜の街',
    'futuristic city': '未来都市',
    'fantasy castle': 'ファンタジー城',
    'ancient ruins': '古代遺跡',
    'deep forest': '深い森',
    'dense forest': '鬱蒼とした森',
    'forest': '森',
    'mountain': '山',
    'mountains': '山々',
    'desert': '砂漠',
    'ocean': '海',
    'beach': 'ビーチ',
    'underwater': '水中',
    'space': '宇宙',
    'sky': '空',
    'clouds': '雲',
    'village': '村',
    'town': '町',
    'city': '街',
    'castle': '城',
    'dungeon': 'ダンジョン',
    'cave': '洞窟',
    'temple': '寺院',
    'shrine': '神社',
    'background art': '背景アート',
    'background': '背景',
    'landscape': '風景',
    'scenery': '景色',

    /* Time / weather */
    'morning': '朝',
    'noon': '昼',
    'afternoon': '午後',
    'evening': '夕方',
    'sunset': '夕焼け',
    'sunrise': '朝焼け',
    'midnight': '真夜中',
    'night': '夜',
    'rainy day': '雨の日',
    'snowy day': '雪の日',
    'rainy': '雨',
    'snowy': '雪',
    'foggy': '霧',
    'cloudy': '曇り',
    'sunny': '晴れ',
    'stormy': '嵐',

    /* Mood */
    'peaceful': '穏やか',
    'mysterious': '神秘的',
    'dangerous': '危険',
    'epic': '壮大',
    'nostalgic': '懐かしい',
    'dreamy': '夢のような',
    'romantic': 'ロマンチック',
    'melancholic': 'メランコリック',
    'atmospheric': '雰囲気のある',
    'moody': 'ムーディ',
    'ethereal': '幻想的',
    'dark': '暗い',
    'bright': '明るい',
    'vibrant': '鮮やか',

    /* Colors */
    'vibrant colors': '鮮やかな色彩',
    'pastel colors': 'パステルカラー',
    'neon colors': 'ネオンカラー',
    'soft pastel': '淡いパステル',
    'monochrome': 'モノクロ',
    'warm tones': '暖色',
    'cool tones': '寒色',
    'pink hair': 'ピンクの髪',
    'blue hair': '青い髪',
    'long hair': '長い髪',
    'short hair': '短い髪',

    /* Negative prompt common */
    'low quality': '低品質',
    'worst quality': '最低品質',
    'blurry': 'ぼやけた',
    'blurred': 'ぼやけている',
    'out of focus': 'ピンボケ',
    'deformed': '形が崩れた',
    'ugly': '醜い',
    'bad anatomy': '崩れた人体',
    'bad hands': '崩れた手',
    'bad face': '崩れた顔',
    'extra fingers': '指が多い',
    'missing fingers': '指が足りない',
    'extra limbs': '余分な手足',
    'watermark': '透かし',
    'signature': '署名',
    'username': 'ユーザー名',
    'logo': 'ロゴ',
    'jpeg artifacts': 'JPEG圧縮ノイズ',
    'noise': 'ノイズ',
    'grainy': 'ザラついた',
    'duplicate': '重複',
    'cropped': '見切れた',
    'lowres': '低解像度',
    'low res': '低解像度',
    'pixelated': 'ピクセル化',
    'text': '文字',

    /* 8bit / retro game specific */
    'tile based': 'タイルベース',
    'tile-based': 'タイルベース',
    '16x16 tile': '16x16タイル',
    '32x32 tile': '32x32タイル',
    '64x64 tile': '64x64タイル',
    '16x16': '16x16ドット',
    '32x32': '32x32ドット',
    'nes style': 'ファミコン風',
    'famicom style': 'ファミコン風',
    'snes style': 'SFC風',
    'super famicom style': 'SFC風',
    'gameboy style': 'ゲームボーイ風',
    'game boy style': 'ゲームボーイ風',
    'msx style': 'MSX風',
    'cga': 'CGA',
    'limited palette': '限定パレット',
    'side-scrolling': '横スクロール',
    'side scrolling': '横スクロール',
    'parallax': 'パララックス',
    'parallax scrolling': 'パララックススクロール',
    'sprite': 'スプライト',
    'pixel perfect': 'ピクセルパーフェクト',
    'animation frame': 'アニメフレーム',

    /* Adjectives / connectives */
    'a beautiful': '美しい',
    'beautiful': '美しい',
    'stunning': '息をのむ',
    'epic scene': '壮大なシーン',
    'gorgeous': 'ゴージャス',
    'in the style of': '〜のスタイルで',
    'inspired by': '〜に着想を得た',
    'with': '・',
    'and': '・',

    /* === ユーザー指定追加 v2 (既存キーは上書きしない) === */
    'rain-soaked streets': '雨に濡れた街',
    'scattered light rays': '木漏れ日',
    'sunlight filtering': '差し込む日差し',
    'fantasy landscape': 'ファンタジー風景',
    'holographic signs': 'ホログラム看板',
    'cyberpunk city': 'サイバーパンク都市',
    'thick canopy': '生い茂った樹冠',
    'mossy ground': '苔むした地面',
    'forest path': '森の小道',
    'high contrast': '高コントラスト',
    'tall trees': '高い木々',
    'neon-lit': 'ネオンに照らされた',
    'techwear': 'テックウェア',
    'canopy': '樹冠',
    'dense': '密度の高い'
  };

  /* ===== 翻訳ロジック (フレーズ長一致優先) ===== */
  function translatePrompt(en) {
    if (!en || !en.trim()) return '';
    var src = en.toLowerCase();
    var keys = Object.keys(DICT).sort(function (a, b) { return b.length - a.length; });
    var slots = [];
    keys.forEach(function (k) {
      var safe = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var left = /^[A-Za-z0-9]/.test(k) ? '\\b' : '';
      var right = /[A-Za-z0-9]$/.test(k) ? '\\b' : '';
      var re = new RegExp(left + safe + right, 'gi');
      src = src.replace(re, function () {
        slots.push(DICT[k]);
        return '' + (slots.length - 1) + '';
      });
    });
    src = src.replace(/(\d+)/g, function (_, n) {
      return slots[parseInt(n, 10)];
    });
    src = src.replace(/\s*,\s*/g, '、');
    src = src.replace(/\s*\(\s*/g, '（');
    src = src.replace(/\s*\)\s*/g, '）');
    src = src.replace(/\s+/g, ' ').trim();
    return src;
  }

  /* ===== UI 構築 (v3: 日本語自動表示・英語折りたたみ) ===== */
  function makeBlock(enEl) {
    if (!enEl || enEl.dataset.jpWidgetMounted === '1') return null;
    enEl.dataset.jpWidgetMounted = '1';

    var wrap = document.createElement('div');
    wrap.className = 'jp-prompt-block';
    wrap.style.cssText = 'margin:0 0 0.6rem 0;display:none;';

    var box = document.createElement('div');
    box.className = 'jp-prompt-box';
    box.style.cssText = 'padding:0.7rem 0.9rem;background:#fff8ee;border:1px solid #d4a373;border-radius:8px;font-size:0.95rem;line-height:1.75;color:#1c1917;white-space:pre-wrap;word-break:break-word;margin-bottom:0.5rem;';

    var head = document.createElement('div');
    head.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:0.4rem;';

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.textContent = '📋 日本語をコピー（おすすめ）';
    copyBtn.style.cssText = 'padding:0.5rem 1rem;font-size:0.88rem;border:1px solid #d4a373;border-radius:6px;background:#ffe8c4;color:#1c1917;cursor:pointer;font-weight:700;';

    var toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.textContent = '英語を見る（任意）';
    toggleBtn.style.cssText = 'padding:0.4rem 0.8rem;font-size:0.78rem;border:1px solid #c9c9c9;border-radius:6px;background:#fff;color:#666;cursor:pointer;';

    head.appendChild(copyBtn);
    head.appendChild(toggleBtn);

    enEl.dataset.originalDisplay = enEl.style.display || '';
    enEl.style.display = 'none';

    function refresh() {
      var en = (enEl.textContent || enEl.innerText || '').trim();
      if (!en) {
        wrap.style.display = 'none';
        return;
      }
      var jp = translatePrompt(en);
      if (!jp) jp = en;
      box.textContent = jp;
      wrap.style.display = '';
    }

    toggleBtn.addEventListener('click', function () {
      if (enEl.style.display === 'none') {
        enEl.style.display = enEl.dataset.originalDisplay || '';
        toggleBtn.textContent = '英語を隠す';
      } else {
        enEl.style.display = 'none';
        toggleBtn.textContent = '英語を見る（任意）';
      }
    });

    copyBtn.addEventListener('click', function () {
      var t = box.textContent || '';
      if (!t) return;
      var done = function () {
        var orig = copyBtn.textContent;
        copyBtn.textContent = '✅ コピーしました';
        setTimeout(function () { copyBtn.textContent = orig; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(done, function () {
          fallbackCopy(t); done();
        });
      } else {
        fallbackCopy(t); done();
      }
    });

    function fallbackCopy(t) {
      var ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }

    wrap.appendChild(box);
    wrap.appendChild(head);

    refresh();
    try {
      var observer = new MutationObserver(refresh);
      observer.observe(enEl, { childList: true, subtree: true, characterData: true });
    } catch (e) {}

    return wrap;
  }

  /* ===== 検出 + マウント ===== */
  function detectAndMount() {
    var selectors = [
      '#prompt-text', '#promptText', '#promptOutput', '#promptOut',
      '#enPrompt', '#positive', '#negative', '.prompt-box'
    ];
    var seen = [];
    selectors.forEach(function (sel) {
      try {
        document.querySelectorAll(sel).forEach(function (el) {
          if (el.id === 'jpPrompt') return;
          if (seen.indexOf(el) !== -1) return;
          seen.push(el);
          var blk = makeBlock(el);
          if (blk && el.parentNode) {
            el.parentNode.insertBefore(blk, el);
          }
        });
      } catch (e) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectAndMount);
  } else {
    detectAndMount();
  }
})();
