import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const address = url.searchParams.get('address') || 'bc1p56aezm44a9yvnrkx0eduqrgf7rdjl6l7fnv0at3wm9stt36hfvaqjwqda8';
    
    // Eenvoudige beveiliging: lange unieke string als token
    if (token !== 'bitcointigers2024-emergency-fix') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const results = {
      steps: [] as string[],
      success: false,
    };
    
    // STAP 1: Reset batch 1 status
    try {
      await sql`UPDATE batches SET is_sold_out = false, minted_wallets = 0, minted_tigers = 0 WHERE id = 1`;
      results.steps.push('✅ Reset batch 1 status');
    } catch (error) {
      results.steps.push(`❌ Error resetting batch 1: ${error}`);
    }
    
    // STAP 2: Reset current_batch
    try {
      await sql`UPDATE current_batch SET sold_out_at = NULL WHERE current_batch = 1`;
      results.steps.push('✅ Reset current batch sold_out_at');
    } catch (error) {
      results.steps.push(`❌ Error resetting current_batch: ${error}`);
    }
    
    // STAP 3: Controleer of wallet al in whitelist staat
    try {
      const { rows } = await sql`SELECT * FROM whitelist WHERE address = ${address}`;
      
      if (rows.length > 0) {
        results.steps.push(`ℹ️ Address ${address} is already in whitelist for batch ${rows[0].batch_id}`);
      } else {
        // STAP 4: Voeg wallet toe aan whitelist als hij er nog niet in staat
        await sql`
          INSERT INTO whitelist (address, batch_id, created_at)
          VALUES (${address}, 1, ${new Date().toISOString()})
        `;
        results.steps.push(`✅ Added address ${address} to whitelist for batch 1`);
      }
      
      // Dubbele check of wallet nu in whitelist staat
      const { rows: checkRows } = await sql`SELECT * FROM whitelist WHERE address = ${address}`;
      if (checkRows.length > 0) {
        results.steps.push(`✅ VERIFIED: Address ${address} is in whitelist for batch ${checkRows[0].batch_id}`);
      } else {
        results.steps.push(`❌ ERROR: Address ${address} is STILL NOT in whitelist after insert attempt!`);
      }
    } catch (error) {
      results.steps.push(`❌ Error managing whitelist: ${error}`);
    }
    
    // STAP 5: Controleer of er überhaupt whitelisted wallets zijn
    try {
      const { rows } = await sql`SELECT COUNT(*) as count FROM whitelist`;
      results.steps.push(`ℹ️ Total whitelist entries: ${rows[0].count}`);
    } catch (error) {
      results.steps.push(`❌ Error counting whitelist: ${error}`);
    }
    
    results.success = !results.steps.some(step => step.includes('❌'));
    
    return NextResponse.json({
      success: results.success,
      message: 'Emergency fix completed',
      details: results.steps
    });
  } catch (error) {
    console.error('Error in emergency fix:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 