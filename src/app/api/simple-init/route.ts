export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { sql } from '@vercel/postgres';
import * as storage from '@/lib/storage-wrapper-db-only';

export async function GET() {
  try {
    console.log('Starting database initialization...');
    
    try {
      // Test database connection first
      const testResult = await sql`SELECT NOW() as time`;
      console.log('Database connection successful:', testResult.rows[0].time);
    
      // Create tables
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
      
      // 3. Check if current_batch has data and insert if needed
      const batchResult = await sql`SELECT COUNT(*) as count FROM current_batch`;
      if (parseInt(batchResult.rows[0].count) === 0) {
        await sql`INSERT INTO current_batch (current_batch, sold_out_at) VALUES (1, NULL)`;
        console.log('Inserted default current batch data');
      }
      
      // 4. Check batches and insert default data if empty
      const batchesResult = await sql`SELECT COUNT(*) as count FROM batches`;
      if (parseInt(batchesResult.rows[0].count) === 0) {
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
                 (8, 325.00, 0, 33, 66, false)
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
      
      return new Response(JSON.stringify({
        status: 'success',
        message: 'Database initialized successfully',
        tables,
        timestamp: new Date().toISOString()
      }), {
        headers: {
          'content-type': 'application/json'
        }
      });
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Database error',
        error: dbError.message || String(dbError),
        timestamp: new Date().toISOString()
      }), { status: 500, headers: { 'content-type': 'application/json' } });
    }
  } catch (error: any) {
    console.error('Error initializing database:', error);
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Failed to initialize database',
      error: error.message || String(error),
      timestamp: new Date().toISOString()
    }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
} 