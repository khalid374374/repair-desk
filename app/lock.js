/* قفل التطبيق بالبصمة (أو الوش) — خالد 2026-10-29: علشان لو حد مسك الموبايل مايشوفش أرقام المحل.
   بيقفل لما التطبيق يفتح، ولما يرجع بعد أكتر من دقيقة في الخلفية (وفي الخلفية الشاشة بتتغطى علشان صورة "التطبيقات الأخيرة").
   شغال من الأول لو الموبايل مربوط وعليه بصمة؛ بيتقفل من ⋮ الإعدادات (rdo_lock = '0'). من غير البلجن (المتصفح / #demo) مالوش أثر. */
(function () {
  const B = () => window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.NativeBiometric;
  const get = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const on = () => get('rdo_lock') !== '0';
  const paired = () => !!get('rdo_token');
  const awayMs = () => { try { const m = JSON.parse(localStorage.getItem('rdo_lock_min') || '1'); return Math.max(0, +m || 0) * 60000; } catch (e) { return 60000; } };   // من الإعدادات: 1 / 5 / 15 دقيقة أو كل مرة (0)
  let hiddenAt = 0, busy = false, avail = null, locked = false, need = false;   // need: لازم بصمة قبل ما الغطا يتشال

  async function available() {
    if (avail != null) return avail;
    if (!B()) return (avail = false);
    try { const r = await B().isAvailable(); avail = !!(r && r.isAvailable); } catch (e) { avail = false; }
    return avail;
  }
  function cover(show) {
    let c = document.getElementById('lock');
    if (!c) {
      c = document.createElement('div'); c.id = 'lock'; c.hidden = true;
      c.innerHTML = '<div class="lock-in"><div class="lock-ic">🔒</div><b>Repair Desk</b><small>التطبيق مقفول</small><button type="button" id="lock-go">👆 افتح بالبصمة</button></div>';
      document.body.appendChild(c);
      c.querySelector('#lock-go').onclick = () => unlock();
    }
    c.hidden = !show; locked = show;
  }
  // البصمة نفسها (5 محاولات من أندرويد). الفشل أو "إلغاء" بيسيب القفل، والزرار يحاول تاني
  async function verify(sub) {
    if (busy) return false; busy = true;
    try { await B().verifyIdentity({ title: 'Repair Desk', subtitle: sub || 'افتح بالبصمة', negativeButtonText: 'إلغاء', maxAttempts: 5 }); return true; }
    catch (e) { return false; }
    finally { busy = false; }
  }
  async function unlock() { if (await verify()) { need = false; cover(false); } }
  async function lockNow() {
    if (!on() || !paired() || !B()) return;
    need = true; cover(true);   // الأول نغطي (من غير ما الأرقام تبان لحظة)، وبعدين نتأكد إن فيه بصمة
    if (!(await available())) { need = false; cover(false); return; }
    unlock();
  }
  document.addEventListener('visibilitychange', () => {
    if (!on() || !paired() || !B() || avail === false) return;
    if (document.visibilityState === 'hidden') { if (busy) return; hiddenAt = Date.now(); cover(true); return; }   // نافذة البصمة نفسها بتخفي الصفحة: مانحسبهاش
    if (busy) return;
    if (hiddenAt && Date.now() - hiddenAt >= awayMs()) need = true;
    if (!need) cover(false); else unlock();
  });
  // من الإعدادات: تشغيل/إيقاف (الإيقاف محتاج البصمة)
  async function toggle() {
    if (!(await available())) return { error: 'الموبايل ده مافيهوش بصمة متسجلة' };
    if (on()) { if (!(await verify('علشان تقفل القفل'))) return { error: 'البصمة ماتأكدتش' }; try { localStorage.setItem('rdo_lock', '0'); } catch (e) {} return { on: false }; }
    try { localStorage.removeItem('rdo_lock'); } catch (e) {} return { on: true };
  }
  // قبل حاجة مهمة (افصل الموبايل): البصمة لو الموبايل عليه بصمة، وإلا مفيش حاجة تمنع (true)
  async function confirmBio(sub) { if (!B() || !(await available())) return true; return verify(sub); }
  window.AppLock = { available, on, toggle, lockNow, confirm: confirmBio };
  // تبديل فرع (branches.js) بيعيد فتح التطبيق وهو مفتوح: مانطلبش البصمة تاني
  let skip = false; try { const t = +sessionStorage.getItem('rdo_nolock') || 0; sessionStorage.removeItem('rdo_nolock'); skip = t > 0 && Date.now() - t < 15000; } catch (e) {}
  if (paired() && on() && B() && !skip) lockNow();
})();
