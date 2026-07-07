(function(){
  // share-widget.js v2 (統合版 2026-07-07) -- LINE / X / コピーの共有ボタン
  // インラインカード型 (related-widget と同列・.back-link 前) + 旧FAB版の実装資産を統合:
  //   多重ロードガード / x.com intent + ハッシュタグ / title 60字切詰 / トースト通知 / secureContext対応コピー
  if (window.__nekoShareWidgetLoaded) return;
  window.__nekoShareWidgetLoaded = true;

  var SITE_TAG = 'ネコポケ';

  function getShareTitle(){
    var h1 = document.querySelector('h1');
    var t = (h1 && h1.textContent.trim()) || document.title || '';
    t = t.replace(/\s+/g, ' ').trim();
    if (t.length > 60) t = t.slice(0, 58) + '…';
    return t;
  }
  function getShareUrl(){
    var c = document.querySelector('link[rel="canonical"]');
    return (c && c.href) ? c.href : window.location.href.split('#')[0];
  }
  function buildXUrl(title, url){
    return 'https://x.com/intent/tweet'
      + '?text=' + encodeURIComponent(title)
      + '&url='  + encodeURIComponent(url)
      + '&hashtags=' + encodeURIComponent(SITE_TAG);
  }
  function buildLineUrl(url){
    return 'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(url);
  }

  function copyText(text, cb){
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function(){ cb(true); }, function(){ cb(false); });
      return;
    }
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      cb(!!ok);
    } catch(e){ cb(false); }
  }

  function showToast(msg){
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = [
      'position:fixed','left:50%','bottom:88px','transform:translateX(-50%)',
      'background:rgba(40,40,40,0.92)','color:#fff','padding:10px 18px',
      'border-radius:20px','font-size:0.85rem','z-index:10000',
      'box-shadow:0 2px 8px rgba(0,0,0,0.25)','pointer-events:none',
      'opacity:0','transition:opacity 0.2s'
    ].join(';');
    document.body.appendChild(t);
    requestAnimationFrame(function(){ t.style.opacity = '1'; });
    setTimeout(function(){
      t.style.opacity = '0';
      setTimeout(function(){ if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, 1600);
  }

  var anchors = document.querySelectorAll('.back-link');
  var anchor = anchors[anchors.length - 1];
  if(!anchor) return;

  var title = getShareTitle();
  var url = getShareUrl();

  var box = document.createElement('div');
  box.className = 'no-print';
  box.id = 'share-widget';
  box.style.cssText = 'max-width:600px;margin:1rem auto;padding:0.9rem 1.2rem;background:#fff;border:1.5px solid #e8ddd0;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,0.06);';

  var heading = document.createElement('p');
  heading.textContent = '📤 このアプリを共有';
  heading.style.cssText = 'font-size:0.78rem;font-weight:700;color:#888;letter-spacing:0.06em;margin-bottom:0.6rem;';
  box.appendChild(heading);

  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:0.5rem;flex-wrap:wrap;';

  function btnCss(bg, fg){
    return 'display:inline-block;padding:0.55rem 1rem;font-size:0.88rem;font-weight:700;color:' + fg + ';background:' + bg + ';border-radius:9px;text-decoration:none;border:none;cursor:pointer;';
  }

  var lineBtn = document.createElement('a');
  lineBtn.textContent = 'LINEで送る';
  lineBtn.href = buildLineUrl(url);
  lineBtn.target = '_blank';
  lineBtn.rel = 'noopener';
  lineBtn.style.cssText = btnCss('#06C755', '#fff');
  row.appendChild(lineBtn);

  var xBtn = document.createElement('a');
  xBtn.textContent = 'Xでポスト';
  xBtn.href = buildXUrl(title, url);
  xBtn.target = '_blank';
  xBtn.rel = 'noopener';
  xBtn.style.cssText = btnCss('#000', '#fff');
  row.appendChild(xBtn);

  var copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.textContent = 'リンクをコピー';
  copyBtn.style.cssText = btnCss('#f5f0e8', '#1c1917') + 'border:1px solid #e8ddd0;';
  copyBtn.addEventListener('click', function(){
    copyText(title + ' ' + url, function(ok){
      showToast(ok ? 'リンクをコピーしました' : 'コピーできませんでした');
    });
  });
  row.appendChild(copyBtn);

  box.appendChild(row);
  anchor.parentNode.insertBefore(box, anchor);
})();
