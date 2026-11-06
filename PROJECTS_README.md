# صفحات المشاريع على GitHub Pages

هذا النظام يتيح إنشاء صفحة مستقلة لكل مشروع برمجي على نطاق `ragaeidos.website` (يشتغل عبر GitHub Pages من مستودع `RaGAEIDOS.github.io`).

## مبدأ العمل

كل مشروع يحصل على مجلد خاص به في جذر المستودع يحتوي على ملف `index.html`، وتكون الصفحة متاحة على المسار:

```
https://ragaeidos.website/اسم-المشروع/
```

مثال: `https://ragaeidos.website/justgivenup/`

## كيفية إضافة مشروع جديد

1. أنشئ مجلد جديد باسم المشروع (بالإنجليزي، بدون مسافات، يُفضل شرطة سفلية أو شرطة عادية):

```
mkdir مشروع-جديد
```

2. أضف ملف `index.html` داخل المجلد استناداً إلى القالب أدناه.

3. أضف أيقونة المشروع (اختياري) باسم `icon.png` أو `logo.png` في نفس المجلد.

4.commit واستدفع إلى الفرع `main` — سيتم تحديث الموقع تلقائياً عبر GitHub Pages.

## القالب القابل لإعادة الاستخدام (Template)

انسخ هذا الملف وسمّه `index.html` داخل مجلد المشروع الجديد:

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl" class="dark scroll-smooth" data-theme="terminal">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0a0e14">
    <meta name="description" content="وصف المشروع هنا">
    <title>اسم المشروع | ragaeidos.website</title>

    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Fira+Code:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: { extend: { fontFamily: { sans: ['Cairo', 'sans-serif'], mono: ['Fira Code', 'monospace'] } } }
        }
    </script>
    <style>
        :root { --bg:#0a0e14; --card:#111822; --border:#1f2937; --green:#00ff9c; --cyan:#00d9ff; --amber:#ffb454; }
        body { background: var(--bg); color: #e5e7eb; font-family: 'Cairo', sans-serif; margin: 0; }
        .badge { display:inline-block; padding:4px 12px; border-radius:999px; font-size:.85rem; font-weight:600; margin:2px; border:1px solid var(--border); background:rgba(255,255,255,0.03); }
        .badge-green { color:var(--green); border-color:var(--green); background:rgba(0,255,156,0.1); }
        .badge-cyan { color:var(--cyan); border-color:var(--cyan); background:rgba(0,217,255,0.1); }
        .badge-amber { color:var(--amber); border-color:var(--amber); background:rgba(255,180,84,0.1); }
        .card { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:24px; }
        .code-block { background:#0f172a; border:1px solid var(--border); border-radius:12px; padding:16px; font-family:'Fira Code',monospace; font-size:.9rem; overflow-x:auto; white-space:pre-wrap; }
        .btn { padding:10px 20px; border-radius:10px; font-weight:700; cursor:pointer; border:none; font-family:inherit; }
        .btn-primary { background:var(--green); color:#000; }
        .btn-ghost { background:rgba(255,255,255,0.05); color:#e5e7eb; border:1px solid var(--border); }
        .lang-btn { padding:8px 16px; border-radius:8px; font-weight:700; cursor:pointer; border:1px solid var(--border); }
        .lang-btn.active { background:var(--green); color:#000; border-color:var(--green); }
        .center-logo { width:72px; height:72px; border-radius:16px; background:#000; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }
        .notice { background:rgba(255,180,84,0.1); border:1px solid var(--amber); color:var(--amber); border-radius:10px; padding:14px; margin-top:16px; font-size:.9rem; }
        a { color:var(--cyan); text-decoration:none; } a:hover { text-decoration:underline; }
    </style>
</head>
<body class="min-h-screen flex flex-col">

    <header class="border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur sticky top-0 z-40">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-[var(--green)]/20 flex items-center justify-center">
                    <i class="fa-brands fa-github text-[var(--green)] text-xs"></i>
                </div>
                <a href="/" class="font-mono font-bold text-sm tracking-tighter">RaGAEIDOS</a>
                <span class="font-mono text-xs text-gray-500 mx-1">|</span>
                <a href="/اسم-المشروع/" class="font-mono text-xs text-[var(--cyan)]">اسم-المشروع</a>
            </div>
            <div class="flex items-center gap-3">
                <a href="https://github.com/RaGAEIDOS/اسم-المستودع" target="_blank" class="btn-ghost text-xs px-3 py-1.5">
                    <i class="fa-brands fa-github mr-1.5"></i> المستودع على GitHub
                </a>
                <a href="/" class="btn-ghost text-xs px-3 py-1.5">العودة للموقع الرئيسي</a>
            </div>
        </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow">
        <div class="text-center mb-16">
            <div class="center-logo">
                <img src="icon.png" alt="الشعار" onerror="this.style.display='none';this.parentElement.innerHTML='<i class=\"fa-shield-halved text-2xl text-[var(--cyan)]\"></i>'">
            </div>
            <h1 class="text-4xl sm:text-5xl font-black text-white mb-4">اسم المشروع</h1>
            <p class="text-lg text-gray-400 max-w-2xl mx-auto">وصف المشروع بالعربية هنا.</p>
            <div class="flex flex-wrap justify-center gap-2 mt-8">
                <span class="badge badge-green">v1.0.0</span>
                <span class="badge badge-amber">MIT License</span>
                <span class="badge badge-cyan">Windows + Linux</span>
            </div>
            <div class="mt-10">
                <button class="lang-btn active">العربية</button>
                <button class="lang-btn">English</button>
            </div>
        </div>

        <section class="card mb-12">
            <h2 class="text-xl font-bold text-white mb-6">التثبيت</h2>
            <div class="code-block">مثال: curl -fsSL https://ragaeidos.website/اسم-المشروع/install.sh | sudo sh</div>
            <div class="flex gap-3 mt-6">
                <button class="btn-ghost flex-1 text-sm">تنزيل الملفات</button>
                <button class="btn-primary flex-1 text-sm">تثبيت الآن</button>
            </div>
        </section>

        <div class="text-center mt-12">
            <a href="/" class="btn-ghost text-sm px-4 py-2">← العودة لمعرض المشاريع</a>
        </div>
    </main>

    <footer class="border-t border-[var(--border)] bg-[var(--bg)] py-8 mt-auto">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <div class="flex items-center gap-2 font-mono"><span>RaGAEIDOS</span><span>|</span><span class="text-[var(--cyan)]">DOS</span><span class="ml-2">© 2026 ragaeidos.website</span></div>
            <div class="flex gap-4">
                <a href="https://github.com/RaGAEIDOS" class="hover:text-[var(--cyan)]">GitHub</a>
                <a href="https://www.youtube.com/@RaGAEIDOS" class="hover:text-[var(--cyan)]">YouTube</a>
            </div>
        </div>
    </footer>
</body>
</html>
```

## مثال موجود

مجلة `justgivenup/` تحتوي على صفحة جاهزة للمشروع `JustGivenUp! Guardian` وتُشغّل على:

```
https://ragaeidos.website/justgivenup/
```

## ملاحظات

- جميع الصفحات ثابتة (Static HTML) وتعمل مباشرة عبر GitHub Pages دون need لبناء أو برمجة طرف خادم.
- التصميم متوافق مع اللغة العربية (`dir="rtl"`).
- يمكن تخصيص الألوان والشعار لكل مشروع بشكل مستقل.
