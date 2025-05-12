import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
  try {
    // Verify the secret key to prevent unauthorized access
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (key !== process.env.BACKUP_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all data from the database
    const [orders, batches, whitelist, mintedWallets, batchSoldOutTimes, mintStart] = await Promise.all([
      sql`SELECT * FROM orders ORDER BY created_at DESC`,
      sql`SELECT * FROM batches ORDER BY id`,
      sql`SELECT * FROM whitelist ORDER BY created_at`,
      sql`SELECT * FROM minted_wallets ORDER BY timestamp`,
      sql`SELECT * FROM batch_sold_out_times ORDER BY batch_id`,
      sql`SELECT * FROM mint_start WHERE id = 1`
    ]);

    // Create backup object
    const backup = {
      timestamp: new Date().toISOString(),
      data: {
        orders: orders.rows,
        batches: batches.rows,
        whitelist: whitelist.rows,
        mintedWallets: mintedWallets.rows,
        batchSoldOutTimes: batchSoldOutTimes.rows,
        mintStart: mintStart.rows[0]
      }
    };

    return NextResponse.json({ 
      success: true, 
      message: 'Backup completed',
      backup 
    });
  } catch (error) {
    console.error('Backup failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Backup failed' 
    }, { status: 500 });
  }
} 