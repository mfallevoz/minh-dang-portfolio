import { site } from "@/config";
import type { Dictionary } from "@/i18n";

/**
 * "Contact" section — last slide, hidden at the very bottom of the carousel.
 */
export default function ContactSection({ dict }: { dict: Dictionary }) {
  return (
    <section className="slide section">
      <div className="section-inner">
        <div className="section-label">{dict.contact.label}</div>
        <h2 className="section-title">{dict.contact.title}</h2>

        <ul className="section-links">
          <li>
            <span>{dict.contact.links.email}</span>
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </li>
          <li>
            <span>{dict.contact.links.instagram}</span>
            <a href={site.instagram.url} target="_blank" rel="noreferrer">
              {site.instagram.handle}
            </a>
          </li>
          <li>
            <span>{dict.contact.links.vimeo}</span>
            <a href={site.vimeo.url} target="_blank" rel="noreferrer">
              {site.vimeo.handle}
            </a>
          </li>
        </ul>

        <p className="section-text section-muted">{dict.contact.note}</p>
      </div>
    </section>
  );
}
