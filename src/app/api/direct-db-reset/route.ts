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
    
    console.log('🔍 FULL DATABASE RESET INITIATED - EXTREME EMERGENCY SOLUTION');
    
    // Query alle tabellen voor diagnostiek
    try {
      const { rows: tables } = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      
      console.log('📊 Database tables found:', tables.map(t => t.table_name).join(', '));
      
      // Get batch info before reset
      const { rows: batchesBefore } = await sql`SELECT * FROM batches WHERE id = 1`;
      console.log('Database status voor reset - Batch 1:', JSON.stringify(batchesBefore, null, 2));
      
      const { rows: currentBatchBefore } = await sql`SELECT * FROM current_batch`;
      console.log('Database status voor reset - Current batch:', JSON.stringify(currentBatchBefore, null, 2));
      
      const { rows: mintedWalletsBefore } = await sql`SELECT COUNT(*) as count FROM minted_wallets WHERE batch_id = 1`;
      console.log(`Database status voor reset - Minted wallets voor batch 1: ${mintedWalletsBefore[0]?.count || 0}`);
    } catch (error) {
      console.error('Error tijdens pre-reset diagnostiek:', error);
    }
    
    // Stap 1: Update batches tabel - reset batch 1
    try {
      await sql`
        UPDATE batches 
        SET is_sold_out = false, 
            minted_tigers = 0, 
            minted_wallets = 0
        WHERE id = 1
      `;
      console.log('✅ Stap 1: Batch 1 reset in batches tabel');
    } catch (error) {
      console.error('❌ Error tijdens update batches tabel:', error);
    }
    
    // Stap 2: Reset current_batch tabel
    try {
      await sql`
        UPDATE current_batch 
        SET current_batch = 1, 
            sold_out_at = NULL
      `;
      console.log('✅ Stap 2: Current batch reset naar batch 1');
    } catch (error) {
      console.error('❌ Error tijdens update current_batch tabel:', error);
    }
    
    // Stap 3: Verwijder alle minted wallets voor batch 1
    try {
      await sql`
        DELETE FROM minted_wallets 
        WHERE batch_id = 1
      `;
      console.log('✅ Stap 3: Alle minted wallets voor batch 1 verwijderd');
    } catch (error) {
      console.error('❌ Error tijdens verwijderen minted_wallets:', error);
    }
    
    // Stap 4: Verwijder alle orders voor batch 1
    try {
      await sql`
        DELETE FROM orders 
        WHERE batch_id = 1
      `;
      console.log('✅ Stap 4: Alle orders voor batch 1 verwijderd');
    } catch (error) {
      console.error('❌ Error tijdens verwijderen orders:', error);
    }
    
    // Controleer de status na alle updates
    try {
      const { rows: batchesAfter } = await sql`SELECT * FROM batches WHERE id = 1`;
      console.log('Database status na reset - Batch 1:', JSON.stringify(batchesAfter, null, 2));
      
      const { rows: currentBatchAfter } = await sql`SELECT * FROM current_batch`;
      console.log('Database status na reset - Current batch:', JSON.stringify(currentBatchAfter, null, 2));
      
      const { rows: mintedWalletsAfter } = await sql`SELECT COUNT(*) as count FROM minted_wallets WHERE batch_id = 1`;
      console.log(`Database status na reset - Minted wallets voor batch 1: ${mintedWalletsAfter[0]?.count || 0}`);
      
      const { rows: ordersAfter } = await sql`SELECT COUNT(*) as count FROM orders WHERE batch_id = 1`;
      console.log(`Database status na reset - Orders voor batch 1: ${ordersAfter[0]?.count || 0}`);
    } catch (error) {
      console.error('Error tijdens post-reset diagnostiek:', error);
    }
    
    return NextResponse.json({
      success: true,
      message: 'COMPLETE DATABASE RESET SUCCESSFUL - All batch 1 data has been reset',
      resetTime: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('❌ Fatal error during database reset:', error);
    return NextResponse.json({ 
      error: 'An error occurred during full database reset',
      details: error.message
    }, { status: 500 });
  }
} 