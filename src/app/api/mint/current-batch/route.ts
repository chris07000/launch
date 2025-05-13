import { NextRequest, NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

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

// Helper function for CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
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
    const { currentBatch, soldOutAt } = await storage.getCurrentBatch();
    const batches = await storage.getBatches();
    const currentBatchInfo = batches.find((b: any) => b.id === currentBatch);
    
    // Handle case where current batch is not found
    if (!currentBatchInfo) {
      return NextResponse.json({ 
        error: `Current batch #${currentBatch} not found` 
      }, { 
        status: 404,
        headers: corsHeaders()
      });
    }
    
    // Calculate time left
    let timeLeft = 0;
    let cooldownDuration = 900000; // Default to 15 minutes
    
    if (soldOutAt) {
      cooldownDuration = await getBatchCooldownMilliseconds(currentBatch);
      const now = Date.now();
      timeLeft = Math.max(0, cooldownDuration - (now - soldOutAt));
    }
    
    // Calculate total and minted tigers for the current batch
    const totalTigers = currentBatchInfo.ordinals || 66;
    
    // Voor backward compatibility, check eerst op mintedTigers en val terug op mintedWallets * 2
    const mintedTigers = currentBatchInfo.mintedTigers !== undefined
      ? currentBatchInfo.mintedTigers
      : currentBatchInfo.mintedWallets * 2;
      
    const availableTigers = totalTigers - mintedTigers;
    
    const response: CurrentBatchResponse = {
      currentBatch: currentBatch,
      totalTigers: totalTigers,
      mintedTigers: mintedTigers,
      availableTigers: availableTigers,
      soldOut: !!soldOutAt,
      soldOutAt: soldOutAt,
      timeLeft: timeLeft,
      cooldownDuration: cooldownDuration
    };
    
    return NextResponse.json(response, {
      headers: corsHeaders()
    });
  } catch (error) {
    console.error('Error fetching current batch info:', error);
    return NextResponse.json({ error: 'Failed to fetch current batch' }, { status: 500 });
  }
}

// Helper function to get cooldown duration for a specific batch
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
    return 15 * 60 * 1000; // 15 minutes in milliseconds
  }
}

// Helper function to convert cooldown settings to milliseconds
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