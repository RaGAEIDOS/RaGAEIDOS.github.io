/* ============================================================
   RaGAEI | DOS — Live Feeds Engine
   بيجيب آخر الفيديوهات (يوتيوب) والمنشورات (X + TikTok) وبيجدّدها
   بشكل دوري مع كاش محلي عشان ما نضغطش على المصادر.
   ============================================================ */
(() => {
    "use strict";

    /* ---------------- الإعدادات ---------------- */
    const CONFIG = {
        refreshMs: 10 * 60 * 1000, // تحديث تلقائي كل 10 دقائق
        cacheTtlMs: 5 * 60 * 1000, // صلاحية الكاش المحلي
        cacheKey: "ragaeidos:feeds:v1",
        themeKey: "ragaeidos:theme",
        timeoutMs: 45000,
        youtube: {
            channelId: "UC9GdAljFO0U6bxUzlSnBDYw",
            handle: "RaGAEIDOS",
            piped: "https://pipedapi.ducks.party/channel/UC9GdAljFO0U6bxUzlSnBDYw",
        },
        x: { handle: "RaGAEIDOS" },
        tiktok: { handle: "ragaeidos" },
        jina: "https://r.jina.ai/",
    };

    const MONTHS = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
    const MONTHS_AR = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
    ];

    /* ---------------- أدوات مساعدة ---------------- */
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

    const esc = (s) =>
        String(s ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

    function hi(text) {
        // يلوّن الهاشتاج والمنشن بعد التأكد من أن النص آمن
        return esc(text).replace(
            /(^|[\s(])#([\p{L}\p{N}_]+)/gu,
            '$1<span class="hashtag">#$2</span>'
        );
    }

    function timeAgo(ts) {
        if (!ts) return "";
        const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
        if (s < 60) return "الآن";
        const m = Math.floor(s / 60);
        if (m < 60) return m === 1 ? "منذ دقيقة" : m === 2 ? "منذ دقيقتين" : m < 11 ? `منذ ${m} دقائق` : `منذ ${m} دقيقة`;
        const h = Math.floor(m / 60);
        if (h < 24) return h === 1 ? "منذ ساعة" : h === 2 ? "منذ ساعتين" : h < 11 ? `منذ ${h} ساعات` : `منذ ${h} ساعة`;
        const d = Math.floor(h / 24);
        if (d < 30) return d === 1 ? "أمس" : d === 2 ? "منذ يومين" : d < 11 ? `منذ ${d} أيام` : `منذ ${d} يومًا`;
        const mo = Math.floor(d / 30);
        if (mo < 12) return mo === 1 ? "منذ شهر" : mo === 2 ? "منذ شهرين" : mo < 11 ? `منذ ${mo} أشهر` : `منذ ${mo} شهرًا`;
        const y = Math.floor(mo / 12);
        return y === 1 ? "منذ سنة" : y === 2 ? "منذ سنتين" : `منذ ${y} سنوات`;
    }

    function arDate(ts) {
        if (!ts) return "";
        try {
            return new Date(ts).toLocaleDateString("ar-EG-u-nu-latn", {
                day: "numeric",
                month: "long",
                year: "numeric",
            });
        } catch (e) {
            return new Date(ts).toLocaleDateString();
        }
    }

    function fmtViews(n) {
        if (n == null || isNaN(n)) return "";
        if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
        if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
        return String(n);
    }

    function fmtDur(sec) {
        if (!sec && sec !== 0) return "";
        sec = Math.round(sec);
        const h = Math.floor(sec / 3600),
            m = Math.floor((sec % 3600) / 60),
            s = sec % 60;
        const p = (x) => String(x).padStart(2, "0");
        return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
    }

    function decodeEntities(s) {
        try {
            const t = document.createElement("textarea");
            t.innerHTML = s;
            return t.value;
        } catch (e) {
            return s;
        }
    }

    const vidId = (url) => {
        const m = String(url || "").match(/[?&]v=([\w-]{11})|shorts\/([\w-]{11})/);
        return m ? m[1] || m[2] : null;
    };

    async function fetchWithTimeout(url, opts = {}, ms = CONFIG.timeoutMs) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), ms);
        try {
            return await fetch(url, { ...opts, signal: ctrl.signal });
        } finally {
            clearTimeout(timer);
        }
    }

    async function fetchJSON(url, opts) {
        const res = await fetchWithTimeout(url, opts);
        if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
        return res.json();
    }

    // جلب صفحات عبر Jina Reader (بيرجّع CORS مفتوح للموقع) مع محاولة إضافية
    async function jinaFetch(path, headers = {}, tries = 2) {
        let lastErr = null;
        for (let i = 0; i < tries; i++) {
            try {
                const res = await fetchWithTimeout(
                    CONFIG.jina + path,
                    { headers: { ...headers } },
                    45000
                );
                if (!res.ok) throw new Error(`jina HTTP ${res.status}`);
                const text = await res.text();
                if (!text || text.length < 40) throw new Error("jina empty");
                return text;
            } catch (e) {
                lastErr = e;
            }
        }
        throw lastErr || new Error("jina failed");
    }

    /* ============================================================
       حالات التطبيق
       ============================================================ */
    const state = {
        videos: [],
        xPosts: [],
        tiktok: [],
        videoFilter: "all",
        videoLimit: 6,
        shortLimit: 8,
        ts: { youtube: null, x: null, tiktok: null },
        lastSync: null,
        syncing: false,
        err: { youtube: false, x: false, tiktok: false },
    };

    /* ============================================================
       محتوى احتياطي (يظهر فورًا لو المصادر مش متاحة)
       ============================================================ */
    const FALLBACK_VIDEOS = [
        { id: "o1EN4eWbvGU", title: "بُنيت برنامج لمكتبة فيديوهاتك زي يوتيوب 🎬 | Timeline Videos — مفتوح المصدر", url: "https://www.youtube.com/watch?v=o1EN4eWbvGU", isShort: false },
        { id: "K4VQ0LD_r6Y", title: "جربت أعمل برنامج يمنع الإباحية على ويندوز! | JustGivenUP! v2.2", url: "https://www.youtube.com/watch?v=K4VQ0LD_r6Y", isShort: false },
        { id: "jwDZIJw8aG4", title: "ما هو اللينكس؟ وما افضل توزيعة للمبتدئين؟ (فيديو تعريفي)", url: "https://www.youtube.com/watch?v=jwDZIJw8aG4", isShort: false },
        { id: "bTrGEZCZYLM", title: "أفضل المصادر لتعلم الطرفية أو Terminal على نظام لينكس او ويندوز Power Shell", url: "https://www.youtube.com/watch?v=bTrGEZCZYLM", isShort: false },
    ];
    const FALLBACK_X = [
        { id: "f1", text: "مشروع TimelineVideos مفتوح المصدر بـ Python و PyQt5 لتنظيم وتشغيل الكورسات التعليمية والفيديوهات المحلية مع حفظ تلقائي للتقدم. متاح الآن على GitHub! 🎬🚀", url: "https://x.com/RaGAEIDOS", ts: null },
        { id: "f2", text: "تطوير أداة Video2ArabicSubs لتحويل الفيديوهات الأجنبية إلى ملفات ترجمة عربية (.SRT) بشكل تلقائي لتسهيل متابعة المحتوى التقني والتعليمي. 🐧💻", url: "https://x.com/RaGAEIDOS", ts: null },
        { id: "f3", text: "سلسلة فيديوهات قصيرة لتبسيط أساسيات البرمجة وعلوم الحاسب، وكيف يتعامل المعالج والذاكرة مع الكود الذي نكتبه بلغات C++ و Python. ⚡", url: "https://x.com/RaGAEIDOS", ts: null },
    ];
    const FALLBACK_TIKTOK = [
        {
            title: "مقاطع برمجية وشروحات لينكس على TikTok — تابع أحدث الفيديوهات القصيرة ونصائح سطر الأوامر (Terminal).",
            url: "https://www.tiktok.com/@ragaeidos",
            cover: "https://i.ytimg.com/vi/IyhKHqWOPUE/hqdefault.jpg",
            likes: null,
        },
    ];

    const thumbOf = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

    /* ============================================================
       جلب يوتيوب: Piped API (الأساسي — فيديوهات القناة)
       ============================================================ */
    async function loadYouTube() {
        const piped = await fetchJSON(CONFIG.youtube.piped);
        const map = new Map();

        if (Array.isArray(piped?.relatedStreams)) {
            piped.relatedStreams.forEach((s) => {
                const id = vidId(s.url);
                if (!id) return;
                map.set(id, {
                    id,
                    title: s.title || "فيديو",
                    url: "https://www.youtube.com" + s.url,
                    thumb: thumbOf(id),
                    views: typeof s.views === "number" ? s.views : null,
                    duration: typeof s.duration === "number" ? s.duration : null,
                    ts: typeof s.uploaded === "number" ? s.uploaded : null,
                    isShort: !!s.isShort,
                });
            });
        }

        if (!map.size) throw new Error("youtube sources unavailable");

        const all = [...map.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0));
        return { videos: all.filter((v) => !v.isShort), all };
    }

    /* ============================================================
       جلب منشورات X (HTML عبر Jina → تحليل المقالات)
       ============================================================ */
    function parseXDate(str) {
        if (!str) return null;
        const m = str.match(new RegExp(`([A-Za-z]{3})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?`));
        if (!m) return null;
        const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(m[1].slice(0, 3));
        if (mo < 0) return null;
        let y = m[3] ? +m[3] : new Date().getFullYear();
        const dt = new Date(y, mo, +m[2]);
        if (!m[3] && dt.getTime() > Date.now()) dt.setFullYear(y - 1);
        return dt.getTime();
    }

    function parseXHtml(html) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const out = [];
        const seen = new Set();

        $$("article", doc).forEach((a) => {
            let id = null;
            for (const l of a.querySelectorAll("a[href]")) {
                const m = (l.getAttribute("href") || "").match(/\/RaGAEIDOS\/status\/(\d+)/);
                if (m) {
                    id = m[1];
                    break;
                }
            }
            if (!id || seen.has(id)) return;

            const clone = a.cloneNode(true);
            clone.querySelectorAll('style,script,svg,[class*="x-animated-count"]').forEach((n) => n.remove());
            // إزالة علامات الاتجاه (LRM/RLM) اللي X بيحطها حوالين الأرقام والتواريخ
            let text = (clone.textContent || "")
                .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, " ")
                .replace(/\s+/g, " ")
                .trim();
            // فصل عربي/لاتيني كان بيلازق ببعض بعد دمج النصوص
            text = text
                .replace(/([\u0600-\u06ff])([A-Za-z0-9])/g, "$1 $2")
                .replace(/([A-Za-z0-9])([\u0600-\u06ff])/g, "$1 $2");

            // هيدر التغريدة: الاسم + @handle + التاريخ
            let dateStr = "";
            const hm = text.match(
                new RegExp(`@RaGAEIDOS\\s*[·\\-–]?\\s*(${MONTHS}\\s+\\d{1,2}(?:,\\s*\\d{4})?)?`, "i")
            );
            if (hm) {
                dateStr = hm[1] || "";
                text = text.slice(hm.index + hm[0].length);
            }
            // تغريدة مقتبسة → نقطع عندها
            const qm = text.match(
                new RegExp(
                    `\\s+[^\\s@]{1,45}\\s+@[A-Za-z0-9_]{2,20}\\s+${MONTHS}\\s+\\d{1,2}(?:,\\s*\\d{4})?`,
                    "i"
                )
            );
            if (qm) text = text.slice(0, qm.index);

            // تنظيف الذيل: أرقام الإحصائيات، مدة الفيديو، مصدر البطاقة، تاريخ زائد
            text = text
                .replace(/\s+\d{1,2}:\d{2}\s*$/, "")
                .replace(/\s*From\s+\S+\s*$/i, "")
                .replace(/(?:\s+\d{1,4})+\s*$/, "")
                .replace(/^\s*[·\-–]?\s*\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\s*/, "")
                .replace(/^\s*[·\-–]\s*/, "")
                .replace(/\s+/g, " ")
                .trim();

            const media = [...a.querySelectorAll("img")]
                .map((i) => i.getAttribute("src") || "")
                .filter((s) => /pbs\.twimg\.com\/media\//.test(s));

            if (!text && !media.length) return;
            seen.add(id);
            out.push({
                id,
                text,
                dateStr,
                ts: parseXDate(dateStr),
                media: media.slice(0, 1),
                url: `https://x.com/RaGAEIDOS/status/${id}`,
            });
        });

        return out;
    }

    function parseXMarkdown(md) {
        const parts = md.split(/\n\*\s+/).slice(1);
        const out = [];
        parts.forEach((p, i) => {
            if (!/@RaGAEIDOS/.test(p)) return;
            let t = p
                .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // صور
                .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // روابط
                .replace(/\s+/g, " ")
                .trim();
            if (!t) return;
            out.push({ id: "m" + i, text: t, ts: null, media: [], url: "https://x.com/RaGAEIDOS" });
        });
        return out;
    }

    async function loadX() {
        let posts = [];
        try {
            const html = await jinaFetch(`https://x.com/${CONFIG.x.handle}`, {
                "x-respond-with": "html",
                "x-target-selector": "article",
            });
            posts = parseXHtml(html);
        } catch (e) {
            /* نجرب المصدر البديل */
        }
        if (!posts.length) {
            try {
                const html = await jinaFetch(`https://x.com/${CONFIG.x.handle}`, {
                    "x-respond-with": "html",
                });
                posts = parseXHtml(html);
            } catch (e) {
                /* نجرب المصدر البديل */
            }
        }
        if (!posts.length) {
            try {
                const md = await jinaFetch(`https://x.com/${CONFIG.x.handle}`);
                posts = parseXMarkdown(md);
            } catch (e) {
                /* فشل كل حاجة */
            }
        }
        if (!posts.length) throw new Error("x unavailable");
        return posts;
    }

    /* ============================================================
       جلب منشورات TikTok (Markdown عبر Jina)
       ============================================================ */
    function parseTikTok(md) {
        const re =
            /\[!\[Image \d+:\s*(?<alt>[^\]]*)\]\((?<cover>[^)]+)\)(?<mid>[\s\S]{0,300}?)\*\*(?<likes>[^*]+)\*\*\]\((?<url>https:\/\/www\.tiktok\.com\/@[\w.]+\/video\/\d+)\)/g;
        const out = [];
        let m;
        while ((m = re.exec(md))) {
            const alt = m.groups.alt
                .replace(/\s+/g, " ")
                .replace(/\s+created by\s+.*$/i, "")
                .trim();
            if (!alt && !m.groups.cover) continue;
            out.push({
                id: m.groups.url.split("/").pop(),
                title: alt || "منشور على TikTok",
                cover: m.groups.cover,
                likes: m.groups.likes.trim(),
                url: m.groups.url,
            });
        }
        return out;
    }

    async function loadTikTok() {
        // المصدر الأساسي: عناصر البوستات فقط (أخف وأنظف بكتير)
        let posts = [];
        try {
            const md = await jinaFetch(`https://www.tiktok.com/@${CONFIG.tiktok.handle}`, {
                "x-target-selector": 'div[data-e2e="user-post-item"]',
            });
            posts = parseTikTok(md);
        } catch (e) {
            /* نجرب الصفحة الكاملة */
        }
        if (!posts.length) {
            const md = await jinaFetch(`https://www.tiktok.com/@${CONFIG.tiktok.handle}`);
            posts = parseTikTok(md);
        }
        if (!posts.length) throw new Error("tiktok unavailable");
        return posts;
    }

    /* ============================================================
       الكاش المحلي
       ============================================================ */
    function readCache() {
        try {
            const r = JSON.parse(localStorage.getItem(CONFIG.cacheKey));
            if (r && r.ts) return r;
        } catch (e) {}
        return null;
    }
    function writeCache() {
        try {
            localStorage.setItem(
                CONFIG.cacheKey,
                JSON.stringify({
                    ts: Date.now(),
                    videos: state.videos,
                    xPosts: state.xPosts,
                    tiktok: state.tiktok,
                    at: state.ts,
                })
            );
        } catch (e) {}
    }
    function applyCache(c) {
        if (Array.isArray(c.videos) && c.videos.length) {
            state.videos = c.videos;
            renderVideos();
            setErr("youtube", false);
        }
        if (Array.isArray(c.xPosts) && c.xPosts.length) {
            state.xPosts = c.xPosts;
            renderX();
            setErr("x", false);
        }
        if (Array.isArray(c.tiktok) && c.tiktok.length) {
            state.tiktok = c.tiktok;
            renderShorts();
        }
        if (c.at) state.ts = { ...state.ts, ...c.at };
        state.lastSync = c.ts;
        updateTimestamps();
    }

    /* ============================================================
       عرض المحتوى
       ============================================================ */
    const videoCard = (v) => `
        <a class="surface video-card group" href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">
            <div class="thumb-wrap">
                <img src="${esc(v.thumb || thumbOf(v.id))}" alt="${esc(v.title)}" loading="lazy" onerror="this.style.opacity=.2">
                <div class="shade"></div>
                <span class="chip ${v.isShort ? "chip-short" : "chip-yt"} thumb-chip">
                    <i class="fa-solid ${v.isShort ? "fa-bolt" : "fa-youtube"}"></i>
                    ${v.isShort ? "Short" : "Video"}
                </span>
                ${v.duration ? `<span class="dur-badge">${fmtDur(v.duration)}</span>` : ""}
                ${v.views != null ? `<span class="views-badge"><i class="fa-regular fa-eye"></i> ${fmtViews(v.views)}</span>` : ""}
                <span class="play-btn"><i class="fa-solid fa-play ml-0.5"></i></span>
            </div>
            <div class="card-body">
                <h3 class="card-title line-clamp-2">${esc(v.title)}</h3>
                <div class="card-meta">
                    <span>${v.ts ? timeAgo(v.ts) : "YouTube"}</span>
                    <span class="go">مشاهدة على يوتيوب <i class="fa-solid fa-arrow-left" style="font-size:10px"></i></span>
                </div>
            </div>
        </a>`;

    const verticalCard = (item, kind) => {
        const isTT = kind === "tiktok";
        return `
        <a class="surface v-card group" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">
            <div class="cover">
                <div class="fallback-icon"><i class="fa-brands ${isTT ? "fa-tiktok" : "fa-youtube"}"></i></div>
                <img src="${esc(item.cover || thumbOf(item.id))}" alt="${esc(item.title)}" loading="lazy" onerror="this.remove()">
                <span class="chip ${isTT ? "chip-tiktok" : "chip-short"} thumb-chip">
                    <i class="fa-solid ${isTT ? "fa-music" : "fa-bolt"}"></i>
                    ${isTT ? "TikTok" : "YT Short"}
                </span>
                ${item.likes ? `<span class="likes-badge"><i class="fa-regular fa-eye"></i> ${esc(item.likes)}</span>` : ""}
            </div>
            <div class="card-body">
                <h3 class="card-title line-clamp-3">${esc(item.title)}</h3>
                <div class="card-meta">
                    <span>${isTT ? "@ragaeidos" : "YouTube Shorts"}</span>
                    <span class="go">${isTT ? "فتح على TikTok" : "مشاهدة على يوتيوب"} <i class="fa-solid fa-arrow-left" style="font-size:10px"></i></span>
                </div>
            </div>
        </a>`;
    };

    const xCard = (p) => `
        <a class="surface x-card group" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">
            <div class="x-head">
                <img class="avatar" src="https://github.com/RaGAEIDOS.png" alt="Ragaey Muhammed" loading="lazy">
                <div class="who">
                    <div class="name">Ragaey Muhammed</div>
                    <div class="handle">@RaGAEIDOS</div>
                </div>
                <i class="fa-brands fa-x-twitter"></i>
            </div>
            <p class="x-text" dir="auto">${hi(p.text)}</p>
            ${
                p.media && p.media.length
                    ? `<div class="x-media"><img src="${esc(p.media[0])}" alt="X post media" loading="lazy" onerror="this.parentElement.remove()"></div>`
                    : ""
            }
            <div class="x-foot">
                <span>${p.ts ? arDate(p.ts) : "منشور على X"}</span>
                <span class="go">عرض على X <i class="fa-solid fa-arrow-up-right-from-square"></i></span>
            </div>
        </a>`;

    function emptyState(msg) {
        return `<div class="empty-state surface" style="border-radius:1rem">${esc(msg)}</div>`;
    }

    function renderVideos() {
        const grid = $("#videosGrid");
        if (!grid) return;
        const list =
            state.videoFilter === "video"
                ? state.videos.filter((v) => !v.isShort)
                : state.videos;

        const shown = list.slice(0, state.videoLimit);
        grid.innerHTML = shown.length
            ? shown.map(videoCard).join("")
            : emptyState("لا توجد فيديوهات مطابقة حاليًا…");

        const count = $("#videosCount");
        if (count) count.innerHTML = `<i class="fa-solid fa-film"></i> ${state.videos.length} فيديو`;

        const btn = $("#loadMoreVideos");
        if (btn) {
            const rest = list.length - shown.length;
            btn.textContent = `عرض كل الفيديوهات (${list.length})`;
            btn.hidden = rest <= 0;
        }
    }

    function renderShorts() {
        const grid = $("#shortsGrid");
        if (!grid) return;
        const list = state.tiktok.map((t) => ({ ...t, kind: "tiktok" }));

        const shown = list.slice(0, state.shortLimit);
        grid.innerHTML = shown.length
            ? shown.map((i) => verticalCard(i, i.kind)).join("")
            : emptyState("لا توجد مقاطع حاليًا…");

        const count = $("#shortsCount");
        if (count) count.innerHTML = `<i class="fa-solid fa-bolt"></i> ${list.length} مقطع`;

        const btn = $("#loadMoreShorts");
        if (btn) {
            const rest = list.length - shown.length;
            btn.hidden = rest <= 0;
            btn.textContent = `عرض كل المقاطع (${list.length})`;
        }
    }

    function renderX() {
        const grid = $("#xGrid");
        if (!grid) return;
        grid.innerHTML = state.xPosts.length
            ? state.xPosts.map(xCard).join("")
            : emptyState("تعذّر جلب التغريدات حاليًا…");

        const count = $("#xCount");
        if (count) count.innerHTML = `<i class="fa-brands fa-x-twitter"></i> ${state.xPosts.length} منشور`;
    }

    /* ============================================================
       شريط المزامنة والحالة
       ============================================================ */
    function setDot(name, status) {
        const pill = $(`#pill-${name}`);
        if (!pill) return;
        const dot = $(".dot", pill);
        dot.className = `dot ${status}`;
        pill.classList.toggle("ok", status === "ok");
        pill.classList.toggle("err", status === "err");
    }
    function setErr(name, on) {
        state.err[name] = on;
        setDot(name, on ? "err" : "ok");
    }
    function setLoading(on) {
        ["#refreshAll", "#refreshVideos", "#refreshShorts", "#refreshX"].forEach((sel) => {
            const b = $(sel);
            if (b) {
                b.disabled = on;
                b.classList.toggle("loading", on);
            }
        });
        const bar = $("#syncBar");
        if (bar) bar.classList.toggle("syncing", on);
    }

    function updateTimestamps() {
        const sync = $("#lastSync");
        if (sync) {
            sync.textContent = state.lastSync
                ? `آخر مزامنة: ${timeAgo(state.lastSync)}`
                : "بانتظار أول مزامنة…";
        }
        const map = [
            ["#videosUpdated", state.ts.youtube],
            ["#shortsUpdated", state.ts.tiktok],
            ["#xUpdated", state.ts.x],
        ];
        map.forEach(([sel, ts]) => {
            const el = $(sel);
            if (el) {
                el.innerHTML = ts
                    ? `<i class="fa-solid fa-circle-check"></i> حيّ ${timeAgo(ts)}`
                    : `<i class="fa-solid fa-rotate"></i> جارٍ التحديث…`;
            }
        });
    }

    /* ============================================================
       المزامنة (يدوي + دوري)
       ============================================================ */
    async function syncAll(force = false) {
        if (state.syncing) return;
        const cached = readCache();
        if (cached) applyCache(cached);
        if (!force && cached && Date.now() - cached.ts < CONFIG.cacheTtlMs) return;

        state.syncing = true;
        setLoading(true);
        ["youtube", "x", "tiktok"].forEach((n) => setDot(n, "load"));

        const [yt, x, tt] = await Promise.allSettled([
            loadYouTube(),
            loadX(),
            loadTikTok(),
        ]);

        let anyOk = false;

        if (yt.status === "fulfilled") {
            state.videos = yt.value.videos;
            state.ts.youtube = Date.now();
            state.err.youtube = false;
            renderVideos();
            renderShorts();
            setDot("youtube", "ok");
            anyOk = true;
        } else {
            setDot("youtube", "err");
            if (!state.videos.length) renderVideos();
        }

        if (x.status === "fulfilled") {
            state.xPosts = x.value;
            state.ts.x = Date.now();
            state.err.x = false;
            renderX();
            setDot("x", "ok");
            anyOk = true;
        } else {
            setDot("x", "err");
            if (!state.xPosts.length) renderX();
        }

        if (tt.status === "fulfilled") {
            state.tiktok = tt.value;
            state.ts.tiktok = Date.now();
            state.err.tiktok = false;
            renderShorts();
            setDot("tiktok", "ok");
            anyOk = true;
        } else {
            setDot("tiktok", "err");
            if (!state.tiktok.length) renderShorts();
        }

        if (anyOk || (cached && Date.now() - cached.ts < CONFIG.refreshMs * 2)) {
            state.lastSync = Date.now();
            writeCache();
        }

        updateTimestamps();
        state.syncing = false;
        setLoading(false);
    }

    async function refreshSection(section) {
        if (state.syncing) return;
        state.syncing = true;
        setLoading(true);
        setDot(section, "load");
        try {
            if (section === "youtube") {
                const data = await loadYouTube();
                state.videos = data.videos;
                state.ts.youtube = Date.now();
                renderVideos();
                renderShorts();
                setDot("youtube", "ok");
            } else if (section === "x") {
                const posts = await loadX();
                state.xPosts = posts;
                state.ts.x = Date.now();
                renderX();
                setDot("x", "ok");
            } else if (section === "tiktok") {
                const posts = await loadTikTok();
                state.tiktok = posts;
                state.ts.tiktok = Date.now();
                renderShorts();
                setDot("tiktok", "ok");
            }
            state.lastSync = Date.now();
            writeCache();
        } catch (e) {
            setDot(section, "err");
        }
        updateTimestamps();
        state.syncing = false;
        setLoading(false);
    }

    /* ============================================================
       مشاريع GitHub (موجودة من قبل — اتنقلت هنا)
       ============================================================ */
    const fallbackProjects = [
        {
            name: "TimelineVideos",
            description: "تطبيق سطح مكتب مبني بـ Python و PyQt5 يعمل كمشغل قوائم فيديوهات تعليمية مع تتبع تلقائي للتقدم.",
            html_url: "https://github.com/RaGAEIDOS/TimelineVideos",
            language: "Python",
            stargazers_count: 2,
        },
        {
            name: "video2arabicsubs",
            description: "أداة سطح مكتب لتحويل أي فيديو إلى ملف ترجمة عربية (SRT) بشكل تلقائي.",
            html_url: "https://github.com/RaGAEIDOS/video2arabicsubs",
            language: "Python",
            stargazers_count: 3,
        },
        {
            name: "justgivenup",
            description: "JustGivenUP! — أداة لحماية التركيز وحجب المحتوى الضار والمشتتات على نظام ويندوز.",
            html_url: "https://github.com/RaGAEIDOS/justgivenup",
            language: "C++",
            stargazers_count: 2,
        },
    ];
    const langColors = {
        Python: "bg-yellow-400",
        "C++": "bg-pink-500",
        C: "bg-blue-500",
        HTML: "bg-orange-500",
        JavaScript: "bg-amber-300",
        Shell: "bg-emerald-400",
    };

    function renderProjects(repos) {
        const container = $("#reposContainer");
        if (!container) return;
        container.innerHTML = "";
        repos.slice(0, 6).forEach((repo) => {
            const dotColor = langColors[repo.language] || "bg-emerald-400";
            const card = document.createElement("a");
            card.href = repo.html_url;
            card.target = "_blank";
            card.rel = "noopener noreferrer";
            card.className =
                "surface terminal-box rounded-2xl p-6 flex flex-col justify-between transition duration-300 hover:-translate-y-1 group";
            card.innerHTML = `
                <div class="space-y-3">
                    <div class="flex items-center justify-between gap-2" dir="ltr">
                        <div class="flex items-center gap-2 text-accent font-mono font-bold text-base truncate group-hover:underline">
                            <i class="fa-solid fa-folder-open text-sm"></i>
                            <span class="truncate">${esc(repo.name)}</span>
                        </div>
                        <i class="fa-solid fa-arrow-up-right-from-square text-xs text-mute group-hover:text-accent transition"></i>
                    </div>
                    <p class="text-sm text-dim leading-relaxed line-clamp-3">
                        ${esc(repo.description || "مشروع برمجي مفتوح المصدر على GitHub.")}
                    </p>
                </div>
                <div class="pt-4 mt-5 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono text-mute" dir="ltr">
                    <span class="flex items-center gap-1.5">
                        <span class="repo-lang-dot ${dotColor}"></span>
                        ${esc(repo.language || "Code")}
                    </span>
                    <span class="flex items-center gap-1" style="color:var(--accent-3)">
                        <i class="fa-regular fa-star"></i>
                        ${repo.stargazers_count || 0}
                    </span>
                </div>`;
            container.appendChild(card);
        });
    }

    async function loadGitHubProjects() {
        renderProjects(fallbackProjects);
        try {
            const res = await fetchWithTimeout(
                "https://api.github.com/users/RaGAEIDOS/repos?sort=updated&per_page=10"
            );
            if (res.ok) {
                const data = await res.json();
                const filtered = data.filter(
                    (r) =>
                        !r.fork &&
                        r.name.toLowerCase() !== "ragaeidos" &&
                        r.name.toLowerCase() !== "ragaeidos.github.io"
                );
                if (filtered.length) renderProjects(filtered);
            }
        } catch (e) {
            /* نفضل على المحتوى الاحتياطي */
        }
    }

    /* ============================================================
       الثيمات البرمجية
       ============================================================ */
    const THEMES = [
        { id: "terminal", label: "Terminal Green", sw1: "#0a0e14", sw2: "#10b981" },
        { id: "dracula", label: "Dracula", sw1: "#282a36", sw2: "#bd93f9" },
        { id: "monokai", label: "Monokai", sw1: "#272822", sw2: "#a6e22e" },
        { id: "nord", label: "Nord", sw1: "#2e3440", sw2: "#88c0d0" },
        { id: "one-dark", label: "One Dark", sw1: "#282c34", sw2: "#61afef" },
        { id: "gruvbox", label: "Gruvbox Dark", sw1: "#282828", sw2: "#d79921" },
        { id: "github-light", label: "GitHub Light", sw1: "#ffffff", sw2: "#1f6feb" },
    ];

    function applyTheme(id) {
        const theme = THEMES.find((t) => t.id === id) ? id : "terminal";
        document.documentElement.setAttribute("data-theme", theme);
        try {
            localStorage.setItem(CONFIG.themeKey, theme);
        } catch (e) {}
        $$(".theme-item").forEach((b) => b.classList.toggle("active", b.dataset.theme === theme));
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#0a0e14";
    }

    function initTheme() {
        let saved = null;
        try {
            saved = localStorage.getItem(CONFIG.themeKey);
        } catch (e) {}
        applyTheme(saved || "terminal");

        const btn = $("#themeBtn");
        const menu = $("#themeMenu");
        if (!btn || !menu) return;

        menu.innerHTML = THEMES.map(
            (t) => `
            <button class="theme-item" data-theme="${t.id}" role="menuitem">
                <span class="swatch" style="--sw1:${t.sw1};--sw2:${t.sw2}"></span>
                <span>${t.label}</span>
            </button>`
        ).join("");
        applyTheme(saved || "terminal");

        const close = () => {
            menu.hidden = true;
            btn.setAttribute("aria-expanded", "false");
        };
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            menu.hidden = !menu.hidden;
            btn.setAttribute("aria-expanded", String(!menu.hidden));
        });
        menu.addEventListener("click", (e) => {
            const item = e.target.closest(".theme-item");
            if (!item) return;
            applyTheme(item.dataset.theme);
            close();
        });
        document.addEventListener("click", (e) => {
            if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) close();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") close();
        });
    }

    /* ============================================================
       القائمة الجوال + التبويبات + الأزرار
       ============================================================ */
    function initUI() {
        // قائمة الجوال
        const toggle = $("#navToggle");
        const mobile = $("#mobileNav");
        if (toggle && mobile) {
            toggle.addEventListener("click", () => {
                mobile.hidden = !mobile.hidden;
                toggle.setAttribute("aria-expanded", String(!mobile.hidden));
            });
            mobile.addEventListener("click", (e) => {
                if (e.target.tagName === "A") mobile.hidden = true;
            });
        }

        // تبويبات الفيديوهات
        $$("#videoTabs .tab").forEach((tab) =>
            tab.addEventListener("click", () => {
                $$("#videoTabs .tab").forEach((t) => t.classList.remove("active"));
                tab.classList.add("active");
                state.videoFilter = tab.dataset.filter;
                state.videoLimit = 6;
                renderVideos();
            })
        );

        // عرض المزيد
        const moreV = $("#loadMoreVideos");
        if (moreV)
            moreV.addEventListener("click", () => {
                state.videoLimit = 1e9;
                renderVideos();
            });
        const moreS = $("#loadMoreShorts");
        if (moreS)
            moreS.addEventListener("click", () => {
                state.shortLimit = 1e9;
                renderShorts();
            });
        // أزرار التحديث
        $("#refreshAll")?.addEventListener("click", () => syncAll(true));
        $("#refreshVideos")?.addEventListener("click", () => refreshSection("youtube"));
        $("#refreshX")?.addEventListener("click", () => refreshSection("x"));
        $("#refreshShorts")?.addEventListener("click", () => refreshSection("tiktok"));
    }

    /* ============================================================
       التشغيل
       ============================================================ */
    function boot() {
        initTheme();
        initUI();

        // محتوى احتياطي فورًا (مش هيفضل فيديو ناقص لو المصادر وقفت)
        state.videos = FALLBACK_VIDEOS;
        state.xPosts = FALLBACK_X;
        state.tiktok = FALLBACK_TIKTOK;
        renderVideos();
        renderShorts();
        renderX();
        renderProjects(fallbackProjects);
        updateTimestamps();

        syncAll(false);
        loadGitHubProjects();

        // تحديث دوري كل 10 دقائق
        setInterval(() => syncAll(false), CONFIG.refreshMs);

        // تحديث عند الرجوع للتاب + تحديث أوقات العرض كل دقيقة
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) syncAll(false);
        });
        setInterval(updateTimestamps, 60000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
