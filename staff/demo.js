/* بيانات وهمية لتطبيق المندوب (#demo / ?m=demo) بنفس شكل courierSnap في mobile.js (اللي الكاشير بيبعته):
   طلباته اللي معاه (out) + الجاهزة اللي محدش خدها (ready) + اللي سلّمها النهارده (done) + الكاش اللي معاه. من غير أرباح ولا طلبات مناديب تانيين. */
window.DEMO = {
  v: 1, name: 'محمد', shop: 'محل الأمانة', shopPhone: '01001234567', at: Date.now() - 40000,
  cash: 220, owe: 1, today: { done: 2, cash: 5845 },
  orders: [
    { id: 'o1', no: 1042, st: 'out', kind: 'order', cust: { name: 'أحمد علي', phone: '01011112222', addr: '12 ش 9، المعادي — الدور 3 شقة 7', lat: 29.9602, lng: 31.2569, note: 'اتصل قبل ما تطلع' }, items: 'Samsung A15 128GB + شاحن', total: 6900, pay: 'cash', paid: false, km: 1.2, at: Date.now() - 25 * 60000 },
    { id: 'o2', no: 1047, st: 'ready', kind: 'order', cust: { name: 'منى سامي', phone: '01099998888', addr: 'دجلة، عمارة 41', lat: 29.9655, lng: 31.2702, note: '' }, items: 'جراب MagSafe ×2 + اسكرينة', total: 345, pay: 'insta', paid: true, km: 2.4, at: Date.now() - 10 * 60000 },
    { id: 'o3', no: 1048, st: 'ready', kind: 'repair', cust: { name: 'كريم حسن', phone: '01277776666', addr: 'زهراء المعادي، شارع 50', lat: 29.9721, lng: 31.3010, note: '' }, items: '🛠 iPhone 12 — شاشة (ناخده من البيت)', total: 0, pay: 'cash', paid: false, km: 4.8, at: Date.now() - 5 * 60000 },
  ],
  done: [
    { id: 'o4', no: 1038, st: 'done', kind: 'order', cust: { name: 'علي محمود', phone: '01155554444', addr: 'المعادي الجديدة', note: '' }, items: 'جراب سيليكون', total: 220, pay: 'cash', paid: false, km: 0.8, doneAt: Date.now() - 90 * 60000, owe: true },
    { id: 'o5', no: 1035, st: 'paid', kind: 'order', cust: { name: 'سارة', phone: '01033332222', addr: 'حدائق المعادي', note: '' }, items: 'Realme C53', total: 5625, pay: 'cash', paid: false, km: 3.1, doneAt: Date.now() - 4 * 3600000, owe: false },
  ],
};
// تطبيق الموظف (2026-11-18): الحضور للمندوب، وموظف من غير طلبات (#demo-emp)
(function () {
  const d = new Date(), at = (h, m) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m || 0).getTime(), ds = x => { const y = new Date(Date.now() - x * 864e5); return y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0'); };
  const att = (rec) => ({ on: true, phone: true, wifi: ['aa:bb:cc:11:22:33'], gps: true, wins: [{ d: ds(0), id: 'm', name: 'صباحي', ic: '☀️', from: '10:00', to: '18:00', start: at(10), end: at(18) }], st: rec ? rec.kind : 'wait', rec, greenMin: 10,
    counts: { green: 12, redOpen: 1, redCleared: 2, blackOpen: 0 }, next: { kind: 'late', need: 3, have: 1 },
    list: [{ d: ds(1), kind: 'green', min: 9, state: 'used' }, { d: ds(2), kind: 'late', min: 14, state: 'open', reason: 'المواصلات' }, { d: ds(5), kind: 'leave', min: 0, state: '' }],
    leaves: [{ d: ds(-3), reason: 'فرح أخويا', status: 'pending' }] });
  window.DEMO.kind = 'courier'; window.DEMO.att = att({ d: ds(0), in: at(9, 58), out: 0, kind: 'ok', min: 0, via: 'gps', flag: '' });
  window.DEMO_EMP = { v: 1, kind: 'emp', name: 'أحمد', shop: 'الأمل فون', at: Date.now() - 30000, att: att(null) };
})();
