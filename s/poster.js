/* بانر العروض كبوستر (خالد 2026-11-20، أفكار من تطبيق "وصلة"): نفس الملف في المتجر (site/s) والكاشير (renderer، صفحة البانر)
   علشان المعاينة تبقى بالظبط زي اللي العميل بيشوفه. ES5 (الآيفونات القديمة). اختبار tests/poster-sync.test.mjs بيتأكد إن النسختين زي بعض.
   bn (من 2026-11-21 "فول كاستمايز"، كل حاجة اختيارية وليها افتراضي):
     st: card | p1 | p2 | p3 — col: '' | shop | custom | red | navy | night | green | purple | orange — c1/c2: ألوان custom — bg: صورة خلفية، dim: غمقان الكلام 0..80
     pp: l (صورة المنتج شمال) | n (من غير) — pf: raw | card (كارت أبيض) | circle — pz: حجم الصورة 70..140
     stk: pct | amt | new (كلمة بس) | none — sks: '' (تلقائي) | circle | rect | tag — skc: '' | y | r | w | g — skw: كلمة الستيكر
     hs: حجم العنوان 80..140 — was: السعر القديم — cta + cs (s|m|l) + cc ('' | w | o | y | n) — tm: التايمر، ts: box | line — anim — rot: يقلب كل 0|3|5|8 ثواني
     ps: صور الإعلانات [{ im, go }] و pm: mix | only */
