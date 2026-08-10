"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Project } from "@/data/projects";
import VideoSlide from "./VideoSlide";
import AboutSection from "./AboutSection";
import ContactSection from "./ContactSection";
import TopBar, { type View } from "./TopBar";
import SoundModule from "./sound/SoundModule";
import { useSound } from "./sound/SoundProvider";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

// The video list is rendered several times and the scroll position is reset
// when crossing a boundary → infinite loop. About & Contact are rendered AFTER,
// at the very bottom: the loop never reaches them. They are accessible only via
// the animated navigation (fast spin).
//
// 👉 COPIES = number of times the video list is repeated.
//    The loop only uses the centre copy; the extra copies act as a "runway"
//    travelled through during the spin to About/Contact.
//    INCREASING COPIES = MORE SLIDES SCROLL BY during the transition.
//    (minimum 3 for the loop to work)
const COPIES = 6;

// Navigation spin settings (to About/Contact).
const SPIN_MS_PER_SLIDE = 120; // duration per slide travelled
const SPIN_MIN_MS = 620; // min duration (short trips, e.g. About ↔ Contact)
const SPIN_MAX_MS = 1700; // max duration (long trips)

/**
 * Easing for the spin, as a CSS-style cubic-bezier.
 *
 * The curve matters more than the duration here. An ease-out starts at full
 * speed, which reads as a jump cut — the reel is already at top speed on the
 * first frame. This one accelerates from a standstill, cruises, then spends
 * most of its time settling, the way a physical reel would.
 */
const SPIN_EASING = cubicBezier(0.55, 0, 0.18, 1);

/** Minimal cubic-bezier solver — same semantics as the CSS timing function. */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const a = (u: number, v: number) => 1 - 3 * v + 3 * u;
  const b = (u: number, v: number) => 3 * v - 6 * u;
  const c = (u: number) => 3 * u;
  const at = (t: number, u: number, v: number) =>
    ((a(u, v) * t + b(u, v)) * t + c(u)) * t;
  const slope = (t: number, u: number, v: number) =>
    3 * a(u, v) * t * t + 2 * b(u, v) * t + c(u);

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Newton-Raphson: find the t whose x matches, then read its y.
    let t = x;
    for (let i = 0; i < 5; i++) {
      const s = slope(t, x1, x2);
      if (s === 0) break;
      t -= (at(t, x1, x2) - x) / s;
    }
    return at(t, y1, y2);
  };
}

// Auto-scroll: the carousel advances by one video every N seconds.
// Speed adapts to the screen height (slides = 100dvh) → consistent duration
// on every device. Tuned for ~15s video loops.
const AUTO_SECONDS_PER_SLIDE = 15;

// ── Warming the runway ──
// A spin to About crosses several screens in about a second, far faster than
// lazy-loading can react. So once the first video is comfortably playing, the
// remaining copies are given their source one at a time, in the background.
// It costs almost no network — every copy points at the same handful of files,
// already in the HTTP cache — but it does spawn a decoder per element, hence
// the cap.
const WARM_START_MS = 1400; // let the visible video settle first
const WARM_STEP_MS = 180; // one more slide per tick
const WARM_MAX_SLIDES = 24; // ceiling on simultaneous <video> decoders

