import { NextRequest, NextResponse } from 'next/server';
import { isWalletEligible, isWhitelisted, hasWalletMinted, isBatchAvailable, getBatchInfo, MAX_TIGERS_PER_WALLET } from '@/api/mint';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Get the batchId and address from the URL
    const batchId = request.nextUrl.searchParams.get('batchId');
    const address = request.nextUrl.searchParams.get('address');
    
    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
        { status: 400 }
      );
    }
    
    if (!address) {
      return NextResponse.json(
        { error: 'Bitcoin address is required' },
        { status: 400 }
      );
    }
    
    const batchIdNum = parseInt(batchId, 10);
    
    // Check if the batch is available (not sold out)
    const batchAvailable = await isBatchAvailable(batchIdNum);
    if (!batchAvailable) {
      // Get sold-out time from database
      const { rows } = await sql`
        SELECT sold_out_at 
        FROM batch_sold_out_times 
        WHERE batch_id = ${batchIdNum}
      `;
      
      const soldOutTime = rows.length > 0 ? rows[0].sold_out_at : Date.now();
      
      // If we don't have a record yet, create one
      if (rows.length === 0) {
        await sql`
          INSERT INTO batch_sold_out_times (batch_id, sold_out_at)
          VALUES (${batchIdNum}, ${new Date().toISOString()}::timestamp)
        `;
      }
      
      return NextResponse.json({
        eligible: false,
        reason: 'batch_sold_out',
        message: `Batch ${batchIdNum} is sold out`,
        soldOutAt: soldOutTime
      });
    }
    
    // Check if the address is whitelisted for this batch
    const isAddressWhitelisted = await isWhitelisted(address, batchIdNum);
    if (!isAddressWhitelisted) {
      // Check if address is whitelisted for any other batch
      let whitelistedBatch = null;
      for (let i = 1; i <= 16; i++) {
        const whitelisted = await isWhitelisted(address, i);
        if (whitelisted) {
          whitelistedBatch = i;
          break;
        }
      }

      return NextResponse.json({
        eligible: false,
        reason: 'not_whitelisted',
        message: whitelistedBatch 
          ? `Address ${address} is whitelisted for batch ${whitelistedBatch}, not for batch ${batchIdNum}` 
          : `Address ${address} is not whitelisted for batch ${batchIdNum}`,
        whitelistedBatch
      });
    }
    
    // Check if the address has already minted from this batch
    const hasMinted = await hasWalletMinted(batchIdNum, address);
    if (hasMinted) {
      return NextResponse.json({
        eligible: false,
        reason: 'already_minted',
        message: `Address ${address} has already minted from batch ${batchIdNum}`
      });
    }

    // Get all orders for this address
    const { rows: orderRows } = await sql`
      SELECT * FROM orders 
      WHERE btc_address = ${address} 
      AND (status = 'paid' OR status = 'completed')
    `;

    // Calculate total Tigers minted
    const totalTigersMinted = orderRows.reduce((total, order) => total + order.quantity, 0);
    
    if (totalTigersMinted >= MAX_TIGERS_PER_WALLET) {
      return NextResponse.json({
        eligible: false,
        reason: 'max_tigers_reached',
        message: `Address ${address} has already minted ${totalTigersMinted} Tigers (maximum: ${MAX_TIGERS_PER_WALLET})`
      });
    }
    
    // The address is eligible to mint
    const batchInfo = await getBatchInfo(batchIdNum);
    
    return NextResponse.json({
      eligible: true,
      batch: batchInfo
    });
  } catch (error: any) {
    console.error('Error in verify endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify address' },
      { status: 500 }
    );
  }
}