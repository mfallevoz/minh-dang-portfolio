"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { site } from "@/config";

const MUTED_KEY = "lucid:muted";
const VOLUME_KEY = "lucid:volume";

/** Level restored when the visitor turns the sound on. */
const DEFAULT_VOLUME = 0.6;

type SoundState = {
  /** User preference. Independent from `armed`. */
  muted: boolean;
  toggleMuted: () => void;
  setMuted: (v: boolean) => void;
  /** 0 → 1. Setting it above 0 also unmutes. */
  volume: number;
  setVolume: (v: number) => void;
  /**
   * The soundtrack stays silent until `arm()`, called on arrival in the
   * portfolio. Never persisted: the landing plays its intro on every load, and
   * the film carries its own audio — the track must not come in over it.
   */
  armed: boolean;
  arm: () => void;
  /** True while the track is actually audible — drives the meter animation. */
  playing: boolean;
  /** False when the track file is missing or unplayable. */
  available: boolean;
};

const SoundContext = createContext<SoundState | null>(null);

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used inside <SoundProvider>");
  return ctx;
}

export default function SoundProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  // Muted until asked otherwise. Nothing can be audible before a user gesture
  // anyway, so a meter sitting at 60 would be claiming something untrue — and
  // turning it up is precisely the gesture that grants the intro its sound.
  const [muted, setMutedState] = useState(true);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [armed, setArmed] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  // The site must keep working with no soundtrack file at all — either the
  // path is blank in the config, or the file is missing / undecodable.
  const [errored, setErrored] = useState(false);
  const available = Boolean(site.music) && !errored;

  // Read stored preferences on mount (avoids an SSR/localStorage mismatch).
  useEffect(() => {
    try {
      const m = localStorage.getItem(MUTED_KEY);
      if (m !== null) setMutedState(m === "1");
      const v = localStorage.getItem(VOLUME_KEY);
      if (v !== null) {
        const n = Number(v);
        if (Number.isFinite(n)) setVolumeState(Math.min(1, Math.max(0, n)));
      }
    } catch {
      /* storage can be unavailable (private mode, embedded webviews) */
    }
    setReady(true);
  }, []);

  const setMuted = useCallback((v: boolean) => {
    setMutedState(v);
    try {
      localStorage.setItem(MUTED_KEY, v ? "1" : "0");
    } catch {}
  }, []);

  const toggleMuted = useCallback(() => {
    // Turning the sound on when the level happens to sit at zero would look
    // like the button did nothing — restore a sensible level with it.
    if (muted && volume === 0) setVolumeState(DEFAULT_VOLUME);
    setMuted(!muted);
  }, [muted, volume, setMuted]);

  const setVolume = useCallback(
    (v: number) => {
      const clamped = Math.min(1, Math.max(0, v));
      setVolumeState(clamped);
      try {
        localStorage.setItem(VOLUME_KEY, String(clamped));
      } catch {}
      // Dragging the level up is an implicit "unmute"; dragging to zero mutes.
      if (clamped === 0) setMuted(true);
      else if (muted) setMuted(false);
    },
    [muted, setMuted]
  );

  const arm = useCallback(() => {
    setArmed(true);
    // Kick playback off inside the gesture itself: Safari only grants audible
    // playback when play() is called synchronously from it.
    const a = audioRef.current;
    if (a && !muted) {
      a.volume = volume;
      a.muted = false;
      a.play().catch(() => {});
    }
  }, [muted, volume]);

  // Keep the element in sync with the state.
  useEffect(() => {
    if (!ready) return;
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    const audible = armed && !muted && volume > 0 && available;
    a.muted = !audible;
    if (audible) a.play().catch(() => {});
    else a.pause();
    setPlaying(audible);
  }, [ready, armed, muted, volume, available]);

  // If the browser refused the first play() (e.g. a hard refresh on a deep
  // link, where no gesture happened yet), retry on the next interaction.
  useEffect(() => {
    if (!ready || !armed || muted || volume === 0) return;
    const a = audioRef.current;
    if (!a || !a.paused) return;
    const retry = () => {
      a.muted = false;
      a.volume = volume;
      a.play().catch(() => {});
    };
    const events = ["pointerdown", "keydown", "touchstart", "wheel"] as const;
    events.forEach((e) =>
      window.addEventListener(e, retry, { once: true, passive: true })
    );
    return () => events.forEach((e) => window.removeEventListener(e, retry));
  }, [ready, armed, muted, volume]);

  return (
    <SoundContext.Provider
      value={{
        muted,
        toggleMuted,
        setMuted,
        volume,
        setVolume,
        armed,
        arm,
        playing,
        available,
      }}
    >
      {children}
      {/* Path lives in src/config.ts — swapping the track is a one-line change,
          and the site degrades quietly if the file is absent. */}
      {site.music ? (
        <audio
          ref={audioRef}
          src={site.music}
          loop
          preload="auto"
          onError={() => setErrored(true)}
        />
      ) : null}
    </SoundContext.Provider>
  );
}
