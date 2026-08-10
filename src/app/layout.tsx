import type { Metadata } from "next";
import "./globals.css";
import { siteUrl } from "@/lib/site-url";
import SoundProvider from "@/components/sound/SoundProvider";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Lucid — Director / DP / Editor",
  description: "Portfolio of Lucid — photography, video, editing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Owns the soundtrack and the shared mute / level state. It stays
            completely silent until the visitor leaves the title screen. */}
        <SoundProvider>{children}</SoundProvider>
      </body>
    </html>
  );
}
