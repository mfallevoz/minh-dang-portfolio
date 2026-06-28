import type { Dictionary } from "@/i18n";

/**
 * "About" section — a full-screen slide hidden at the very bottom of the
 * carousel. Reachable only through the animated navigation (the video loop
 * never scrolls down this far).
 */
export default function AboutSection({ dict }: { dict: Dictionary }) {
  return (
    <section className="slide section">
      <div className="section-inner">
        <div className="section-label">{dict.about.label}</div>
        <h2 className="section-title">{dict.about.title}</h2>
        {dict.about.body.map((paragraph, i) => (
          <p
            key={i}
            className={"section-text" + (i > 0 ? " section-muted" : "")}
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
