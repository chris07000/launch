# Bitcoin Ordinals Mint

This repository contains a Bitcoin Ordinals minting platform that allows:
- Minting Tiger NFTs on the Bitcoin blockchain
- Batch-based whitelist system
- Admin dashboard
- Payment verification

## Development

To run the project in development mode:

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

## Vercel Deployment

This project is designed to work both locally (using file storage) and on Vercel (using PostgreSQL).

### Prerequisites

1. A Vercel account
2. Vercel Postgres database integration added to your project

### Environment Variables

Make sure to add these environment variables to your Vercel project:

```
# IMPORTANT - This tells the app to use database storage instead of file storage
VERCEL=1

# Admin credentials
ADMIN_PASSWORD=your_admin_password

# Bitcoin wallet configuration
PROJECT_BTC_WALLET=your_btc_wallet_address
PAYMENT_BTC_WALLET=your_payment_btc_wallet

# App configuration
MAX_TIGERS_PER_WALLET=2
BTC_TO_USD_RATE=99000

# API URL - your Vercel deployment URL
API_URL=https://your-vercel-url.vercel.app
```

The Postgres connection variables will be automatically added by the Vercel Postgres integration.

### Deployment Steps

1. Add the Vercel Postgres integration to your project
2. Set up all environment variables
3. Deploy the project

The database will be automatically initialized during the first deployment.

## Troubleshooting

If you encounter issues with the admin page or minting functionality:

1. Check the Vercel logs for any errors
2. Make sure the `VERCEL=1` environment variable is set
3. Verify that the Postgres database is properly connected
4. Try accessing the `/api/init` endpoint to initialize the database

See the [VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md) file for more details.
