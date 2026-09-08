# 🔌 ربط الموقع بـ Supabase + نشره على Netlify — دليل كامل (مجاني 100%، بدون فيزا)

هذا الدليل يحل محل خطة Render (التي تطلب بطاقة بنكية).
الفكرة الجديدة **كلها مجانية ولا تطلب أي بطاقة**:

| الدور | المنصة | التكلفة |
|---|---|---|
| استضافة صفحات الموقع (static) | **Netlify** | مجاني نهائيًا — بدون فيزا |
| تخزين تعديلات لوحة التحكم | **Supabase** (قاعدة بيانات) | مجاني نهائيًا — بدون فيزا |
| تخزين الصور المرفوعة | **Supabase Storage** | مجاني (1 GB) |

> موقعك يبقى صفحة واحدة + Supabase كمخزن خلفي. أي زائر بيفتح الموقع بيقرأ أحدث إعدادات وصور من Supabase مباشرة → **تظهر للجميع فورًا**.

---

## الخطوة 1 — إنشاء مشروع Supabase (بدون فيزا)

1. افتح <https://supabase.com> واضغط **Start your project**.
2. سجّل بحساب GitHub أو بريد إلكتروني (لا يُطلب أي بطاقة إطلاقًا).
3. من لوحة التحكم اضغط **New project**:
   - **Name:** `zakir-hussein-site`
   - **Database Password:** اكتبي أي كلمة مرور قوية واحفظيها في مكان آمن (مهمة)
   - **Region:** `EU Central (Frankfurt)` — الأقرب لمصر
   - **Plan:** `Free` ✅
4. اضغط **Create new project** وانتظري دقيقة حتى تجهز القاعدة.

## الخطوة 2 — نسخ بيانات الربط (Project URL + anon key)

1. من لوحة مشروعك: اضغط ⚙️ **Project Settings** (أو أيقونة الترس).
2. من القائمة الجانبية اضغط **API**.
3. انسخي هاتين القيمتين واحتفظي بهما:
   - **Project URL** — شكلها: `https://xxxx.supabase.co`
   - **anon public** — سلسلة طويلة تبدأ بـ `eyJhbGci...`

> ⚠️ انسخي الـ **anon** (وليس service_role — ده سرّي ممنوع ينكشف).

## الخطوة 3 — تجهيز قاعدة البيانات (سكربت جاهز)

1. من القائمة الجانبية اضغط **SQL Editor** ثم **New query**.
2. الصقي الكود التالي كاملًا ثم اضغط **Run**:

```sql
-- جدول إعدادات الموقع (صف واحد فقط)
create table if not exists public.site_config (
  id integer primary key,
  config jsonb not null default '{}'::jsonb
);
alter table public.site_config enable row level security;

-- القراءة متاحة للجميع (عشان الموقع يقرأ الإعدادات)
drop policy if exists "read public" on public.site_config;
create policy "read public" on public.site_config for select using (true);

-- الكتابة متاحة فقط لحساب المدير المسجّل
drop policy if exists "ins auth" on public.site_config;
create policy "ins auth" on public.site_config for insert to authenticated with check (true);
drop policy if exists "upd auth" on public.site_config;
create policy "upd auth" on public.site_config for update to authenticated using (true) with check (true);

insert into public.site_config (id, config) values (1, '{}') on conflict (id) do nothing;

-- مخزن الصور (عام للقراءة)
insert into storage.buckets (id, name, public) values ('images', 'images', true)
  on conflict (id) do update set public = true;

drop policy if exists "pub read img" on storage.objects;
create policy "pub read img" on storage.objects for select using (bucket_id = 'images');
drop policy if exists "auth ins img" on storage.objects;
create policy "auth ins img" on storage.objects for insert to authenticated with check (bucket_id = 'images');
```

3. ستظهر رسالة نجاح خضراء `Success`.

## الخطوة 4 — إنشاء حساب المدير (لللوحة)

