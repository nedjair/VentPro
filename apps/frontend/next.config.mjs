const internalApiBaseUrl = (process.env.INTERNAL_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration minimale pour tester l'hydratation
  reactStrictMode: true,
  poweredByHeader: false,

  // Configuration des images
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },

  // Configuration webpack pour éviter les erreurs de chunks
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Optimisation des chunks pour le développement
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: {
              minChunks: 1,
              priority: -20,
              reuseExistingChunk: true,
              maxSize: 244000, // 244KB max par chunk
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
      };
    }
    return config;
  },

  // Redirection des appels API vers le backend.
  // En Docker, `localhost` dans le conteneur frontend ne pointe pas vers le
  // backend : on utilise donc une base interne configurable (`backend:3001`).
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${internalApiBaseUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
