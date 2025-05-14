import { NextRequest, NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';
import { sql } from '@vercel/postgres';

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

    const requestedBatchId = parseInt(batchIdParam, 10);

    // Get whitelist, minted wallets, current batch and all batches
    const [whitelist, mintedWallets, batches, currentBatchInfo] = await Promise.all([
      storage.getWhitelist(),
      storage.getMintedWallets(),
      storage.getBatches(),
      storage.getCurrentBatch()
    ]);

    const currentBatchId = currentBatchInfo.currentBatch;
    const soldOutAt = currentBatchInfo.soldOutAt;

    // Log de current batch voor debug
    console.log(`Current active batch: ${currentBatchId}`);
    
    // Check if address is whitelisted for any batch - doe dit eerst om het in alle responses te kunnen gebruiken
    const anyWhitelistEntry = whitelist.find(entry => entry.address === address);
    const whitelistedBatchId = anyWhitelistEntry ? anyWhitelistEntry.batchId : null;
    
    // Log debugging info
    console.log(`Wallet check for address: ${address}, requested batch: ${requestedBatchId}`);
    console.log(`Wallet is whitelisted for batch: ${whitelistedBatchId || 'NONE'}`);

    // Check if the specified batch exists
    const requestedBatch = batches.find(b => b.id === requestedBatchId);
    if (!requestedBatch) {
      return NextResponse.json({
        eligible: false,
        reason: 'invalid_batch',
        message: `Batch #${requestedBatchId} not found`,
        whitelistedBatch: whitelistedBatchId
      });
    }

    // Check if the requested batch is sold out - en stel voor om naar current batch te gaan
    if (requestedBatch.isSoldOut) {
      // Extra veiligheid: Als er 0 tigers gemint zijn, negeer de isSoldOut status
      if (requestedBatch.mintedTigers === 0 || requestedBatch.mintedWallets === 0) {
        console.log(`Batch ${requestedBatchId} is marked as sold out, but has 0 tigers minted. Treating as not sold out.`);
        
        // FIX: Als dit batch 1 is en er zijn geen tigers, forceer een database correctie
        if (requestedBatchId === 1) {
          console.log('Attempting EMERGENCY FIX for batch 1 being incorrectly marked as sold out');
          
          try {
            // Reset batch direct in de database via SQL
            await sql`
              UPDATE batches 
              SET is_sold_out = false 
              WHERE id = 1
            `;
            
            console.log('Emergency direct SQL fix: Updated batches table');
            
            // Reset current batch info
            await sql`
              UPDATE current_batch 
              SET sold_out_at = NULL 
              WHERE current_batch = 1
            `;
            
            console.log('Emergency direct SQL fix: Updated current_batch table');
            
            // Ook via storage wrapper updaten
            await storage.saveBatches([{
              ...requestedBatch,
              isSoldOut: false
            }]);
            
            // Als dit de huidige batch is en er is een soldOutAt, reset die ook
            if (requestedBatchId === currentBatchId && soldOutAt) {
              await storage.saveCurrentBatch({
                currentBatch: currentBatchId,
                soldOutAt: null
              });
            }
          } catch (error) {
            console.error('Error during emergency database fix:', error);
          }
        }
      } else {
        return NextResponse.json({
          eligible: false,
          reason: 'batch_sold_out',
          currentBatch: currentBatchId,
          whitelistedBatch: whitelistedBatchId,
          message: `Batch #${requestedBatchId} is sold out. The current active batch is #${currentBatchId}.`
        });
      }
    }

    // Als wallet niet gewhitelist is voor enige batch
    if (!anyWhitelistEntry) {
      return NextResponse.json({
        eligible: false,
        reason: 'not_whitelisted',
        message: 'Address is not whitelisted for any batch'
      });
    }

    // Check if the batch that the user is whitelisted for is sold out
    const whitelistedBatch = batches.find(b => b.id === whitelistedBatchId);
    
    // Check if the user's originally whitelisted batch is sold out
    const isOriginalBatchSoldOut = whitelistedBatch?.isSoldOut === true;

    // Check if address is whitelisted for the requested batch
    const isWhitelistedForRequestedBatch = whitelistedBatchId === requestedBatchId;

    // Als gebruiker is gewhitelist voor een batch die sold out is, maar probeert een nog beschikbare batch te gebruiken
    if (isOriginalBatchSoldOut && requestedBatchId !== whitelistedBatchId) {
      // Sta dit toe - address was gewhitelisted voor een eerdere batch die nu sold out is
      console.log(`Address ${address} was whitelisted for batch #${whitelistedBatchId} which is sold out. Allowing mint for batch #${requestedBatchId}`);
      // Dit is OK - gebruiker mag "upgraden" naar een nieuwere beschikbare batch
    } 
    // Als gebruiker NIET gewhitelist is voor de gevraagde batch, en de eigen batch nog beschikbaar is
    else if (!isWhitelistedForRequestedBatch && !isOriginalBatchSoldOut) {
      return NextResponse.json({
        eligible: false,
        reason: 'not_whitelisted_for_batch',
        whitelistedBatch: whitelistedBatchId,
        message: `Address is whitelisted for batch #${whitelistedBatchId}, not for batch #${requestedBatchId}`
      });
    }

    // Check if address has already minted from this batch
    const mintedWallet = mintedWallets.find(wallet => 
      wallet.address === address && wallet.batchId === requestedBatchId
    );

    if (mintedWallet) {
      return NextResponse.json({
        eligible: false,
        reason: 'already_minted',
        whitelistedBatch: whitelistedBatchId,
        message: `Address has already minted from batch #${requestedBatchId}`
      });
    }

    // Check if the batch has reached its max wallets/tigers
    // Eerst op basis van tigers controleren, als dat beschikbaar is
    if (requestedBatch.mintedTigers !== undefined && requestedBatch.ordinals) {
      // Check op basis van tigers (moderner)
      if (requestedBatch.mintedTigers >= requestedBatch.ordinals) {
        // Update batch to sold out if it's not already marked
        if (!requestedBatch.isSoldOut) {
          requestedBatch.isSoldOut = true;
          await storage.saveBatches(batches);
        }
        
        return NextResponse.json({
          eligible: false,
          reason: 'batch_full',
          whitelistedBatch: whitelistedBatchId,
          message: `Batch #${requestedBatchId} has reached maximum tigers (${requestedBatch.ordinals})`
        });
      }
    } else {
      // Fallback naar wallets check met null check
      const maxWallets = requestedBatch.maxWallets || 33; // Default naar 33 als maxWallets ontbreekt
      if (requestedBatch.mintedWallets >= maxWallets) {
        // Update batch to sold out if it's not already marked
        if (!requestedBatch.isSoldOut) {
          requestedBatch.isSoldOut = true;
          await storage.saveBatches(batches);
        }
        
        return NextResponse.json({
          eligible: false,
          reason: 'batch_full',
          whitelistedBatch: whitelistedBatchId,
          message: `Batch #${requestedBatchId} has reached maximum wallets`
        });
      }
    }

    // If all checks pass, the address is eligible to mint
    return NextResponse.json({
      eligible: true,
      batchId: requestedBatchId,
      whitelistedBatch: whitelistedBatchId,
      message: `Address is eligible to mint from batch #${requestedBatchId}`
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