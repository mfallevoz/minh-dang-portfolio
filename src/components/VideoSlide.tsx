"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A full-screen carousel slide — natively hosted video (<video>).
 *
 * Lazy-loading: the source is only loaded once the slide approaches the
 * viewport (rootMargin), which avoids overwhelming the browser when every
 * carousel copy is rendered at once. Once loaded, it stays mounted.
 *
 * The video is muted, looping, and starts playing the moment any part of it
 * enters the viewport (pauses only once it's fully off-screen).
 */
export default function VideoSlide({
  src,
  poster,
}: {
  src: string;
  poster?: string;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const visibleRef = useRef(false);
  const [load, setLoad] = useState(false);

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

    // Preload the source a bit before the slide reaches the viewport.
    const loadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLoad(true);
          loadObserver.disconnect();
        }
      },
      { rootMargin: "150% 0px 150% 0px" }
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
    if (load) v.load();
    return () => {
      v.removeEventListener("canplay", onReady);
      v.removeEventListener("loadeddata", onReady);
    };
  }, [load]);

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
    <section className="slide" ref={rootRef}>
      <video
        ref={videoRef}
        className="slide-media"
        src={load ? src : undefined}
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
