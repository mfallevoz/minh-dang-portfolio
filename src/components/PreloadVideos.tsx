"use client";

import { useEffect, useState } from "react";

type Item = { id: string; src: string; srcMobile?: string };

/**
 * Off-screen <video> elements that warm the browser cache while the user picks
 * a language. Picks the lighter mobile version on small screens, and only
 * renders after the viewport is known (so it never preloads the wrong variant).
 */
export default function PreloadVideos({ items }: { items: Item[] }) {
  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsMobile(mq.matches);
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <div className="preload" aria-hidden="true">
      {items.map((p) => (
        <video
          key={p.id}
          src={isMobile && p.srcMobile ? p.srcMobile : p.src}
          preload="auto"
          muted
          playsInline
        />
      ))}
    </div>
  );
}
