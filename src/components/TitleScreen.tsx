"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Wordmark from "@/components/Wordmark";
import SoundModule from "@/components/sound/SoundModule";
import { useSound } from "@/components/sound/SoundProvider";

/** How long the arming screen waits before the intro rolls, in ms. */
const PREROLL_MS = 3000;

/**
 * The front door, in two beats.
 *
 *   1. "arming"  — wordmark, sound warning and the level control, over a
 *                  countdown. This pause exists for one reason: browsers only
 *                  allow audible playback after a user gesture, so the visitor
 *                  needs a moment to touch the sound control before the film
 *                  starts. Touching it unlocks the <video> element (see
 *                  `unlock`), and the intro then plays with its own audio.
 *   2. "playing" — the intro runs full frame, once, uninterrupted. When it
 *                  ends, `onDone` hands over to the portfolio.
 *
 * The site soundtrack (music.mp3) is deliberately silent throughout: it only
 * starts once we are inside. The intro carries its own sound.
 *
 * One <video> element serves both beats, so it is preloaded and — crucially —
 * stays unlocked between them.
 */
export default function TitleScreen({
  onDone,
  leaving,
}: {
  onDone: () => void;
  leaving: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { muted, volume } = useSound();

  const [phase, setPhase] = useState<"arming" | "playing">("arming");
  const phaseRef = useRef<"arming" | "playing">("arming");
  const [booted, setBooted] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  // Remaining seconds, for the countdown readout.
  const [left, setLeft] = useState(Math.round(PREROLL_MS / 1000));

  // True once a user gesture has bought us the right to play audio.
  const unlockedRef = useRef(false);
  const doneRef = useRef(false);

  // `<source media="...">` is ignored inside <video> (unlike <picture>), so the
  // variant is chosen here — a phone should not pull the 1080p file.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    setSrc(mq.matches ? "/intro/intro-mobile.mp4" : "/intro/intro-desktop.mp4");
  }, []);

  // Fade the arming UI in once there is something to show (or after a short
  // beat if the video never loads — the screen must never be a dead end).
  useEffect(() => {
    const v = videoRef.current;
    const show = () => setBooted(true);
    const t = setTimeout(show, 900);
    v?.addEventListener("loadeddata", show, { once: true });
    return () => {
      clearTimeout(t);
      v?.removeEventListener("loadeddata", show);
    };
  }, []);

  // The level, read through a ref so the callbacks below stay referentially
  // stable — if `start` changed whenever the slider moved, the countdown
  // effect would tear down and restart, resetting the timer on every nudge.
  const soundRef = useRef({ muted, volume });
  soundRef.current = { muted, volume };

  /**
   * Spend a user gesture to unlock audio on the element.
   *
   * Safari only grants a media element the right to play with sound if a
   * play() call originated in a gesture handler. So we play it for an instant
   * at volume 0 — inaudible — then rewind. From then on the element may be
   * started programmatically, with sound.
   */
  const unlock = useCallback(() => {
    const v = videoRef.current;
    if (!v || unlockedRef.current) return;
    unlockedRef.current = true;

    // The film is already running — someone reached for the level control
    // mid-play. The gesture applies to it directly; a silent rewind here would
    // restart the intro and drop the level to zero.
    if (phaseRef.current === "playing") {
      const { muted: m, volume: vol } = soundRef.current;
      v.volume = vol;
      v.muted = m;
      v.play().catch(() => {
        unlockedRef.current = false;
        v.muted = true;
      });
      return;
    }

    v.muted = false;
    v.volume = 0; // the unlock blip must not be heard
    v.play()
      .then(() => {
        // A <video> defaults to volume 1. Never restore that blindly: if the
        // film has already started, `start` owns the element and putting the
        // level back would blast it at full volume.
        if (phaseRef.current !== "arming") return;
        v.pause();
        v.currentTime = 0;
        v.volume = soundRef.current.volume;
        v.muted = soundRef.current.muted;
      })
      .catch(() => {
        unlockedRef.current = false;
        v.muted = true;
      });
  }, []);

  // Any gesture on the page counts — most often it is a click on the meter.
  useEffect(() => {
    if (!src) return;
    const onGesture = () => unlock();
    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [src, unlock]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  /** Roll the film. `fromGesture` means we may turn the sound on outright. */
  const start = useCallback(
    (fromGesture: boolean) => {
      if (phaseRef.current !== "arming") return;
      phaseRef.current = "playing";
      setPhase("playing");

      const v = videoRef.current;
      if (!v) return;
      const { muted: m, volume: vol } = soundRef.current;
      v.currentTime = 0;
      v.volume = vol;
      // Audible only if we are actually allowed to be.
      v.muted = m || !(unlockedRef.current || fromGesture);
      v.play().catch(() => {
        // Refused even muted (rare): fall back rather than stall on a still.
        v.muted = true;
        v.play().catch(() => finish());
      });
    },
    [finish]
  );

  // Countdown, then roll.
  useEffect(() => {
    if (phase !== "arming") return;
    const started = Date.now();
    const id = setInterval(() => {
      const remaining = PREROLL_MS - (Date.now() - started);
      setLeft(Math.max(0, Math.ceil(remaining / 1000)));
      if (remaining <= 0) {
        clearInterval(id);
        start(false);
      }
    }, 200);
    return () => clearInterval(id);
  }, [phase, start]);

  // Keep the running film in sync with the level control.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || phase !== "playing") return;
    v.volume = volume;
    // Only ever unmute if a gesture actually bought us the right to. Muting is
    // always allowed, and is the default.
    const audible = !muted && unlockedRef.current;
    v.muted = !audible;
    // Re-assert playback when turning the sound on: some browsers want the
    // unmute backed by a play() call rather than a bare property change.
    if (audible && v.paused) v.play().catch(() => {});
  }, [muted, volume, phase]);

  // Safari needs `muted` set on the element itself, and an explicit load() for
  // a source that appeared after the first render.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;
    v.muted = true;
    v.setAttribute("muted", "");
    v.load();
  }, [src]);

  // Enter / Space start the intro early, or skip it once running.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = document.activeElement;
      // Don't hijack the keyboard while the level slider has focus.
      if (el instanceof HTMLInputElement || el instanceof HTMLButtonElement)
        return;
      e.preventDefault();
      if (phaseRef.current === "arming") start(true);
      else finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [start, finish]);

  const arming = phase === "arming";

  return (
    <main
      className={
        "title" +
        (booted ? " is-booted" : "") +
        (arming ? " is-arming" : " is-playing") +
        (leaving ? " is-entering" : "")
      }
      // While arming, a click anywhere skips the wait and rolls the film with
      // sound — the click is the gesture that permits it.
      onClick={arming ? () => start(true) : undefined}
    >
      <video
        ref={videoRef}
        className="title-bg"
        src={src ?? undefined}
        poster="/intro/intro-poster.jpg"
        playsInline
        preload="auto"
        onEnded={finish}
        aria-hidden="true"
      />
      <div className="title-vignette" aria-hidden="true" />
      <div className="title-grain" aria-hidden="true" />

      {/* ── Corner framing marks, like a viewfinder ── */}
      <div className="title-marks" aria-hidden="true">
        <i /> <i /> <i /> <i />
      </div>

      {arming ? (
        <>
          <div className="title-inner">
            <h1 className="title-word">
              <Wordmark />
            </h1>
            <p className="title-tag">Production &middot; Cine &middot; Still</p>

            {/* Set the level here: this is the one moment a click can buy the
                right to play the intro out loud. */}
            <div className="title-audio" onClick={(e) => e.stopPropagation()}>
              <p className="title-audio-warn">
                <span className="title-audio-dot" aria-hidden="true" />
                This site has sound
              </p>
              <div className="title-audio-rule" aria-hidden="true" />
              <SoundModule variant="inline" />
              <p className="title-audio-cta">
                Turn it up to hear the intro
              </p>
            </div>

            <div className="title-countdown" aria-live="off">
              <div className="title-countdown-bar">
                <span style={{ animationDuration: `${PREROLL_MS}ms` }} />
              </div>
              <p className="title-countdown-text">
                Intro in {String(left).padStart(2, "0")}s — click to start now
              </p>
            </div>
          </div>

          <div className="title-status" aria-hidden="true">
            <span>SAIGON · PARIS · TOKYO</span>
            <span className="title-status-dim">STANDBY</span>
          </div>
        </>
      ) : (
        <>
          {/* Same fixed position as the portfolio's rack, deliberately: the
              module does not move a pixel across the cut, so it reads as one
              continuous control rather than two. It is also the way back for
              anyone who missed the countdown — clicking it is the gesture that
              grants the film its sound, mid-play. */}
          <div className="rack" onClick={(e) => e.stopPropagation()}>
            <SoundModule />
          </div>

          <button
            type="button"
            className="intro-skip"
            onClick={(e) => {
              e.stopPropagation();
              finish();
            }}
          >
            Skip <span aria-hidden="true">→</span>
          </button>
        </>
      )}
    </main>
  );
}
