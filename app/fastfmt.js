/* تنسيق التواريخ والأرقام أسرع 40 مرة (خالد 2026-11-20: "الصفحات في الوردية بتطول اوي في التحميل"):
   toLocaleString / toLocaleDateString / toLocaleTimeString بيعملوا "منسّق" جديد في كل مرة، وده تقيل على الموبايل
   (600 سطر = 2 ثانية على معالج متوسط، والمنسّق المحفوظ = 0.05 ثانية). هنا بنحفظ المنسّق لكل (لغة + اختيارات) ونعيده،
   ونفس النتيجة بالظبط (نفس قواعد المتصفح للاختيارات الافتراضية)، ولو أي حاجة غريبة بيرجع للطريقة الأصلية.
   لازم يتحمّل قبل أي سكريبت تاني (index.html). */
(function () {
  if (typeof Intl === 'undefined' || window.__fastFmt) return; window.__fastFmt = true;
  const cache = new Map();
  const get = (T, loc, o) => {
    const k = T === Intl.NumberFormat ? 'N' : 'D';
    const key = k + '|' + (Array.isArray(loc) ? loc.join(',') : loc == null ? '' : String(loc)) + '|' + (o ? JSON.stringify(o) : '');
    let f = cache.get(key); if (!f) { f = new T(loc, o); if (cache.size < 300) cache.set(key, f); } return f;
  };
  const DATE_K = ['weekday', 'era', 'year', 'month', 'day', 'dateStyle'], TIME_K = ['hour', 'minute', 'second', 'dayPeriod', 'fractionalSecondDigits', 'timeStyle'];
  const has = (o, ks) => !!o && ks.some(k => o[k] !== undefined);
  const N0 = Number.prototype.toLocaleString, D0 = Date.prototype.toLocaleString, DD0 = Date.prototype.toLocaleDateString, DT0 = Date.prototype.toLocaleTimeString;
  Number.prototype.toLocaleString = function (loc, o) { try { return get(Intl.NumberFormat, loc, o).format(this); } catch (e) { return N0.call(this, loc, o); } };
  // زي المتصفح: من غير أي خانة تاريخ = يوم/شهر/سنة، ومن غير أي خانة وقت = ساعة/دقيقة/ثانية
  Date.prototype.toLocaleDateString = function (loc, o) {
    if (isNaN(this) || has(o, TIME_K) && !has(o, DATE_K)) return DD0.call(this, loc, o);
    try { return get(Intl.DateTimeFormat, loc, has(o, DATE_K) ? o : { ...(o || {}), year: 'numeric', month: 'numeric', day: 'numeric' }).format(this); } catch (e) { return DD0.call(this, loc, o); }
  };
  Date.prototype.toLocaleTimeString = function (loc, o) {
    if (isNaN(this) || has(o, DATE_K) && !has(o, TIME_K)) return DT0.call(this, loc, o);
    try { return get(Intl.DateTimeFormat, loc, has(o, TIME_K) ? o : { ...(o || {}), hour: 'numeric', minute: 'numeric', second: 'numeric' }).format(this); } catch (e) { return DT0.call(this, loc, o); }
  };
  Date.prototype.toLocaleString = function (loc, o) {
    if (isNaN(this)) return D0.call(this, loc, o);
    try { return get(Intl.DateTimeFormat, loc, has(o, DATE_K) || has(o, TIME_K) ? o : { ...(o || {}), year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).format(this); } catch (e) { return D0.call(this, loc, o); }
  };
})();
