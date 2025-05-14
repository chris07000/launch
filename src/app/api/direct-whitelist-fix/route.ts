import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const address = url.searchParams.get('address') || 'bc1p56aezm44a9yvnrkx0eduqrgf7rdjl6l7fnv0at3wm9stt36hfvaqjwqda8';
    
    // FASE 1: Controleer de huidige database status
    const results = {
      steps: [] as string[],
      success: false,
      hardReset: false,
    };
    
    // Check whitelist tabel
    const whitelist = await sql`SELECT COUNT(*) as count FROM whitelist`;
    results.steps.push(`Huidige whitelist tabel heeft ${whitelist.rows[0].count} entries`);
    
    // Check of adres al in de whitelist staat
    const addressCheck = await sql`SELECT * FROM whitelist WHERE address = ${address}`;
    if (addressCheck.rows.length > 0) {
      results.steps.push(`Adres ${address} staat al in de whitelist voor batch ${addressCheck.rows[0].batch_id}`);
    } else {
      results.steps.push(`Adres ${address} is NIET gevonden in de whitelist`);
    }
    
    // Controleer batches tabel
    const batches = await sql`SELECT * FROM batches WHERE id = 1`;
    if (batches.rows.length > 0) {
      const batch = batches.rows[0];
      results.steps.push(`Batch 1 status: mintedWallets=${batch.minted_wallets}, mintedTigers=${batch.minted_tigers}, isSoldOut=${batch.is_sold_out}`);
    } else {
      results.steps.push(`Batch 1 niet gevonden in database!`);
    }
    
    // FASE 2: Toevoegen/updaten van wallet in whitelist
    try {
      await sql`
        INSERT INTO whitelist (address, batch_id, created_at)
        VALUES (${address}, 1, ${new Date().toISOString()})
        ON CONFLICT (address) DO UPDATE SET batch_id = 1, created_at = ${new Date().toISOString()}
      `;
      results.steps.push(`✅ Adres ${address} toegevoegd/geupdate in whitelist`);
      
      // Controleer of toevoeging is gelukt
      const checkAdd = await sql`SELECT * FROM whitelist WHERE address = ${address}`;
      if (checkAdd.rows.length > 0) {
        results.steps.push(`✅ Adres ${address} gevonden in whitelist na toevoegen`);
      } else {
        results.steps.push(`❌ Adres ${address} NIET gevonden in whitelist na toevoegen!`);
      }
    } catch (error: any) {
      results.steps.push(`❌ Fout bij toevoegen aan whitelist: ${error.message}`);
    }
    
    // FASE 3: Reset batch 1 status
    try {
      await sql`UPDATE batches SET is_sold_out = false, minted_wallets = 0, minted_tigers = 0 WHERE id = 1`;
      results.steps.push(`✅ Reset batch 1 counter en status`);
    } catch (error: any) {
      results.steps.push(`❌ Fout bij resetten van batch 1: ${error.message}`);
    }
    
    // FASE 4: Reset current_batch tabel
    try {
      await sql`UPDATE current_batch SET sold_out_at = NULL WHERE current_batch = 1`;
      results.steps.push(`✅ Reset current_batch tabel`);
    } catch (error: any) {
      results.steps.push(`❌ Fout bij resetten van current_batch: ${error.message}`);
    }
    
    // FASE 5: HARDE RESET - Als parameter reset=true is meegegeven
    if (url.searchParams.get('reset') === 'true') {
      results.hardReset = true;
      
      try {
        // Reset alle tabellen
        await sql`DELETE FROM minted_wallets`;
        results.steps.push(`✅ Alle minted wallets verwijderd`);
      } catch (error: any) {
        results.steps.push(`❌ Fout bij verwijderen van minted wallets: ${error.message}`);
      }
      
      try {
        // Reset batches
        await sql`UPDATE batches SET is_sold_out = false, minted_wallets = 0, minted_tigers = 0`;
        results.steps.push(`✅ Alle batches gereset`);
      } catch (error: any) {
        results.steps.push(`❌ Fout bij resetten van batches: ${error.message}`);
      }
    }
    
    // FASE 6: Controleer final state
    const finalWhitelist = await sql`SELECT COUNT(*) as count FROM whitelist`;
    results.steps.push(`Whitelist tabel heeft nu ${finalWhitelist.rows[0].count} entries`);
    
    // Check final state van het adres
    const finalAddressCheck = await sql`SELECT * FROM whitelist WHERE address = ${address}`;
    if (finalAddressCheck.rows.length > 0) {
      results.steps.push(`✅ EINDRESULTAAT: Adres ${address} staat in de whitelist voor batch ${finalAddressCheck.rows[0].batch_id}`);
    } else {
      results.steps.push(`❌ EINDRESULTAAT: Adres ${address} staat NIET in de whitelist!`);
    }
    
    results.success = !results.steps.some(step => step.includes('❌'));
    
    return NextResponse.json({
      success: results.success,
      message: 'Whitelist fix uitgevoerd',
      hardReset: results.hardReset,
      details: results.steps
    });
  } catch (error) {
    console.error('Error in direct whitelist fix:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 