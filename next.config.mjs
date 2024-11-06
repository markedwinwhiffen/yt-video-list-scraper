/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: true
  },
  async rewrites() {
    return [
      {
        source: '/api',
        destination: '/api',
      },
    ]
  }
}

export default nextConfig 