/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ]
      }
    ];
  },

  // Experimental features
  experimental: {
    serverComponentsExternalPackages: [],
    instrumentationHook: false
  },

  // Enable image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.bitcoinbunny.com',
      },
      {
        protocol: 'https', 
        hostname: 'ord-mirror.magiceden.dev',
      }
    ]
  },

  // Environment variables
  env: {
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    PROJECT_BTC_WALLET: process.env.PROJECT_BTC_WALLET,
    PAYMENT_BTC_WALLET: process.env.PAYMENT_BTC_WALLET,
    BTC_TO_USD_RATE: process.env.BTC_TO_USD_RATE,
    API_URL: process.env.API_URL || '',
    BACKUP_SECRET: process.env.BACKUP_SECRET,
  }
};

module.exports = nextConfig; 