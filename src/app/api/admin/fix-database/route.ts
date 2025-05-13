import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import * as storage from '@/lib/storage-wrapper-db-only';

export const dynamic = 'force-dynamic';

// Standaard cooldown waarde (2 dagen)
const DEFAULT_COOLDOWN = {
  value: 2,
  unit: 'days'
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');
    
    // Controleer wachtwoord
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    const fixes: { step: string; status: string; details?: any }[] = [];
    
    // Fix 1: Reset batch 1 mintedWallets naar exact 33 (66 tigers)
    try {
      const batches = await storage.getBatches();
      const batchIndex = batches.findIndex(b => b.id === 1);
      
      if (batchIndex !== -1) {
        const oldValue = batches[batchIndex].mintedWallets;
        batches[batchIndex].mintedWallets = 33;
        
        // Controleer of de batch marked as sold out moet zijn (exact 33 wallets = 66 tigers)
        batches[batchIndex].isSoldOut = true;
        
        await storage.saveBatches(batches);
        
        fixes.push({
          step: 'Reset batch 1 mintedWallets',
          status: 'success',
          details: {
            oldValue,
            newValue: 33,
            ordinals: batches[batchIndex].ordinals,
            isSoldOut: batches[batchIndex].isSoldOut
          }
        });
      } else {
        fixes.push({
          step: 'Reset batch 1 mintedWallets',
          status: 'error',
          details: 'Batch 1 not found'
        });
      }
    } catch (error: any) {
      fixes.push({
        step: 'Reset batch 1 mintedWallets',
        status: 'error',
        details: error.message
      });
    }
    
    // Fix 2: Zorg dat de batch cooldown op 2 dagen staat
    try {
      // Check if cooldown table exists
      await sql`
        CREATE TABLE IF NOT EXISTS batch_cooldowns (
          batch_id TEXT PRIMARY KEY,
          cooldown_value INTEGER NOT NULL,
          cooldown_unit TEXT NOT NULL
        )
      `;
      
      // Reset default cooldown to 2 days
      await sql`
        INSERT INTO batch_cooldowns (batch_id, cooldown_value, cooldown_unit)
        VALUES ('default', ${DEFAULT_COOLDOWN.value}, ${DEFAULT_COOLDOWN.unit})
        ON CONFLICT (batch_id) 
        DO UPDATE SET 
          cooldown_value = ${DEFAULT_COOLDOWN.value},
          cooldown_unit = ${DEFAULT_COOLDOWN.unit}
      `;
      
      // Set batch 1 cooldown explicitly to 2 days
      await sql`
        INSERT INTO batch_cooldowns (batch_id, cooldown_value, cooldown_unit)
        VALUES ('1', ${DEFAULT_COOLDOWN.value}, ${DEFAULT_COOLDOWN.unit})
        ON CONFLICT (batch_id) 
        DO UPDATE SET 
          cooldown_value = ${DEFAULT_COOLDOWN.value},
          cooldown_unit = ${DEFAULT_COOLDOWN.unit}
      `;
      
      // Refresh current batch as sold out to restart the timer
      const { currentBatch } = await storage.getCurrentBatch();
      if (currentBatch === 1) {
        await storage.saveCurrentBatch({
          currentBatch: 1,
          soldOutAt: Date.now() // Reset soldOutAt to now
        });
        
        fixes.push({
          step: 'Reset batch 1 soldOutAt timestamp',
          status: 'success',
          details: {
            currentBatch,
            soldOutAt: new Date().toISOString()
          }
        });
      }
      
      // Verify the settings were saved
      const { rows } = await sql`SELECT * FROM batch_cooldowns`;
      
      fixes.push({
        step: 'Fix cooldown settings',
        status: 'success',
        details: rows
      });
    } catch (error: any) {
      fixes.push({
        step: 'Fix cooldown settings',
        status: 'error',
        details: error.message
      });
    }
    
    return NextResponse.json({
      status: 'success',
      message: 'Database fix complete',
      fixes
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: 'Fix failed',
      error: error.message
    }, { status: 500 });
  }
} 