import { NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Debug alles wat er binnenkomt
    console.log('🔍 BATCH FORCE RESET API AANGEROEPEN');
    
    // Beveilig de URL met een token parameter - moet worden opgegeven in de URL
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const resetToken = process.env.ADMIN_PASSWORD; // Gebruik het admin password als token
    
    console.log(`Token from request: ${token?.substring(0, 3)}...`);
    console.log(`Expected token: ${resetToken?.substring(0, 3)}...`);
    
    if (!token || token !== resetToken) {
      console.log('⚠️ Ongeldige token voor batch reset');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    console.log('⚠️ EMERGENCY RESET: Alle tabellen direct via SQL opnieuw instellen');
    
    // Directe SQL opvragen voor diagnostiek
    try {
      const { rows: batchesBefore } = await sql`SELECT * FROM batches WHERE id = 1`;
      console.log('Database check - Batch 1 vóór reset:', JSON.stringify(batchesBefore, null, 2));
      
      const { rows: currentBatchBefore } = await sql`SELECT * FROM current_batch`;
      console.log('Database check - Current batch vóór reset:', JSON.stringify(currentBatchBefore, null, 2));
    } catch (error) {
      console.error('Fout bij diagnostiek queries:', error);
    }
    
    // Direct SQL gebruiken voor extra zekerheid
    try {
      // 1. Reset eerst batch 1 in de batches tabel
      await sql`
        UPDATE batches 
        SET is_sold_out = false, minted_tigers = 0, minted_wallets = 0
        WHERE id = 1;
      `;
      
      console.log('✅ Database direct update: Reset batch 1 via SQL');
      
      // 2. Reset current_batch tabel
      await sql`
        UPDATE current_batch 
        SET current_batch = 1, sold_out_at = NULL;
      `;
      
      console.log('✅ Database direct update: Reset current batch via SQL');
      
      // 3. Eventuele minted wallets voor batch 1 verwijderen
      await sql`
        DELETE FROM minted_wallets 
        WHERE batch_id = 1;
      `;
      
      console.log('✅ Database direct update: Removed minted wallets for batch 1 via SQL');
      
      // Directe SQL opvragen om resultaat te bevestigen
      const { rows: batchesAfter } = await sql`SELECT * FROM batches WHERE id = 1`;
      console.log('Database check - Batch 1 na reset:', JSON.stringify(batchesAfter, null, 2));
      
      const { rows: currentBatchAfter } = await sql`SELECT * FROM current_batch`;
      console.log('Database check - Current batch na reset:', JSON.stringify(currentBatchAfter, null, 2));
    } catch (sqlError) {
      console.error('❌ SQL error tijdens reset:', sqlError);
      return NextResponse.json({
        error: 'Database SQL error tijdens reset',
        details: sqlError instanceof Error ? sqlError.message : String(sqlError)
      }, { status: 500 });
    }
    
    // Controleer via storage wrappers of alles correct is
    try {
      // Alle batches ophalen
      const batches = await storage.getBatches();
      
      // Batch 1 vinden en controleren
      const batch1 = batches.find(b => b.id === 1);
      
      if (!batch1) {
        console.log('⚠️ Batch 1 niet gevonden via storage wrapper');
      } else {
        console.log(`Batch 1 via storage wrapper: isSoldOut=${batch1.isSoldOut}, mintedTigers=${batch1.mintedTigers}, mintedWallets=${batch1.mintedWallets}`);
        
        // Double-check of status correct is, anders nog een keer updaten
        if (batch1.isSoldOut || (batch1.mintedTigers ?? 0) > 0 || batch1.mintedWallets > 0) {
          console.log('⚠️ Storage wrapper toont nog oude waarden, forceer update');
          
          batch1.isSoldOut = false;
          batch1.mintedTigers = 0;
          batch1.mintedWallets = 0;
          
          await storage.saveBatches(batches);
          console.log('✅ Batch 1 geforceerd geupdate via storage wrapper');
        }
      }
      
      // Current batch controleren
      const { currentBatch, soldOutAt } = await storage.getCurrentBatch();
      console.log(`Current batch via storage wrapper: currentBatch=${currentBatch}, soldOutAt=${soldOutAt}`);
      
      // Double-check of status correct is, anders nog een keer updaten
      if (currentBatch !== 1 || soldOutAt !== null) {
        console.log('⚠️ Current batch status incorrect, forceer update');
        
        await storage.saveCurrentBatch({
          currentBatch: 1,
          soldOutAt: null
        });
        
        console.log('✅ Current batch geforceerd geupdate via storage wrapper');
      }
    } catch (storageError) {
      console.error('❌ Error tijdens storage wrapper checks:', storageError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Batch 1 has been reset to 0 tigers and is no longer marked as sold out',
      resetTime: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('❌ General error in batch force reset:', error);
    return NextResponse.json({ 
      error: 'An error occurred while resetting batch 1',
      details: error.message
    }, { status: 500 });
  }
} 