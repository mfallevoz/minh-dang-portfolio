"use client";

/**
 * Full-screen "camera stop" cut: RGB-split bars, scanlines and a hard black
 * flicker. It covers every transition on the site — entering from the title
 * screen, and swapping language — so both read as the same gesture.
 *
 * Rendered above everything and never interactive.
 */
export default function GlitchCut({ active }: { active: boolean }) {
  return (
    <div
      className={"glitch-cut" + (active ? " is-active" : "")}
      aria-hidden="true"
    >
      <span className="glitch-bar" />
      <span className="glitch-bar" />
      <span className="glitch-bar" />
    </div>
  );
}

/**
 * Timing of the cut. These must stay in sync with the `glitchOut` keyframes.
 *
 *   0 ──────── flicker ────────┤ 462 ─── solid black ─── 700
 *                              │        ↑
 *                              │        swap at 520
 *
 * The flicker alone is not enough cover: it keeps dropping back to near
 * transparent, so a swap during it is caught mid-blink. The cut therefore ends
 * on a short, fully opaque blackout, and the content changes inside it.
 */
export const GLITCH_MS = 700;

/** When the overlay reaches full opacity and stays there. */
export const GLITCH_BLACKOUT_MS = 462;

/** When to swap the content underneath — well inside the blackout. */
export const GLITCH_SWAP_MS = 520;
