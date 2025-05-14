import { NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Beveilig de URL met een token parameter
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const resetToken = process.env.ADMIN_PASSWORD;
    
    if (!token || token !== resetToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // EMERGENCY RESET: Alle tabellen direct via SQL opnieuw instellen

    try {
      console.log('🚨 STARTING EMERGENCY DATABASE RESET 🚨');
      
      // 1. BATCH TABEL
      await sql`
        UPDATE batches 
        SET is_sold_out = false, minted_tigers = 0, minted_wallets = 0
        WHERE id = 1;
      `;
      console.log('✅ Reset batches tabel voor batch 1');
      
      // 2. CURRENT BATCH TABEL
      await sql`
        UPDATE current_batch 
        SET current_batch = 1, sold_out_at = NULL;
      `;
      console.log('✅ Reset current_batch tabel');
      
      // 3. MINTED WALLETS TABEL
      await sql`
        DELETE FROM minted_wallets 
        WHERE batch_id = 1;
      `;
      console.log('✅ Verwijderde minted wallets voor batch 1');
      
      // 4. WHITELIST INFO OPHALEN
      const { rows: whitelist } = await sql`SELECT * FROM whitelist`;
      console.log(`ℹ️ Whitelist bevat ${whitelist.length} entries`);
      
      // 5. ALLE TABELLEN EXTRA DIAGNOSTIEK
      const { rows: batches } = await sql`SELECT * FROM batches`;
      console.log('ℹ️ Batches table content:', JSON.stringify(batches, null, 2));
      
      const { rows: currentBatch } = await sql`SELECT * FROM current_batch`;
      console.log('ℹ️ Current batch table content:', JSON.stringify(currentBatch, null, 2));
      
      const { rows: mintedWallets } = await sql`SELECT * FROM minted_wallets`;
      console.log('ℹ️ Minted wallets table content:', JSON.stringify(mintedWallets, null, 2));
      
      console.log('🚨 EMERGENCY DATABASE RESET COMPLETED 🚨');
    } catch (sqlError) {
      console.error('🔴 Critical SQL error during emergency reset:', sqlError);
      return NextResponse.json({ 
        success: false, 
        error: 'Critical SQL error during reset',
        details: sqlError instanceof Error ? sqlError.message : String(sqlError)
      }, { status: 500 });
    }
    
    // Ook via storage wrappers voor extra zekerheid
    try {
      // Eerst de huidige batches ophalen
      const batches = await storage.getBatches();
      console.log('ℹ️ Batch info from storage wrapper:', JSON.stringify(batches, null, 2));
      
      // Batch 1 resetten
      const batch1Index = batches.findIndex(b => b.id === 1);
      if (batch1Index !== -1) {
        batches[batch1Index].mintedTigers = 0;
        batches[batch1Index].mintedWallets = 0;
        batches[batch1Index].isSoldOut = false;
        await storage.saveBatches(batches);
        console.log('✅ Reset batch 1 via storage wrapper');
      } else {
        console.warn('⚠️ Batch 1 niet gevonden in storage wrapper');
      }
      
      // De current batch resetten
      await storage.saveCurrentBatch({
        currentBatch: 1,
        soldOutAt: null
      });
      console.log('✅ Reset current batch via storage wrapper');
      
      // Minted wallets resetten
      const mintedWallets = await storage.getMintedWallets();
      const filteredWallets = mintedWallets.filter(w => w.batchId !== 1);
      await storage.saveMintedWallets(filteredWallets);
      console.log('✅ Removed batch 1 minted wallets via storage wrapper');
    } catch (storageError) {
      console.error('🟠 Error tijdens storage wrapper reset:', storageError);
      // We gaan door zelfs als er een fout is met de storage wrappers
    }
    
    return NextResponse.json({
      success: true,
      message: 'EMERGENCY RESET COMPLETED - Database is now in clean state',
      instructions: 'Please refresh your browser or restart the application to see changes'
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('🔴 General error in emergency reset:', error);
    return NextResponse.json({ 
      error: 'An error occurred during emergency database reset',
      details: error.message
    }, { status: 500 });
  }
} 