export default function Carousel({
  dict,
  locale,
  projects,
  onLocaleChange,
}: {
  dict: Dictionary;
  locale: Locale;
  projects: Project[];
  onLocaleChange: (locale: Locale) => void;
}) {
  const { available: soundAvailable } = useSound();
  const P = projects.length;
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [tc, setTc] = useState("00:00:00:00");

  // Current view. We keep a synchronous ref to read it inside handlers.
  const [view, _setView] = useState<View>("carousel");
  const viewRef = useRef<View>("carousel");
  const setView = (v: View) => {
    viewRef.current = v;
    _setView(v);
  };

  const navRef = useRef(false); // true during a programmatic spin
  const rafRef = useRef(0);
  const pauseRef = useRef(false); // auto-scroll paused (user interaction)

  // ── Warm the runway in the background ──
  // How many slides (in DOM order) have been handed their source so far.
  const totalSlides = P * COPIES;
  const warmTarget = Math.min(totalSlides, WARM_MAX_SLIDES);
  const [warmed, setWarmed] = useState(0);

  useEffect(() => {
    if (warmTarget === 0) return;
    let id: ReturnType<typeof setInterval>;
    const kickoff = setTimeout(() => {
      id = setInterval(() => {
        setWarmed((n) => {
          if (n >= warmTarget) {
            clearInterval(id);
            return n;
          }
          return n + 1;
        });
      }, WARM_STEP_MS);
    }, WARM_START_MS);

    return () => {
      clearTimeout(kickoff);
      clearInterval(id);
    };
  }, [warmTarget]);

  // A click on About/Contact means the spin is imminent: stop trickling and
  // hand every remaining slide its source at once.
  const warmNow = () => setWarmed(warmTarget);

  // Offsets derived from a slide's height.
  const offsets = () => {
    const c = ref.current!;
    const h = c.clientHeight;
    const copyH = h * P;
    return { h, copyH, about: copyH * COPIES, contact: copyH * COPIES + h };
  };

  // Starting position: top of the centre video copy.
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.scrollTop = c.clientHeight * P;
  }, []);

  // ───────── Animated spin to a target ─────────
  const animateTo = (to: number, onDone?: () => void) => {
    const c = ref.current;
    if (!c) return;
    cancelAnimationFrame(rafRef.current);

    navRef.current = true;

    const from = c.scrollTop;
    const dist = to - from;
    const h = c.clientHeight || 1;
    // Duration proportional to the number of slides travelled, clamped.
    const dur = Math.min(
      SPIN_MAX_MS,
      Math.max(SPIN_MIN_MS, (Math.abs(dist) / h) * SPIN_MS_PER_SLIDE)
    );
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      c.scrollTop = from + dist * SPIN_EASING(t);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        c.scrollTop = to;
        navRef.current = false;
        onDone?.();
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const goAbout = () => {
    if (!ref.current || navRef.current) return;
    warmNow();
    setView("about"); // hide the carousel overlays right away
    animateTo(offsets().about);
  };
  const goContact = () => {
    if (!ref.current || navRef.current) return;
    warmNow();
    setView("contact");
    animateTo(offsets().contact);
  };
  const goHome = () => {
    if (!ref.current || navRef.current) return;
    warmNow();
    const { h, copyH } = offsets();
    // Scroll back up to the active project in the centre copy.
    animateTo(copyH + active * h, () => setView("carousel"));
  };

  // ───────── Scroll: infinite loop (carousel) ─────────
  useEffect(() => {
    const c = ref.current;
    if (!c) return;

    let ticking = false;
    const onScroll = () => {
      if (navRef.current) return; // ignore scroll during the spin
      if (viewRef.current !== "carousel") return; // sections are locked
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const { h, copyH } = offsets();
        if (c.scrollTop >= copyH * 2) c.scrollTop -= copyH;
        else if (c.scrollTop < h * 0.5) c.scrollTop += copyH;
        const idx = Math.round(c.scrollTop / h);
        setActive(((idx % P) + P) % P);
        ticking = false;
      });
    };

    c.addEventListener("scroll", onScroll, { passive: true });
    return () => c.removeEventListener("scroll", onScroll);
  }, []);

  // ───────── Slow, continuous auto-scroll ─────────
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (
        viewRef.current === "carousel" &&
        !navRef.current &&
        !pauseRef.current &&
        !document.hidden
      ) {
        // Speed adapted to the screen height: 1 video every ~15s.
        const speed = c.clientHeight / AUTO_SECONDS_PER_SLIDE; // px/s
        acc += speed * dt;
        const stepPx = Math.trunc(acc);
        if (stepPx) {
          acc -= stepPx;
          c.scrollTop += stepPx; // onScroll handles the wrap + active index
        }
      } else {
        acc = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Pause the auto-scroll while the user interacts, then resume.
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let t: ReturnType<typeof setTimeout>;
    const pause = () => {
      pauseRef.current = true;
      clearTimeout(t);
      t = setTimeout(() => {
        pauseRef.current = false;
      }, 2500);
    };
    const opts = { passive: true } as const;
    c.addEventListener("wheel", pause, opts);
    c.addEventListener("touchstart", pause, opts);
    c.addEventListener("touchmove", pause, opts);
    c.addEventListener("pointerdown", pause, opts);
    window.addEventListener("keydown", pause);
    return () => {
      clearTimeout(t);
      c.removeEventListener("wheel", pause);
      c.removeEventListener("touchstart", pause);
      c.removeEventListener("touchmove", pause);
      c.removeEventListener("pointerdown", pause);
      window.removeEventListener("keydown", pause);
    };
  }, []);

  // Lock scrolling on the About/Contact sections (only the logo leaves them).
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const block = (e: Event) => {
      if (viewRef.current !== "carousel") e.preventDefault();
    };
    c.addEventListener("wheel", block, { passive: false });
    c.addEventListener("touchmove", block, { passive: false });
    return () => {
      c.removeEventListener("wheel", block);
      c.removeEventListener("touchmove", block);
    };
  }, []);

  // Reposition cleanly after a resize.
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const onResize = () => {
      const { h, copyH, about, contact } = offsets();
      if (viewRef.current === "carousel") c.scrollTop = copyH + active * h;
      else c.scrollTop = viewRef.current === "contact" ? contact : about;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active]);

  // Keyboard navigation (carousel only).
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const onKey = (e: KeyboardEvent) => {
      if (navRef.current || viewRef.current !== "carousel") return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        c.scrollBy({ top: c.clientHeight, behavior: "smooth" });
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        c.scrollBy({ top: -c.clientHeight, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fake camera timecode (decorative).
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const t = (Date.now() - start) / 1000;
      const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
      setTc(
        `${pad(t / 3600)}:${pad((t / 60) % 60)}:${pad(t % 60)}:${pad((t * 24) % 24)}`
      );
    }, 1000 / 12);
    return () => clearInterval(id);
  }, []);

  const slides = Array.from({ length: COPIES }).flatMap((_, ci) =>
    projects.map((p, i) => {
      const index = ci * P + i; // position in DOM order, across every copy
      return (
        <VideoSlide
          key={`${ci}-${i}`}
          src={p.src}
          srcMobile={p.srcMobile}
          poster={p.poster}
          warm={index < warmed}
        />
      );
    })
  );

  const current = projects[active];
  const inCarousel = view === "carousel";
  const hidden = inCarousel ? "" : " is-hidden";

  return (
    <>
      <TopBar
        dict={dict}
        view={view}
        onHome={goHome}
        onAbout={goAbout}
        onContact={goContact}
      />

      <div className="carousel" ref={ref}>
        {slides}
        <AboutSection
          dict={dict}
          locale={locale}
          onLocaleChange={onLocaleChange}
        />
        <ContactSection dict={dict} />
      </div>

      {/* Audio module — part of the right-hand instrument column, and the only
          overlay that stays put on About/Contact. Here it governs the
          soundtrack, so with no track file there is nothing to govern. */}
      {soundAvailable && (
        <div className="rack">
          <SoundModule />
        </div>
      )}

      {/* Active project info — empty fields are simply not shown */}
      <div className={"info" + hidden} key={active}>
        {current.category && <div className="info-cat">{current.category}</div>}
        {current.title && <h2 className="info-title">{current.title}</h2>}
        {(current.client || current.year) && (
          <div className="info-meta">
            {[current.client, current.year].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>

      {/* Camera HUD */}
      <div className={"hud" + hidden}>
        <span className="hud-rec">
          <i /> REC
        </span>
        <span>{tc}</span>
        <span className="hud-dim">4K · 24 FPS</span>
        <span className="hud-count">
          {String(active + 1).padStart(2, "0")} / {String(P).padStart(2, "0")}
        </span>
      </div>
    </>
  );
}
