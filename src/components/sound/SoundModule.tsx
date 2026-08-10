"use client";

import { useSound } from "./SoundProvider";

const SEGMENTS = 12;

/**
 * Audio module, styled after a camera / mixer rack readout:
 *
 *     ◂)) AUD           60
 *     ▮▮▮▮▮▮▮▯▯▯▯▯
 *
 * The label toggles mute, the meter sets the level. The meter is a real
 * `<input type="range">` laid transparently over the segments, so dragging,
 * arrow keys and screen readers all work for free.
 */
export default function SoundModule({
  variant = "rack",
}: {
  /**
   * `rack` = fixed HUD column on the right. `inline` = inside a panel.
   *
   * Styling only. Whether the module is worth showing at all is the caller's
   * call: over the portfolio it governs the soundtrack (so it hides when there
   * is no track file), while over the intro it governs the film's own audio
   * and is always relevant.
   */
  variant?: "rack" | "inline";
}) {
  const { muted, toggleMuted, volume, setVolume, playing } = useSound();

  const level = muted ? 0 : volume;
  const lit = Math.round(level * SEGMENTS);
  const pct = Math.round(level * 100);

  return (
    <div
      className={`sound-module sound-module--${variant}${muted ? " is-muted" : ""}${playing ? " is-playing" : ""}`}
    >
      <button
        type="button"
        className="sound-label"
        onClick={toggleMuted}
        aria-pressed={muted}
        aria-label={muted ? "Unmute the soundtrack" : "Mute the soundtrack"}
        title={muted ? "Unmute" : "Mute"}
      >
        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
          <path d="M4 9h3.2L12 5v14l-4.8-4H4z" fill="currentColor" />
          {muted ? (
            <path
              d="M16 9.2l5 5.6M21 9.2l-5 5.6"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <>
              <path
                d="M15.4 9.6a3.6 3.6 0 0 1 0 4.8"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M18 7.2a7 7 0 0 1 0 9.6"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                fill="none"
              />
            </>
          )}
        </svg>
        <span className="sound-label-text">AUD</span>
        <span className="sound-value">{muted ? "MUTE" : String(pct).padStart(2, "0")}</span>
      </button>

      <div className="sound-meter">
        <div className="sound-segs" aria-hidden="true">
          {Array.from({ length: SEGMENTS }).map((_, i) => (
            <span
              key={i}
              className={
                "sound-seg" +
                (i < lit ? " is-on" : "") +
                (i >= SEGMENTS - 2 ? " is-hot" : "")
              }
              style={{ ["--i" as string]: i }}
            />
          ))}
        </div>
        <input
          className="sound-range"
          type="range"
          min={0}
          max={100}
          step={100 / SEGMENTS}
          value={pct}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          aria-label="Soundtrack level"
        />
      </div>
    </div>
  );
}
