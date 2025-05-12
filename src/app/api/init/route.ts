import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { initializeStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const defaultBatches = [
  { id: 1, price: 250.00, maxWallets: 33, ordinals: 66, mintedWallets: 0, isSoldOut: false },
  { id: 2, price: 260.71, maxWallets: 33, ordinals: 66, mintedWallets: 0, isSoldOut: false },
  { id: 3, price: 271.43, maxWallets: 33, ordinals: 66, mintedWallets: 0, isSoldOut: false },
  { id: 4, price: 282.14, maxWallets: 33, ordinals: 66, mintedWallets: 0, isSoldOut: false },
  { id: 5, price: 292.86, maxWallets: 33, ordinals: 66, mintedWallets: 0, isSoldOut: false },
  { id: 6, price: 303.57, maxWallets: 33, ordinals: 66, mintedWallets: 0, isSoldOut: false },
  { id: 7, price: 314.29, maxWallets: 33, ordinals: 66, mintedWallets: 0, isSoldOut: false },
  { id: 8, price: 325.00, maxWallets: 33, ordinals: 66, mintedWallets: 0, isSoldOut: false },
  { id: 9, price: 335.71, maxWallets: 33, ordinals: 66, mintedWallets: 0, isSoldOut: false },
  { id: 10, price: 346.43, maxWallets: 33, ordinals: 66, mintedWallets: 0, isSoldOut: false },
  { id: 11, price: 357.14, maxWallets: 33, ordinals: 66, mintedWallets: 0, isSoldOut: false },
  { id: 12, price: 367.86, maxWallets: 33, ordinals: 66, mintedWallets: 0, isSoldOut: false },
  { id: 13, price: 378.57, maxWallets: 33, ordinals: 66, mintedWallets: 0, isSoldOut: false },
  { id: 14, price: 389.29, maxWallets: 33, ordinals: 66, mintedWallets: 0, isSoldOut: false },
  { id: 15, price: 400.00, maxWallets: 33, ordinals: 66, mintedWallets: 0, isSoldOut: false },
  { id: 16, price: 450.00, maxWallets: 33, ordinals: 66, mintedWallets: 0, isSoldOut: false }
];

export async function GET() {
  try {
    // Initialize storage (clear all tables)
    await initializeStorage();

    // Create tables if they don't exist
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        btc_address VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        total_price DECIMAL(20,8) NOT NULL,
        total_price_usd DECIMAL(10,2) NOT NULL,
        price_per_unit DECIMAL(10,2) NOT NULL,
        price_per_unit_btc DECIMAL(20,8) NOT NULL,
        batch_id INTEGER NOT NULL,
        payment_address VARCHAR(255) NOT NULL,
        payment_reference VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS batches (
        id INTEGER PRIMARY KEY,
        price DECIMAL(10,2) NOT NULL,
        minted_wallets INTEGER NOT NULL DEFAULT 0,
        max_wallets INTEGER NOT NULL,
        ordinals INTEGER NOT NULL,
        is_sold_out BOOLEAN NOT NULL DEFAULT FALSE
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS whitelist (
        address VARCHAR(255) PRIMARY KEY,
        batch_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS minted_wallets (
        address VARCHAR(255) NOT NULL,
        batch_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (address, batch_id)
      );
    `;

    // Import default batches
    for (const batch of defaultBatches) {
      await sql`
        INSERT INTO batches (id, price, minted_wallets, max_wallets, ordinals, is_sold_out)
        VALUES (${batch.id}, ${batch.price}, ${batch.mintedWallets}, ${batch.maxWallets}, ${batch.ordinals}, ${batch.isSoldOut})
        ON CONFLICT (id) DO UPDATE SET
          price = EXCLUDED.price,
          max_wallets = EXCLUDED.max_wallets,
          ordinals = EXCLUDED.ordinals
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully'
    });
  } catch (error: any) {
    console.error('Error initializing database:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 