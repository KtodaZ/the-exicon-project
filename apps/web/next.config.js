/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  reactStrictMode: true,
  images: {
    domains: [
      'avatars.githubusercontent.com',
      'avatar.tobi.sh',
      'cloudflare-ipfs.com',
      'loremflickr.com',
      'storage.googleapis.com'
    ]
  },
  experimental: {
    legacyBrowsers: false,
    browsersListForSwc: true
  },
  env: {
    NEXT_PUBLIC_VERCEL_URL: process.env.VERCEL_URL
  }
};

module.exports = nextConfig;