1. من القائمة الجانبية اضغط **Authentication** ← **Users** ← **Add user**.
2. اكتبي:
   - **Email:** أي بريد (مثل `admin@zh-site.com`)
   - **Password:** اختاري كلمة مرور قوية للوحة التحكم
   - فعّلي خيار **Auto Confirm User** إن وُجد (عشان يتفعّل الدخول فورًا)
3. اضغط **Create user**.
4. **احفظي هذا البريد وكلمة المرور** — دي هتبقى باسورد لوحة التحكم بعد الربط.

## الخطوة 5 — تفعيل الربط في الموقع

طريقتان:

**الطريقة (أ) — الأسهل (أنصحك بها):**
ابعتيلي عبر المحادثة القيم الثلاث:
- Project URL
- anon key
- بريد حساب المدير (من الخطوة 4)

وأنا أعبّيها لك في ملف `index.html` (في السطر المكتوب فيه `window.ZH_SB`) وأجهّز لك الحزمة النهائية الجاهزة للنشر.

**الطريقة (ب) — بنفسك:**
افتحي ملف `index.html` بمحرر نصوص (مثل Notepad أو VS Code) وابحثي عن:

```
window.ZH_SB = { url: '', anon: '', adminEmail: '' };
```

واملئي القيم الثلاث بين علامتي التنصيص، ثم احفظي الملف.

---

## الخطوة 6 — نشر الموقع على Netlify (بدون فيزا، بالحرف حرفيًا)

1. افتحي <https://app.netlify.com/drop>
2. سجّلي الدخول بحساب (بريد أو GitHub) — لا يُطلب أي بطاقة.
3. اسحبي مجلد `zakir-hussein-site` **كاملًا** وأفلتيه في الصفحة.
4. بعد ثوانٍ سيعطيك Netlify رابطًا مثل:
   `https://أي-اسم-عشوائي.netlify.app`
5. عدّلي اسم الموقع إن أردت: **Site settings → Change site name**.

## الخطوة 7 — التحقق (تظهر للجميع)

1. افتحي الرابط → سيقرأ الموقع إعدادات Supabase ويطبقها.
2. اضغطي **5 مرات** على سطر الحقوق أسفل الصفحة → نافذة كلمة المرور.
3. اكتبي **باسورد حساب المدير** (من الخطوة 4) — وليس 0000.
4. سترين في رأس اللوحة: **● متصل بـ Supabase — الحفظ والنشر لكل الزوار**.
5. ارفعي صورة تجريبية → **💾 حفظ ونشر للجميع**.
6. افتحي الموقع من موبايل آخر أو نافذة تصفح خاص — الصورة ظاهرة للجميع ✅

---

## 📋 ملاحظات مهمة

- **تعديل أي تحديث مستقبلي للمحتوى** (نصوص/أرقام/صور) يتم من اللوحة فقط → يظهر فورًا للكل، ولا تحتاجين إعادة نشر.
- **لو عدّلتِ في ملف `index.html` نفسه** (تصميم أو كود) → اسحبي المجلد على Netlify Drop من جديد ليتحدث.
- **إيقاف الخمول**: مشروع Supabase المجاني يتوقف تلقائيًا بعد 7 أيام بدون أي طلب. طالما في زوار يفتحون الموقع (كل فتحة بتقرأ من القاعدة) فهو يبقى نشطًا. لو توقف: افتحي مشروعك في Supabase واضغطي **Restore project** (ثوانٍ).
- **حدود الخطة المجانية**: قاعدة 500 MB + صور 1 GB + عدد زوار شهري 50 ألف — أكثر من كافٍ لموقع المركز.
- **الصور الأصلية**: احتفظي دائمًا بنسخة على جهازك.

---

## 🧪 مشكلة شائعة

**"اللوحة بتقول كلمة مرور غير صحيحة بعد الربط"**
تأكدي إنك تكتبي باسورد حساب المدير (الذي أنشأته في Authentication → Users)، وأن `adminEmail` في `window.ZH_SB` مطابق لبريد ذلك الحساب بالضبط، وأن خيار Auto Confirm مفعّل (أو أنك فعّلت بريدك من رسالة التأكيد).
