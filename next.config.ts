import type { NextConfig } from "next"

/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  // Your existing config here
  compress: true,
  images: {
    formats: ['image/webp', 'image/avif'],
  },
}

export default withBundleAnalyzer(nextConfig)