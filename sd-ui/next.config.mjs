/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // MUST be `fallback`, not a plain array. A plain array is treated as
    // `afterFiles`, which is evaluated after static routes but BEFORE dynamic
    // ones — that let this catch-all swallow /api/auth/[...nextauth] and proxy
    // sign-in to the Python backend (which 404s). `fallback` runs only after
    // every Next route, including dynamic ones, has been checked, so local
    // handlers (/api/chat, /api/history, /api/auth/*) win and everything else
    // (/api/status, /api/evaluate) still proxies to FastAPI.
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: `${process.env.API_URL || 'http://localhost:8000'}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
