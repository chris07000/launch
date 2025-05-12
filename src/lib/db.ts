import { sql } from '@vercel/postgres';
import { Order, Batch, WhitelistEntry, MintedWallet } from './types';

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Create orders table
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

    // Create batches table
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

    // Create whitelist table
    await sql`
      CREATE TABLE IF NOT EXISTS whitelist (
        address VARCHAR(255) PRIMARY KEY,
        batch_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create minted_wallets table
    await sql`
      CREATE TABLE IF NOT EXISTS minted_wallets (
        address VARCHAR(255) NOT NULL,
        batch_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (address, batch_id)
      );
    `;

    // Create batch_sold_out_times table
    await sql`
      CREATE TABLE IF NOT EXISTS batch_sold_out_times (
        batch_id INTEGER PRIMARY KEY,
        sold_out_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create mint_start table
    await sql`
      CREATE TABLE IF NOT EXISTS mint_start (
        id INTEGER PRIMARY KEY DEFAULT 1,
        start_time TIMESTAMP
      );
    `;

    // Create used_transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS used_transactions (
        tx_id VARCHAR(255) PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL,
        amount DECIMAL(20,8) NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
} 