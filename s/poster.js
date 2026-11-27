/* بانر العروض كبوستر (خالد 2026-11-20، أفكار من تطبيق "وصلة"): نفس الملف في المتجر (site/s) والكاشير (renderer، صفحة البانر)
   علشان المعاينة تبقى بالظبط زي اللي العميل بيشوفه. ES5 (الآيفونات القديمة). اختبار tests/poster-sync.test.mjs بيتأكد إن النسختين زي بعض.
   bn ("فول كاستمايز" 2026-11-21/22، كل حاجة اختيارية وليها افتراضي):
     st: card | p1 شرايط | p2 نقط ونجمة | p3 كشّاف | p4 موجات | p5 فقاعات | p6 نيون
     col: '' | shop | custom | red | navy | night | green | purple | orange — c1/c2: ألوان custom — bg: صورة خلفية، dim: غمقان الكلام 0..80
     pp: l | n — pf: raw | card | circle — pz: 70..140
     stk: pct | amt | new | none — sks: '' | circle | rect | tag — skc: '' | y | r | w | g — skw
     hs: 80..140 — was — cta + cs (s|m|l) + cc ('' | w | o | y | n) — tm + ts (box|line)
     الحركة: anim (الكل) + mbg الخلفية + mpr المنتج بيطفو + mst الستيكر بينطّ + msh لمعة العنوان (افتراضي في الكشّاف بس)
     rot: يقلب كل 0|3|5|8 ثواني — ps: صور الإعلانات [{ im, go }] و pm: mix | only
     ov: { <id المنتج>: شكل العرض ده لوحده } (2026-11-22: "أعدّل البانر لكل إعلان لوحده")
     lay: مقاسات وأماكن لكل جهاز لوحده (خالد 2026-11-22: "بانر الكمبيوتر يبقى ليه تعديلات لوحده"، وبيتسحب بالماوس في صفحة البانر)
       { m: موبايل, d: كمبيوتر, s: إعلان جانبي, w: إعلان عريض (2026-11-27، إعلانات الكمبيوتر بنظام البانر) } وكل واحد { <عنصر>: [x, y, حجم%], g: المسافة بين السطور, w: عرض الكلام% }
       العناصر ELS. x/y بالبكسل على مقاس مرجعي (عرض البانر من جوه = 360 على الموبايل و1112 على الكمبيوتر، والطول على الكمبيوتر بكسل عادي) فبيتكبّروا مع البانر */
