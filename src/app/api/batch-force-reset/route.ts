import { NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Beveilig de URL met een token parameter - moet worden opgegeven in de URL
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const resetToken = process.env.ADMIN_PASSWORD; // Gebruik het admin password als token
    
    if (!token || token !== resetToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // 1. Eerst de batches ophalen
    const batches = await storage.getBatches();
    
    // 2. Batch 1 vinden en resetten naar 0 tigers en niet sold out
    const batch1Index = batches.findIndex(b => b.id === 1);
    
    if (batch1Index === -1) {
      return NextResponse.json({ error: 'Batch 1 not found' }, { status: 404 });
    }
    
    // 3. Batch 1 updaten naar 0 tigers en niet sold out
    batches[batch1Index].mintedTigers = 0;
    batches[batch1Index].mintedWallets = 0;
    batches[batch1Index].isSoldOut = false;
    
    // 4. Opslaan van de batches
    const batchesResult = await storage.saveBatches(batches);
    
    if (!batchesResult) {
      return NextResponse.json({ 
        error: 'Failed to save batches' 
      }, { status: 500 });
    }
    
    // 5. Huidige batch info ophalen
    const { currentBatch, soldOutAt } = await storage.getCurrentBatch();
    
    // 6. Sold out time resetten als dat nodig is
    let currentBatchResult = true;
    if (soldOutAt !== null && currentBatch === 1) {
      currentBatchResult = await storage.saveCurrentBatch({
        currentBatch: 1,
        soldOutAt: null
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Batch 1 has been reset to 0 tigers and is no longer marked as sold out',
      batchesUpdated: batchesResult,
      currentBatchUpdated: currentBatchResult
    });
  } catch (error: any) {
    console.error('Error in batch force reset:', error);
    return NextResponse.json({ 
      error: 'An error occurred while resetting batch 1',
      details: error.message
    }, { status: 500 });
  }
} 