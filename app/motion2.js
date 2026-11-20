/* حركات بإحساس التطبيقات الحديثة (خالد 2026-11-20، أفكار من تطبيق "وصلة": الفكرة بس، مش كودهم):
   1) موجة من مكان اللمسة على الزراير والكروت: طبقة fixed فوق العنصر بنفس استدارته، فمابتغيّرش مكان ولا شكل أي حاجة.
   2) حركة "سوستة" (window.RdSpring) للنوافذ ودخول الصفحات: linear() لو المتصفح بيفهمه، وإلا الحركة القديمة زي ما هي.
   3) القايمة بتتمط شوية لما توصل لأولها أو آخرها وانت بتسحب، وترجع بسوستة (أندرويد بس؛ الآيفون عنده الحركة دي لوحده).
   كله بيقف مع "وقّف الحركة" (body.still) وreduced-motion. */
(function () {
  const still = () => document.body.classList.contains('still') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // سوستة خفيفة (بتعدّي شوية وترجع)، متولّدة من معادلة spring وبتتكتب كنقط linear()
  const springPts = (() => { const k = 170, c = 18, pts = []; let x = 0, v = 0; for (let i = 0; i <= 60; i++) { pts.push(+x.toFixed(4)); for (let j = 0; j < 10; j++) { const a = -k * (x - 1) - c * v; v += a * 0.0015; x += v * 0.0015; } } pts[pts.length - 1] = 1; return pts; })();
  const ok = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)');
  window.RdSpring = ok ? 'linear(' + springPts.join(', ') + ')' : '';

  /* ---------- 1) الموجة ---------- */
  const SEL = 'button, .card[data-tk], [data-tk], .act, .sh-sec, .rowbtn, .chip, a.btn, .tile';
  let layer = null;
  function ripple(e) {
    if (still() || e.button > 0) return;
    const el = e.target.closest(SEL); if (!el || el.disabled || el.closest('[data-noripple]')) return;
    const r = el.getBoundingClientRect(); if (r.width < 24 || r.height < 18 || r.width > innerWidth * 1.2) return;
    if (!layer) { layer = document.createElement('div'); layer.className = 'rpl-layer'; document.body.appendChild(layer); }
    const cs = getComputedStyle(el), box = document.createElement('div'), dot = document.createElement('i');
    box.className = 'rpl-box'; box.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:${cs.borderRadius}`;
    const x = e.clientX - r.left, y = e.clientY - r.top, d = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y)) * 2;
    dot.style.cssText = `left:${x - d / 2}px;top:${y - d / 2}px;width:${d}px;height:${d}px`;
    // لون الموجة: فاتح على الزراير الغامقة، وغامق شوية على الفاتحة
    // الزرار من غير خلفية (أو شبه شفاف): بنبص على خلفية الصفحة (الغامق = موجة فاتحة)
    const lumOf = c => { const b = String(c || '').match(/\d+(\.\d+)?/g); return b && b.length >= 3 && (b[3] == null || +b[3] > 0.4) ? (0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2]) / 255 : null; };
    let lum = lumOf(cs.backgroundColor); if (lum == null) lum = lumOf(getComputedStyle(document.body).backgroundColor); if (lum == null) lum = 1;
    dot.style.background = lum < 0.55 ? 'rgba(255,255,255,.28)' : 'rgba(29,79,184,.14)';
    box.appendChild(dot); layer.appendChild(box);
    const grow = dot.animate([{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    let gone = false; const fade = () => { if (gone) return; gone = true; const f = box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: Math.max(0, 140 - (grow.currentTime || 0) / 3), fill: 'forwards' }); f.onfinish = () => box.remove(); };
    const up = () => { removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true); fade(); };
    addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true); setTimeout(fade, 900);
  }
  document.addEventListener('pointerdown', ripple, { capture: true, passive: true });
  // السكرول: الموجة بتختفي على طول (كانت هتفضل متعلّقة مكانها والكارت بيتحرك)
  document.addEventListener('scroll', () => { if (layer) layer.innerHTML = ''; }, { capture: true, passive: true });

  /* ---------- 3) القايمة بتتمط ---------- */
  const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!iOS) {
    let sc = null, y0 = 0, edge = 0, cur = 0;
    const box = t => t.closest && t.closest('.view.on, #sheet:not([hidden])');
    document.addEventListener('touchstart', e => { if (still() || e.touches.length !== 1) return; sc = box(e.target); y0 = e.touches[0].clientY; edge = 0; cur = 0; }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (!sc) return; const dy = e.touches[0].clientY - y0;
      if (!edge) { const top = sc.scrollTop <= 0, bot = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 1; edge = dy > 6 && top ? 1 : dy < -6 && bot ? -1 : 0; if (!edge) { if (Math.abs(dy) > 12) sc = null; return; } }
      const pull = Math.max(0, edge * dy); cur = Math.min(0.055, pull / 2600) ;   // بحد أقصى 5.5% زي أندرويد
      sc.style.transformOrigin = edge > 0 ? '50% 0' : '50% 100%'; sc.style.transform = `scaleY(${1 + cur})`;
    }, { passive: true });
    const end = () => {
      if (!sc || !cur) { sc = null; return; } const el = sc; sc = null;
      const an = el.animate([{ transform: el.style.transform }, { transform: 'scaleY(1)' }], { duration: 420, easing: window.RdSpring || 'cubic-bezier(.2,.8,.2,1)' });
      el.style.transform = ''; an.onfinish = () => { el.style.transformOrigin = ''; };
    };
    document.addEventListener('touchend', end, { passive: true }); document.addEventListener('touchcancel', end, { passive: true });
  }
})();
