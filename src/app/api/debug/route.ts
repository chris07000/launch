import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Add export keyword to make it a proper Next.js API route
export async function GET(request: Request) {
  try {
    // Test database connection
    const dbTest = await sql`SELECT NOW();`;
    
    // Get table information
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;

    // Get counts from each table
    const [
      ordersCount,
      batchesCount,
      whitelistCount,
      mintedWalletsCount
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM orders`,
      sql`SELECT COUNT(*) as count FROM batches`,
      sql`SELECT COUNT(*) as count FROM whitelist`,
      sql`SELECT COUNT(*) as count FROM minted_wallets`
    ]);

    return NextResponse.json({
      status: 'connected',
      timestamp: dbTest.rows[0].now,
      tables: tables.rows.map(row => row.table_name),
      counts: {
        orders: ordersCount.rows[0].count,
        batches: batchesCount.rows[0].count,
        whitelist: whitelistCount.rows[0].count,
        mintedWallets: mintedWalletsCount.rows[0].count
      }
    });
  } catch (error: any) {
    console.error('Database connection error:', error);
    return NextResponse.json({
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
} 