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
    const oldTigers = batches[batchIndex].mintedTigers !== undefined 
      ? batches[batchIndex].mintedTigers 
      : batches[batchIndex].mintedWallets * 2;
    
    // Als we exact 65 tigers hebben, moeten we dat beschouwen als 66 (vol)
    const totalTigersInBatch = batches[batchIndex].ordinals;
    const isAlmostFull = Number(mintedTigers) >= totalTigersInBatch - 1;
    
    // Als het aantal bijna vol is (65 of 66 van de 66), ronden we af naar vol
    let newWallets;
    let actualTigers;
    let isSoldOut;
    
    if (isAlmostFull) {
      // Bij 65 of 66 tigers, beschouw als vol
      newWallets = Math.ceil(totalTigersInBatch / 2);
      actualTigers = totalTigersInBatch;
      isSoldOut = true;
      console.log(`Batch ${batchId} is bijna of helemaal vol (${mintedTigers}/${totalTigersInBatch}), behandeld als vol`);
    } else {
      newWallets = Math.ceil(Number(mintedTigers) / 2);
      actualTigers = Number(mintedTigers);
      isSoldOut = false;
    }
    
    batches[batchIndex].mintedWallets = newWallets;
    batches[batchIndex].mintedTigers = actualTigers;
    batches[batchIndex].isSoldOut = isSoldOut;
    
    console.log(`Batch ${batchId}: ${actualTigers}/${totalTigersInBatch} tigers gemint, isSoldOut: ${isSoldOut}`);
    
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
      message: `Batch ${batchId} bijgewerkt: ${oldTigers} → ${actualTigers} tigers ${isSoldOut ? '(UITVERKOCHT)' : ''}`,
      oldTigers: oldTigers,
      newTigers: actualTigers,
      requestedTigers: Number(mintedTigers),
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