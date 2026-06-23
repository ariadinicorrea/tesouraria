/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: { staleTimes: { dynamic: 30, static: 180 } },
};
export default nextConfig;
