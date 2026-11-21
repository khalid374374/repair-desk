/* شكل البيانات اللي التطبيق بيعرضها ("لقطة" المحل). الكاشير هيبعتها لوحده أول ما حاجة تتغيّر (الخطوة الجاية).
   دلوقتي: بيانات تجريبية بس علشان نشوف الشكل على الموبايل. كل الفلوس أرقام صحيحة بالعملة اللي في الإعدادات. */
window.DEMO = {
  shop: 'الامل فون 2', currency: 'ج', at: Date.now() - 60 * 1000, cashierOnline: true,
  drawer: { now: 5022, shiftNo: 4, openedAt: '09:30', by: 'علي' },
  today: { profit: 1370, fees: 385, repairNet: 820, acc: 165 },
  counts: { waiting: 3, processing: 5, doneToday: 2 },
  look: { theme: 'ocean', dark: true, black: false, glass: false, still: false },
  approvals: [{ id: 'ap1', kindName: 'سحب من الدرج', by: 'أحمد', title: 'سحب 500 — مواصلات', amt: 500 }],
  notes: [{ t: Date.now() - 300000, title: '⚠ تليفون المحافظ: اتقفل فودافون كاش وانستاباي', body: 'حد قفل المراقبة على: فودافون كاش، انستاباي والبنوك. التحويلات دي مش هتوصل الكاشير لحد ما تتفتح.', kind: 'watchdown' },
    { t: Date.now() - 7200000, title: '🔧 علي قفّل درج الصيانة', body: 'الصافي 2,400 · نصيب صاحب المكان 1,200 · نصيب الشريك 1,200 · العد مظبوط', kind: 'close' }],
  alerts: [
    { icon: '📶', text: 'خط 1 وصل {85%} من الحد الشهري', sub: 'باقي 30,000 لآخر الشهر', lvl: 'o' },
    { icon: '👤', text: 'أحمد شلبي عليه {5,500} من 6 أيام', lvl: 'r' },
    { icon: '📦', text: '3 أصناف قرّبت تخلص', sub: 'وصلة Type-C · شاحن 20 وات · جراب A15' },
  ],
  balances: [
    { name: 'فودافون كاش', amt: 12092 }, { name: 'انستاباي', amt: 3316 }, { name: 'فوري كاش اوت', amt: 1002 }, { name: 'فوري (آخر تقفيل)', amt: 3896, manual: true },
  ],
  lines: [{ name: 'خط 1', used: 170000, limit: 200000 }, { name: 'انستا', used: 42000, limit: 200000 }],
  moves: [
    { icon: '📥', text: 'سحب 2,100 على خط 1 · عمولة 35', t: '10:42 م', by: 'علي' },
    { icon: '📝', text: 'ملاحظة: مؤمن خد 1,000 فودافون كاش', t: '10:03 م', by: 'علي' },
    { icon: '➖', text: 'سحب 500 · جمعية', t: '9:39 م', by: 'علي' },
    { icon: '💳', text: 'سحب كارت مشتريات 4,000 · مكسبك 88', t: '9:11 م', by: 'علي' },
  ],
  // "الكل": آخر 60 يوم [id, إيصال, الجهاز, العطل, العميل, الصافي, يوم التسليم, الباقي]
  hist: (function () { const d = n => new Date(Date.now() - n * 864e5).toLocaleDateString('sv'); const devs = [['iPhone X', 'باك كفر', 'يوسف'], ['Samsung A51', 'شاشة', 'هاني'], ['Oppo A15', 'سوكت شحن', 'مها'], ['iPhone 12', 'بطارية', 'عمرو'], ['Redmi Note 9', 'سوفت وير', ''], ['Realme 8', 'شاشة', 'نادية'], ['Samsung A12', 'زجاج كاميرا', 'خالد'], ['Infinix Note 10', 'مايك', 'رامي']];
    const out = [['h150', 150, 'iPhone X', 'باك كفر', 'يوسف', 350, d(0), 0], ['h151', 151, 'Samsung A51', 'شاشة', 'هاني', 600, d(0), 500]];
    for (let i = 0; i < 70; i++) { const x = devs[i % devs.length]; out.push(['h' + (148 - i), 148 - i, x[0], x[1], x[2], 80 + (i * 137) % 700 - (i === 9 ? 900 : 0), d(1 + Math.floor(i / 3)), i % 11 === 4 ? 200 : 0]); }
    return out; })(),
  tickets: [
    { no: 152, status: 'processing', dev: 'Samsung A10', type: 'تغيير شاشة', price: 1200, paid: 300, parts: 450, days: 4, customer: 'أحمد', phone: '01001112223', tech: 'محمود' },
    { no: 153, status: 'processing', dev: 'iPhone 11', type: 'بطارية', price: 900, paid: 0, parts: 380, days: 1, customer: 'منى' },
    { no: 154, status: 'processing', dev: 'Oppo A54', type: 'سوكت شحن', price: 250, paid: 100, parts: 60, days: 0, customer: '' },
    { no: 149, status: 'processing', dev: 'Redmi Note 10', type: 'سوفت وير', price: 200, paid: 200, parts: 0, days: 6, customer: 'كريم', imei: '356938035643809' },
    { no: 147, status: 'processing', dev: 'Realme C25', type: 'شاشة', price: 950, paid: 500, parts: 520, days: 2, customer: 'سارة', pw: 1, pd: '2026-01-01', pn: 'شاشة' },
    { no: 155, status: 'waiting', dev: 'Infinix Hot 12', type: 'مايك', price: 150, paid: 0, parts: 0, days: 0, customer: 'حسن' },
    { no: 156, status: 'waiting', dev: 'Samsung A32', type: 'زجاج كاميرا', price: 300, paid: 100, parts: 0, days: 0, customer: '' },
    { no: 157, status: 'waiting', dev: 'Huawei Y9', type: 'فحص', price: 0, paid: 0, parts: 0, days: 0, customer: 'عم سيد' },
    { no: 150, status: 'done', dev: 'iPhone X', type: 'باك كفر', price: 600, paid: 600, parts: 250, days: 0, customer: 'يوسف', doneToday: true },
    { no: 151, status: 'done', dev: 'Samsung A51', type: 'شاشة', price: 1500, paid: 1000, parts: 900, days: 0, customer: 'هاني', doneToday: true },
  ],
  week: [{ d: 'سبت', v: 920, rep: 560, acc: 160, fees: 200 }, { d: 'حد', v: 1240, rep: 800, acc: 190, fees: 250 }, { d: 'اتنين', v: 680, rep: 300, acc: 130, fees: 250 }, { d: 'تلات', v: 1490, rep: 1000, acc: 210, fees: 280 },
    { d: 'أربع', v: 1080, rep: 650, acc: 150, fees: 280 }, { d: 'خميس', v: 1600, rep: 1100, acc: 220, fees: 280 }, { d: 'جمعة', v: 830, rep: 450, acc: 100, fees: 280 }],
  stock: { items: [
    ['s1', 'اسكرينة A10', 14, 50, 15, 'acc', '20000001', 5, 'اسكرينة'], ['s2', 'جراب ايفون 13', 3, 120, 45, 'acc', '20000002', 4, 'جراب'],
    ['s3', 'شاحن سامسونج 25W', 6, 350, 220, 'acc', '8806094000000', 2, 'شاحن'], ['s4', 'سماعة بلوتوث', 0, 450, 280, 'acc', '20000004', 1, 'سماعة'],
    ['s5', 'كابل تايب سي', 22, 60, 25, 'acc', '20000005', 5, 'كابل'], ['s6', 'شاشة A10 اوليد', 2, 0, 520, 'part', '20000006', 2, ''],
    ['s7', 'بطارية ايفون 11', 4, 0, 380, 'part', '20000007', 1, ''], ['s8', 'سوكت شحن تايب سي', 18, 0, 25, 'part', '20000008', 5, ''],
  ], people: [['p1', 'أحمد شلبي'], ['p2', 'عم سيد']] },
  cur: { no: 4, from: 'امبارح 9:00 ص', repairNet: 820, repairN: 3, fees: 385, accSales: 410, accN: 6, total: 1615, sales: 795, goal: 1500, notes: [{ txt: 'محمد هيعدّي ياخد الشاحن (مدفوع)', by: 'علي', t: Date.now() - 3600e3 }] },
  closings: [{ no: 3, by: 'علي', day: 'السبت', diff: 125 }, { no: 2, by: 'خالد', day: 'الجمعة', diff: 0 }, { no: 1, by: 'علي', day: 'الخميس', diff: -60 }],
  aging: 3, owes: [{ name: 'أحمد شلبي', amt: 5500 }, { name: 'عم سيد', amt: 750 }], tickOwe: [{ id: 'k151', no: 151, dev: 'Samsung A51', customer: 'هاني', rem: 500, dd: '' }],
  weekPrev: 6100, cc: '20',   // المقارنات (2026-11-07)
  month: { name: 'أكتوبر 2026', repair: 18400, fees: 6950, acc: 4120, exp: 2300, profit: 27170, gross: 29470, prevGross: 25800,
    rep: { n: 64, rev: 41200, parts: 22800, net: 18400, oweN: 3, oweNet: 1250 }, accD: { n: 212, rev: 10900, cost: 6780, profit: 4120 } },
};
