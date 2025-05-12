/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Remove X-Powered-By header for security
  compress: true, // Enable compression
  images: {
    domains: [
      'api.qrserver.com',
      'mempool.space',
      'ord-mirror.magiceden.dev',
      'ordin.s3.amazonaws.com',
      'turbo.ordinalswallet.com'
    ],
    minimumCacheTTL: 60,
  },
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ]
  },
  swcMinify: true,
  env: {
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    PROJECT_BTC_WALLET: process.env.PROJECT_BTC_WALLET,
    MAX_TIGERS_PER_WALLET: process.env.MAX_TIGERS_PER_WALLET,
    BTC_TO_USD_RATE: process.env.BTC_TO_USD_RATE
  }
};

module.exports = nextConfig; 