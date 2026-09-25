/** @type {import('next').NextConfig} */
const nextConfig = {
  // The upload route shells out to ffmpeg. Its binary is a runtime file that
  // Next's tracing cannot see through `require`, so it has to be named — and
  // the package must stay external, since bundling a binary is meaningless.
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/admin/upload": ["./node_modules/ffmpeg-static/ffmpeg"],
    // Temporary: the catch-up route for videos that escaped compression.
    "/api/admin/reoptimize": ["./node_modules/ffmpeg-static/ffmpeg"],
  },

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
