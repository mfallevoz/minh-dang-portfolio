/** @type {import('next').NextConfig} */
const nextConfig = {
  // The site used to serve /en and /vi. Those routes are gone — the language
  // is client state now — so send any old link or indexed URL to the root
  // instead of a 404.
  async redirects() {
    return [
      { source: "/en", destination: "/", permanent: true },
      { source: "/vi", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
