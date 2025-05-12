import { NextRequest, NextResponse } from 'next/server';
import { createMintOrder, getAllBatches, getBatchInfo } from '@/api/mint';

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
    // Request body ophalen
    const body = await request.json();
    const { quantity, btcAddress, batchId } = body;
    
    console.log('POST /api/mint - Request received:', {
      quantity,
      btcAddress,
      batchId
    });
    
    // Validatie van invoer
    if (!btcAddress) {
      throw new Error('Bitcoin address is required');
    }
    
    if (!quantity || quantity < 1) {
      throw new Error('Valid quantity is required');
    }
    
    // Order aanmaken
    console.log('Creating mint order with:', { btcAddress, quantity, batchId });
    const orderData = await createMintOrder(btcAddress, quantity, batchId);
    console.log('Order created successfully:', orderData);
    
    // Response teruggeven
    return NextResponse.json(orderData, { status: 201 });
  } catch (error: any) {
    // Error handling
    const errorMessage = error.message || 'Something went wrong';
    console.error('POST /api/mint error:', errorMessage, error);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
} 