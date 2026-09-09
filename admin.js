/* =========================================================
   لوحة تحكم الموقع — مركز صيانة ذاكر حسين
   v2:
   - حفظ على السيرفر (config.json) -> التعديلات تظهر لكل الزوار
   - رفع صور من الجهاز للسيرفر (uploads/) -> تظهر للكل
   - بنر عروض متحرك قابل للتحكم
   - شريط المميزات قابل للتعديل
   - لو مش في سيرفر: تلقائيًا بيحفظ محليًا (localStorage) كبديل
   ========================================================= */
(function () {
  'use strict';
  var LS = 'zh_site_cfg_v1';

  function qs(q) { return document.querySelector(q); }
  function qsa(q) { return Array.prototype.slice.call(document.querySelectorAll(q)); }
  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function num(p) {
    var d = String(p == null ? '' : p).replace(/[^0-9]/g, '');
    if (!d) return '';
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (d.indexOf('0') === 0) d = '2' + d; else if (d.indexOf('2') !== 0) d = '2' + d;
    return d;
  }
  function rgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    if (isNaN(n)) return '179,9,6';
    return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
  }
  function hexMix(a, b, t) {
    function hx(x) { var h = String(x).replace('#', ''); return h.length === 3 ? h.split('').map(function (c) { return c + c; }).join('') : h; }
    function ch(h, i) { return parseInt(h.substr(i, 2), 16); }
    var A = hx(a), B = hx(b);
    function to(i) { return Math.round(ch(A, i) + (ch(B, i) - ch(A, i)) * t); }
    function p2(n) { var s = n.toString(16); return s.length === 1 ? '0' + s : s; }
    return '#' + p2(to(0)) + p2(to(2)) + p2(to(4));
  }
  function merge(a, b) {
    Object.keys(b || {}).forEach(function (k) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) {
        if (!a[k] || typeof a[k] !== 'object' || Array.isArray(a[k])) a[k] = {};
        merge(a[k], b[k]);
      } else a[k] = b[k];
    });
    return a;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function now() { return new Date().getTime(); }

  /* =========================================================
     الأيقونات الافتراضية (لو ما فيش أيكونة محفوظة)
     ========================================================= */
  var IC_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  var IC_STAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>';
  var IC_CARD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>';
  var IC_PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  var IC_WRENCH = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';
  var STRIP_ICONS = [IC_LOCK, IC_STAR, IC_CARD, IC_PIN, IC_WRENCH];
  var IC_IMG = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';

  /* =========================================================
     التصور الافتراضي الكامل
     ========================================================= */
  function defaults() {
    return {
      v: 2,
      brand: {
        name: 'مركز صيانة ذاكر حسين',
        tag: 'لصيانة السيارات — مدينة نصر',
        desc: 'مركز صيانة ذاكر حسين بمدينة نصر — ميكانيكا سيارات، صيانة عفشة، كشف أعطال، تغيير زيوت وفلاتر وقطع غيار أصلية من أفضل الشركات العالمية، مع إمكانية الدفع بالفيزا.',
        footerAbout: 'صيانة متكاملة لسيارتك في مدينة نصر: ميكانيكا، عفشة، كشف أعطال، زيوت وفلاتر وقطع غيار أصلية، مع الدفع بالفيزا.',
        logoImg: 'assets/logo.png'
      },
      contact: {
        phone1: '01050006620', phone2: '01000033396', wa: '01050006620',
        email: 'mohamedghanem2001@gmail.com',
        addr1: 'شارع أحمد الزمر، عمارات السويسري — أمام ماكدونالدز وخير زمان',
        addr2: 'مدينة نصر، القاهرة، مصر',
        facebook: 'https://www.facebook.com',
        amsoil: 'https://www.amsoil.com',
        mapUrl: 'https://maps.google.com/maps?q=%D8%B4%D8%A7%D8%B1%D8%B9%20%D8%A3%D8%AD%D9%85%D8%AF%20%D8%A7%D9%84%D8%B2%D9%85%D8%B1%20%D9%85%D8%AF%D9%8A%D9%86%D8%A9%20%D9%86%D8%B5%D8%B1&z=16&output=embed&hl=ar'
      },
      hero: {
        badge: 'مركز صيانة سيارات متكامل — مدينة نصر',
        titleStart: 'صيانة متكاملة لسيارتك مع ',
        titleHi: 'مركز صيانة ذاكر حسين',
        lead: 'ميكانيكا سيارات، صيانة عفشة، كشف أعطال، وتغيير زيوت وفلاتر — بزيوت وقطع غيار من كبرى الشركات العالمية، مع خدمة الدفع بالفيزا.',
        artName: 'ذاكر حسين',
        artSub: 'مركز صيانة السيارات — مدينة نصر',
        chips: ['ميكانيكا', 'عفشة', 'كشف أعطال', 'زيوت وفلاتر'],
        meta1: 'وكيل لكبرى شركات الزيوت العالمية',
        meta2: 'الدفع بالفيزا متاح',
        meta3: 'متاح التقسيط',
        float1a: 'زيوت عالمية', float1b: 'أصلية ١٠٠٪',
        float2a: '١٥ سنة', float2b: 'خبرة في صيانة السيارات'
      },
      services: {
        eyebrow: 'خدماتنا',
        title: 'كل اللي محتاجه سيارتك… في مكان واحد',
        sub: 'فريق متخصص وأجهزة فحص حديثة لضمان صيانة دقيقة وسلامة تامة لسيارتك، من المحرك حتى العفشة.',
        note: 'زيوت متوفرة من كبرى العلامات العالمية',
        items: []
      },
      why: {
        eyebrow: 'لماذا تختارنا؟',
        title: 'ثقة بنيناها بالشغل ',
        titleHi: 'والالتزام',
        sub: 'خبرة تتجاوز ١٥ سنة في صيانة وإصلاح السيارات، وفريق فني محترف يهتم بسيارتك من أول نظرة فحص وحتى التسليم.',
        chip: 'متاح الآن — تواصل معنا',
        btn1: 'اتصل بنا', btn2: 'رقم آخر',
        items: []
      },
      inst: {
        eyebrow: 'خدمة التقسيط',
        t1: '📢 متاح التقسيط من خلال ',
        red: 'أكبر شركات التقسيط',
        t2: ' في مصر',
        sub: 'قسّط تكاليف الصيانة والزيوت وقطع الغيار بسهولة — وفّر ميزانيتك واشتغل معانا من غير قلق على المصاريف.',
        ctaB: 'اختار شركة التقسيط اللي تناسبك وسيب الباقي علينا',
        ctaTail: ' — احنا بنجهز كل حاجة ليك.',
        items: []
      },
      gallery: {
        eyebrow: 'معرض الأعمال والعروض',
        title: 'شوف شغلنا بنفسك',
        sub: 'صور من أعمالنا وعروض الزيوت والقطع المتوفرة لدى المركز.',
        note: '📸 تفضل تتفرج على صور من أعمالنا — جديدنا بينزل باستمرار.',
        items: []
      },      offers: {
        eyebrow: 'عروضنا',
        title: 'عروض وخصومات 🔥',
        sub: 'اختر العرض المناسب، شوف تفاصيله كاملة واطلبه في ثواني.',
        items: [
          { title: 'عرض تغيير الزيت والفلاتر', desc: 'خصم خاص على تغيير الزيت والفلاتر بزيوت عالمية أصلية.', details: 'يشمل العرض:\n- تغيير زيت المحرك بزيت عالمي أصلي.\n- تغيير فلتر الزيت.\n- فحص سريع مجاني للسيارة.\n\nالعرض ساري لفترة محدودة — اطلبه دلوقتي وسيب الباقي علينا.', img: '', fb: '' },
          { title: 'عرض فحص العفشة بالكمبيوتر', desc: 'افحص العفشة كاملة واعرف أي مشكلة قبل ما تتصلح.', details: 'يشمل العرض:\n- كشف أعطال شامل بالكمبيوتر.\n- فحص العفشة والتعليق.\n- تقرير واضح بالحالة قبل أي إصلاح.\n\nكلمنا على الواتساب للمزيد.', img: '', fb: '' },
          { title: 'عرض الصيانة الشاملة', desc: 'باقة صيانة شاملة لكل سيارة بسعر خاص.', details: 'يشمل العرض:\n- ميكانيكا + فحص شامل.\n- زيوت وفلاتر أصلية.\n- تخفيض على قطع الغيار.\n\nاسأل عن التفاصيل كاملة من زر الطلب.', img: '', fb: '' }
        ]
      },
      strip: {
        items: [
          { icon: IC_LOCK, t: 'متاح التقسيط', s: 'من أكبر شركات التقسيط في مصر' },
          { icon: IC_STAR, t: 'وكيل معتمد', s: 'لكبرى شركات الزيوت' },
          { icon: IC_CARD, t: 'ادفع بالفيزا', s: 'أو كاش' },
          { icon: IC_PIN, t: 'في قلب مدينة نصر', s: 'أمام ماكدونالدز وخير زمان' }
        ]
      },
      banner: {
        show: true,
        chip: '🎁 عروض',
        items: [
          '🎉 عروض خاصة على تغيير الزيوت والفلاتر لفترة محدودة',
          '💳 التقسيط متاح من أمان، Contact، فرصة، Halan، سهولة، ValU وأكثر',
          '🔧 افحص سيارتك ببلاش عند أي صيانة شاملة'
        ],
        bg1: '#B30906', bg2: '#5A0200', txt: '#FFE9A8', speed: 24
      },
      location: {
        eyebrow: 'موقعنا',
        title: 'لينك تلاقينا؟ مكاننا سهل جدًا 😉',
        sub: 'في قلب مدينة نصر، على شارع أحمد الزمر — قدام ماكدونالدز وخير زمان. افتح الخريطة وهتلاقينا.'
      },
      cta: { title: 'جاهز تسيب سيارتك في أيد أمينة؟ 🚗', p: 'كلمنا دلوقتي أو ابعت على واتساب — المركز في قلب مدينة نصر، وخدمة التقسيط متاحة من كبرى الشركات.' },
      footer: { madeBy: 'صنع بواسطة @Memaa388' },
      colors: { gold: '#F4BA35', brand: '#B30906', dark: '#0C0A06' },
      security: { password: '0000' },
      show: { strip: true, offers: true, services: true, why: true, inst: true, gallery: true, location: true, cta: true, banner: true }
    };
  }

  /* لقطة للقوائم من الصفحة الحالية (فقط لو ما فيش محفوظ) */
  function snapshotArrays(d) {
    var map = [
      ['#svcGrid .svc-card', 'services.items', 'h3', 'p', true],
      ['#whyGrid .w-card', 'why.items', 'h3', 'p', true],
      ['#instGrid .inst-item', 'inst.items', '.nm b', '.nm small', false],
      ['#galGrid figure', 'gallery.items', 'figcaption', null, false]
    ];
    map.forEach(function (m) {
      var els = qsa(m[0]);
      if (!els.length) return;
      var arr = els.map(function (el) {
        var a = el.querySelector(m[2]), b = m[3] ? el.querySelector(m[3]) : null;
        var sv = el.querySelector('svg');
        var item = { icon: (m[4] && sv) ? sv.outerHTML : '' };
        item.main = a ? a.textContent.trim() : '';
        item.sub = b ? b.textContent.trim() : '';
        if (m[1] === 'gallery.items') item.title = item.main, item.img = '';
        return item;
      });
      // تحويل للشكل النهائي حسب كل قائمة
      if (m[1] === 'services.items') d.services.items = arr.map(function (x) { return { icon: x.icon, title: x.main, desc: x.sub }; });
      else if (m[1] === 'why.items') d.why.items = arr.map(function (x) { return { icon: x.icon, title: x.main, desc: x.sub }; });
      else if (m[1] === 'inst.items') d.inst.items = arr.map(function (x) { return { main: x.main, sub: x.sub }; });
      else if (m[1] === 'gallery.items') d.gallery.items = arr.map(function (x) { return { title: x.title, img: x.img }; });
    });
    return d;
  }

  /* =========================================================
     تحميل المحفوظات (سيرفر أولًا ثم محلي)
     ========================================================= */
  function readLocal() {
    var raw = null;
    try { raw = localStorage.getItem(LS); } catch (e) {}
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  function writeLocal(cfg) { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {} }

  /* =========================================================
     الاتصال بـ Supabase (عند تفعيل الربط) + بديل محلي
     ========================================================= */
  var LS_TOKEN = 'zh_sb_tok_v1';
  var SB = (typeof window !== 'undefined' && window.ZH_SB) ? window.ZH_SB : {};
  function sbReady() { return !!(SB && SB.url && SB.anon); }
  function sbGetTok() {
    try {
      var r = JSON.parse(localStorage.getItem(LS_TOKEN) || 'null');
      if (r && r.exp > Date.now()) return r.t;
    } catch (e) { }
    return null;
  }
  function sbSetTok(t) { try { localStorage.setItem(LS_TOKEN, JSON.stringify({ t: t, exp: Date.now() + 3540 * 1000 })); } catch (e) { } }
  function sbClearTok() { try { localStorage.removeItem(LS_TOKEN); } catch (e) { } }
  function sbAuthHeaders(json) {
    var h = { apikey: SB.anon };
    if (json) h['Content-Type'] = 'application/json';
    var tok = sbGetTok();
    if (tok) h['Authorization'] = 'Bearer ' + tok;
    return h;
  }
  function supabaseSignIn(password) {
    return window.fetch(SB.url + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { apikey: SB.anon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: SB.adminEmail || 'admin@local', password: password })
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, j: j }; });
    });
  }
  function supabaseGetConfig() {
    return window.fetch(SB.url + '/rest/v1/site_config?select=config&id=eq.1', { headers: sbAuthHeaders(true) })
      .then(function (r) { return r.json(); })
      .then(function (arr) { if (Array.isArray(arr) && arr[0] && arr[0].config) return arr[0].config; return null; });
  }
  function supabaseSave(cfg) {
    return window.fetch(SB.url + '/rest/v1/site_config', {
      method: 'POST',
      headers: { apikey: SB.anon, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal', 'Authorization': 'Bearer ' + sbGetTok() },
      body: JSON.stringify([{ id: 1, config: cfg }])
    }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); });
  }
  function mimeOf(name) {
    name = String(name || '').toLowerCase();
    if (name.indexOf('.png') > -1) return 'image/png';
    if (name.indexOf('.jpg') > -1 || name.indexOf('.jpeg') > -1) return 'image/jpeg';
    if (name.indexOf('.gif') > -1) return 'image/gif';
    if (name.indexOf('.webp') > -1) return 'image/webp';
    if (name.indexOf('.svg') > -1) return 'image/svg+xml';
    return 'application/octet-stream';
  }
  function extOf(name) {
    name = String(name || '').toLowerCase();
    var m = name.match(/\.(png|jpe?g|gif|webp|svg)$/);
    return m ? m[1] : 'png';
  }
  function supabaseUpload(arrayBuf, name) {
    var tok = sbGetTok();
    if (!tok) return Promise.reject(new Error('no auth'));
    var ext = extOf(name);
    var fname = 'img-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7) + '.' + ext;
    return window.fetch(SB.url + '/storage/v1/object/images/' + fname, {
      method: 'PUT',
      headers: { apikey: SB.anon, 'Authorization': 'Bearer ' + tok, 'Content-Type': mimeOf(name) },
      body: arrayBuf
    }).then(function (r) { if (!r.ok) throw new Error('upload http ' + r.status); return r.json(); })
      .then(function () { return SB.url + '/storage/v1/object/public/images/' + fname; });
  }

  function serverGet() {
    if (sbReady()) return supabaseGetConfig();
    if (!window.fetch) return Promise.reject(new Error('no fetch'));
    return window.fetch('/api/config', { method: 'GET', cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); });
  }
  function serverSave(cfg) {
    if (sbReady()) {
      if (!sbGetTok()) return Promise.reject(new Error('need login'));
      return supabaseSave(cfg);
    }
    if (!window.fetch) return Promise.reject(new Error('no fetch'));
    return window.fetch('/api/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    }).then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); });
  }
  function connState(cb) {
    if (!window.fetch) { cb(false, 'no fetch'); return; }
    var to = setTimeout(function () { cb(false, 'timeout'); }, 2500);
    if (sbReady()) {
      window.fetch(SB.url + '/rest/v1/site_config?select=id&id=eq.1', { headers: sbAuthHeaders(true) })
        .then(function (r) { clearTimeout(to); cb(r.ok, 'sb'); })
        .catch(function () { clearTimeout(to); cb(false, 'sb'); });
      return;
    }
    window.fetch('/api/config', { method: 'GET', cache: 'no-store' })
      .then(function (r) { clearTimeout(to); cb(r.ok, 'api'); })
      .catch(function () { clearTimeout(to); cb(false, 'api'); });
  }
  function setConnUI() {
    var el = qs('#connStatus'); if (!el) return;
    el.className = 'conn';
    el.textContent = '⏳ جاري فحص الاتصال…';
    connState(function (ok, mode) {
      var e2 = qs('#connStatus'); if (!e2) return;
      if (ok && mode === 'sb') { e2.className = 'conn'; e2.textContent = '● متصل بـ Supabase — الحفظ والنشر لكل الزوار'; }
      else if (ok) { e2.className = 'conn'; e2.textContent = '● متصل بالسيرفر المحلي'; }
      else { e2.className = 'conn off'; e2.textContent = '⚠️ غير مربوط بـ Supabase — التعديلات محلية (تابع دليل الربط)'; }
    });
  }
  function uploadImageFile(file) {
    return new Promise(function (resolve, reject) {
      if (sbReady()) {
        var rd = new FileReader();
        rd.onerror = function () { reject(new Error('read error')); };
        rd.onload = function () { supabaseUpload(rd.result, file.name || 'img.png').then(resolve).catch(reject); };
        rd.readAsArrayBuffer(file);
        return;
      }
      var rd2 = new FileReader();
      rd2.onerror = function () { reject(new Error('read error')); };
      rd2.onload = function () {
        var data = String(rd2.result);
        if (!window.fetch) { reject(new Error('no server')); return; }
        window.fetch('/api/upload', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name || 'image.png', data: data })
        }).then(function (r) { return r.json(); })
          .then(function (j) { if (j && j.ok) resolve(j.url); else reject(new Error((j && j.error) || 'upload fail')); })
          .catch(reject);
      };
      rd2.readAsDataURL(file);
    });
  }

  /* =========================================================
     الرسم على الصفحة
     ========================================================= */
  function setTxt(el, t) { if (el) el.textContent = t; }
  function setHTML(el, h) { if (el) el.innerHTML = h; }

  function iconOf(it) { return (it && it.icon) ? it.icon : IC_WRENCH; }

  function renderServices(cfg) {
    var grid = qs('#svcGrid'); if (!grid) return;
    grid.innerHTML = (cfg.services.items || []).map(function (it) {
      return '<div class="svc-card" data-reveal><div class="svc-ic">' + iconOf(it) + '</div>' +
        '<h3>' + esc(it.title) + '</h3><p>' + esc(it.desc) + '</p></div>';
    }).join('');
  }
  function renderWhy(cfg) {
    var grid = qs('#whyGrid'); if (!grid) return;
    grid.innerHTML = (cfg.why.items || []).map(function (it, i) {
      return '<div class="w-card" data-reveal><div class="w-num">' + ('0' + (i + 1)).slice(-2) + '</div>' +
        '<h3>' + iconOf(it) + ' ' + esc(it.title) + '</h3><p>' + esc(it.desc) + '</p></div>';
    }).join('');
  }
  function renderInst(cfg) {
    var grid = qs('#instGrid'); if (!grid) return;
    grid.innerHTML = (cfg.inst.items || []).map(function (it) {
      return '<div class="inst-item" data-reveal><span class="ok">✓</span><span class="nm"><b>' + esc(it.main) + '</b>' +
        (it.sub ? '<small>' + esc(it.sub) + '</small>' : '') + '</span></div>';
    }).join('');
  }
  function renderGallery(cfg) {
    var grid = qs('#galGrid'); if (!grid) return;
    var items = (cfg.gallery.items && cfg.gallery.items.length) ? cfg.gallery.items : [];
    if (!items.length) {
      for (var i = 1; i <= 10; i++) items.push({ title: 'صورة ' + i, img: '' });
    }
    grid.innerHTML = items.map(function (it) {
      var media;
      if (it && it.img && String(it.img).trim()) {
        media = '<img src="' + esc(it.img) + '" alt="' + esc(it.title || '') + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0">';
      } else {
        media = '<div class="ph"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><b>الصورة قادمة</b><span>أضف صورة من لوحة التحكم</span></div>';
      }
      return '<figure class="gal-item" data-reveal><div class="gal-media">' + media + '</div>' +
        '<figcaption class="gal-cap"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>' + esc(it.title || '') + '</figcaption></figure>';
    }).join('');
    var note = qs('#galNote'); if (note) note.textContent = (cfg.gallery.note || '');
  }
  function renderStrip(cfg) {
    var grid = qs('#stripGrid'); if (!grid) return;
    var items = (cfg.strip && cfg.strip.items) ? cfg.strip.items : defaults().strip.items;
    grid.innerHTML = items.map(function (it) {
      var ic = (it.icon) ? it.icon : STRIP_ICONS[0];
      return '<div class="benefit">' + ic + '<span>' + esc(it.t) + (it.s ? '<small>' + esc(it.s) + '</small>' : '') + '</span></div>';
    }).join('');
  }
  function renderBanner(cfg) {
    var bar = qs('#offerBar'); if (!bar) return;
    var b = cfg.banner || {};
    var on = b.show !== false && (cfg.show ? cfg.show.banner !== false : true);
    var items = (b.items && b.items.length) ? b.items : [];
    bar.style.display = on && items.length ? '' : 'none';
    if (!(on && items.length)) return;
    var chip = qs('.ob-chip'); if (chip) chip.textContent = b.chip || '🎁 عروض';
    var track = qs('#obTrack'); if (!track) return;
    function seg() {
      return '<div class="ob-seg">' + items.map(function (t) {
        return '<span class="ob-it">' + esc(t) + '<span class="sep">◆</span></span>';
      }).join('') + '</div>';
    }
    track.innerHTML = seg() + seg();
    var rs = document.documentElement.style;
    rs.setProperty('--off1', b.bg1 || '#B30906');
    rs.setProperty('--off2', b.bg2 || '#5A0200');
    rs.setProperty('--offTxt', b.txt || '#FFE9A8');
    rs.setProperty('--offSpeed', (b.speed || 24) + 's');
  }
  function renderOffers(cfg) {
    var grid = qs('#offersGrid'); if (!grid) return;
    var items = (cfg.offers && cfg.offers.items) ? cfg.offers.items : [];
    var empty = qs('#offersEmpty');
    if (empty) {
      if (!items.length) { empty.style.display = 'block'; empty.innerHTML = '➕ أضف أول عرض من لوحة التحكم — (5 ضغطات على سطر الحقوق أسفل الموقع)'; }
      else empty.style.display = 'none';
    }
    grid.innerHTML = items.map(function (it, i) {
      var media;
      if (it.img && String(it.img).trim()) {
        media = '<img src="' + esc(it.img) + '" alt="' + esc(it.title || '') + '" loading="lazy">';
      } else {
        media = '<div class="ph">' + IC_IMG + '<b>صورة العرض هنا</b><span>أضف صورة من لوحة التحكم</span></div>';
      }
      var fb = (it.fb && String(it.fb).trim() && String(it.fb) !== '#')
        ? '<a class="btn of-fb" href="' + esc(it.fb) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg> شوف العرض على فيسبوك</a>'
        : '';
      return '<figure class="of-card" data-reveal>' +
        '<div class="of-media gal-media">' + media + '</div>' +
        '<figcaption class="of-cap">' +
        '<h3>' + esc(it.title || '') + '</h3>' +
        (it.desc ? '<div class="of-txt">' + esc(it.desc) + '</div>' : '') +
        '<div class="of-btns">' +
          '<button type="button" class="btn btn-primary of-order" data-i="' + i + '">🛒 اطلب العرض</button>' +
          '<button type="button" class="btn btn-outline of-details" data-i="' + i + '">التفاصيل الكاملة</button>' +
          fb +
        '</div></figcaption></figure>';
    }).join('');
    // ربط أزرار كل بطاقة
    qsa('#offersGrid .of-order').forEach(function (b) { b.addEventListener('click', function () { zhOpenOrder(Number(b.getAttribute('data-i'))); }); });
    qsa('#offersGrid .of-details').forEach(function (b) { b.addEventListener('click', function () { zhOpenDetails(Number(b.getAttribute('data-i'))); }); });
    observeReveal();
  }
  function zhModalOpen(html) {
    var wrap = qs('#zhModalWrap'), card = qs('#zhModalCard');
    if (!wrap || !card) return;
    card.innerHTML = html;
    wrap.classList.add('open');
    wrap.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // ربط إغلاق
    qsa('#zhModalWrap [data-zhclose]').forEach(function (el) {
      el.addEventListener('click', zhModalClose);
    });
    qsa('#zhModalWrap [data-zhorder]').forEach(function (el) {
      el.addEventListener('click', function () { zhOpenOrder(Number(el.getAttribute('data-zhorder'))); });
    });
  }
  function zhModalClose() {
    var wrap = qs('#zhModalWrap');
    if (wrap) { wrap.classList.remove('open'); wrap.setAttribute('aria-hidden', 'true'); }
    document.body.style.overflow = '';
  }
  function zhModalHtml(inner) {
    return '<button type="button" class="zh-x" data-zhclose="1" aria-label="إغلاق">✕</button>' + inner;
  }
  function zhOpenDetails(i) {
    var items = (CUR && CUR.offers && CUR.offers.items) || [];
    var it = items[i]; if (!it) return;
    var media = (it.img && String(it.img).trim())
      ? '<div class="zh-media"><img src="' + esc(it.img) + '" alt="' + esc(it.title || '') + '"></div>'
      : '<div class="zh-media"></div>';
    var det = esc(it.details || it.desc || '');
    var fb = (it.fb && String(it.fb).trim() && String(it.fb) !== '#')
      ? '<a class="btn of-fb" style="width:auto" href="' + esc(it.fb) + '" target="_blank" rel="noopener">شوف العرض على فيسبوك</a>' : '';
    var html = zhModalHtml(media +
      '<div class="zh-title">' + esc(it.title || '') + '</div>' +
      '<span class="zh-tag">✨ عرض خاص</span>' +
      '<div class="zh-body">' + det + '</div>' +
      '<div class="zh-act">' +
        '<button type="button" class="btn btn-primary" data-zhorder="' + i + '">🛒 اطلب هذا العرض</button>' +
        fb +
      '</div>');
    zhModalOpen(html);
  }
  function zhOpenOrder(i) {
    var items = (CUR && CUR.offers && CUR.offers.items) || [];
    var it = items[i]; if (!it) return;
    var title = it.title || 'العرض';
    var html = zhModalHtml('<div class="zh-pad">' +
      '<h3 style="font-size:1.3rem;font-weight:900;color:var(--ink);margin-bottom:4px">🛒 اطلب العرض</h3>' +
      '<p style="color:#6f6250;font-size:.95rem;margin-bottom:16px">املأ بياناتك ورسالتك هتوصلك جاهزة على واتساب.</p>' +
      '<div class="zf-note">⚠️ هتفتح لك نافذة واتساب فيها الطلب جاهز — اضغط إرسال وبس.</div>' +
      '<div class="form-c"><label>العرض المطلوب</label><input class="fxd" type="text" id="zfOffer" value="' + esc(title) + '" readonly></div>' +
      '<div class="form-c"><label>الاسم *</label><input type="text" id="zfName" placeholder="اكتب اسمك الكامل"></div>' +
      '<div class="form-c"><label>رقم الهاتف *</label><input type="tel" id="zfPhone" placeholder="01xxxxxxxxx" dir="ltr" style="text-align:left"></div>' +
      '<div class="form-c"><label>العنوان</label><input type="text" id="zfAddr" placeholder="المدينة - المنطقة - التفاصيل"></div>' +
      '<div class="zf-err" id="zfErr"></div>' +
      '<button type="button" class="btn btn-wa" id="zfSend" style="width:100%;padding:14px">إرسال الطلب عبر واتساب</button>' +
      '</div>');
    zhModalOpen(html);
    var send = qs('#zfSend');
    if (send) send.addEventListener('click', function () {
      var name = qs('#zfName').value.trim();
      var phone = qs('#zfPhone').value.replace(/[^0-9]/g, '');
      var addr = qs('#zfAddr').value.trim();
      var offer = (qs('#zfOffer').value || title).trim();
      var err = qs('#zfErr');
      if (!name) { err.textContent = 'اكتب اسمك من فضلك'; return; }
      if (phone.length < 10) { err.textContent = 'اكتب رقم هاتف صحيح (11 رقم)'; return; }
      err.textContent = '';
      var brandName = (CUR && CUR.brand && CUR.brand.name) ? CUR.brand.name : 'مركز صيانة ذاكر حسين';
      var msg = '📦 طلب عرض جديد — ' + brandName + '\n' +
        'العرض المطلوب: ' + offer + '\n' +
        'الاسم: ' + name + '\n' +
        'رقم الهاتف: ' + phone + '\n' +
        (addr ? 'العنوان: ' + addr + '\n' : '');
      var phRaw = (CUR && CUR.contact && (CUR.contact.wa || CUR.contact.phone1)) || '01050006620';
      var ph = String(phRaw).replace(/[^0-9]/g, '');
      if (ph.indexOf('0') === 0) ph = '2' + ph; else if (ph.indexOf('2') !== 0) ph = '2' + ph;
      var url = 'https://wa.me/' + ph + '?text=' + encodeURIComponent(msg);
      var a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      zhModalClose();
    });
  }
  function zhBindEsc() {
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') zhModalClose(); });
  }

  function setPhones(cfg) {
    var p1 = cfg.contact.phone1 || '', p2 = cfg.contact.phone2 || '';
    function put(a, n) {
      var sp = a.querySelector('span.ltr');
      if (sp) { sp.textContent = n; return; }
      a.textContent = (a.textContent || '').replace(/\b0\d{9}\b/g, n);
    }
    qsa('a[data-ph="1"]').forEach(function (a) { a.setAttribute('href', 'tel:+' + num(p1)); put(a, p1); });
    qsa('a[data-ph="2"]').forEach(function (a) { a.setAttribute('href', 'tel:+' + num(p2)); put(a, p2); });
    var wn = num(cfg.contact.wa || cfg.contact.phone1);
    qsa('a[data-wa="1"]').forEach(function (a) { a.setAttribute('href', 'https://wa.me/' + wn); });
    qsa('a[data-email="1"]').forEach(function (a) {
      a.setAttribute('href', 'mailto:' + cfg.contact.email);
      if ((a.textContent || '').indexOf('@') > -1) a.textContent = cfg.contact.email;
    });
    qsa('a[data-fb="1"]').forEach(function (a) { a.setAttribute('href', cfg.contact.facebook); });
    qsa('a[data-amsoil="1"]').forEach(function (a) { a.setAttribute('href', cfg.contact.amsoil); });
  }

  function observeReveal() {
    var io = window.__zhio;
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.12 });
      window.__zhio = io;
    }
    qsa('[data-reveal]:not(.in)').forEach(function (el) { io.observe(el); });
  }

  /* =========================================================
     التطبيق الكامل للإعدادات على الصفحة
     ========================================================= */
  function apply(cfg) {
    var c = cfg || {};
    CUR = c;
    var colors = c.colors || {};
    var gold = colors.gold || '#F4BA35', brand = colors.brand || '#B30906', dark = colors.dark || '#0C0A06';
    var rs = document.documentElement.style;
    rs.setProperty('--gold', gold); rs.setProperty('--gold-rgb', rgb(gold));
    rs.setProperty('--brand', brand); rs.setProperty('--brand-rgb', rgb(brand));
    rs.setProperty('--dark', dark);
    rs.setProperty('--amber', gold); rs.setProperty('--orange', brand);
    rs.setProperty('--gold-deep', hexMix(gold, '#000000', 0.45));
    rs.setProperty('--grad', 'linear-gradient(120deg,' + hexMix(gold, '#FFFFFF', 0.22) + ',' + hexMix(gold, '#000000', 0.10) + ')');

    /* ---- العنوان/الوصف ---- */
    var nm = c.brand && c.brand.name ? c.brand.name : '';
    document.title = nm + ' | صيانة متكاملة للسيارات في مدينة نصر';
    var md = qs('meta[name="description"]'); if (md) md.setAttribute('content', (c.brand || {}).desc || '');
    var ogt = qs('meta[property="og:title"]'); if (ogt) ogt.setAttribute('content', nm);
    var ogd = qs('meta[property="og:description"]'); if (ogd) ogd.setAttribute('content', (c.brand || {}).desc || '');

    /* ---- اللوجو + الاسم ---- */
    var logo = (c.brand && c.brand.logoImg) ? c.brand.logoImg : 'assets/logo.png';
    qsa('.zh-logo').forEach(function (im) { im.src = logo; });
    qsa('.logo-name').forEach(function (el) {
      el.innerHTML = esc(nm) + '<small>' + esc((c.brand || {}).tag || '') + '</small>';
    });
    setTxt(qs('#footAbout'), (c.brand || {}).footerAbout || '');

    /* ---- الهيرو ---- */
    var h = c.hero || {};
    setHTML(qs('#heroBadge'), '<span class="dot"></span> ' + esc(h.badge || ''));
    setHTML(qs('#heroH1'), esc(h.titleStart || '') + '<span class="hl">' + esc(h.titleHi || '') + '</span>');
    setTxt(qs('#heroLead'), h.lead || '');
    setTxt(qs('#artTitle'), h.artName || '');
    setTxt(qs('#artSub'), h.artSub || '');
    var chips = qs('#heroChips');
    if (chips) chips.innerHTML = (h.chips || []).map(function (x) { return '<span class="chip">' + esc(x) + '</span>'; }).join('');
    var metaEls = qsa('#top .hero-meta .hm');
    var mm = [h.meta1, h.meta2, h.meta3];
    metaEls.forEach(function (el, i) {
      var sv = el.querySelector('svg');
      var wasA = el.tagName === 'A';
      var href = el.getAttribute('href');
      el.innerHTML = (sv ? sv.outerHTML : '') + ' ' + esc(mm[i] || '');
      if (wasA) el.setAttribute('href', href || '#installments');
    });
    var f1 = qs('#top .fc-1'), f2 = qs('#top .fc-2');
    if (f1 && f1.querySelector) {
      var b1 = f1.querySelector('b'), s1 = f1.querySelector('span:not(.fc-ic)');
      if (b1) b1.textContent = h.float1a || '';
      if (s1) s1.textContent = h.float1b || '';
    }
    if (f2 && f2.querySelector) {
      var b2 = f2.querySelector('b'), s2 = f2.querySelector('span:not(.fc-ic)');
      if (b2) b2.textContent = h.float2a || '';
      if (s2) s2.textContent = h.float2b || '';
    }

    /* ---- عناوين الأقسام ---- */
    var sv = c.services || {};
    setTxt(qs('#sEyebrow'), sv.eyebrow || ''); setTxt(qs('#sTitle'), sv.title || ''); setTxt(qs('#sSub'), sv.sub || '');
    setTxt(qs('#svcNoteTxt'), sv.note || '');
    var w = c.why || {};
    setTxt(qs('#wEyebrow'), w.eyebrow || '');
    setHTML(qs('#whyH2'), esc(w.title || '') + '<span>' + esc(w.titleHi || '') + '</span>');
    setTxt(qs('#whySub'), w.sub || '');
    var wc = qs('#whyChip');
    if (wc) { var wsvg = wc.querySelector('svg'); wc.innerHTML = (wsvg ? wsvg.outerHTML : '') + ' ' + esc(w.chip || ''); }
    qsa('#why .why-foot a[data-ph]').forEach(function (a) {
      var which = a.getAttribute('data-ph') === '1' ? w.btn1 : w.btn2;
      for (var i = 0; i < a.childNodes.length; i++) {
        var nd = a.childNodes[i];
        if (nd.nodeType === 3 && nd.textContent.trim()) { nd.textContent = which + ': '; break; }
      }
    });
    var im = c.inst || {};
    setTxt(qs('#iEyebrow'), im.eyebrow || '');
    setHTML(qs('#instH2'), esc(im.t1 || '') + '<span style="color:var(--brand)">' + esc(im.red || '') + '</span>' + esc(im.t2 || ''));
    setTxt(qs('#instSub'), im.sub || '');
    var icta = qs('#instCta');
    if (icta) icta.innerHTML = '💳 <b>' + esc(im.ctaB || '') + '</b>' + esc(im.ctaTail || '');
    var g = c.gallery || {};
    setTxt(qs('#gEyebrow'), g.eyebrow || ''); setTxt(qs('#gTitle'), g.title || ''); setTxt(qs('#gSub'), g.sub || '');
    var of = c.offers || {};
    setTxt(qs('#oEyebrow'), of.eyebrow || ''); setTxt(qs('#oTitle'), of.title || ''); setTxt(qs('#oSub'), of.sub || '');
    var lc = c.location || {};
    setTxt(qs('#lEyebrow'), lc.eyebrow || ''); setTxt(qs('#locTitle'), lc.title || '');
    setTxt(qs('#locSub'), lc.sub || '');
    var ct = c.cta || {};
    setTxt(qs('#ctaTitle'), ct.title || ''); setTxt(qs('#ctaP'), ct.p || '');

    /* ---- المحتوى الديناميكي ---- */
    renderServices(c); renderWhy(c); renderInst(c); renderGallery(c); renderOffers(c); renderStrip(c); renderBanner(c);

    /* ---- جهات الاتصال ---- */
    setPhones(c);
    var ct2 = c.contact || {};
    var addr = qs('#addrTxt');
    if (addr) addr.innerHTML = esc(ct2.addr1 || '') + '<br>' + esc(ct2.addr2 || '');
    var mf = qs('#mapFrame');
    if (mf && ct2.mapUrl) mf.setAttribute('src', ct2.mapUrl);
    var mfb = qs('#mapFallback a');
    if (mfb && ct2.mapUrl) mfb.setAttribute('href', ct2.mapUrl);

    /* ---- الفوتر ---- */
    var cp = qs('#copySpan');
    if (cp) cp.innerHTML = '© <span id="year"></span> ' + esc(nm) + ' — جميع الحقوق محفوظة';
    var yr = qs('#year'); if (yr) yr.textContent = new Date().getFullYear();
    setTxt(qs('#madeByTxt'), (c.footer || {}).madeBy || '');

    /* ---- إظهار/إخفاء الأقسام ---- */
    var secs = { strip: '.strip', services: '#services', offers: '#offers', why: '#why', inst: '#installments', gallery: '#gallery', location: '#location', cta: '#contact' };
    Object.keys(secs).forEach(function (k) {
      var el = qs(secs[k]);
      if (el) el.style.display = (c.show && c.show[k] === false) ? 'none' : '';
    });
    observeReveal();
  }

  /* =========================================================
     UI لوحة التحكم
     ========================================================= */
  var root = null;
  var activeTab = 'data';
  var cur = null;
  var CUR = null;

  function fieldHtml(fk, label, value, type, hint) {
    type = type || 'text';
    var v = esc(value == null ? '' : value);
    if (type === 'area') {
      return '<div class="f-row"><label>' + esc(label) + '</label><textarea data-fk="' + esc(fk) + '">' + v + '</textarea>' + (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>';
    }
    if (type === 'chk') {
      return '<label class="chk"><input type="checkbox" data-fk="' + esc(fk) + '"' + (value ? ' checked' : '') + '> <span>' + esc(label) + '</span></label>';
    }
    if (type === 'color') {
      return '<div class="f-row"><label>' + esc(label) + '</label><input type="color" data-fk="' + esc(fk) + '" value="' + v + '"></div>';
    }
    if (type === 'list') {
      return '<div class="f-row"><label>' + esc(label) + '</label><textarea data-fk="' + esc(fk) + '" data-array="1">' + v + '</textarea>' + (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>';
    }
    return '<div class="f-row"><label>' + esc(label) + '</label><input type="text" data-fk="' + esc(fk) + '" value="' + v + '">' + (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>';
  }
  function getPath(o, path) {
    var p = path.split('.');
    for (var i = 0; i < p.length; i++) { if (o == null) return undefined; o = o[p[i]]; }
    return o;
  }
  function setPath(o, path, v) {
    var p = path.split('.');
    for (var i = 0; i < p.length - 1; i++) { if (o[p[i]] == null || typeof o[p[i]] !== 'object') o[p[i]] = {}; o = o[p[i]]; }
    o[p[p.length - 1]] = v;
  }

  /* ---- قوائم قابلة للتعديل ---- */
  var LIST_DEFS = [
    { id: 'edServices', fk: 'services.items', title: 'الخدمات', cols: [['title', 'اسم الخدمة', 'text'], ['desc', 'الوصف', 'area']], icon: true },
    { id: 'edWhy', fk: 'why.items', title: 'نقاط لماذا نحن', cols: [['title', 'العنوان', 'text'], ['desc', 'الوصف', 'area']], icon: true },
    { id: 'edInst', fk: 'inst.items', title: 'شركات التقسيط', cols: [['main', 'اسم الشركة', 'text'], ['sub', 'اسم إضافي (اختياري)', 'text']], icon: false },
    { id: 'edGal', fk: 'gallery.items', title: 'صور المعرض', cols: [['title', 'عنوان الصورة', 'text'], ['img', 'رابط الصورة', 'text']], icon: false, upload: true },
    { id: 'edStrip', fk: 'strip.items', title: 'عناصر شريط المميزات', cols: [['t', 'النص الرئيسي', 'text'], ['s', 'النص الصغير', 'text']], icon: true },
    { id: 'edOffers', fk: 'offers.items', title: 'العروض', single: true, upload: true, cols: [['title', 'اسم العرض', 'text'], ['desc', 'وصف مختصر يظهر في البطاقة', 'area'], ['details', 'التفاصيل الكاملة (تظهر في نافذة التفاصيل)', 'area'], ['img', 'رابط صورة العرض', 'text'], ['fb', 'رابط عرض الفيسبوك (زر شوف على فيسبوك)', 'text']] }
  ];

  function rowHtml(def, it, idx) {
    var cols = '';
    def.cols.forEach(function (cl) {
      var key = cl[0], label = cl[1], type = cl[2];
      var v = it && it[key] != null ? it[key] : '';
      var attr = type === 'area'
        ? '<textarea data-col="' + key + '" placeholder="' + esc(label) + '">' + esc(v) + '</textarea>'
        : '<input type="text" data-col="' + key + '" placeholder="' + esc(label) + '" value="' + esc(v) + '">';
      cols += '<div class="f-row" style="margin-bottom:8px"><label style="font-size:.8rem">' + esc(label) + '</label>' + attr + '</div>';
    });
    var icon = (def.icon && it && it.icon) ? it.icon : '';
    var up = (def.upload) ? '<div class="row-upload"><button type="button" class="ed-add row-up">📤 رفع صورة من جهازك</button><span class="up-st"></span></div>' : '';
    var bodyWrap = def.single ? '<div class="fcolwrap">' + cols + '</div>' : '<div class="two">' + cols + '</div>';
    return '<div class="ed-row" data-idx="' + idx + '">' +
      '<button type="button" class="del" title="حذف">✕</button>' +
      (def.icon ? '<input type="hidden" data-col="icon" value="' + esc(icon) + '">' : '') +
      bodyWrap + up + '</div>';
  }
  function buildEditors(cfg) {
    LIST_DEFS.forEach(function (def) {
      var wrap = qs('#' + def.id); if (!wrap) return;
      var items = getPath(cfg, def.fk) || [];
      wrap.innerHTML = items.map(function (it, i) { return rowHtml(def, it, i); }).join('') +
        '<button type="button" class="ed-add">+ إضافة عنصر جديد</button>';
      bindEditorRows(wrap, def, cfg);
    });
  }
  function bindEditorRows(wrap, def, cfg) {
    qsa('.ed-row .del', wrap).forEach(function (b) {
      b.addEventListener('click', function () { b.closest('.ed-row').remove(); });
    });
    var add = wrap.querySelector('.ed-add');
    if (add) add.addEventListener('click', function () {
      var blank = {};
      def.cols.forEach(function (c) { blank[c[0]] = ''; });
      if (def.icon) {
        var icons = def.id === 'edStrip' ? STRIP_ICONS : null;
        var first = wrap.querySelector('.ed-row [data-col="icon"]');
        blank.icon = first ? first.value : (icons ? icons[0] : IC_WRENCH);
      }
      wrap.insertAdjacentHTML('beforeend', rowHtml(def, blank, wrap.querySelectorAll('.ed-row').length));
      bindEditorRows(wrap, def, cfg);
    });
    if (def.upload) {
      qsa('.row-up', wrap).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var row = btn.closest('.ed-row');
          var inp = document.createElement('input');
          inp.type = 'file'; inp.accept = 'image/*';
          inp.style.display = 'none';
          document.body.appendChild(inp);
          inp.addEventListener('change', function () {
            var file = inp.files && inp.files[0];
            if (!file) { inp.remove(); return; }
            var st = row.querySelector('.up-st');
            if (st) st.textContent = '⏳ جاري الرفع…';
            uploadImageFile(file).then(function (url) {
              var imgInp = row.querySelector('[data-col="img"]');
              if (imgInp) imgInp.value = url;
              if (st) { st.textContent = '✓ تم الرفع للسيرفر — اضغط "حفظ" عشان يظهر للكل'; st.style.color = '#8fd6a2'; }
              inp.remove();
            }).catch(function () {
              if (st) { st.textContent = '⚠️ الرفع فشل — تأكد إن الموقع شغال على السيرفر، أو استخدم رابط خارجي'; st.style.color = '#ff9b94'; }
              inp.remove();
            });
          });
          inp.click();
        });
      });
    }
  }
  function readEditors(cfg) {
    LIST_DEFS.forEach(function (def) {
      var wrap = qs('#' + def.id); if (!wrap) return;
      var arr = [];
      wrap.querySelectorAll('.ed-row').forEach(function (row) {
        var item = {};
        row.querySelectorAll('[data-col]').forEach(function (inp) { item[inp.getAttribute('data-col')] = inp.value; });
        arr.push(item);
      });
      setPath(cfg, def.fk, arr);
    });
  }
  function editorDefaults() { /* ليست القوائم لو فاضية من non-server contexts */ }

  /* ---- صفوف تبويبات ---- */
  function tabsHtml() {
    var tabs = [
      ['data', 'بيانات أساسية'], ['hero', 'الواجهة'], ['services', 'الخدمات'],
      ['why', 'لماذا نحن'], ['inst', 'التقسيط'], ['offers', 'العروض 🔥'], ['promo', 'الإعلانات والشرائط'],
      ['gallery', 'المعرض'], ['loc', 'الموقع والخريطة'], ['appear', 'الألوان والأقسام'],
      ['sec', 'الأمان'], ['foot', 'الفوتر']
    ];
    return tabs.map(function (t) { return '<button type="button" class="adm-tab" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('');
  }
  function listFieldPlaceholders() { }

  function panelBody(cfg) {
    function logoBlock() {
      return '<div class="f-row">' +
        fieldHtml('brand.logoImg', 'رابط اللوجو الحالي', cfg.brand.logoImg, 'text', 'أو ارفع لوجو جديد من جهازك فيبقى لكل الزوار') +
        '<button type="button" class="ed-add" id="logoUpBtn" style="margin-top:6px">📤 رفع لوجو جديد</button><span class="up-st" id="logoUpSt"></span>' +
        '</div>';
    }
    return [
      { id: 'data', html:
        '<h4 class="sec">اسم المركز والهوية</h4>' +
        logoBlock() +
        fieldHtml('brand.name', 'اسم المركز', cfg.brand.name) +
        fieldHtml('brand.tag', 'السطر الصغير تحت الاسم', cfg.brand.tag) +
        fieldHtml('brand.desc', 'وصف الموقع (لنتائج البحث)', cfg.brand.desc, 'area') +
        fieldHtml('brand.footerAbout', 'نبذة الفوتر', cfg.brand.footerAbout, 'area') +
        '<h4 class="sec">التواصل</h4>' +
        '<div class="two">' +
        fieldHtml('contact.phone1', 'رقم الهاتف الأساسي (01…)', cfg.contact.phone1) +
        fieldHtml('contact.phone2', 'رقم الهاتف الثاني (اختياري)', cfg.contact.phone2) +
        '</div>' +
        '<div class="two">' +
        fieldHtml('contact.wa', 'رقم الواتساب', cfg.contact.wa, 'text', 'بيستخدم في كل أزرار واتساب الموقع') +
        fieldHtml('contact.email', 'البريد الإلكتروني', cfg.contact.email) +
        '</div>' +
        fieldHtml('contact.facebook', 'رابط صفحة فيسبوك', cfg.contact.facebook) +
        '<div class="two">' +
        fieldHtml('contact.addr1', 'العنوان (سطر أول)', cfg.contact.addr1) +
        fieldHtml('contact.addr2', 'العنوان (سطر ثاني)', cfg.contact.addr2) +
        '</div>' +
        fieldHtml('contact.amsoil', 'رابط موقع الزيوت Amsoil', cfg.contact.amsoil)
      },
      { id: 'hero', html:
        '<h4 class="sec">الواجهة الرئيسية</h4>' +
        fieldHtml('hero.badge', 'الشارة العلوية', cfg.hero.badge) +
        '<div class="two">' +
        fieldHtml('hero.titleStart', 'بداية العنوان', cfg.hero.titleStart) +
        fieldHtml('hero.titleHi', 'الجزء المميز من العنوان', cfg.hero.titleHi) +
        '</div>' +
        fieldHtml('hero.lead', 'النص التعريفي', cfg.hero.lead, 'area') +
        '<h4 class="sec">بطاقة الشعار</h4>' +
        '<div class="two">' +
        fieldHtml('hero.artName', 'الاسم في البطاقة', cfg.hero.artName) +
        fieldHtml('hero.artSub', 'الوصف تحت الاسم', cfg.hero.artSub) +
        '</div>' +
        fieldHtml('hero.chips', 'الكلمات المميزة (كل كلمة في سطر)', (cfg.hero.chips || []).join('\n'), 'list', 'افصل بين الكلمات بأسطر جديدة') +
        '<h4 class="sec">نقاط المزايا + البطاقات الطايرة</h4>' +
        fieldHtml('hero.meta1', 'النقطة الأولى', cfg.hero.meta1) +
        fieldHtml('hero.meta2', 'النقطة الثانية', cfg.hero.meta2) +
        fieldHtml('hero.meta3', 'النقطة الثالثة', cfg.hero.meta3) +
        '<div class="two">' +
        fieldHtml('hero.float2a', 'بطاقة الخبرة — سطر أول', cfg.hero.float2a) +
        fieldHtml('hero.float2b', 'بطاقة الخبرة — سطر ثاني', cfg.hero.float2b) +
        '</div>'
      },
      { id: 'services', html:
        '<h4 class="sec">عنوان القسم</h4>' +
        fieldHtml('services.eyebrow', 'الشارة', cfg.services.eyebrow) +
        fieldHtml('services.title', 'العنوان الرئيسي', cfg.services.title) +
        fieldHtml('services.sub', 'الوصف', cfg.services.sub, 'area') +
        '<h4 class="sec">سطر شريط "زيوت متوفرة"</h4>' +
        fieldHtml('services.note', 'النص', cfg.services.note) +
        '<h4 class="sec">الخدمات (أضف/عدّل/احذف)</h4>' +
        '<div id="edServices"></div>'
      },
      { id: 'why', html:
        '<h4 class="sec">عنوان القسم</h4>' +
        fieldHtml('why.eyebrow', 'الشارة', cfg.why.eyebrow) +
        '<div class="two">' +
        fieldHtml('why.title', 'جزء العنوان الأول', cfg.why.title) +
        fieldHtml('why.titleHi', 'الجزء المميز', cfg.why.titleHi) +
        '</div>' +
        fieldHtml('why.sub', 'الوصف', cfg.why.sub, 'area') +
        '<h4 class="sec">شريط "متاح الآن" وأزراره</h4>' +
        fieldHtml('why.chip', 'نص الشريط', cfg.why.chip) +
        fieldHtml('why.btn1', 'زر الرقم الأول', cfg.why.btn1) +
        fieldHtml('why.btn2', 'زر الرقم الثاني', cfg.why.btn2) +
        '<h4 class="sec">النقاط</h4><div id="edWhy"></div>'
      },
      { id: 'inst', html:
        '<h4 class="sec">عنوان القسم</h4>' +
        fieldHtml('inst.eyebrow', 'الشارة', cfg.inst.eyebrow) +
        '<div class="two">' +
        fieldHtml('inst.t1', 'قبل الجزء الأحمر', cfg.inst.t1) +
        fieldHtml('inst.red', 'الجزء الأحمر', cfg.inst.red) +
        '</div>' +
        fieldHtml('inst.sub', 'الوصف', cfg.inst.sub, 'area') +
        '<h4 class="sec">سطر الختام 💳</h4>' +
        fieldHtml('inst.ctaB', 'الجزء العريض', cfg.inst.ctaB) +
        fieldHtml('inst.ctaTail', 'الجزء التكميلي', cfg.inst.ctaTail) +
        '<h4 class="sec">شركات التقسيط</h4><div id="edInst"></div>'
      },
      { id: 'offers', html:
        '<h4 class="sec">عنوان قسم العروض (على الموقع)</h4>' +
        fieldHtml('offers.eyebrow', 'الشارة', cfg.offers.eyebrow) +
        fieldHtml('offers.title', 'عنوان القسم', cfg.offers.title) +
        fieldHtml('offers.sub', 'الوصف', cfg.offers.sub, 'area') +
        '<div class="f-row"><div class="hint">🔥 <b>إزاي القسم شغال؟</b> كل عرض له: صورة، وصف مختصر في البطاقة، تفاصيل كاملة (تظهر في نافذة "التفاصيل الكاملة")، رابط فيسبوك (زر "شوف العرض على فيسبوك"). زر "اطلب العرض" بيفتح نموذج (اسم + هاتف + عنوان) ويرسلها واتساب للرقم الموجود في تبويب "بيانات أساسية".</div></div>' +
        '<div id="edOffers"></div>'
      },
      { id: 'promo', html:
        '<h4 class="sec">🎁 بنر العروض المتحرك (أعلى الموقع)</h4>' +
        fieldHtml('banner.show', 'إظهار البنر', cfg.banner.show !== false, 'chk') +
        fieldHtml('banner.chip', 'كلمة الشارة (يسار/يمين البنر)', cfg.banner.chip) +
        fieldHtml('banner.items', 'نصوص العروض (كل عرض في سطر)', (cfg.banner.items || []).join('\n'), 'list', 'كل سطر = عرض بيمر في البنر المتحرك') +
        '<div class="two">' +
        fieldHtml('banner.bg1', 'لون البداية', cfg.banner.bg1, 'color') +
        fieldHtml('banner.bg2', 'لون النهاية', cfg.banner.bg2, 'color') +
        '</div>' +
        '<div class="two">' +
        fieldHtml('banner.txt', 'لون النص', cfg.banner.txt, 'color') +
        fieldHtml('banner.speed', 'سرعة الحركة (ثانية)', cfg.banner.speed) +
        '</div>' +
        '<h4 class="sec">شريط المميزات (تحت الواجهة)</h4>' +
        fieldHtml('show.strip', 'إظهار شريط المميزات', cfg.show.strip !== false, 'chk') +
        '<div id="edStrip"></div>'
      },
      { id: 'gallery', html:
        '<h4 class="sec">عنوان القسم</h4>' +
        fieldHtml('gallery.eyebrow', 'الشارة', cfg.gallery.eyebrow) +
        fieldHtml('gallery.title', 'العنوان', cfg.gallery.title) +
        fieldHtml('gallery.sub', 'الوصف', cfg.gallery.sub, 'area') +
        fieldHtml('gallery.note', 'السطر الأخير تحت الصور', cfg.gallery.note) +
        '<h4 class="sec">صور المعرض — ارفع من جهازك وهي تظهر لكل الزوار</h4>' +
        '<div class="f-row"><div class="hint">📸 زر "📤 رفع صورة من جهازك" بيخزّن الصورة على السيرفر وبيحط رابطها تلقائيًا. أو الصق رابط صورة جاهزة في خانة "رابط الصورة". بعد الرفع اضغط "حفظ".</div></div>' +
        '<div id="edGal"></div>'
      },
      { id: 'loc', html:
        '<h4 class="sec">عنوان قسم الموقع</h4>' +
        fieldHtml('location.eyebrow', 'الشارة', cfg.location.eyebrow) +
        fieldHtml('location.title', 'العنوان', cfg.location.title) +
        fieldHtml('location.sub', 'الوصف', cfg.location.sub, 'area') +
        '<h4 class="sec">الخريطة</h4>' +
        fieldHtml('contact.mapUrl', 'رابط تضمين خريطة جوجل', cfg.contact.mapUrl, 'text', 'جوجل ماب → مشاركة → تضمين خريطة والصق الرابط')
      },
      { id: 'appear', html:
        '<h4 class="sec">ألوان الموقع</h4>' +
        '<div class="two">' +
        fieldHtml('colors.gold', 'الذهبي', cfg.colors.gold, 'color') +
        fieldHtml('colors.brand', 'الأحمر', cfg.colors.brand, 'color') +
        '</div>' +
        fieldHtml('colors.dark', 'الخلفيات الداكنة', cfg.colors.dark, 'color') +
        '<h4 class="sec">إظهار / إخفاء الأقسام</h4>' +
        fieldHtml('show.strip', 'شريط المميزات', cfg.show.strip !== false, 'chk') +
        fieldHtml('show.offers', 'قسم العروض 🔥', cfg.show.offers !== false, 'chk') +
        fieldHtml('show.services', 'قسم الخدمات', cfg.show.services !== false, 'chk') +
        fieldHtml('show.why', 'قسم لماذا نحن', cfg.show.why !== false, 'chk') +
        fieldHtml('show.inst', 'قسم التقسيط', cfg.show.inst !== false, 'chk') +
        fieldHtml('show.gallery', 'قسم المعرض', cfg.show.gallery !== false, 'chk') +
        fieldHtml('show.location', 'قسم الموقع', cfg.show.location !== false, 'chk') +
        fieldHtml('show.cta', 'قسم تواصل معنا الأخير', cfg.show.cta !== false, 'chk') +
        fieldHtml('show.banner', 'بنر العروض العلوي', cfg.show.banner !== false, 'chk')
      },
      { id: 'sec', html:
        '<h4 class="sec">🔒 كلمة مرور لوحة التحكم</h4>' +
        fieldHtml('security.password', 'كلمة المرور المحلية (قبل ربط Supabase)', cfg.security.password, 'text', 'مؤقتة فقط لو الموقع مش مربوط بـ Supabase بعد.') +
        '<div class="f-row"><div class="hint">🔌 <b>عند الربط بـ Supabase:</b> الدخول للوحة = باسورد حساب المدير اللي أنشأتيه في Supabase Auth (5 ضغطات على سطر الحقوق ثم الباسورد ده).</div></div>' +
        '<div class="f-row"><div class="hint" id="sbStatusLine">⚠️ حالة الربط: غير مربوط بعد — ابعتلي رابط المشروع و anon key عشان أكمّل الربط، أو اتبعي دليل Supabase.</div></div>'
      },
      { id: 'foot', html:
        '<h4 class="sec">قسم تواصل معنا الأخير (قبل الفوتر)</h4>' +
        fieldHtml('cta.title', 'العنوان', cfg.cta.title) +
        fieldHtml('cta.p', 'النص', cfg.cta.p, 'area') +
        '<h4 class="sec">الفوتر</h4>' +
        fieldHtml('footer.madeBy', 'سطر "صنع بواسطة"', cfg.footer.madeBy)
      }
    ];
  }

  /* ---- نافذة اللوحة ---- */
  function openUI(cfg) {
    if (!root) return;
    root.classList.add('open');
    root.innerHTML =
      '<div class="adm-ov" id="admOv"></div>' +
      '<div class="adm-panel">' +
      '<div class="adm-head"><h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> لوحة تحكم الموقع</h3>' +
      '<div><div class="conn" id="connStatus"></div><button class="adm-x" id="admX" title="إغلاق">✕</button></div></div>' +
      '<div class="adm-tabs">' + tabsHtml() + '</div>' +
      '<div class="adm-body" id="admBody"></div>' +
      '<div class="adm-actions">' +
      '<button class="adm-save" id="admSave">💾 حفظ ونشر للجميع</button>' +
      '<button class="adm-reset" id="admReset">إعادة الضبط</button>' +
      '</div>' +
      '<div class="adm-toast" id="admToast"></div>' +
      '</div>';

    var body = qs('#admBody');
    panelBody(cfg).forEach(function (p) {
      var node = document.createElement('div');
      node.className = 'adm-tabpane';
      node.setAttribute('data-pane', p.id);
      node.innerHTML = p.html;
      body.appendChild(node);
    });

    function activate(tab) {
      activeTab = tab;
      qsa('.adm-tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
      qsa('#admBody .adm-tabpane').forEach(function (pn) { pn.style.display = pn.getAttribute('data-pane') === tab ? '' : 'none'; });
    }
    qsa('.adm-tab').forEach(function (b) {
      b.addEventListener('click', function () { activate(b.getAttribute('data-tab')); });
    });
    activate(activeTab);

    setConnUI();
    var sbline = qs('#sbStatusLine');
    if (sbline) {
      if (sbReady()) sbline.innerHTML = '🟢 <b>مربوط بـ Supabase:</b> ' + esc(SB.url);
      else sbline.innerHTML = '🟠 <b>غير مربوط بعد.</b> عشان تخزين التعديلات والصور للجميع، ابعتلي (Project URL + anon key) وأنا أربطها، أو اتبع دليل Supabase.';
    }
    buildEditors(cfg);
    var lo = qs('#logoUpBtn');
    if (lo) lo.addEventListener('click', function () {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*'; inp.style.display = 'none';
      document.body.appendChild(inp);
      inp.addEventListener('change', function () {
        var f = inp.files && inp.files[0]; if (!f) { inp.remove(); return; }
        var st = qs('#logoUpSt'); if (st) st.textContent = '⏳ جاري رفع اللوجو…';
        uploadImageFile(f).then(function (url) {
          var fi = qs('[data-fk="brand.logoImg"]'); if (fi) fi.value = url;
          if (st) { st.textContent = '✓ اترفع — اضغط حفظ عشان يتطبق'; st.style.color = '#8fd6a2'; }
          inp.remove();
        }).catch(function () { if (st) st.textContent = '⚠️ فشل الرفع'; inp.remove(); });
      });
      inp.click();
    });

    qs('#admX').addEventListener('click', close);
    qs('#admOv').addEventListener('click', close);
    qs('#admSave').addEventListener('click', function () {
      qsa('#adminRoot [data-fk]').forEach(function (inp) {
        var fk = inp.getAttribute('data-fk');
        var v;
        if (inp.type === 'checkbox') v = inp.checked;
        else if (inp.getAttribute('data-array')) v = inp.value.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
        else v = inp.value;
        setPath(cur, fk, v);
      });
      readEditors(cur);
      apply(cur);
      writeLocal(cur);
      serverSave(cur).then(function () {
        toast('✓ تم النشر — التغييرات ظاهرة لكل الزوار');
      }).catch(function () {
        toast('⚠️ اتسجل محليًا فقط (مفيش سيرفر) — هتظهر ليك لوحدك');
      });
    });
    qs('#admReset').addEventListener('click', function () {
      if (!window.confirm('متأكد؟ هيرجع الموقع للإعدادات الأصلية ويحذف التعديلات.')) return;
      try { localStorage.removeItem(LS); } catch (e) {}
      cur = defaults();
      if (window.fetch) {
        serverSave(cur).then(function () { toast('تمت إعادة الضبط ونشرها للكل'); }, function () { toast('اترجّع محليًا'); });
      }
      apply(cur);
      buildUIagain();
    });

    function buildUIagain() { /* تحديث الحقول بعد الريست */ }
  }

  function toast(msg) {
    var t = qs('#admToast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._x);
    t._x = setTimeout(function () { t.classList.remove('show'); }, 3000);
  }
  function close() { if (root) root.classList.remove('open'); }

  /* ---- بوابة الباسورد: 5 ضغطات على سطر الحقوق ---- */
  var _clicks = 0, _t = null;
  function gateOpen() {
    var g = qs('#pwGate'); if (!g) return;
    g.classList.add('open');
    var inp = qs('#pwIn'); if (inp) { inp.value = ''; setTimeout(function () { inp.focus(); }, 60); }
    var er = qs('#pwErr'); if (er) er.textContent = '';
  }
  function gateClose() { var g = qs('#pwGate'); if (g) g.classList.remove('open'); }
  function gateFail(msg) {
    var er = qs('#pwErr'); if (er) er.textContent = msg;
    var card = qs('#pwCard');
    if (card) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
    var inp = qs('#pwIn'); if (inp) { inp.select(); inp.focus(); }
  }
  function gateTry() {
    var inp = qs('#pwIn');
    var btn = qs('#pwOpen');
    if (!sbReady()) {
      // الوضع المحلي (قبل الربط بـ Supabase): مقارنة بكلمة المرور المحفوظة
      var pass = (cur && cur.security && cur.security.password) ? cur.security.password : '0000';
      if (inp && inp.value === pass) { gateClose(); openUI(cur); }
      else { gateFail('كلمة المرور غير صحيحة، حاول تاني'); }
      return;
    }
    // الوضع المتصل بـ Supabase: تسجيل دخول حقيقي لحساب المدير
    var orig = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري التحقق…'; }
    supabaseSignIn(inp ? inp.value : '').then(function (r) {
      if (r.ok && r.j && r.j.access_token) {
        sbSetTok(r.j.access_token);
        gateClose();
        openUI(cur);
      } else {
        gateFail('كلمة المرور غير صحيحة، حاول تاني');
      }
    }).catch(function () {
      gateFail('تعذر الاتصال بـ Supabase — تأكد من الربط أو الإنترنت');
    }).then(function () {
      if (btn) { btn.disabled = false; btn.textContent = orig; }
    });
  }
  function armSecret() {
    var zone = qs('.foot-bottom');
    if (!zone) return;
    zone.addEventListener('click', function () {
      _clicks++;
      if (_t) clearTimeout(_t);
      _t = setTimeout(function () { _clicks = 0; }, 2000);
      if (_clicks >= 5) { _clicks = 0; gateOpen(); }
    });
    var b1 = qs('#pwOpen'); if (b1) b1.addEventListener('click', gateTry);
    var b2 = qs('#pwClose'); if (b2) b2.addEventListener('click', gateClose);
    var ov = qs('.pw-ov'); if (ov) ov.addEventListener('click', gateClose);
    var inp = qs('#pwIn');
    if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); gateTry(); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') gateClose(); });
  }

  /* ---- التشغيل ---- */
  function localCfg() {
    var saved = readLocal();
    if (saved) { var d = defaults(); merge(d, saved); return d; }
    // مفيش محفوظ: نلتقط المحتوى الحالي للصفحة (الأصلي) كنقطة بداية
    return snapshotArrays(defaults());
  }
  function boot() {
    try {
      zhBindEsc();
      root = qs('#adminRoot');
      armSecret();
      cur = localCfg();
      apply(cur);
      // نحاول نجيب إعدادات السيرفر (الأحدث للكل)
      if (window.fetch) {
        serverGet().then(function (remote) {
          if (remote && typeof remote === 'object' && remote.v) {
            cur = defaults();
            merge(cur, remote);
            apply(cur);
          }
        }).catch(function () { /* محلي */ });
      }
    } catch (e) { if (window.console) console.warn('boot', e); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
