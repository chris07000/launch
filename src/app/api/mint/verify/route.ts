import { NextRequest, NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const batchIdParam = searchParams.get('batchId');
    const address = searchParams.get('address');

    if (!batchIdParam || !address) {
      return NextResponse.json({ 
        eligible: false,
        reason: 'missing_parameters',
        message: 'Missing required parameters' 
      }, { status: 400 });
    }

    const batchId = parseInt(batchIdParam, 10);

    // Get whitelist and minted wallets
    const [whitelist, mintedWallets, batches] = await Promise.all([
      storage.getWhitelist(),
      storage.getMintedWallets(),
      storage.getBatches()
    ]);

    // Check if the specified batch exists and is not sold out
    const batch = batches.find(b => b.id === batchId);
    if (!batch) {
      return NextResponse.json({
        eligible: false,
        reason: 'invalid_batch',
        message: `Batch #${batchId} not found`
      });
    }

    if (batch.isSoldOut) {
      return NextResponse.json({
        eligible: false,
        reason: 'batch_sold_out',
        message: `Batch #${batchId} is sold out`
      });
    }

    // Check if address is whitelisted for this batch
    const whitelistEntry = whitelist.find(entry => 
      entry.address === address && entry.batchId === batchId
    );

    // If not whitelisted for this batch, check if whitelisted for any batch
    if (!whitelistEntry) {
      const anyWhitelistEntry = whitelist.find(entry => entry.address === address);
      
      return NextResponse.json({
        eligible: false,
        reason: 'not_whitelisted',
        whitelistedBatch: anyWhitelistEntry ? anyWhitelistEntry.batchId : null,
        message: anyWhitelistEntry 
          ? `Address is whitelisted for batch #${anyWhitelistEntry.batchId}, not for batch #${batchId}` 
          : 'Address is not whitelisted'
      });
    }

    // Check if address has already minted from this batch
    const mintedWallet = mintedWallets.find(wallet => 
      wallet.address === address && wallet.batchId === batchId
    );

    if (mintedWallet) {
      return NextResponse.json({
        eligible: false,
        reason: 'already_minted',
        message: `Address has already minted from batch #${batchId}`
      });
    }

    // Check if the batch has reached its max wallets
    // Eerst op basis van tigers controleren, als dat beschikbaar is
    if (batch.mintedTigers !== undefined && batch.ordinals) {
      // Check op basis van tigers (moderner)
      if (batch.mintedTigers >= batch.ordinals) {
        // Update batch to sold out if it's not already marked
        if (!batch.isSoldOut) {
          batch.isSoldOut = true;
          await storage.saveBatches(batches);
        }
        
        return NextResponse.json({
          eligible: false,
          reason: 'batch_full',
          message: `Batch #${batchId} has reached maximum tigers (${batch.ordinals})`
        });
      }
    } else {
      // Fallback naar wallets check met null check
      const maxWallets = batch.maxWallets || 33; // Default naar 33 als maxWallets ontbreekt
      if (batch.mintedWallets >= maxWallets) {
        // Update batch to sold out if it's not already marked
        if (!batch.isSoldOut) {
          batch.isSoldOut = true;
          await storage.saveBatches(batches);
        }
        
        return NextResponse.json({
          eligible: false,
          reason: 'batch_full',
          message: `Batch #${batchId} has reached maximum wallets`
        });
      }
    }

    // If all checks pass, the address is eligible to mint
    return NextResponse.json({
      eligible: true,
      batchId,
      message: `Address is eligible to mint from batch #${batchId}`
    });
  } catch (error) {
    console.error('Verify endpoint error:', error);
    return NextResponse.json({
      eligible: false,
      reason: 'error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}