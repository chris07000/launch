import { NextRequest, NextResponse } from 'next/server';
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

    // STAP 1: Direct de whitelist check doen met SQL
    const whitelistResult = await sql`SELECT * FROM whitelist WHERE address = ${address}`;
    const whitelistEntry = whitelistResult.rows[0];
    const whitelistedBatchId = whitelistEntry ? whitelistEntry.batch_id : null;
    
    console.log(`Checking whitelist for ${address}: ${whitelistEntry ? 'FOUND for batch ' + whitelistedBatchId : 'NOT FOUND'}`);
    
    // STAP 2: Batch informatie ophalen
    const batchesResult = await sql`SELECT * FROM batches WHERE id = ${requestedBatchId}`;
    if (batchesResult.rows.length === 0) {
      return NextResponse.json({
        eligible: false,
        reason: 'invalid_batch',
        message: `Batch #${requestedBatchId} not found`
      });
    }
    
    const requestedBatch = batchesResult.rows[0];
    
    // STAP 3: Check of batch sold out is, maar als het 0 minted wallets heeft, dan niet
    if (requestedBatch.is_sold_out && requestedBatch.minted_wallets > 0) {
      return NextResponse.json({
        eligible: false,
        reason: 'batch_sold_out',
        message: `Batch #${requestedBatchId} is sold out`
      });
    }
    
    // STAP 4: Als de wallet in whitelist staat, check of hij voor de juiste batch is
    if (whitelistedBatchId !== null) {
      // Check of de wallet al gemint heeft
      const mintedWalletsResult = await sql`
        SELECT * FROM minted_wallets 
        WHERE address = ${address} AND batch_id = ${requestedBatchId}
      `;
      
      if (mintedWalletsResult.rows.length > 0) {
        return NextResponse.json({
          eligible: false,
          reason: 'already_minted',
          whitelistedBatch: whitelistedBatchId,
          message: `Address has already minted from batch #${requestedBatchId}`
        });
      }
      
      // Sta toe als de wallet gewhitelist is voor de gevraagde batch
      if (whitelistedBatchId === requestedBatchId) {
        return NextResponse.json({
          eligible: true,
          batchId: requestedBatchId,
          message: `Address is eligible to mint from batch #${requestedBatchId}`
        });
      }
      
      // Als wallet voor een andere batch is, geef dat aan
      return NextResponse.json({
        eligible: false,
        reason: 'not_whitelisted_for_batch',
        whitelistedBatch: whitelistedBatchId,
        message: `Address is whitelisted for batch #${whitelistedBatchId}, not for batch #${requestedBatchId}`
      });
    }
    
    // Default response - niet in whitelist
    return NextResponse.json({
      eligible: false,
      reason: 'not_whitelisted',
      message: 'Address is not whitelisted for any batch'
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