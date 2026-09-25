"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A full-screen carousel slide — natively hosted video (<video>).
 *
 * Loading happens on two tracks:
 *   1. an IntersectionObserver, for slides the visitor scrolls towards;
 *   2. `warm`, set by the carousel during idle time, so the "runway" copies
 *      already hold their source before a spin to About/Contact races past
 *      them. Without it, a 1200ms spin outruns the observer and the runway
 *      flashes empty.
 * Once loaded, a slide stays loaded.
 *
 * The poster is also painted as the slide's background, so a slide that has
 * not loaded yet shows the still frame rather than black.
 *
 * The video is muted, looping, and starts playing the moment any part of it
 * enters the viewport (pauses only once it's fully off-screen).
 */
export default function VideoSlide({
  src,
  srcMobile,
  poster,
  warm = false,
}: {
  src: string;
  srcMobile?: string;
  poster?: string;
  warm?: boolean;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const visibleRef = useRef(false);
  // One-way: once a slide holds its source it keeps it. `warm` is a trigger,
  // not a state — otherwise a slide would drop its video the moment the
  // warming window moved on, and reload it on the way back.
  const [load, setLoad] = useState(false);
  useEffect(() => {
    if (warm) setLoad(true);
  }, [warm]);

  // On small screens, load the lighter cropped version when one exists.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const effectiveSrc = isMobile && srcMobile ? srcMobile : src;

  // Safari blocks autoplay unless the element is muted *at the moment* play()
  // is called — and React doesn't reliably set the `muted` property. So we set
  // it imperatively and retry once if WebKit still rejects the first attempt.
  const playSafe = (v: HTMLVideoElement) => {
    v.muted = true;
    v.play().catch(() => {
      v.muted = true;
      setTimeout(() => {
        if (visibleRef.current) v.play().catch(() => {});
      }, 120);
    });
  };

  // Force the muted property on mount (Safari autoplay requirement).
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.muted = true;
      v.setAttribute("muted", "");
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Preload the source well before the slide reaches the viewport. Generous
    // on purpose: the spin travels several screens in about a second, so a
    // tight margin would only start loading once it is already too late.
    const loadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLoad(true);
          loadObserver.disconnect();
        }
      },
      { rootMargin: "400% 0px 400% 0px" }
    );
    loadObserver.observe(root);

    // Play as soon as ANY part of the slide is visible; pause once fully gone.
    const playObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? false;
        visibleRef.current = visible;
        const v = videoRef.current;
        if (!v) return;
        if (visible) playSafe(v);
        else v.pause();
      },
      { threshold: 0 }
    );
    playObserver.observe(root);

    return () => {
      loadObserver.disconnect();
      playObserver.disconnect();
    };
  }, []);

  // Resume playback once the video is ready (the IO may have fired earlier).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onReady = () => {
      if (visibleRef.current) playSafe(v);
    };
    v.addEventListener("canplay", onReady);
    v.addEventListener("loadeddata", onReady);
    // Safari doesn't always begin loading a source set dynamically in JS —
    // an explicit load() kicks it off so the ready events actually fire.
    // Also re-runs if the chosen source switches (desktop ↔ mobile).
    if (load) v.load();
    return () => {
      v.removeEventListener("canplay", onReady);
      v.removeEventListener("loadeddata", onReady);
    };
  }, [load, effectiveSrc]);

  // Safety net: if the browser blocked autoplay, the first user gesture
  // anywhere unlocks playback of the visible video (muted play is allowed then).
  useEffect(() => {
    const unlock = () => {
      const v = videoRef.current;
      if (v && visibleRef.current) playSafe(v);
    };
    const events = ["pointerdown", "touchstart", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, unlock, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, unlock));
  }, []);

  return (
    <section
      className="slide"
      ref={rootRef}
      // The still frame sits behind the <video>. Even mid-spin, before a
      // source has attached or decoded, the slide shows the image — never a
      // black hole. Costs one already-cached request.
      style={poster ? { backgroundImage: `url(${poster})` } : undefined}
    >
      <video
        ref={videoRef}
        className="slide-media"
        src={load ? effectiveSrc : undefined}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
      <div className="slide-vignette" />
    </section>
  );
}
