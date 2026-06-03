import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const internalApiBaseUrl = (process.env.INTERNAL_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    domains: ['localhost'],
  },

  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: {
              minChunks: 1,
              priority: -20,
              reuseExistingChunk: true,
              maxSize: 244000,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              reuseExistingChunk: true,
              maxSize: 244000,
            },
          },
        },
      }
    }
    return config
  },

  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${internalApiBaseUrl}/api/v1/:path*`,
      },
    ]
  },
}

export default withBundleAnalyzer(nextConfig)
