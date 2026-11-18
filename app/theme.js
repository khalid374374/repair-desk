/* شكل التطبيق زي الكاشير (خالد 2026-10-29): نفس الثيمات (اللون)، فاتح / غامق / أسود، Liquid Glass، ووقّف الحركة.
   "زي الكاشير" (الافتراضي): بياخد الشكل من الملخص (look في mobile snapshot) ويفتكره. لو اتقفل: الاختيار من الإعدادات هنا (rdo_look).
   الألوان: كل الثيمات بتتحسب من hue + تشبّع زي renderer/theme.js في البرنامج، وبتتحط كـ متغيرات CSS (app.css كله ماشي عليها). */
(function () {
  const THEMES = [['ocean', 'أزرق هادي', 218, 1], ['teal', 'فيروزي', 184, 0.82], ['sage', 'أخضر مريمية', 152, 0.55], ['mauve', 'موف', 276, 0.66], ['rose', 'أحمر هادي', 350, 0.70], ['orange', 'برتقالي دافي', 24, 0.86], ['graphite', 'رمادي فحمي', 216, 0.16]];
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const own = () => Object.assign({ follow: true, theme: 'ocean', mode: 'dark', glass: false, still: false }, read('rdo_look') || {});
  // الشكل اللي شغال دلوقتي
  function current() {
    const o = own(), c = read('rdo_look_c');
    if (o.follow && c) return { theme: c.theme || 'ocean', mode: c.black ? 'black' : c.dark ? 'dark' : 'light', glass: !!c.glass, still: !!c.still, from: 'cashier' };
    return { theme: o.theme, mode: o.mode, glass: !!o.glass, still: !!o.still, from: o.follow ? 'default' : 'own' };
  }
  const hsl = (h, s, l) => `hsl(${h} ${Math.round(Math.max(0, Math.min(1, s)) * 100)}% ${l}%)`;
  function palette(id, mode) {
    const t = THEMES.find(x => x[0] === id) || THEMES[0], h = t[2], k = t[3];
    const S = v => v * k;
    const acc = { ac: hsl(h, S(0.9), mode === 'light' ? 50 : 60), ac2: hsl(h, S(1), mode === 'light' ? 42 : 75), g1: hsl(h, S(0.9), mode === 'light' ? 58 : 64), g2: hsl(h, S(0.82), mode === 'light' ? 46 : 52) };
    if (mode === 'light') return { ...acc, bg: hsl(h, S(0.45), 95), card: '#ffffff', line: hsl(h, S(0.35), 86), tx: hsl(h, S(0.62), 16), mut: hsl(h, S(0.18), 44), soft: hsl(h, S(0.8), 92), 'soft-tx': hsl(h, S(0.7), 28), 'soft-ln': hsl(h, S(0.6), 80), sk2: hsl(h, S(0.35), 90), hero: hsl(h, S(0.6), 88), inp: hsl(h, S(0.4), 97) };
    if (mode === 'black') return { ...acc, bg: '#000000', card: hsl(h, S(0.08), 7), line: hsl(h, S(0.08), 16), tx: hsl(h, S(0.15), 92), mut: hsl(h, S(0.1), 62), soft: hsl(h, S(0.35), 14), 'soft-tx': hsl(h, S(0.8), 86), 'soft-ln': hsl(h, S(0.35), 26), sk2: hsl(h, S(0.06), 13), hero: hsl(h, S(0.12), 6), inp: hsl(h, S(0.06), 4) };
    return { ...acc, bg: hsl(h, S(0.5), 9), card: hsl(h, S(0.42), 14), line: hsl(h, S(0.38), 22), tx: hsl(h, S(0.4), 93), mut: hsl(h, S(0.22), 65), soft: hsl(h, S(0.52), 24), 'soft-tx': hsl(h, S(0.9), 90), 'soft-ln': hsl(h, S(0.48), 35), sk2: hsl(h, S(0.4), 19), hero: hsl(h, S(0.52), 19), inp: hsl(h, S(0.52), 12) };
  }
  function apply() {
    const c = current(), p = palette(c.theme, c.mode), r = document.documentElement.style;
    for (const [k, v] of Object.entries(p)) r.setProperty('--' + k, v);
    const b = document.body; if (!b) return c;
    b.classList.toggle('light', c.mode === 'light'); b.classList.toggle('black', c.mode === 'black');
    b.classList.toggle('glass', c.glass); b.classList.toggle('still', c.still);
    document.querySelector('meta[name="color-scheme"]') && document.querySelector('meta[name="color-scheme"]').setAttribute('content', c.mode === 'light' ? 'light' : 'dark');
    return c;
  }
  // من الملخص: بنفتكره (علشان التطبيق يفتح بنفس الشكل حتى قبل ما الملخص يوصل)
  function fromCashier(look) {
    if (!look || typeof look !== 'object') return;
    const c = { theme: String(look.theme || 'ocean'), dark: !!look.dark, black: !!look.black, glass: !!look.glass, still: !!look.still };
    const old = read('rdo_look_c'); write('rdo_look_c', c);
    if (JSON.stringify(old) !== JSON.stringify(c) && own().follow) apply();
  }
  function setOwn(patch) { write('rdo_look', Object.assign(own(), patch)); return apply(); }
  window.Look = { THEMES, own, current, palette, apply, fromCashier, setOwn };
  apply();
})();
