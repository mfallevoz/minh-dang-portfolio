"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@/data/projects";
import { getDictionary } from "@/i18n";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import TitleScreen from "./TitleScreen";
import Carousel from "./Carousel";
import PreloadVideos from "./PreloadVideos";
import GlitchCut, { GLITCH_MS, GLITCH_SWAP_MS } from "./GlitchCut";
import { useSound } from "./sound/SoundProvider";

const LOCALE_KEY = "lucid:locale";

// How many videos to start fetching behind the title screen.
const PRELOAD_COUNT = 3;

/**
 * The whole site, on a single URL.
 *
 * There is no routing: the title screen and the portfolio are two states of
 * one page, and the language is client state. Nothing ever reloads — every
 * transition is the same glitch cut.
 */
export default function Experience({ projects }: { projects: Project[] }) {
  const { arm } = useSound();

  const [stage, setStage] = useState<"title" | "site">("title");
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [glitching, setGlitching] = useState(false);

  // Guards against a second trigger while a cut is already playing.
  const busyRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Resolve the language once on the client: a saved choice wins, otherwise
  // the browser's preference, otherwise English.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LOCALE_KEY);
    } catch {}
    if (saved && isLocale(saved)) {
      setLocale(saved);
      return;
    }
    const tags = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];
    for (const tag of tags) {
      const base = tag.toLowerCase().split("-")[0];
      if (isLocale(base)) {
        setLocale(base);
        return;
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  /** Play the cut, swap the content while the screen is dark, then clear. */
  const cutTo = useCallback((swap: () => void) => {
    if (busyRef.current) return;
    busyRef.current = true;

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduced) {
      swap();
      busyRef.current = false;
      return;
    }

    setGlitching(true);
    timers.current.push(
      setTimeout(swap, GLITCH_SWAP_MS),
      setTimeout(() => {
        setGlitching(false);
        busyRef.current = false;
      }, GLITCH_MS)
    );
  }, []);

  // Called when the intro finishes (or is skipped). The soundtrack takes over
  // from the film's own audio here, and only here — music.mp3 never plays over
  // the landing.
  const enter = useCallback(() => {
    arm();
    cutTo(() => setStage("site"));
  }, [arm, cutTo]);

  const changeLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      try {
        localStorage.setItem(LOCALE_KEY, next);
      } catch {}
      // The carousel stays mounted, so the scroll position — and therefore the
      // About section the visitor is reading — is preserved.
      cutTo(() => setLocale(next));
    },
    [locale, cutTo]
  );

  const dict = getDictionary(locale);

  return (
    <>
      {stage === "title" ? (
        <>
          <TitleScreen onDone={enter} leaving={glitching} />
          {/* Warm the cache while the visitor is still on the title screen. */}
          <PreloadVideos
            items={projects.slice(0, PRELOAD_COUNT).map((p) => ({
              id: p.id,
              src: p.src,
              srcMobile: p.srcMobile,
            }))}
          />
        </>
      ) : (
        <Carousel
          dict={dict}
          locale={locale}
          projects={projects}
          onLocaleChange={changeLocale}
        />
      )}

      <GlitchCut active={glitching} />
    </>
  );
}
