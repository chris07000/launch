# Vercel Deployment Guide

This guide explains how to deploy this project to Vercel correctly.

## Prerequisites

1. A Vercel account
2. PostgreSQL database (Vercel Postgres or external provider)

## Environment Variables

Make sure to add the following environment variables to your Vercel project:

```
# Admin toegang
ADMIN_PASSWORD=your_admin_password

# Bitcoin wallet configuratie
PROJECT_BTC_WALLET=your_btc_wallet_address
PAYMENT_BTC_WALLET=your_payment_btc_address

# App configuratie
MAX_TIGERS_PER_WALLET=2
BTC_TO_USD_RATE=99000

# Backup secret
BACKUP_SECRET=your_backup_secret

API_URL=https://your-vercel-url.vercel.app

# Database configuratie - provided by Vercel Postgres integration
# POSTGRES_URL
# POSTGRES_USER
# POSTGRES_HOST
# POSTGRES_PASSWORD
# POSTGRES_DATABASE

# Important! Set VERCEL to 1 to enable Vercel mode
VERCEL=1
```

## Deployment Steps

1. Connect your GitHub repository to Vercel
2. Configure the environment variables
3. Deploy the project

The build script will automatically:
1. Create necessary database tables
2. Import default batch data
3. Set up initial app state

## Troubleshooting

If you encounter issues with the deployment:

1. Check the Vercel logs to identify any build or runtime errors
2. Verify that all environment variables are correctly set
3. Make sure your Postgres database is accessible
4. Check that the `VERCEL=1` variable is set, which tells the app to use the database instead of the filesystem

## Local vs. Vercel Storage

The application is designed to:
- Use filesystem storage in local development
- Use PostgreSQL database in production (Vercel)

The `src/lib/storage-wrapper.ts` file automatically detects the environment and uses the appropriate storage method. 