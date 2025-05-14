import { NextRequest, NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const password = searchParams.get('password');

    // Password protection
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // STAP 1: Direct SQL gebruiken om exact te zien wat er in de database staat
    console.log("FASE 1: Directe database raadpleging");
    const { rows: batchesRaw } = await sql`SELECT * FROM batches ORDER BY id`;
    console.log("Batches uit database:", batchesRaw);
    
    const { rows: mintedWalletsRaw } = await sql`SELECT * FROM minted_wallets ORDER BY batch_id, address`;
    console.log("Geminte wallets uit database:", mintedWalletsRaw);
    
    // STAP 2: Alle counts aan de database kant berekenen
    console.log("FASE 2: Calculaties aan de database kant");
    let totalMintsPerBatch = {};
    mintedWalletsRaw.forEach(wallet => {
      const batchId = wallet.batch_id;
      const quantity = wallet.quantity || 1; // Default naar 1 als quantity niet bestaat
      
      if (!totalMintsPerBatch[batchId]) {
        totalMintsPerBatch[batchId] = 0;
      }
      
      totalMintsPerBatch[batchId] += quantity;
    });
    
    console.log("Berekende mints per batch:", totalMintsPerBatch);
    
    // STAP 3: FORCEER update van mintedTigers in de database
    console.log("FASE 3: Database updates uitvoeren");
    const updates = [];
    
    for (const batch of batchesRaw) {
      const batchId = batch.id;
      const currentMintedTigers = batch.minted_tigers || 0;
      const totalMints = totalMintsPerBatch[batchId] || 0;
      
      // FORCEREN: ongeacht of het al correct is, werk toch bij
      try {
        console.log(`Batch ${batchId}: update van ${currentMintedTigers} naar ${totalMints} (geforceerd)`);
        
        // Gebruik direct SQL om de waarde bij te werken
        await sql`
          UPDATE batches 
          SET minted_tigers = ${totalMints}
          WHERE id = ${batchId}
        `;
        
        updates.push({
          batchId,
          oldValue: currentMintedTigers,
          newValue: totalMints,
          forced: true
        });
      } catch (err) {
        console.error(`Fout bij update batch ${batchId}:`, err);
      }
    }
    
    // STAP 4: Verifieer dat de updates zijn toegepast
    console.log("FASE 4: Verificatie van updates");
    const { rows: updatedBatches } = await sql`SELECT * FROM batches ORDER BY id`;
    console.log("Bijgewerkte batches:", updatedBatches);
    
    return NextResponse.json({
      success: true,
      message: `Forced updates for ${updates.length} batches`,
      updates,
      originalBatches: batchesRaw,
      updatedBatches
    });
  } catch (error: any) {
    console.error('Error in force update endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to force update mintedTigers',
      details: error.message
    }, { status: 500 });
  }
} 