/* بانر العروض كبوستر (خالد 2026-11-20، أفكار من تطبيق "وصلة"): نفس الملف في المتجر (site/s) والكاشير (renderer، معاينة إعدادات المتجر)
   علشان المعاينة تبقى بالظبط زي اللي العميل بيشوفه. ES5 (الآيفونات القديمة). اختبار tests/poster-sync.test.mjs بيتأكد إن النسختين زي بعض.
   bn = { st: card | p1 | p2 | p3, col: '' | shop | red | navy | night | green | purple | orange, stk: pct | amt | none, cta: نص الزرار, anim: false = من غير حركة } */
(function (W) {
  var PAL = { red: ['#c92a43', '#ee6a35'], navy: ['#0d2557', '#1d4fb8'], night: ['#1a1033', '#3a1c5c'], green: ['#0b6b3a', '#139a6a'], purple: ['#4a2196', '#7c4ddb'], orange: ['#a53d06', '#d9620b'] };
  var DEF = { p1: 'red', p2: 'navy', p3: 'night' };
  var STYLES = ['card', 'p1', 'p2', 'p3', 'img'];   // img = بوستر صورة من عند المحل (خالد 2026-11-21)
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // لون المحل: الفاتح زي ما هو والغامق أغمق 35% (من غير color-mix علشان الآيفون القديم)
  function dark(hex, k) { var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); if (!m) return '#0d2557'; var n = parseInt(m[1], 16), f = function (v) { return Math.max(0, Math.round(v * (1 - k))); }; return '#' + ((1 << 24) + (f(n >> 16 & 255) << 16) + (f(n >> 8 & 255) << 8) + f(n & 255)).toString(16).slice(1); }
  function clean(bn) {
    bn = bn && typeof bn === 'object' ? bn : {};
    var ps = (Object.prototype.toString.call(bn.ps) === '[object Array]' ? bn.ps : []).filter(function (x) { return x && /^poster-[0-9a-f]{8}\.(webp|jpg|png)$/.test(x.im); }).slice(0, 5)
      .map(function (x) { return { im: x.im, go: /^(p|c):[^\s<>"'&]{1,40}$/.test(x.go || '') ? x.go : '' }; });
    return { st: STYLES.indexOf(bn.st) >= 0 ? bn.st : 'card', col: PAL[bn.col] || bn.col === 'shop' ? bn.col : '', stk: bn.stk === 'amt' || bn.stk === 'none' ? bn.stk : 'pct', cta: String(bn.cta || '').slice(0, 24), anim: bn.anim !== false, ps: ps };
  }
  function on(bn) { var s = clean(bn).st; return s !== 'card' && s !== 'img'; }   // بوستر بالمنتج (مش صورة)
  // البوسترات الصور: [{ im: اسم الصورة، go: 'p:<منتج>' | 'c:<قسم>' | '' (العروض) }]
  function imgs(bn) { var b = clean(bn); return b.st === 'img' ? b.ps : []; }
  function goOf(x) { return /^p:/.test(x.go) ? '#/p/' + encodeURIComponent(x.go.slice(2)) : /^c:/.test(x.go) ? '#/c/' + encodeURIComponent(x.go.slice(2)) : '#/c/_off'; }
  // الكلاس والألوان للزرار اللي بره (div / button)
  function attrs(bn, shopAc) {
    var b = clean(bn); if (b.st === 'card' || b.st === 'img') return { cls: '', style: '' };
    var c = b.col === 'shop' ? [dark(shopAc, 0.38), shopAc || '#1d4fb8'] : PAL[b.col || DEF[b.st]];
    return { cls: ' pst pst-' + b.st + (b.anim ? '' : ' pst-still'), style: '--pa:' + c[0] + ';--pb:' + c[1] };
  }
  /* d = { name, pic (HTML جاهز: <img> أو إيموجي)، img (فيه صورة؟)، price (HTML)، was (HTML أو '')، pct، save (HTML: الفرق)، timer (HTML)، sub } */
  function html(bn, d) {
    var b = clean(bn), stk = '';
    // سطر واحد (خالد 2026-11-20: "وفّر 200 ج / خصم 31% مش مظبوط شكلهم على التليفون" لما كانوا رقم فوق كلمة)
    // دايرة: الكلمة صغيرة فوق والرقم كبير تحت، والمبلغ الطويل بخط أصغر علشان يفضل جوه الدايرة
    if (b.stk === 'pct' && d.pct > 0) stk = '<span class="pst-stk"><small>خصم</small><b dir="ltr">' + Math.round(d.pct) + '%</b></span>';
    else if (b.stk === 'amt' && d.save) stk = '<span class="pst-stk' + (String(d.save).replace(/<[^>]*>/g, '').trim().length > 5 ? ' lg' : '') + '"><small>وفّر</small><b><bdi>' + d.save + '</bdi></b></span>';
    var extra = b.st === 'p2' ? '<svg class="pst-burst" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 0 L58 30 L88 20 L70 45 L100 55 L70 62 L84 92 L55 74 L42 100 L38 70 L8 82 L28 58 L0 42 L30 36 L18 8 L44 26 Z"/></svg>' : b.st === 'p3' ? '<span class="pst-beam" aria-hidden="true"></span>' : '';
    return '<span class="pst-bg" aria-hidden="true"></span>' + extra
      + '<span class="pst-copy"><small class="pst-sub">⚡ ' + esc(d.sub || 'عرض لفترة محدودة') + '</small><b class="pst-h">' + esc(d.name) + '</b>'
      + '<span class="pst-pr"><strong>' + d.price + '</strong>' + (d.was ? '<s>' + d.was + '</s>' : '') + '</span>'
      + (d.timer ? '<span class="pst-tm">' + d.timer + '</span>' : '')
      + '<span class="pst-cta">' + esc(b.cta || 'اطلب دلوقتي') + ' ←</span></span>'
      + '<span class="pst-prod' + (d.img ? ' im' : '') + '">' + d.pic + '</span>' + stk;
  }
  W.RdPoster = { clean: clean, on: on, imgs: imgs, goOf: goOf, attrs: attrs, html: html, PAL: PAL, DEF: DEF, STYLES: STYLES };
})(window);
