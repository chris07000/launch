import { NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;
    
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    // Huidige batch info ophalen
    const { currentBatch } = await storage.getCurrentBatch();
    
    // Reset de soldOut status
    const result = await storage.saveCurrentBatch({
      currentBatch: currentBatch,
      soldOutAt: null
    });
    
    // Log voor debugging
    console.log(`Reset soldOut status for batch ${currentBatch}. Result: ${result ? 'success' : 'failed'}`);
    
    if (result) {
      return NextResponse.json({
        success: true,
        message: `Current batch ${currentBatch} soldOut status has been reset`
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to reset current batch status'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in reset-current-batch API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 