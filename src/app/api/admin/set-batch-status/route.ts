import { NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { batchId, mintedWallets, password } = body;
    
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    if (!batchId || mintedWallets === undefined) {
      return NextResponse.json({ error: 'batchId and mintedWallets are required' }, { status: 400 });
    }
    
    const batches = await storage.getBatches();
    const batchIndex = batches.findIndex(b => b.id === Number(batchId));
    
    if (batchIndex === -1) {
      return NextResponse.json({ error: `Batch ${batchId} not found` }, { status: 404 });
    }
    
    // Update de mintedWallets waarde
    const oldValue = batches[batchIndex].mintedWallets;
    batches[batchIndex].mintedWallets = Number(mintedWallets);
    
    // Als mintedWallets gelijk is aan maxWallets, markeer als soldOut
    if (Number(mintedWallets) >= batches[batchIndex].maxWallets) {
      batches[batchIndex].isSoldOut = true;
      console.log(`Batch ${batchId} is nu gemarkeerd als sold out`);
    } else {
      batches[batchIndex].isSoldOut = false;
    }
    
    await storage.saveBatches(batches);
    
    // Check of de huidige batch is gewijzigd en of die nu sold out is
    const { currentBatch, soldOutAt } = await storage.getCurrentBatch();
    
    // Als de huidige batch sold out is geworden, update de soldOutAt tijd
    if (Number(batchId) === currentBatch && batches[batchIndex].isSoldOut && !soldOutAt) {
      await storage.saveCurrentBatch({
        currentBatch,
        soldOutAt: Date.now()
      });
      console.log(`Current batch ${currentBatch} sold out time is set to now`);
    }
    
    return NextResponse.json({
      success: true,
      message: `Batch ${batchId} mintedWallets updated from ${oldValue} to ${mintedWallets}`,
      isSoldOut: batches[batchIndex].isSoldOut,
      maxWallets: batches[batchIndex].maxWallets
    });
  } catch (error: any) {
    console.error('Error in set-batch-status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 