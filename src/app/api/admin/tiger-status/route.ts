import { NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

// Helper functie om de cooldown tijd op te halen
async function getBatchCooldown(batchId: number) {
  try {
    // Eerst kijken of er een specifieke instelling is voor deze batch
    const { rows: batchSpecific } = await sql`
      SELECT cooldown_value, cooldown_unit FROM batch_cooldowns 
      WHERE batch_id = ${batchId.toString()}
    `;
    
    if (batchSpecific.length > 0) {
      return {
        value: batchSpecific[0].cooldown_value,
        unit: batchSpecific[0].cooldown_unit
      };
    }
    
    // Anders de standaard instelling ophalen
    const { rows: defaultCooldown } = await sql`
      SELECT cooldown_value, cooldown_unit FROM batch_cooldowns 
      WHERE batch_id = 'default'
    `;
    
    if (defaultCooldown.length > 0) {
      return {
        value: defaultCooldown[0].cooldown_value,
        unit: defaultCooldown[0].cooldown_unit
      };
    }
    
    // Fallback naar 2 dagen als er geen instellingen zijn
    return { value: 2, unit: 'days' };
  } catch (error) {
    console.error('Error getting batch cooldown:', error);
    return { value: 2, unit: 'days' };
  }
}

// GET: Krijg huidige status van tigers per batch
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');
    
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    const batches = await storage.getBatches();
    const { currentBatch, soldOutAt } = await storage.getCurrentBatch();
    
    // Cooldown informatie ophalen
    let cooldownInfo = null;
    if (soldOutAt) {
      const cooldownSetting = await getBatchCooldown(currentBatch);
      cooldownInfo = {
        batchId: currentBatch,
        soldOutAt: new Date(soldOutAt).toISOString(),
        cooldownSetting,
      };
    }
    
    // Converteer wallets naar tigers voor betere leesbaarheid
    const tigerStatus = batches.map(batch => ({
      batchId: batch.id,
      mintedTigers: batch.mintedWallets * 2, // 1 wallet = 2 tigers
      totalTigers: batch.ordinals,
      percentage: Math.round((batch.mintedWallets * 2 / batch.ordinals) * 100),
      isSoldOut: batch.isSoldOut,
      isCurrentBatch: batch.id === currentBatch
    }));
    
    return NextResponse.json({
      status: 'success',
      currentBatch,
      soldOutAt: soldOutAt ? new Date(soldOutAt).toISOString() : null,
      cooldownInfo,
      tigerStatus
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message
    }, { status: 500 });
  }
}

// POST: Stel aantal tigers in (niet wallets)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { batchId, mintedTigers, password } = body;
    
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    if (!batchId || mintedTigers === undefined) {
      return NextResponse.json({ error: 'batchId en mintedTigers zijn vereist' }, { status: 400 });
    }
    
    const batches = await storage.getBatches();
    const batchIndex = batches.findIndex(b => b.id === Number(batchId));
    
    if (batchIndex === -1) {
      return NextResponse.json({ error: `Batch ${batchId} niet gevonden` }, { status: 404 });
    }
    
    // Convert tigers naar wallets (in de database is 1 wallet = 2 tigers)
    const mintedWallets = Math.ceil(Number(mintedTigers) / 2);
    
    // Update de batch
    const oldTigers = batches[batchIndex].mintedWallets * 2;
    batches[batchIndex].mintedWallets = mintedWallets;
    
    // Bepaal of de batch sold out is
    const totalTigers = batches[batchIndex].ordinals;
    batches[batchIndex].isSoldOut = Number(mintedTigers) >= totalTigers;
    
    await storage.saveBatches(batches);
    
    // Update current batch sold out status indien nodig
    const { currentBatch, soldOutAt } = await storage.getCurrentBatch();
    
    if (Number(batchId) === currentBatch) {
      if (batches[batchIndex].isSoldOut && !soldOutAt) {
        // Als de batch nu uitverkocht is maar nog geen sold out timestamp heeft
        await storage.saveCurrentBatch({
          currentBatch,
          soldOutAt: Date.now()
        });
      } else if (!batches[batchIndex].isSoldOut && soldOutAt) {
        // Als de batch niet meer uitverkocht is maar wel een sold out timestamp heeft
        await storage.saveCurrentBatch({
          currentBatch,
          soldOutAt: null
        });
      }
    }
    
    return NextResponse.json({
      status: 'success',
      message: `Batch ${batchId} bijgewerkt: ${oldTigers} → ${mintedTigers} tigers`,
      details: {
        batchId: Number(batchId),
        oldTigers,
        newTigers: Number(mintedTigers),
        totalTigers,
        isSoldOut: batches[batchIndex].isSoldOut
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message
    }, { status: 500 });
  }
} 