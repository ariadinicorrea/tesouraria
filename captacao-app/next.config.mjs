/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: { staleTimes: { dynamic: 0, static: 0 } },
};
export default nextConfig;
