(function(){
  // share-widget.js -- LINE / X 共有ボタン (外部JS・APIキー不要の素リンク方式)
  // related-widget.js と同じ流儀: IIFE / .back-link 前に挿入 / no-print
  function pageUrl(){
    var c = document.querySelector('link[rel="canonical"]');
    return (c && c.href) ? c.href : window.location.href;
  }
  function pageTitle(){
    var h1 = document.querySelector('h1');
    return (h1 ? h1.textContent : document.title).trim();
  }

  var url = pageUrl();
  var text = pageTitle() + ' | ネコポケ';
  var lineHref = 'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(url);
  var xHref = 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text);
  var copyText = text + ' ' + url;

  var anchors = document.querySelectorAll('.back-link');
  var anchor = anchors[anchors.length - 1];
  if(!anchor) return;

  var box = document.createElement('div');
  box.className = 'no-print';
  box.id = 'share-widget';
  box.style.cssText = 'max-width:600px;margin:1rem auto;padding:0.9rem 1.2rem;background:#fff;border:1.5px solid #e8ddd0;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,0.06);';

  var title = document.createElement('p');
  title.textContent = '📤 このアプリを共有';
  title.style.cssText = 'font-size:0.78rem;font-weight:700;color:#888;letter-spacing:0.06em;margin-bottom:0.6rem;';
  box.appendChild(title);

  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:0.5rem;flex-wrap:wrap;';

  function makeBtn(label, bg, fg){
    var a = document.createElement('a');
    a.textContent = label;
    a.target = '_blank';
    a.rel = 'noopener';
    a.style.cssText = 'display:inline-block;padding:0.55rem 1rem;font-size:0.88rem;font-weight:700;color:' + fg + ';background:' + bg + ';border-radius:9px;text-decoration:none;';
    return a;
  }

  var lineBtn = makeBtn('LINEで送る', '#06C755', '#fff');
  lineBtn.href = lineHref;
  row.appendChild(lineBtn);

  var xBtn = makeBtn('Xでポスト', '#000', '#fff');
  xBtn.href = xHref;
  row.appendChild(xBtn);

  var copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.textContent = 'リンクをコピー';
  copyBtn.style.cssText = 'padding:0.55rem 1rem;font-size:0.88rem;font-weight:700;color:#1c1917;background:#f5f0e8;border:1px solid #e8ddd0;border-radius:9px;cursor:pointer;';
  copyBtn.addEventListener('click', function(){
    function done(){ copyBtn.textContent = 'コピーしました'; setTimeout(function(){ copyBtn.textContent = 'リンクをコピー'; }, 1500); }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(copyText).then(done).catch(function(){});
    } else {
      var t = document.createElement('textarea');
      t.value = copyText; document.body.appendChild(t); t.select();
      try{ document.execCommand('copy'); done(); }catch(e){}
      document.body.removeChild(t);
    }
  });
  row.appendChild(copyBtn);

  box.appendChild(row);
  anchor.parentNode.insertBefore(box, anchor);
})();
