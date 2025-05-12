import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const result = await sql`SELECT NOW()`;
    
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS current_batch (
        id SERIAL PRIMARY KEY,
        current_batch INTEGER NOT NULL DEFAULT 1,
        sold_out_at TIMESTAMP
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS batches (
        id INTEGER PRIMARY KEY,
        price NUMERIC NOT NULL,
        minted_wallets INTEGER DEFAULT 0,
        max_wallets INTEGER NOT NULL,
        ordinals INTEGER NOT NULL,
        is_sold_out BOOLEAN DEFAULT FALSE,
        is_fcfs BOOLEAN DEFAULT FALSE
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        btc_address TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        total_price NUMERIC NOT NULL,
        total_price_usd NUMERIC NOT NULL,
        price_per_unit NUMERIC NOT NULL,
        price_per_unit_btc NUMERIC NOT NULL,
        batch_id INTEGER NOT NULL,
        payment_address TEXT NOT NULL,
        payment_reference TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS whitelist (
        address TEXT PRIMARY KEY,
        batch_id INTEGER NOT NULL,
        created_at TEXT NOT NULL
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS minted_wallets (
        id SERIAL PRIMARY KEY,
        address TEXT NOT NULL,
        batch_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        timestamp TEXT NOT NULL
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS used_transactions (
        tx_id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        timestamp TIMESTAMP NOT NULL
      )
    `;
    
    // Check if current_batch exists
    const { rows: countRows } = await sql`SELECT COUNT(*) as count FROM current_batch`;
    if (countRows[0].count === 0) {
      // Insert default values
      await sql`INSERT INTO current_batch (current_batch, sold_out_at) VALUES (1, NULL)`;
    }
    
    // Add default batches if needed
    const { rows: batchRows } = await sql`SELECT COUNT(*) as count FROM batches`;
    if (batchRows[0].count === 0) {
      // Insert default batches
      const defaultBatches = [
        { id: 1, price: 250.00, maxWallets: 33, ordinals: 66 },
        { id: 2, price: 260.71, maxWallets: 33, ordinals: 66 },
        { id: 3, price: 271.43, maxWallets: 33, ordinals: 66 },
        { id: 4, price: 282.14, maxWallets: 33, ordinals: 66 },
        { id: 5, price: 292.86, maxWallets: 33, ordinals: 66 },
        { id: 6, price: 303.57, maxWallets: 33, ordinals: 66 },
        { id: 7, price: 314.29, maxWallets: 33, ordinals: 66 },
        { id: 8, price: 325.00, maxWallets: 33, ordinals: 66 },
        { id: 9, price: 335.71, maxWallets: 33, ordinals: 66 },
        { id: 10, price: 346.43, maxWallets: 33, ordinals: 66 },
        { id: 11, price: 357.14, maxWallets: 33, ordinals: 66 },
        { id: 12, price: 367.86, maxWallets: 33, ordinals: 66 },
        { id: 13, price: 378.57, maxWallets: 33, ordinals: 66 },
        { id: 14, price: 389.29, maxWallets: 33, ordinals: 66 },
        { id: 15, price: 400.00, maxWallets: 33, ordinals: 66 },
        { id: 16, price: 450.00, maxWallets: 33, ordinals: 66 }
      ];
      
      for (const batch of defaultBatches) {
        await sql`
          INSERT INTO batches (id, price, minted_wallets, max_wallets, ordinals, is_sold_out, is_fcfs)
          VALUES (${batch.id}, ${batch.price}, 0, ${batch.maxWallets}, ${batch.ordinals}, false, false)
        `;
      }
    }
    
    // Get database tables
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const tables = tablesResult.rows.map(row => row.table_name);
    
    // All done
    return NextResponse.json({
      status: 'success',
      message: 'Database initialized successfully',
      timestamp: result.rows[0].now,
      tables
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Database initialization failed',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 