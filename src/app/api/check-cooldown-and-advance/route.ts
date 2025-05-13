import { NextRequest, NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

/**
 * Helper function to find the next available batch
 */
async function findNextAvailableBatch(currentBatchId: number): Promise<number> {
  const batches = await storage.getBatches();
  
  for (let i = currentBatchId + 1; i <= 16; i++) {
    const batch = batches.find(b => b.id === i);
    if (batch && !batch.isSoldOut) {
      console.log(`Found next available batch: ${i}`);
      return i;
    }
  }
  
  console.log(`No next available batch found, staying on ${currentBatchId}`);
  return currentBatchId; // Stay on current batch if no next available batch found
}

/**
 * Helper function to get cooldown duration for a specific batch
 */
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
    
    // Fall back to 2 minutes for testing if nothing is configured
    return 2 * 60 * 1000; // 2 minutes in milliseconds
  } catch (error) {
    console.error('Error getting batch cooldown:', error);
    // Default to 2 minutes in case of error (for testing)
    return 2 * 60 * 1000;
  }
}

/**
 * Helper function to convert cooldown settings to milliseconds
 */
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

/**
 * Check if cooldown period has elapsed and advance to the next batch if needed
 */
export async function GET(request: NextRequest) {
  try {
    // Get the current batch info
    const { currentBatch, soldOutAt } = await storage.getCurrentBatch();
    console.log(`Current batch: ${currentBatch}, soldOutAt: ${soldOutAt ? new Date(soldOutAt).toISOString() : 'not sold out'}`);
    
    // If no soldOutAt timestamp, the batch is not sold out yet
    if (!soldOutAt) {
      return NextResponse.json({
        batch: currentBatch,
        status: 'active',
        message: 'Current batch is active and not sold out'
      });
    }
    
    // Get the cooldown duration for this batch
    const cooldownDuration = await getBatchCooldownMilliseconds(currentBatch);
    console.log(`Cooldown duration for batch ${currentBatch}: ${cooldownDuration}ms (${cooldownDuration / 1000 / 60} minutes)`);
    
    // Calculate time elapsed since batch was marked as sold out
    const now = Date.now();
    const timeSinceSoldOut = now - soldOutAt;
    console.log(`Time since sold out: ${timeSinceSoldOut}ms (${timeSinceSoldOut / 1000 / 60} minutes)`);
    
    // Check if cooldown period has elapsed
    if (timeSinceSoldOut >= cooldownDuration) {
      // Find the next available batch
      const nextBatch = await findNextAvailableBatch(currentBatch);
      
      if (nextBatch !== currentBatch) {
        // Update to the next batch and reset soldOutAt
        await storage.saveCurrentBatch({
          currentBatch: nextBatch,
          soldOutAt: null
        });
        
        console.log(`Advanced to next batch: ${nextBatch}`);
        
        return NextResponse.json({
          previousBatch: currentBatch,
          newBatch: nextBatch,
          status: 'advanced',
          message: `Advanced to batch ${nextBatch}`
        });
      } else {
        // No next batch available, stay on current batch
        return NextResponse.json({
          batch: currentBatch,
          status: 'no_next_batch',
          message: 'Cooldown period elapsed but no next batch available'
        });
      }
    } else {
      // Cooldown period not elapsed yet
      const timeLeft = cooldownDuration - timeSinceSoldOut;
      console.log(`Cooldown period not elapsed yet. ${timeLeft}ms left (${timeLeft / 1000 / 60} minutes)`);
      
      return NextResponse.json({
        batch: currentBatch,
        status: 'cooldown',
        timeLeft: timeLeft,
        cooldownDuration: cooldownDuration,
        message: `Cooldown period not elapsed yet. ${Math.ceil(timeLeft / 1000 / 60)} minutes left`
      });
    }
  } catch (error) {
    console.error('Error checking cooldown and advancing batch:', error);
    return NextResponse.json({
      error: 'Failed to check cooldown',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 