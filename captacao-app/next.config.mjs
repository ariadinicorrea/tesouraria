/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: { staleTimes: { dynamic: 0, static: 0 } },
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' }],
      },
    ];
  },
};
export default nextConfig;
