import { NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { batchId, mintedTigers, password } = body;
    
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    if (mintedTigers === undefined) {
      return NextResponse.json({ error: 'mintedTigers is vereist' }, { status: 400 });
    }
    
    if (!batchId) {
      return NextResponse.json({ error: 'batchId is vereist' }, { status: 400 });
    }
    
    const batches = await storage.getBatches();
    const batchIndex = batches.findIndex(b => b.id === Number(batchId));
    
    if (batchIndex === -1) {
      return NextResponse.json({ error: `Batch ${batchId} niet gevonden` }, { status: 404 });
    }
    
    // Get current tiger count
    const oldTigers = batches[batchIndex].mintedTigers !== undefined 
      ? batches[batchIndex].mintedTigers 
      : batches[batchIndex].mintedWallets * 2;
    
    // Calculate if batch is full or almost full
    const totalTigersInBatch = batches[batchIndex].ordinals || 66;
    
    // Directe toewijzing van de opgegeven waarde zonder afrondingen
    // Gebruiker kan zelf kiezen of hij 65 of 66 wil instellen
    const actualTigers = Number(mintedTigers);
    
    // Bepaal isSoldOut op basis van of we het maximum aantal tigers hebben bereikt
    const isSoldOut = actualTigers >= totalTigersInBatch;
    
    // Update batch values - keep mintedWallets for backward compatibility
    batches[batchIndex].mintedWallets = Math.ceil(actualTigers / 2);
    batches[batchIndex].mintedTigers = actualTigers;
    batches[batchIndex].isSoldOut = isSoldOut;
    
    console.log(`Batch ${batchId}: exact op ${actualTigers}/${totalTigersInBatch} tigers gezet, isSoldOut: ${isSoldOut}`);
    
    await storage.saveBatches(batches);
    
    // Check current batch status
    const { currentBatch, soldOutAt } = await storage.getCurrentBatch();
    
    // Update sold out time if needed
    if (Number(batchId) === currentBatch && batches[batchIndex].isSoldOut && !soldOutAt) {
      await storage.saveCurrentBatch({
        currentBatch,
        soldOutAt: Date.now()
      });
      console.log(`Current batch ${currentBatch} sold out time is set to now`);
    } 
    // Reset sold out time if batch is not sold out anymore
    else if (Number(batchId) === currentBatch && !batches[batchIndex].isSoldOut && soldOutAt) {
      await storage.saveCurrentBatch({
        currentBatch,
        soldOutAt: null
      });
      console.log(`Current batch ${currentBatch} sold out time is reset`);
    }
    
    // Return success response with tiger-only data
    return NextResponse.json(
      {
        success: true,
        message: `Batch ${batchId} updated to ${mintedTigers} minted tigers`,
        batch: {
          id: batchId,
          oldMintedTigers: oldTigers,
          newMintedTigers: actualTigers,
          isSoldOut: batches[batchIndex].isSoldOut,
          totalTigers: batches[batchIndex].ordinals
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in set-batch-status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 