import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    console.log('Retrieving direct database status...');
    
    const result: any = {
      database_direct_check: true,
      tables: {}
    };
    
    // Direct orders tellen met SQL
    try {
      const { rows: orderRows } = await sql`SELECT COUNT(*) as count FROM orders`;
      result.tables.orders = {
        count: parseInt(orderRows[0].count),
        status: 'checked'
      };
      
      // Als er orders zijn, haal de eerste 5 op om te zien wat erin zit
      if (parseInt(orderRows[0].count) > 0) {
        const { rows: orderSamples } = await sql`SELECT * FROM orders LIMIT 5`;
        result.tables.orders.samples = orderSamples;
      }
    } catch (error) {
      result.tables.orders = {
        error: `${error}`,
        status: 'error'
      };
    }
    
    // Direct minted_wallets tellen met SQL
    try {
      const { rows: walletRows } = await sql`SELECT COUNT(*) as count FROM minted_wallets`;
      result.tables.minted_wallets = {
        count: parseInt(walletRows[0].count),
        status: 'checked'
      };
    } catch (error) {
      result.tables.minted_wallets = {
        error: `${error}`,
        status: 'error'
      };
    }
    
    // Direct batches tellen en nakijken met SQL
    try {
      const { rows: batchRows } = await sql`SELECT * FROM batches ORDER BY id`;
      result.tables.batches = {
        count: batchRows.length,
        status: 'checked',
        data: batchRows.map(row => ({
          id: row.id,
          mintedWallets: row.minted_wallets,
          price: row.price
        }))
      };
    } catch (error) {
      result.tables.batches = {
        error: `${error}`,
        status: 'error'
      };
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in db-status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 