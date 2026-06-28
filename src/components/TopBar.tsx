"use client";

import { site } from "@/config";
import type { Dictionary } from "@/i18n";

export type View = "carousel" | "about" | "contact";

/**
 * Fixed top bar. Purely presentational: the buttons trigger the animated
 * navigation handled by the Carousel.
 */
export default function TopBar({
  dict,
  view,
  onHome,
  onAbout,
  onContact,
}: {
  dict: Dictionary;
  view: View;
  onHome: () => void;
  onAbout: () => void;
  onContact: () => void;
}) {
  return (
    <header className="topbar">
      <button className="logo" onClick={onHome} aria-label={dict.nav.home}>
        {site.wordmark}
      </button>

      <button
        className={"nav-link nav-center" + (view === "about" ? " is-active" : "")}
        onClick={onAbout}
      >
        {dict.nav.about}
      </button>

      <button
        className={"nav-link nav-end" + (view === "contact" ? " is-active" : "")}
        onClick={onContact}
      >
        {dict.nav.contact}
      </button>
    </header>
  );
}
