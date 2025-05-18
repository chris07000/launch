import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Haal bestaande batches op
    const { rows: batches } = await sql`SELECT * FROM batches ORDER BY id`;
    
    // Update alle batches met maxWallets = 999
    for (const batch of batches) {
      await sql`
        UPDATE batches
        SET max_wallets = 999
        WHERE id = ${batch.id}
      `;
    }
    
    // Confirmatie
    const { rows: updatedBatches } = await sql`SELECT * FROM batches ORDER BY id`;
    
    return NextResponse.json({
      success: true,
      message: `Alle batches zijn bijgewerkt, maxWallets is nu 999 voor ${updatedBatches.length} batches`,
      batches: updatedBatches
    });
  } catch (error: any) {
    console.error('Error updating batches:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 