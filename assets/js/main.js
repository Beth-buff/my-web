/* =========================================================
   Beth_buff 的个人空间 — interactions
   No dependencies. Vanilla JS.
   ========================================================= */

(() => {
  "use strict";

  const doc = document;
  const root = doc.documentElement;
  const body = doc.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Theme ---------- */
  const themeToggle = doc.getElementById("theme-toggle");
  const THEME_KEY = "bethbuff-theme";
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  function setTheme(theme, persist = true) {
    const isDark = theme === "dark";
    root.setAttribute("data-theme", theme);
    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute("aria-label", isDark ? "切换浅色模式" : "切换深色模式");
    }
    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch (error) {
        /* storage can be unavailable in private contexts */
      }
    }
  }

  function readStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (error) {
      return null;
    }
  }

  const storedTheme = readStoredTheme();
  setTheme(storedTheme || (systemDark.matches ? "dark" : "light"), false);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      setTheme(next);
    });
  }

  systemDark.addEventListener("change", (event) => {
    if (!readStoredTheme()) {
      setTheme(event.matches ? "dark" : "light", false);
    }
  });

  /* ---------- Header, progress, active nav ---------- */
  const header = doc.getElementById("site-header");
  const progress = doc.getElementById("scroll-progress");
  const navLinks = Array.from(doc.querySelectorAll("[data-nav]"));
  const navSections = navLinks
    .map((link) => doc.getElementById(link.dataset.nav))
    .filter(Boolean);
  const contactSection = doc.getElementById("contact");
  let ticking = false;

  function updateActiveNav(scrollTop) {
    if (!navLinks.length) return;
    const probe = scrollTop + window.innerHeight * 0.34;
    let current = null;

    navSections.forEach((section) => {
      const top = section.getBoundingClientRect().top + scrollTop;
      if (top <= probe) current = section.id;
    });

    if (contactSection) {
      const contactTop = contactSection.getBoundingClientRect().top + scrollTop;
      if (contactTop <= probe) current = null;
    }

    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.dataset.nav === current);
    });
  }

  function updateScrollUI() {
    const scrollTop = window.scrollY || window.pageYOffset;
    const maxScroll = doc.documentElement.scrollHeight - window.innerHeight;
    const ratio = maxScroll > 0 ? Math.min(scrollTop / maxScroll, 1) : 0;

    if (progress) {
      progress.style.transform = `scaleX(${ratio})`;
    }
    if (header) {
      header.classList.toggle("is-scrolled", scrollTop > 24);
    }
    updateActiveNav(scrollTop);
    ticking = false;
  }

  function requestScrollUpdate() {
    if (!ticking) {
      window.requestAnimationFrame(updateScrollUI);
      ticking = true;
    }
  }

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate);
  updateScrollUI();

  /* ---------- Reveal on scroll ---------- */
  const revealItems = Array.from(doc.querySelectorAll("[data-reveal]"));
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  /* ---------- Stat counters ---------- */
  const statValues = Array.from(doc.querySelectorAll("[data-count]"));

  function animateStat(element) {
    const target = Number(element.dataset.count);
    const suffix = element.dataset.suffix || "";
    const original = element.textContent.trim();
    const pad = original.startsWith("0") ? 2 : 0;

    if (!Number.isFinite(target)) return;

    const formatValue = (value) =>
      value >= 1000 ? value.toLocaleString("en-US") : String(value).padStart(pad, "0");

    if (reduceMotion) {
      element.textContent = `${formatValue(target)}${suffix}`;
      return;
    }

    const duration = 1300;
    const start = performance.now();

    function frame(now) {
      const progressValue = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progressValue, 3);
      const value = Math.round(target * eased);
      element.textContent = `${formatValue(value)}${suffix}`;
      if (progressValue < 1) {
        requestAnimationFrame(frame);
      }
    }

    requestAnimationFrame(frame);
  }

  if (statValues.length) {
    if (!("IntersectionObserver" in window)) {
      statValues.forEach(animateStat);
    } else {
      const statObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            animateStat(entry.target);
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.5 }
      );
      statValues.forEach((stat) => statObserver.observe(stat));
    }
  }

  /* ---------- Live timecode ---------- */
  const timecodeEl = doc.getElementById("hero-timecode");
  if (timecodeEl && !reduceMotion) {
    const totalFrames = ((4 * 60 + 23) * 24) + 8;
    const startedAt = performance.now();

    function updateTimecode(now) {
      const frames = totalFrames + Math.floor(((now - startedAt) / 1000) * 24);
      const ff = frames % 24;
      const totalSeconds = Math.floor(frames / 24);
      const ss = totalSeconds % 60;
      const mm = Math.floor(totalSeconds / 60) % 60;
      const hh = Math.floor(totalSeconds / 3600) % 24;
      timecodeEl.textContent = [hh, mm, ss, ff]
        .map((part) => String(part).padStart(2, "0"))
        .join(":");
      requestAnimationFrame(updateTimecode);
    }

    requestAnimationFrame(updateTimecode);
  }

  /* ---------- Hangzhou clock ---------- */
  const localTimeEl = doc.getElementById("local-time");
  const mobileTimeEl = doc.getElementById("mobile-time");
  const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const shortTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  function updateClock() {
    const now = new Date();
    if (localTimeEl) localTimeEl.textContent = timeFormatter.format(now);
    if (mobileTimeEl) mobileTimeEl.textContent = shortTimeFormatter.format(now);
  }

  updateClock();
  window.setInterval(updateClock, 1000);

  const yearEl = doc.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Mobile menu ---------- */
  const menuToggle = doc.getElementById("menu-toggle");
  const mobileMenu = doc.getElementById("mobile-menu");
  const mobileLinks = mobileMenu ? Array.from(mobileMenu.querySelectorAll("a")) : [];

  function openMenu() {
    if (!mobileMenu || !menuToggle) return;
    body.classList.add("nav-open");
    mobileMenu.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "关闭菜单");
  }

  function closeMenu() {
    if (!mobileMenu || !menuToggle) return;
    body.classList.remove("nav-open");
    mobileMenu.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "打开菜单");
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      if (body.classList.contains("nav-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  }

  mobileLinks.forEach((link) => link.addEventListener("click", closeMenu));

  window.addEventListener("resize", () => {
    if (window.innerWidth > 960 && body.classList.contains("nav-open")) {
      closeMenu();
    }
  });

  doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && body.classList.contains("nav-open")) {
      closeMenu();
      if (menuToggle) menuToggle.focus();
    }
  });

  /* ---------- Dialog content ---------- */
  const noteData = {
    dawn: {
      kicker: "FIELD NOTE / 制作手记",
      title: "一个 MC 动画，从脑洞到成片要多久",
      meta: "2026.11.02 · 阅读约 3 分钟",
      paragraphs: [
        "最开始只是脑子里闪过的一个画面：两个方块人站在雨里，其中一个把剑收了起来。没有台词，也没有前因后果，但那个画面一直没散。",
        "真正开始做才发现，最难的不是建模，是让两个没有表情的方块人演戏。镜头要多停半秒，动作要少一点，音乐要刚好在那一刻落下来。",
        "成片只有 54 秒，工程文件却有 6 个 G。每次导出的时候都觉得还能再来一版，但观众看到的永远是停顿的那一帧。"
      ],
      note: "下次想试试不用一句台词，只靠镜头和音乐讲完一个故事。"
    },
    ethics: {
      kicker: "FIELD NOTE / 剪辑",
      title: "做视频第 N 年，我还在和节奏较劲",
      meta: "2026.10.18 · 阅读约 4 分钟",
      paragraphs: [
        "剪辑最迷人的地方，是你以为自己在讲故事，其实是在控制观众什么时候呼吸。一个镜头多停 8 帧，感觉就完全不一样。",
        "我现在剪片子，会先把所有“很酷但没用”的镜头单独放一边。它们通常很美，也很容易把节奏拖垮。舍不得删的时候，就先关掉声音看一遍。",
        "节奏不是快，是让人愿意继续看下去。该留白的时候留白，该炸的时候炸，剩下的交给观众。"
      ],
      note: "这一条写在每次新建工程的第一行备注里。"
    },
    walknote: {
      kicker: "FIELD NOTE / 随想",
      title: "我为什么总在做一些「没用」的整活",
      meta: "2026.09.27 · 阅读约 3 分钟",
      paragraphs: [
        "有些视频做出来，既不带货，也不涨粉，甚至很难用一句话解释它到底在讲什么。但我还是想做。",
        "因为“有用”的东西已经太多了。偶尔做一个纯粹为了好玩、为了一个很蠢的笑点、为了让自己在剪辑台前笑出来的视频，很重要。",
        "观众其实能感觉到作者玩得开不开心。一个真正好玩的整活，比十个精心计算过的选题更有生命力。"
      ],
      note: "目前最满意的整活，往往也是播放量最低的那几个。"
    },
    gear: {
      kicker: "FIELD NOTE / 器材",
      title: "设备不重要，但硬盘真的很重要",
      meta: "2026.09.10 · 阅读约 3 分钟",
      paragraphs: [
        "我曾经相信，换一台更好的电脑就能做出更好的动画。后来发现，渲染速度是快了，片子该卡住的地方还是卡住。",
        "设备解决的是效率问题，不是表达问题。真正让一个视频成立的，还是那个最初的脑洞，以及你愿不愿意为它多改一版。",
        "现在我对器材只有一个要求：别在我想到点子的时候掉链子。硬盘也是。"
      ],
      note: "备份，备份，再备份。重要的事说三遍。"
    }
  };

  const dialog = doc.getElementById("detail-dialog");
  const dialogKicker = doc.getElementById("dialog-kicker");
  const dialogTitle = doc.getElementById("dialog-title");
  const dialogMeta = doc.getElementById("dialog-meta");
  const dialogVisual = doc.getElementById("dialog-visual");
  const dialogBody = doc.getElementById("dialog-body");
  const dialogClose = doc.getElementById("dialog-close");
  const dialogDismiss = doc.getElementById("dialog-dismiss");
  const dialogCta = dialog ? dialog.querySelector(".dialog-foot .button") : null;
  let lastTrigger = null;

  function fillDialog(data, type) {
    if (!dialog) return;

    dialogKicker.textContent = data.kicker;
    dialogTitle.textContent = data.title;
    dialogMeta.innerHTML = data.meta;

    if (data.visualText) {
      dialogVisual.classList.add("is-on");
      dialogVisual.style.background = data.visualBg || "#1b2522";
      dialogVisual.innerHTML = `<span>${data.visualText}</span>`;
    } else {
      dialogVisual.classList.remove("is-on");
      dialogVisual.removeAttribute("style");
      dialogVisual.innerHTML = "";
    }

    dialogBody.innerHTML = "";
    data.paragraphs.forEach((paragraph) => {
      const p = doc.createElement("p");
      p.textContent = paragraph;
      dialogBody.appendChild(p);
    });

    if (data.note) {
      const note = doc.createElement("div");
      note.className = "dialog-note";
      note.textContent = data.note;
      dialogBody.appendChild(note);
    }

    if (dialogCta) {
      const subject = data.subject || (type === "note" ? `看到你的手记：${data.title}` : "想聊聊一个故事");
      dialogCta.href = `mailto:15264687539@163.com?subject=${encodeURIComponent(subject)}`;
      dialogCta.childNodes[0].nodeValue = type === "note" ? "写封信给我 " : "聊聊你的故事 ";
    }
  }

  function openDialog(data, type, trigger) {
    if (!dialog) return;
    lastTrigger = trigger || null;
    fillDialog(data, type);
    dialog.showModal();
    body.classList.add("dialog-open");
    dialog.scrollTop = 0;
  }

  function closeDialog() {
    if (!dialog || !dialog.open) return;
    dialog.close();
  }

  doc.querySelectorAll("[data-project]").forEach((button) => {
    button.addEventListener("click", () => {
      const data = projectData[button.dataset.project];
      if (data) openDialog(data, "project", button);
    });
  });

  doc.querySelectorAll("[data-note]").forEach((button) => {
    button.addEventListener("click", () => {
      const data = noteData[button.dataset.note];
      if (data) openDialog(data, "note", button);
    });
  });

  if (dialog) {
    dialogClose.addEventListener("click", closeDialog);
    dialogDismiss.addEventListener("click", closeDialog);

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog();
    });

    dialog.addEventListener("close", () => {
      body.classList.remove("dialog-open");
      if (lastTrigger) {
        lastTrigger.focus({ preventScroll: true });
        lastTrigger = null;
      }
    });
  }

  /* ---------- Bilibili video player ---------- */
  const videoDialog = doc.getElementById("video-dialog");
  const videoPlayer = doc.getElementById("video-player");
  const videoIframe = doc.getElementById("video-iframe");
  const videoPoster = doc.getElementById("video-poster");
  const videoStart = doc.getElementById("video-start");
  const videoDialogTitle = doc.getElementById("video-dialog-title");
  const videoDialogMeta = doc.getElementById("video-dialog-meta");
  const videoExternal = doc.getElementById("video-external");
  const videoDialogClose = doc.getElementById("video-dialog-close");
  const videoDialogDismiss = doc.getElementById("video-dialog-dismiss");
  let videoTrigger = null;
  let currentBvid = "";

  function startVideo() {
    if (!currentBvid) return;
    window.open(`https://www.bilibili.com/video/${currentBvid}`, "_blank", "noopener,noreferrer");
    closeVideo();
  }

  function openVideo(card, trigger) {
    if (!videoDialog || !videoIframe) return;
    const bvid = trigger?.dataset.bvid || card.dataset.bvid;
    if (!bvid) return;
    const title = card.querySelector("h3")?.textContent.trim() || "Bilibili 视频";
    const tag = card.querySelector(".video-tag")?.textContent.trim() || "视频";
    const date = card.querySelector(".video-date")?.textContent.trim() || "";
    const duration = card.querySelector(".video-duration")?.textContent.trim() || "";
    const plays = card.querySelector(".video-stats span")?.textContent.trim() || "";
    const cover = card.querySelector(".video-cover img")?.getAttribute("src") || "";

    currentBvid = bvid;
    videoDialogTitle.textContent = title;
    videoDialogMeta.textContent = `${tag} · ${duration} · ${date} · ${plays}`;
    videoExternal.href = `https://www.bilibili.com/video/${bvid}`;
    if (videoPoster && cover) videoPoster.src = cover;
    videoPlayer?.classList.remove("is-playing");
    videoIframe.removeAttribute("src");
    videoTrigger = trigger || null;
    videoDialog.showModal();
    body.classList.add("dialog-open");
  }

  function closeVideo() {
    if (videoDialog?.open) videoDialog.close();
  }

  doc.querySelectorAll(".video-open").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".video-card");
      if (card) openVideo(card, button);
    });
  });

  if (videoDialog) {
    videoDialogClose.addEventListener("click", closeVideo);
    videoDialogDismiss.addEventListener("click", closeVideo);
    videoStart?.addEventListener("click", startVideo);
    videoDialog.addEventListener("click", (event) => {
      if (event.target === videoDialog) closeVideo();
    });
    videoDialog.addEventListener("close", () => {
      if (videoIframe) videoIframe.removeAttribute("src");
      videoPlayer?.classList.remove("is-playing");
      currentBvid = "";
      body.classList.remove("dialog-open");
      if (videoTrigger) {
        videoTrigger.focus({ preventScroll: true });
        videoTrigger = null;
      }
    });
  }

  /* ---------- Copy email ---------- */
  const copyButton = doc.getElementById("copy-email");
  const toast = doc.getElementById("toast");
  let toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2400);
  }

  function fallbackCopy(text) {
    const textarea = doc.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    doc.body.appendChild(textarea);
    textarea.select();
    let success = false;
    try {
      success = doc.execCommand("copy");
    } catch (error) {
      success = false;
    }
    textarea.remove();
    return success;
  }

  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      const email = copyButton.dataset.email || "15264687539@163.com";
      const label = copyButton.querySelector("span");
      let copied = false;

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(email);
          copied = true;
        }
      } catch (error) {
        copied = false;
      }

      if (!copied) copied = fallbackCopy(email);

      if (copied) {
        showToast("邮箱已复制，等你来信");
        if (label) {
          label.textContent = "已复制";
          window.setTimeout(() => {
            label.textContent = "复制";
          }, 2400);
        }
      } else {
        showToast(`请手动复制：${email}`);
      }
    });
  }

  /* ---------- Keep footer year honest ---------- */
  const footerYear = doc.getElementById("year");
  if (footerYear) footerYear.textContent = String(new Date().getFullYear());
})();
