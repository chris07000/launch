import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import * as storage from '@/lib/storage-wrapper-db-only';

export const dynamic = 'force-dynamic';

// Voeg een helper functie toe voor CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Voeg OPTIONS handler toe voor preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

interface CurrentBatchResponse {
  currentBatch: number;
  price: number;
  available: number;
  maxWallets: number;
  soldOut: boolean;
}

export async function GET() {
  try {
    // Get current batch ID
    const { currentBatch, soldOutAt } = await storage.getCurrentBatch();
    
    // Get all batches
    const batches = await storage.getBatches();
    
    // Find current batch details
    const currentBatchInfo = batches.find(b => b.id === currentBatch);
    
    if (!currentBatchInfo) {
      return NextResponse.json({
        error: `Current batch #${currentBatch} not found`
      }, { 
        status: 404,
        headers: corsHeaders()
      });
    }
    
    const response: CurrentBatchResponse = {
      currentBatch: currentBatchInfo.id,
      price: currentBatchInfo.price,
      available: currentBatchInfo.maxWallets - currentBatchInfo.mintedWallets,
      maxWallets: currentBatchInfo.maxWallets,
      soldOut: currentBatchInfo.isSoldOut
    };
    
    if (soldOutAt) {
      // Calculate timeLeft based on 15-minute cooldown
      const now = Date.now();
      const cooldownEnd = soldOutAt + 15 * 60 * 1000; // 15 minutes
      const timeLeft = Math.max(0, cooldownEnd - now);
      
      return NextResponse.json({
        ...response,
        batches,
        soldOut: true,
        soldOutAt,
        cooldownEnd,
        timeLeft,
        nextBatch: currentBatch + 1
      }, {
        headers: corsHeaders()
      });
    }
    
    return NextResponse.json({
      ...response,
      batches
    }, {
      headers: corsHeaders()
    });
  } catch (error) {
    console.error('Error fetching current batch:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch current batch',
      message: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: corsHeaders()
    });
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