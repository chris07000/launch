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

    // Direct whitelist check with SQL
    const whitelistResult = await sql`SELECT * FROM whitelist WHERE address = ${address}`;
    const whitelistEntry = whitelistResult.rows[0];
    const whitelistedBatchId = whitelistEntry ? whitelistEntry.batch_id : null;
    
    console.log(`Checking whitelist for ${address}: ${whitelistEntry ? 'FOUND for batch ' + whitelistedBatchId : 'NOT FOUND'}`);
    
    // Get batch information
    const batchesResult = await sql`SELECT * FROM batches WHERE id = ${requestedBatchId}`;
    if (batchesResult.rows.length === 0) {
      return NextResponse.json({
        eligible: false,
        reason: 'invalid_batch',
        message: `Batch #${requestedBatchId} not found`
      });
    }
    
    const requestedBatch = batchesResult.rows[0];
    
    // Check if batch is sold out
    if (requestedBatch.is_sold_out && requestedBatch.minted_wallets > 0) {
      return NextResponse.json({
        eligible: false,
        reason: 'batch_sold_out',
        message: `Batch #${requestedBatchId} is sold out`
      });
    }
    
    // Check if the address has already minted from this batch
    const mintedWalletsResult = await sql`
      SELECT * FROM minted_wallets 
      WHERE address = ${address} AND batch_id = ${requestedBatchId}
    `;
    
    if (mintedWalletsResult.rows.length > 0) {
      return NextResponse.json({
        eligible: false,
        reason: 'already_minted',
        message: `Address has already minted from batch #${requestedBatchId}`
      });
    }
    
    // Check if address is whitelisted for the requested batch
    if (whitelistedBatchId === requestedBatchId) {
      return NextResponse.json({
        eligible: true,
        batchId: requestedBatchId,
        message: `Address is eligible to mint from batch #${requestedBatchId}`
      });
    }
    
    // Default response - not in whitelist or whitelisted for a different batch
    return NextResponse.json({
      eligible: false,
      reason: 'not_whitelisted',
      whitelistedBatch: whitelistedBatchId,
      message: whitelistedBatchId ? 
        `Address is whitelisted for batch #${whitelistedBatchId}, not for batch #${requestedBatchId}` :
        'Address is not whitelisted for any batch'
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