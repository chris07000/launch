import { NextRequest, NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const password = searchParams.get('password');

    // Password protection
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Haal alle batches op
    const batches = await storage.getBatches();
    
    // Haal geminte wallets op
    const mintedWallets = await storage.getMintedWallets();
    
    // Bijhouden welke batches zijn bijgewerkt
    const batchUpdates = [];
    
    // Loop door elke batch
    for (const batch of batches) {
      // Tel het aantal mints voor deze batch
      let totalMintsForBatch = 0;
      mintedWallets.forEach(wallet => {
        if (wallet.batchId === batch.id) {
          totalMintsForBatch += wallet.quantity;
        }
      });
      
      // Als mintedTigers niet gelijk is aan de getelde mints, werk dan bij
      const oldTigersValue = batch.mintedTigers !== undefined ? batch.mintedTigers : 0;
      if (oldTigersValue !== totalMintsForBatch) {
        batch.mintedTigers = totalMintsForBatch;
        console.log(`[FIX] Updating batch ${batch.id} mintedTigers: ${oldTigersValue} → ${totalMintsForBatch}`);
        batchUpdates.push({
          batchId: batch.id,
          oldValue: oldTigersValue,
          newValue: totalMintsForBatch
        });
      }
    }
    
    // Als er wijzigingen zijn, sla de batches op
    if (batchUpdates.length > 0) {
      await storage.saveBatches(batches);
      return NextResponse.json({
        success: true,
        message: `Updated mintedTigers for ${batchUpdates.length} batches`,
        updates: batchUpdates
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'No batches needed updating'
      });
    }
  } catch (error: any) {
    console.error('Error fixing progress counters:', error);
    return NextResponse.json({ 
      error: 'Failed to fix progress counters',
      details: error.message
    }, { status: 500 });
  }
} 