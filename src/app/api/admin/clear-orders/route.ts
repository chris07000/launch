import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

// Voeg deze route toe als een extra optie om orders te wissen
export async function POST(request: Request) {
  try {
    console.log('EMERGENCY ORDER CLEAR: Clearing orders table directly with SQL...');
    
    // Gebruik directe SQL om zeker te zijn dat alles wordt gewist
    try {
      await sql`TRUNCATE orders RESTART IDENTITY CASCADE`;
      console.log('Orders table TRUNCATED successfully');
    } catch (sqlError) {
      console.error('Error truncating orders table:', sqlError);
      return NextResponse.json({ error: `Error truncating orders: ${sqlError}` }, { status: 500 });
    }
    
    // Als backup ook DELETE proberen
    try {
      await sql`DELETE FROM orders`;
      console.log('All records deleted from orders table');
    } catch (sqlError) {
      console.error('Error deleting from orders table:', sqlError);
      // Continue anyway
    }
    
    // Controleer of er echt geen orders meer zijn
    try {
      const { rows } = await sql`SELECT COUNT(*) as count FROM orders`;
      console.log(`Remaining orders count: ${rows[0].count}`);
      
      return NextResponse.json({ 
        success: true, 
        message: 'All orders cleared successfully', 
        remainingOrdersCount: rows[0].count 
      });
    } catch (sqlError) {
      console.error('Error checking remaining orders:', sqlError);
      return NextResponse.json({ 
        success: true, 
        warning: 'Orders may have been cleared but failed to verify count',
        error: `${sqlError}`
      });
    }
  } catch (error: any) {
    console.error('Unexpected error in clear-orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 