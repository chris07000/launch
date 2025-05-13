import { NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { batchId, mintedTigers, mintedWallets, password } = body;
    
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    // Zorg dat we altijd een waarde hebben voor mintedTigers
    // Voor backward compatibility, houden we mintedWallets nog wel bij
    if (mintedTigers === undefined && mintedWallets !== undefined) {
      // Converteer wallets naar tigers (1 wallet = 2 tigers)
      mintedTigers = Number(mintedWallets) * 2;
    } else if (mintedTigers === undefined) {
      return NextResponse.json({ error: 'mintedTigers of mintedWallets is vereist' }, { status: 400 });
    }
    
    if (!batchId) {
      return NextResponse.json({ error: 'batchId is vereist' }, { status: 400 });
    }
    
    const batches = await storage.getBatches();
    const batchIndex = batches.findIndex(b => b.id === Number(batchId));
    
    if (batchIndex === -1) {
      return NextResponse.json({ error: `Batch ${batchId} niet gevonden` }, { status: 404 });
    }
    
    // Update de batch waarden
    const oldValue = batches[batchIndex].mintedWallets;
    const oldTigers = oldValue * 2;
    
    // Converteer tigers naar wallets voor database opslag (1 wallet = 2 tigers)
    const newWallets = Math.ceil(Number(mintedTigers) / 2);
    batches[batchIndex].mintedWallets = newWallets;
    
    // Bereken het totale aantal geminte tigers en het doel
    const totalMintedTigers = Number(mintedTigers);
    const totalTigersInBatch = batches[batchIndex].ordinals;
    
    console.log(`Batch ${batchId}: ${totalMintedTigers}/${totalTigersInBatch} tigers gemint`);
    
    // Alleen sold out als ALLE tigers zijn gemint
    if (totalMintedTigers >= totalTigersInBatch) {
      batches[batchIndex].isSoldOut = true;
      console.log(`Batch ${batchId} is nu gemarkeerd als sold out (alle ${totalTigersInBatch} tigers zijn gemint)`);
    } else {
      // Batch is niet uitverkocht als er nog tigers beschikbaar zijn
      batches[batchIndex].isSoldOut = false;
      console.log(`Batch ${batchId} is niet sold out, ${totalMintedTigers}/${totalTigersInBatch} tigers gemint`);
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
    // Als de huidige batch niet meer sold out is, reset de soldOutAt tijd
    else if (Number(batchId) === currentBatch && !batches[batchIndex].isSoldOut && soldOutAt) {
      await storage.saveCurrentBatch({
        currentBatch,
        soldOutAt: null
      });
      console.log(`Current batch ${currentBatch} sold out time is reset`);
    }
    
    return NextResponse.json({
      success: true,
      message: `Batch ${batchId} bijgewerkt: ${oldTigers} → ${totalMintedTigers} tigers`,
      oldTigers: oldTigers,
      newTigers: totalMintedTigers,
      totalTigersInBatch: totalTigersInBatch,
      mintedWallets: newWallets, // Voor backward compatibility
      isSoldOut: batches[batchIndex].isSoldOut,
      maxWallets: batches[batchIndex].maxWallets // Voor backward compatibility
    });
  } catch (error: any) {
    console.error('Error in set-batch-status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 