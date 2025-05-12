import { NextRequest, NextResponse } from 'next/server';
import { createMintOrder, getAllBatches, getBatchInfo } from '@/api/mint';
import { initializeStorage } from '@/lib/storage';

// Initialize storage on startup
initializeStorage().catch(console.error);

export async function GET(request: NextRequest) {
  try {
    // Haal de batchId uit de URL als die er is
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    
    if (batchId) {
      // Specifieke batch informatie ophalen
      const batchInfo = await getBatchInfo(parseInt(batchId, 10));
      return NextResponse.json(batchInfo);
    } else {
      // Alle batches ophalen
      const allBatches = await getAllBatches();
      return NextResponse.json(allBatches);
    }
  } catch (error: any) {
    // Error handling
    const errorMessage = error.message || 'Something went wrong';
    console.error('GET /api/mint error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { btcAddress, quantity, batchId } = body;

    // Validate required fields
    if (!btcAddress) {
      return NextResponse.json({ error: 'BTC address is required' }, { status: 400 });
    }

    if (!quantity || quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 });
    }

    // Create mint order
    const order = await createMintOrder(btcAddress, quantity, batchId);

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Error creating mint order:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
} 