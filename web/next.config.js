/** @type {import('next').NextConfig} */
const buildDirectory = process.env.DISHA_NEXT_DIST_DIR || ".next";
if (!/^\.next(?:-[a-z0-9-]+)?$/.test(buildDirectory)) {
  throw new Error("DISHA_NEXT_DIST_DIR must be .next or a named .next-* build directory");
}
const nextConfig = {
  distDir: buildDirectory,
  // OS/Appliance mode needs a self-contained runtime (no node_modules at boot).
  output: "standalone",
  // OpenNext's file tracer can omit the workerd-conditioned pg-cloudflare
  // implementation used by node-postgres. Force those files into the traced
  // server bundle so Cloudflare Workers can resolve pg/lib/stream.js safely.
  outputFileTracingIncludes: {
    "**/*": [
      "./node_modules/pg-cloudflare/dist/**",
      "./node_modules/pg-cloudflare/esm/**",
    ],
  },
  // Keep behavior deterministic in production images.
  poweredByHeader: false,
  experimental: { cpus: 2 },
  // CI runs `npm run type-check:full` (tsconfig.full.json) before build, which
  // covers MORE files than Next.js build's tsconfig.json. Skip Next.js's
  // redundant in-build type check to avoid cancellation on 2-CPU runners.
  typescript: { ignoreBuildErrors: true },
  // This app lives inside the monorepo; keep Turbopack rooted at web/.
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
