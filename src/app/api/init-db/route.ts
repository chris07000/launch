import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Starting database initialization...');
    
    try {
      // Test database connection first
      const testResult = await sql`SELECT NOW() as time`;
      console.log('Database connection successful:', testResult.rows[0].time);
    
      // Create the tables
      // 1. Create current_batch table
      await sql`
        CREATE TABLE IF NOT EXISTS current_batch (
          id SERIAL PRIMARY KEY,
          current_batch INTEGER NOT NULL DEFAULT 1,
          sold_out_at TIMESTAMP
        )
      `;
      console.log('Created current_batch table');
      
      // 2. Create batches table
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
      console.log('Created batches table');
      
      // 3. Create orders table
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
      console.log('Created orders table');
      
      // 4. Create whitelist table
      await sql`
        CREATE TABLE IF NOT EXISTS whitelist (
          address TEXT PRIMARY KEY,
          batch_id INTEGER NOT NULL,
          created_at TEXT NOT NULL
        )
      `;
      console.log('Created whitelist table');
      
      // 5. Create minted_wallets table
      await sql`
        CREATE TABLE IF NOT EXISTS minted_wallets (
          id SERIAL PRIMARY KEY,
          address TEXT NOT NULL,
          batch_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          timestamp TEXT NOT NULL
        )
      `;
      console.log('Created minted_wallets table');
      
      // 6. Create used_transactions table
      await sql`
        CREATE TABLE IF NOT EXISTS used_transactions (
          tx_id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          timestamp TIMESTAMP NOT NULL
        )
      `;
      console.log('Created used_transactions table');
      
      // Check if current_batch has data and insert if needed
      const batchResult = await sql`SELECT COUNT(*) as count FROM current_batch`;
      if (batchResult.rows[0].count === 0) {
        await sql`INSERT INTO current_batch (current_batch, sold_out_at) VALUES (1, NULL)`;
        console.log('Inserted default current batch data');
      }
      
      // Check batches and insert default data if empty
      const batchesResult = await sql`SELECT COUNT(*) as count FROM batches`;
      if (batchesResult.rows[0].count === 0) {
        // Insert default batches
        await sql`
          INSERT INTO batches (id, price, minted_wallets, max_wallets, ordinals, is_sold_out)
          VALUES (1, 250.00, 0, 33, 66, false),
                 (2, 260.71, 0, 33, 66, false),
                 (3, 271.43, 0, 33, 66, false),
                 (4, 282.14, 0, 33, 66, false),
                 (5, 292.86, 0, 33, 66, false),
                 (6, 303.57, 0, 33, 66, false),
                 (7, 314.29, 0, 33, 66, false),
                 (8, 325.00, 0, 33, 66, false),
                 (9, 335.71, 0, 33, 66, false),
                 (10, 346.43, 0, 33, 66, false),
                 (11, 357.14, 0, 33, 66, false),
                 (12, 367.86, 0, 33, 66, false),
                 (13, 378.57, 0, 33, 66, false),
                 (14, 389.29, 0, 33, 66, false),
                 (15, 400.00, 0, 33, 66, false),
                 (16, 450.00, 0, 33, 66, false)
        `;
        console.log('Inserted default batches data');
      }
      
      // Get the list of tables for the response
      const tablesResult = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      const tables = tablesResult.rows.map(row => row.table_name);
      
      return NextResponse.json({
        status: 'success',
        message: 'Database initialized successfully',
        tables,
        timestamp: new Date().toISOString()
      });
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      return NextResponse.json({
        status: 'error',
        message: 'Database error',
        error: dbError.message || String(dbError),
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error initializing database:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to initialize database',
      error: error.message || String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 