(function (W) {
  var PAL = { red: ['#c92a43', '#ee6a35'], navy: ['#0d2557', '#1d4fb8'], night: ['#1a1033', '#3a1c5c'], green: ['#0b6b3a', '#139a6a'], purple: ['#4a2196', '#7c4ddb'], orange: ['#a53d06', '#d9620b'] };
  var DEF = { p1: 'red', p2: 'navy', p3: 'night' };
  var STYLES = ['card', 'p1', 'p2', 'p3'];
  var PAGES = ['svc', 'repair', 'bill', 'trade', 'wish'];   // صفحات المتجر اللي البوستر الصورة يقدر يفتحها
  var IMG = /^poster-[0-9a-f]{8}\.(webp|jpg|png)$/, HEX = /^#[0-9a-f]{6}$/i;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // لون المحل: الفاتح زي ما هو والغامق أغمق 35% (من غير color-mix علشان الآيفون القديم)
  function dark(hex, k) { var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); if (!m) return '#0d2557'; var n = parseInt(m[1], 16), f = function (v) { return Math.max(0, Math.round(v * (1 - k))); }; return '#' + ((1 << 24) + (f(n >> 16 & 255) << 16) + (f(n >> 8 & 255) << 8) + f(n & 255)).toString(16).slice(1); }
  function one(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function num(v, a, b, d) { v = Math.round(+v); return v >= a && v <= b ? v : d; }
  function clean(bn) {
    bn = bn && typeof bn === 'object' ? bn : {};
    var ps = (Object.prototype.toString.call(bn.ps) === '[object Array]' ? bn.ps : []).filter(function (x) { return x && IMG.test(x.im); }).slice(0, 5)
      .map(function (x) { return { im: x.im, go: /^(p|c|g):[^\s<>"'&]{1,40}$/.test(x.go || '') ? x.go : '' }; });
    // pm: الصور مع عروض البانر (mix) أو لوحدها مكانها (only). st 'img' من النسخة الأولى (2.58.3) = لوحدها
    var pm = bn.st === 'img' || bn.pm === 'only' ? 'only' : 'mix';
    return { pm: pm, ps: ps, st: one(bn.st, STYLES, 'card'), col: PAL[bn.col] || bn.col === 'shop' || (bn.col === 'custom' && HEX.test(bn.c1 || '') && HEX.test(bn.c2 || '')) ? bn.col : '',
      c1: HEX.test(bn.c1 || '') ? bn.c1 : '', c2: HEX.test(bn.c2 || '') ? bn.c2 : '', bg: IMG.test(bn.bg || '') ? bn.bg : '', dim: num(bn.dim, 0, 80, 55),
      pp: one(bn.pp, ['l', 'n'], 'l'), pf: one(bn.pf, ['raw', 'card', 'circle'], 'raw'), pz: num(bn.pz, 70, 140, 100),
      stk: one(bn.stk, ['pct', 'amt', 'new', 'none'], 'pct'), sks: one(bn.sks, ['circle', 'rect', 'tag'], ''), skc: one(bn.skc, ['y', 'r', 'w', 'g'], ''), skw: String(bn.skw || '').slice(0, 12),
      hs: num(bn.hs, 80, 140, 100), was: bn.was !== false, cta: String(bn.cta || '').slice(0, 24), cs: one(bn.cs, ['s', 'm', 'l'], 'm'), cc: one(bn.cc, ['w', 'o', 'y', 'n'], ''),
      tm: bn.tm !== false, ts: one(bn.ts, ['box', 'line'], 'box'), anim: bn.anim !== false, rot: [0, 3, 5, 8].indexOf(+bn.rot) >= 0 ? +bn.rot : 5 };
  }
  function on(bn) { return clean(bn).st !== 'card'; }
  // البوسترات الصور: [{ im: اسم الصورة، go: 'p:<منتج>' | 'c:<قسم>' | 'g:<صفحة>' | '' (العروض) }]
  function imgs(bn) { return clean(bn).ps; }
  function goOf(x) { var k = x.go.slice(2); return /^p:/.test(x.go) ? '#/p/' + encodeURIComponent(k) : /^c:/.test(x.go) ? '#/c/' + encodeURIComponent(k) : /^g:/.test(x.go) && PAGES.indexOf(k) >= 0 ? '#/' + k : '#/c/_off'; }
  // الكلاس والألوان للزرار اللي بره (div / button)
  // base = لينك فولدر صور المحل (.../store/<slug>/i/): لو فيه صورة خلفية (bg) بتبقى ورا البوستر بدل الألوان
  function attrs(bn, shopAc, base) {
    var b = clean(bn); if (b.st === 'card') return { cls: '', style: '' };
    var c = b.col === 'shop' ? [dark(shopAc, 0.38), shopAc || '#1d4fb8'] : b.col === 'custom' ? [b.c1, b.c2] : PAL[b.col || DEF[b.st]];
    var bgi = b.bg && base ? ";--pimg:url('" + base + b.bg + "')" : '';
    var cls = ' pst pst-' + b.st + (b.anim ? '' : ' pst-still') + (bgi ? ' pst-bgi' : '') + (b.pp === 'n' ? ' pp-n' : '') + (b.pf !== 'raw' ? ' pf-' + b.pf : '') + (b.cs !== 'm' ? ' cs-' + b.cs : '') + (b.cc ? ' cc-' + b.cc : '') + (b.ts === 'line' ? ' ts-line' : '');
    return { cls: cls, style: '--pa:' + c[0] + ';--pb:' + c[1] + ';--hs:' + b.hs / 100 + ';--pz:' + b.pz / 100 + ';--pdim:' + b.dim / 100 + bgi };
  }
  /* d = { name, pic (HTML جاهز: <img> أو إيموجي)، img (فيه صورة؟)، price (HTML)، was (HTML أو '')، pct، save (HTML: الفرق)، timer (HTML)، sub } */
  function html(bn, d) {
    var b = clean(bn), stk = '', sc = b.skc ? ' sc-' + b.skc : '';
    // الستيكر: الكلمة صغيرة فوق والرقم كبير تحت. الشكل تلقائي (الخصم دايرة، وفّر مستطيل بكيرف، الكلمة بس شريطة) أو اللي المحل اختاره
    var shape = function (auto) { var s = b.sks || auto; return s === 'rect' ? ' amt' : s === 'tag' ? ' tag' : ''; };
    if (b.stk === 'pct' && d.pct > 0) stk = '<span class="pst-stk' + shape('circle') + sc + '"><small>' + esc(b.skw || 'خصم') + '</small><b dir="ltr">' + Math.round(d.pct) + '%</b></span>';
    else if (b.stk === 'amt' && d.save) stk = '<span class="pst-stk' + shape('rect') + sc + (String(d.save).replace(/<[^>]*>/g, '').trim().length > 5 ? ' lg' : '') + '"><small>' + esc(b.skw || 'وفّر') + '</small><b><bdi>' + d.save + '</bdi></b></span>';
    else if (b.stk === 'new') stk = '<span class="pst-stk one' + shape('tag') + sc + '"><b>' + esc(b.skw || 'جديد') + '</b></span>';
    var extra = b.st === 'p2' ? '<svg class="pst-burst" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 0 L58 30 L88 20 L70 45 L100 55 L70 62 L84 92 L55 74 L42 100 L38 70 L8 82 L28 58 L0 42 L30 36 L18 8 L44 26 Z"/></svg>' : b.st === 'p3' ? '<span class="pst-beam" aria-hidden="true"></span>' : '';
    return '<span class="pst-bg" aria-hidden="true"></span>' + extra
      + '<span class="pst-copy"><small class="pst-sub">⚡ ' + esc(d.sub || 'عرض لفترة محدودة') + '</small><b class="pst-h">' + esc(d.name) + '</b>'
      + '<span class="pst-pr"><strong>' + d.price + '</strong>' + (d.was && b.was ? '<s>' + d.was + '</s>' : '') + '</span>'
      + (d.timer && b.tm ? '<span class="pst-tm">' + d.timer + '</span>' : '')
      + '<span class="pst-cta">' + esc(b.cta || 'اطلب دلوقتي') + ' ←</span></span>'
      + (b.pp === 'n' ? '' : '<span class="pst-prod' + (d.img ? ' im' : '') + '">' + d.pic + '</span>') + stk;
  }
  W.RdPoster = { clean: clean, on: on, imgs: imgs, goOf: goOf, PAGES: PAGES, attrs: attrs, html: html, PAL: PAL, DEF: DEF, STYLES: STYLES };
})(window);
