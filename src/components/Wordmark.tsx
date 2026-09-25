import { site } from "@/config";

/**
 * The Lucid wordmark, inlined rather than loaded as an <img>.
 *
 * Inlining is what lets it take `currentColor`: the top bar inverts itself
 * against the video behind it with `mix-blend-mode: difference`, and the title
 * screen wraps the mark in an animated bloom. An <img> could do neither.
 *
 * The source file (public/assets/logo.svg) is a dark mark on an opaque white
 * square — right for print, unusable on a black site. These are the same paths
 * on a tight viewBox with no background.
 */
export default function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="255.87 835.80 1595.40 256.90"
      fill="currentColor"
      role="img"
      aria-label={site.name}
    >
      <path d="M283.73,1050.39h137.63v10.91h-155.49v-176.39h17.85v165.49Z" />
      <path d="M582.43,995.62v-110.72h17.85v110.72c0,36.27,30.5,56.9,84.81,56.9s85.18-20.63,85.18-56.9v-110.72h17.85v110.72c0,43.15-37.57,68.04-103.04,68.04s-102.67-24.89-102.67-68.04Z" />
      <path d="M1405.69,1061.3v-176.39h17.86v176.39h-17.86Z" />
      <path d="M1686.54,884.9c92.25,0,154.74,36.04,154.74,88.2s-62.49,88.2-154.74,88.2h-78.12v-176.39h78.12ZM1688.77,1050.39c80.72,0,133.91-31.53,133.91-77.29s-53.19-77.29-133.91-77.29h-62.49v154.58h62.49Z" />
      <path d="M1217.52,1004.46c-14.32,27.03-40.8,48.98-75.5,59.02-66.66,19.28-138.44-12.73-160.32-71.49-21.87-58.75,14.44-122.02,81.11-141.3,8.27-2.39,16.62-3.99,24.95-4.85-49.44,13.11-84.83,54.12-83.38,101.79,1.75,57.09,55.67,102.12,120.44,100.58,38.46-.91,72.09-18.04,92.7-43.75Z" />
    </svg>
  );
}
