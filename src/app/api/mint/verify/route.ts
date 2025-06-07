import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

// Helper function to validate bc1p address format
function isValidBc1pAddress(address: string): boolean {
  return address.startsWith('bc1p') && address.length >= 62 && address.length <= 64;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const batchIdParam = searchParams.get('batchId');
    const address = searchParams.get('address');
    const checkAllBatches = searchParams.get('checkAllBatches') === 'true';

    if (!batchIdParam || !address) {
      return NextResponse.json({ 
        eligible: false,
        reason: 'missing_parameters',
        message: 'Missing required parameters' 
      }, { status: 400 });
    }

    const requestedBatchId = parseInt(batchIdParam, 10);

    // Validate address format
    if (!isValidBc1pAddress(address)) {
      return NextResponse.json({
        eligible: false,
        reason: 'invalid_address',
        message: 'Invalid Bitcoin address format. Must be a valid bc1p address'
      });
    }

    console.log(`Checking eligibility for ${address} on batch ${requestedBatchId}`);
    
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

    // Check if wallet has reached maximum tigers limit across all batches
    const totalMintedResult = await sql`
      SELECT SUM(quantity) as total_minted FROM minted_wallets 
      WHERE address = ${address}
    `;
    
    const totalMinted = totalMintedResult.rows[0]?.total_minted || 0;
    const maxTigersPerWallet = 3; // Adjust this limit as needed
    
    if (totalMinted >= maxTigersPerWallet) {
      return NextResponse.json({
        eligible: false,
        reason: 'max_tigers_reached',
        message: `Address has reached the maximum limit of ${maxTigersPerWallet} Tigers`
      });
    }
    
    // If we get here, the address is eligible to mint
    console.log(`Address ${address} is eligible to mint from batch ${requestedBatchId}`);
    
    return NextResponse.json({
      eligible: true,
      batchId: requestedBatchId,
      message: `Address is eligible to mint from batch #${requestedBatchId}`,
      totalMinted: totalMinted,
      remainingMints: maxTigersPerWallet - totalMinted
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