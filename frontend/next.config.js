/** @type {import('next').NextConfig} */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons/**',
      },
    ],
  },
};

module.exports = nextConfig;
