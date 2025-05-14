import { NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Beveilig de URL met een token parameter - moet worden opgegeven in de URL
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const resetToken = process.env.ADMIN_PASSWORD; // Gebruik het admin password als token
    
    if (!token || token !== resetToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Direct SQL gebruiken voor extra zekerheid
    try {
      // 1. Reset eerst batch 1 in de batches tabel
      await sql`
        UPDATE batches 
        SET is_sold_out = false, minted_tigers = 0, minted_wallets = 0
        WHERE id = 1;
      `;
      
      console.log('Database direct update: Reset batch 1 via SQL');
      
      // 2. Reset current_batch tabel
      await sql`
        UPDATE current_batch 
        SET current_batch = 1, sold_out_at = NULL;
      `;
      
      console.log('Database direct update: Reset current batch via SQL');
      
      // 3. Eventuele minted wallets voor batch 1 verwijderen
      await sql`
        DELETE FROM minted_wallets 
        WHERE batch_id = 1;
      `;
      
      console.log('Database direct update: Removed minted wallets for batch 1 via SQL');
    } catch (sqlError) {
      console.error('SQL error tijdens reset:', sqlError);
    }
    
    // 4. Voor alle zekerheid ook via storage wrappers updaten
    // Batches ophalen
    const batches = await storage.getBatches();
    
    // Batch 1 vinden en resetten
    const batch1Index = batches.findIndex(b => b.id === 1);
    
    if (batch1Index === -1) {
      return NextResponse.json({ error: 'Batch 1 not found' }, { status: 404 });
    }
    
    // Batch 1 updaten naar 0 tigers en niet sold out
    batches[batch1Index].mintedTigers = 0;
    batches[batch1Index].mintedWallets = 0;
    batches[batch1Index].isSoldOut = false;
    
    // Opslaan van de batches
    const batchesResult = await storage.saveBatches(batches);
    
    // Huidige batch info ophalen
    const { currentBatch, soldOutAt } = await storage.getCurrentBatch();
    
    // Sold out time resetten
    let currentBatchResult = true;
    if (soldOutAt !== null || currentBatch !== 1) {
      currentBatchResult = await storage.saveCurrentBatch({
        currentBatch: 1,
        soldOutAt: null
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Batch 1 has been reset to 0 tigers and is no longer marked as sold out',
      batchesUpdated: batchesResult,
      currentBatchUpdated: currentBatchResult,
      directSqlUpdated: true
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('Error in batch force reset:', error);
    return NextResponse.json({ 
      error: 'An error occurred while resetting batch 1',
      details: error.message
    }, { status: 500 });
  }
} 