(function (W) {
  var PAL = { red: ['#c92a43', '#ee6a35'], navy: ['#0d2557', '#1d4fb8'], night: ['#1a1033', '#3a1c5c'], green: ['#0b6b3a', '#139a6a'], purple: ['#4a2196', '#7c4ddb'], orange: ['#a53d06', '#d9620b'] };
  var DEF = { p1: 'red', p2: 'navy', p3: 'night', p4: 'purple', p5: 'orange', p6: 'night' };
  var STYLES = ['card', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  var PAGES = ['svc', 'repair', 'bill', 'trade', 'wish'];   // صفحات المتجر اللي البوستر الصورة يقدر يفتحها
  var KEYS = ['st', 'col', 'c1', 'c2', 'bg', 'dim', 'pp', 'pf', 'pz', 'stk', 'sks', 'skc', 'skw', 'hs', 'was', 'cta', 'cs', 'cc', 'tm', 'ts', 'anim', 'mbg', 'mpr', 'mst', 'msh', 'lay'];
  /* المقاسات: m موبايل (360 عرض)، d كمبيوتر (1112)، s إعلان جانبي (تصميم الموبايل على لوحة 360 × 180)، w إعلان عريض (تصميم الكمبيوتر على لوحة 1112 × 200).
     الإعلانين بيتصغّروا/بيتكبّروا على قد مكانهم (store.js pvFit) فبيطلعوا زي المعاينة بالظبط */
  var DEVS = ['m', 'd', 's', 'w'], AD = { s: [360, 180], w: [1112, 200] };
  var ELS = ['sub', 'h', 'pr', 'tm', 'cta', 'prod', 'stk', 'stt'];   // stt: كلام الستيكر (حجم بس)   // اللي يتعدّل لكل عرض لوحده
  var IMG = /^poster-[0-9a-f]{8}\.(webp|jpg|png)$/, HEX = /^#[0-9a-f]{6}$/i, PID = /^[\w-]{1,40}$/;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // لون المحل: الفاتح زي ما هو والغامق أغمق 35% (من غير color-mix علشان الآيفون القديم)
  function dark(hex, k) { var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); if (!m) return '#0d2557'; var n = parseInt(m[1], 16), f = function (v) { return Math.max(0, Math.round(v * (1 - k))); }; return '#' + ((1 << 24) + (f(n >> 16 & 255) << 16) + (f(n >> 8 & 255) << 8) + f(n & 255)).toString(16).slice(1); }
  /* لون المحل الفاتح (زي الأصفر) مع كلام البانر الأبيض كان مش باين (2026-11-27، الوضوح 2.1): بناخد درجة أغمق من نفس اللون لحد ما الأبيض يبقى واضح (4.5+).
     الألوان الغامقة (الأزرق والأخضر الغامق...) زي ما هي بالظبط */
  function lum(hex) { var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); if (!m) return 0; var n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255].reduce(function (s, v, i) { v /= 255; v = v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0); }
  function forWhite(hex) { if (!/^#?[0-9a-f]{6}$/i.test(String(hex || ''))) return hex; var k = 0, c = hex; while (lum(c) > 0.18 && k < 0.8) { k += 0.05; c = dark(hex, k); } return c; }
  function one(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function num(v, a, b, d) { v = Math.round(+v); return v >= a && v <= b ? v : d; }
  function lay(v) {
    var o = { m: {}, d: {}, s: {}, w: {} }; if (!v || typeof v !== 'object') return o;
    DEVS.forEach(function (dv) {
      var src = v[dv], r = {}; if (!src || typeof src !== 'object') return;
      ELS.forEach(function (e) { var a = src[e]; if (Object.prototype.toString.call(a) !== '[object Array]') return; var x = num(a[0], -700, 700, 0), y = num(a[1], -300, 300, 0), k = num(a[2], 40, 250, 100); if (x || y || k !== 100) r[e] = [x, y, k]; });
      var g = num(src.g, 0, 40, -1), w = num(src.w, 30, 100, 0); if (g >= 0) r.g = g; if (w) r.w = w; o[dv] = r;
    });
    return o;
  }
  // المتغيرات اللي poster.css بيقراها: --mx-h / --my-h / --mk-h (موبايل) و --dx-h ... (كمبيوتر)
  function layVars(l) {
    var s = ''; DEVS.forEach(function (dv) { var r = l[dv] || {}; ELS.forEach(function (e) { var a = r[e]; if (!a) return; if (a[0]) s += ';--' + dv + 'x-' + e + ':' + a[0]; if (a[1]) s += ';--' + dv + 'y-' + e + ':' + a[1]; if (a[2] !== 100) s += ';--' + dv + 'k-' + e + ':' + a[2] / 100; }); if (r.g != null) s += ';--' + dv + 'g:' + r.g; if (r.w) s += ';--' + dv + 'w:' + r.w; });
    return s;
  }
  function style(bn) {
    var st = one(bn.st, STYLES, 'card');
    return { st: st, col: PAL[bn.col] || bn.col === 'shop' || (bn.col === 'custom' && HEX.test(bn.c1 || '') && HEX.test(bn.c2 || '')) ? bn.col : '',
      c1: HEX.test(bn.c1 || '') ? bn.c1 : '', c2: HEX.test(bn.c2 || '') ? bn.c2 : '', bg: IMG.test(bn.bg || '') ? bn.bg : '', dim: num(bn.dim, 0, 80, 55),
      pp: one(bn.pp, ['l', 'n'], 'l'), pf: one(bn.pf, ['raw', 'card', 'circle'], 'raw'), pz: num(bn.pz, 70, 140, 100),
      stk: one(bn.stk, ['pct', 'amt', 'new', 'none'], 'pct'), sks: one(bn.sks, ['circle', 'rect', 'tag', 'glass'], ''), skc: one(bn.skc, ['y', 'r', 'w', 'g'], ''), skw: String(bn.skw || '').slice(0, 12),
      hs: num(bn.hs, 80, 140, 100), was: bn.was !== false, cta: String(bn.cta || '').slice(0, 24), cs: one(bn.cs, ['s', 'm', 'l'], 'm'), cc: one(bn.cc, ['w', 'o', 'y', 'n'], ''),
      tm: bn.tm !== false, ts: one(bn.ts, ['box', 'line'], 'box'), anim: bn.anim !== false, mbg: bn.mbg !== false, mpr: bn.mpr !== false, mst: bn.mst !== false, msh: bn.msh == null ? st === 'p3' : !!bn.msh, lay: lay(bn.lay) };
  }
  function clean(bn) {
    bn = bn && typeof bn === 'object' ? bn : {};
    var ps = (Object.prototype.toString.call(bn.ps) === '[object Array]' ? bn.ps : []).filter(function (x) { return x && IMG.test(x.im); }).slice(0, 5)
      .map(function (x) { var o = { im: x.im, imd: IMG.test(x.imd || '') ? x.imd : '', go: /^(p|c|g):[^\s<>"'&]{1,40}$/.test(x.go || '') ? x.go : '' }; if (IMG.test(x.ib || '')) o.ib = x.ib; if (IMG.test(x.ibd || '')) o.ibd = x.ibd; return o; });   // imd: صورة عريضة للكمبيوتر (اختياري). ib / ibd: أول فريم صغير ثابت (للموبايل / للكمبيوتر) للخلفية المتغبّشة لو الإعلان متحرك (2026-11-22)
    // pm: الصور مع عروض البانر (mix) أو لوحدها مكانها (only). st 'img' من النسخة الأولى (2.58.3) = لوحدها
    var out = style(bn), ov = {}, n = 0, src = bn.ov && typeof bn.ov === 'object' ? bn.ov : {};
    for (var k in src) { if (n >= 30 || !PID.test(k) || !src[k] || typeof src[k] !== 'object') continue; var mix = {}, i; for (i = 0; i < KEYS.length; i++) mix[KEYS[i]] = KEYS[i] in src[k] ? src[k][KEYS[i]] : out[KEYS[i]]; ov[k] = style(mix); n++; }
    out.pm = bn.st === 'img' || bn.pm === 'only' ? 'only' : 'mix'; out.ps = ps; out.rot = [0, 3, 5, 8].indexOf(+bn.rot) >= 0 ? +bn.rot : 5; out.ov = ov;
    return out;
  }
  // شكل عرض معيّن: لو ليه شكل لوحده (ov) بيتطبق، وإلا شكل كل العروض
  function forP(bn, id) { var b = clean(bn), o = id && b.ov[id]; if (!o) return b; var r = {}, k; for (k in b) r[k] = b[k]; for (k in o) r[k] = o[k]; return r; }
  function on(bn) { return clean(bn).st !== 'card'; }
  // البوسترات الصور: [{ im: اسم الصورة، go: 'p:<منتج>' | 'c:<قسم>' | 'g:<صفحة>' | '' (العروض) }]
  function imgs(bn) { return clean(bn).ps; }
  function goOf(x) { var k = x.go.slice(2); return /^p:/.test(x.go) ? '#/p/' + encodeURIComponent(k) : /^c:/.test(x.go) ? '#/c/' + encodeURIComponent(k) : /^g:/.test(x.go) && PAGES.indexOf(k) >= 0 ? '#/' + k : '#/c/_off'; }
  // الكلاس والألوان للزرار اللي بره (div / button)
  // base = لينك فولدر صور المحل (.../store/<slug>/i/): لو فيه صورة خلفية (bg) بتبقى ورا البوستر بدل الألوان
  function attrs(bn, shopAc, base) {
    var b = bn && bn.ov ? bn : clean(bn); b = style(b); if (b.st === 'card') return { cls: '', style: '' };
    var sa = forWhite(shopAc || '#1d4fb8'), c = b.col === 'shop' ? [dark(sa, 0.38), sa] : b.col === 'custom' ? [b.c1, b.c2] : PAL[b.col || DEF[b.st]];
    var bgi = b.bg && base ? ";--pimg:url('" + base + b.bg + "')" : '';
    var cls = ' pst pst-' + b.st + (b.anim ? '' : ' pst-still') + (b.mbg ? '' : ' no-mbg') + (b.mpr ? '' : ' no-mpr') + (b.mst ? '' : ' no-mst') + (b.msh ? ' sh-on' : ' sh-off')
      + (bgi ? ' pst-bgi' : '') + (b.pp === 'n' ? ' pp-n' : '') + (b.pf !== 'raw' ? ' pf-' + b.pf : '') + (b.cs !== 'm' ? ' cs-' + b.cs : '') + (b.cc ? ' cc-' + b.cc : '') + (b.ts === 'line' ? ' ts-line' : '');
    return { cls: cls, style: '--pa:' + c[0] + ';--pb:' + c[1] + ';--hs:' + b.hs / 100 + ';--pz:' + b.pz / 100 + ';--pdim:' + b.dim / 100 + layVars(b.lay) + bgi };
  }
  /* d = { name, pic (HTML جاهز: <img> أو إيموجي)، img (فيه صورة؟)، price (HTML)، was (HTML أو '')، pct، save (HTML: الفرق)، timer (HTML)، sub } */
  function html(bn, d) {
    var b = style(bn && bn.ov ? bn : clean(bn)), stk = '', sc = b.skc ? ' sc-' + b.skc : '';
    // الستيكر: الكلمة صغيرة فوق والرقم كبير تحت. الشكل تلقائي (الخصم دايرة، وفّر مستطيل بكيرف، الكلمة بس شريطة) أو اللي المحل اختاره
    var shape = function (auto) { var s = b.sks || auto; return s === 'rect' ? ' amt' : s === 'tag' ? ' tag' : s === 'glass' ? ' gls' : ''; };   // glass: كبسولة شفافة (خالد 2026-11-27 من الإعلان الجانبي القديم)
    if (b.stk === 'pct' && d.pct > 0) stk = '<span class="pst-stk' + shape('circle') + sc + '"><span class="pst-stt"><small>' + esc(b.skw || 'خصم') + '</small><b dir="ltr">' + Math.round(d.pct) + '%</b></span></span>';
    else if (b.stk === 'amt' && d.save) stk = '<span class="pst-stk' + shape('rect') + sc + (String(d.save).replace(/<[^>]*>/g, '').trim().length > 5 ? ' lg' : '') + '"><span class="pst-stt"><small>' + esc(b.skw || 'وفّر') + '</small><b><bdi>' + d.save + '</bdi></b></span></span>';
    else if (b.stk === 'new') stk = '<span class="pst-stk one' + shape('tag') + sc + '"><span class="pst-stt"><b>' + esc(b.skw || 'جديد') + '</b></span></span>';
    var extra = b.st === 'p2' ? '<svg class="pst-burst" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 0 L58 30 L88 20 L70 45 L100 55 L70 62 L84 92 L55 74 L42 100 L38 70 L8 82 L28 58 L0 42 L30 36 L18 8 L44 26 Z"/></svg>'
      : b.st === 'p3' ? '<span class="pst-beam" aria-hidden="true"></span>'
      : b.st === 'p4' ? '<span class="pst-wave w1" aria-hidden="true"></span><span class="pst-wave w2" aria-hidden="true"></span>'
      : b.st === 'p5' ? '<span class="pst-bub" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>'
      : b.st === 'p6' ? '<span class="pst-ring" aria-hidden="true"></span><span class="pst-core" aria-hidden="true"></span>' : '';
    return '<span class="pst-bg" aria-hidden="true"></span>' + extra
      + '<span class="pst-copy"><small class="pst-sub">⚡ ' + esc(d.sub || 'عرض لفترة محدودة') + '</small><b class="pst-h">' + esc(d.name) + '</b>'
      + '<span class="pst-pr"><strong>' + d.price + '</strong>' + (d.was && b.was ? '<s>' + d.was + '</s>' : '') + '</span>'
      + (d.timer && b.tm ? '<span class="pst-tm">' + d.timer + '</span>' : '')
      + '<span class="pst-cta">' + esc(b.cta || 'اطلب دلوقتي') + ' ←</span></span>'
      + (b.pp === 'n' ? '' : '<span class="pst-prod' + (d.img ? ' im' : '') + '">' + d.pic + '</span>') + stk;
  }
  // الكلام أطول من البانر (مقاسات كبيرة، أو خط المتجر Cairo أطول من خط الكاشير): الكلام كله بيصغر سوا (--fitk) لحد ما آخر حاجة
  // (الزرار) تبان جوه البانر، فمابيتقصش أبدًا. بيرجّع النسبة (1 = مااتصغرش). 2026-11-22
  function fit(el) {
    var cp = el && el.querySelector && el.querySelector('.pst-copy'); if (!cp || !cp.lastElementChild) return 1;
    el.style.setProperty('--fitk', '1'); var k = 1, last = cp.lastElementChild;
    for (var i = 0; i < 14; i++) {
      var need = last.offsetTop + last.offsetHeight, have = cp.clientHeight; if (!have || need <= have + 1) break;
      k = Math.max(0.55, k * Math.max(0.9, have / need) - 0.005); el.style.setProperty('--fitk', k.toFixed(3)); if (k <= 0.55) break;
    }
    return k;
  }
  W.RdPoster = { DEVS: DEVS, AD: AD, clean: clean, fit: fit, style: style, forP: forP, KEYS: KEYS, on: on, imgs: imgs, goOf: goOf, PAGES: PAGES, attrs: attrs, html: html, PAL: PAL, DEF: DEF, STYLES: STYLES, ELS: ELS, lay: lay };
})(window);
