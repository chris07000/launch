import { NextRequest, NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';
import { sql } from '@vercel/postgres';
import { Batch } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CurrentBatchResponse {
  currentBatch: number;
  totalTigers: number;
  mintedTigers: number;
  availableTigers: number;
  soldOut: boolean;
  soldOutAt: number | null;
  timeLeft: number;
  cooldownDuration: number;
}

// CORS headers helper function
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Helper function to get the cooldown duration for a batch
async function getBatchCooldownMilliseconds(batchId: number): Promise<number> {
  try {
    // First, try to get batch-specific cooldown
    const { rows: batchSpecific } = await sql`
      SELECT cooldown_value, cooldown_unit FROM batch_cooldowns 
      WHERE batch_id = ${batchId.toString()}
    `;
    
    // If batch-specific setting exists, use it
    if (batchSpecific.length > 0) {
      const { cooldown_value, cooldown_unit } = batchSpecific[0];
      return convertToMilliseconds(cooldown_value, cooldown_unit);
    }
    
    // Otherwise, try to get default cooldown
    const { rows: defaultCooldown } = await sql`
      SELECT cooldown_value, cooldown_unit FROM batch_cooldowns 
      WHERE batch_id = 'default'
    `;
    
    // If default setting exists, use it
    if (defaultCooldown.length > 0) {
      const { cooldown_value, cooldown_unit } = defaultCooldown[0];
      return convertToMilliseconds(cooldown_value, cooldown_unit);
    }
    
    // Fall back to 15 minutes if nothing is configured
    return 15 * 60 * 1000; // 15 minutes in milliseconds
  } catch (error) {
    console.error('Error getting batch cooldown:', error);
    // Default to 15 minutes in case of error
    return 15 * 60 * 1000;
  }
}

// Helper function to convert time units to milliseconds
function convertToMilliseconds(value: number, unit: string): number {
  switch (unit) {
    case 'minutes':
      return value * 60 * 1000;
    case 'hours':
      return value * 60 * 60 * 1000;
    case 'days':
      return value * 24 * 60 * 60 * 1000;
    default:
      return value * 60 * 1000; // Default to minutes
  }
}

// Helper function to find the next available batch
async function findNextAvailableBatch(currentBatchId: number): Promise<number> {
  try {
    const batches = await storage.getBatches();
    
    // Start looking from the next batch
    for (let i = currentBatchId + 1; i <= 16; i++) {
      const batch = batches.find(b => b.id === i);
      
      // If batch exists and is not sold out, return it
      if (batch && !batch.isSoldOut) {
        return i;
      }
    }
    
    // If all batches are sold out, stay on current batch
    return currentBatchId;
  } catch (error) {
    console.error('Error finding next available batch:', error);
    return currentBatchId;
  }
}

// Check if a batch has an active timer
async function checkBatchTimer(batchId: number): Promise<{ active: boolean, endTime: number | null, timeLeft: number | null }> {
  try {
    // Check if batch_durations table exists
    const { rows: tableCheck } = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'batch_durations'
      ) as exists
    `;
    
    if (!tableCheck[0].exists) {
      // Tabel bestaat niet, geen timer actief
      return { active: false, endTime: null, timeLeft: null };
    }
    
    // Haal timer informatie op
    const { rows } = await sql`
      SELECT * FROM batch_durations 
      WHERE batch_id = ${batchId}
    `;
    
    if (rows.length === 0 || !rows[0].start_time || !rows[0].end_time) {
      // Geen timer gevonden of timer is niet actief
      return { active: false, endTime: null, timeLeft: null };
    }
    
    const now = Date.now();
    const endTime = rows[0].end_time;
    
    // Controleer of de timer nog actief is
    if (now > endTime) {
      // Timer is verlopen, markeer batch als sold out
      await markBatchAsSoldOutDueToTimer(batchId);
      return { active: false, endTime, timeLeft: 0 };
    }
    
    // Timer is actief, bereken resterende tijd
    const timeLeft = endTime - now;
    return { active: true, endTime, timeLeft };
  } catch (error) {
    console.error('Error checking batch timer:', error);
    return { active: false, endTime: null, timeLeft: null };
  }
}

// Markeer een batch als sold out wegens timer
async function markBatchAsSoldOutDueToTimer(batchId: number): Promise<void> {
  try {
    console.log(`Batch ${batchId} timer expired, marking as sold out`);
    
    // Haal alle batches op
    const batches = await storage.getBatches();
    
    // Vind de batch
    const batch = batches.find(b => b.id === batchId);
    if (!batch) {
      console.error(`Batch ${batchId} not found`);
      return;
    }
    
    // Markeer als sold out
    if (!batch.isSoldOut) {
      batch.isSoldOut = true;
      
      // Update in database
      await storage.saveBatches(batches);
      
      // Update current batch info
      const currentBatchInfo = await storage.getCurrentBatch();
      if (currentBatchInfo.currentBatch === batchId) {
        await storage.saveCurrentBatch({
          currentBatch: batchId,
          soldOutAt: Date.now()
        });
      }
      
      console.log(`Batch ${batchId} marked as sold out due to timer expiration`);
    }
  } catch (error) {
    console.error('Error marking batch as sold out:', error);
  }
}

export async function GET(request: NextRequest) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders()
    });
  }

  // Get current batch information
  try {
    const { searchParams } = new URL(request.url);
    
    // Haal current batch info op uit storage
    const currentBatchInfo = await storage.getCurrentBatch();
    const currentBatchId = currentBatchInfo.currentBatch;
    const soldOutAt = currentBatchInfo.soldOutAt;
    
    // Haal alle batches op
    const batches = await storage.getBatches();
    
    // Vind huidige batch
    const currentBatch = batches.find(batch => batch.id === currentBatchId);
    
    if (!currentBatch) {
      return NextResponse.json({ error: 'Current batch not found' }, { status: 404 });
    }
    
    // Controleer batch timer
    const timerStatus = await checkBatchTimer(currentBatchId);
    
    // Check als de batch sold out is
    if (currentBatch.isSoldOut || soldOutAt) {
      // Als er een sold out time is, bereken cooldown tijd
      if (soldOutAt) {
        const now = Date.now();
        const cooldownDuration = await getBatchCooldownMilliseconds(currentBatchId);
        const timeSinceSoldOut = now - soldOutAt;
        
        // Als cooldown voorbij is, ga naar volgende batch
        if (timeSinceSoldOut >= cooldownDuration) {
          const nextBatchId = await findNextAvailableBatch(currentBatchId);
          
          if (nextBatchId !== currentBatchId) {
            console.log(`Moving from batch ${currentBatchId} to ${nextBatchId} as cooldown period has elapsed`);
            await storage.saveCurrentBatch({
              currentBatch: nextBatchId,
              soldOutAt: null
            });
            
            // Haal nieuwe batch info op
            const newBatch = batches.find(batch => batch.id === nextBatchId);
            
            // Check timer voor nieuwe batch
            const newTimerStatus = await checkBatchTimer(nextBatchId);
            
            return NextResponse.json({
              currentBatch: nextBatchId,
              mintedWallets: newBatch?.mintedWallets || 0,
              mintedTigers: newBatch?.mintedTigers || 0,
              totalTigers: newBatch?.ordinals || 66,
              soldOut: newBatch?.isSoldOut || false,
              price: newBatch?.price || 0,
              hasTimer: newTimerStatus.active,
              timeLeft: newTimerStatus.timeLeft
            });
          }
        }
        
        // Cooldown periode is nog niet voorbij
        return NextResponse.json({
          currentBatch: currentBatchId,
          mintedWallets: currentBatch.mintedWallets,
          mintedTigers: currentBatch.mintedTigers || (currentBatch.mintedWallets * 2),
          totalTigers: currentBatch.ordinals,
          soldOut: true,
          soldOutAt,
          cooldownDuration,
          timeLeft: cooldownDuration - timeSinceSoldOut,
          price: currentBatch.price
        });
      }
    }
    
    // Als er een actieve timer is, retourneer die informatie
    if (timerStatus.active) {
      // Timer is actief, toon timer info
      return NextResponse.json({
        currentBatch: currentBatchId,
        mintedWallets: currentBatch.mintedWallets,
        mintedTigers: currentBatch.mintedTigers || (currentBatch.mintedWallets * 2),
        totalTigers: currentBatch.ordinals,
        soldOut: currentBatch.isSoldOut,
        price: currentBatch.price,
        hasTimer: true,
        timerEndTime: timerStatus.endTime,
        timeLeft: timerStatus.timeLeft
      });
    }
    
    // Normale respons zonder timer of sold out status
    return NextResponse.json({
      currentBatch: currentBatchId,
      mintedWallets: currentBatch.mintedWallets,
      mintedTigers: currentBatch.mintedTigers || (currentBatch.mintedWallets * 2),
      totalTigers: currentBatch.ordinals,
      soldOut: currentBatch.isSoldOut,
      price: currentBatch.price,
      hasTimer: false
    });
  } catch (error: any) {
    console.error('Error getting current batch:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, password } = await request.json();
    
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { 
        status: 401,
        headers: corsHeaders()
      });
    }

    if (action === 'mark_sold_out') {
      const { currentBatch } = await storage.getCurrentBatch();
      
      // Mark current batch as sold out with timestamp
      await storage.saveCurrentBatch({ 
        currentBatch,
        soldOutAt: Date.now()
      });

      return NextResponse.json({ success: true }, {
        headers: corsHeaders()
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { 
      status: 400,
      headers: corsHeaders()
    });
  } catch (error) {
    console.error('Error updating batch status:', error);
    return NextResponse.json({ error: 'Failed to update batch status' }, { 
      status: 500,
      headers: corsHeaders()
    });
  }
} 