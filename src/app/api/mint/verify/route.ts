import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isWalletEligible, isWhitelisted, hasWalletMinted, isBatchAvailable, getBatchInfo, orders, MAX_TIGERS_PER_WALLET } from '@/api/mint';

export async function GET(request: NextRequest) {
  try {
    // Get the batchId and address from the URL
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const address = searchParams.get('address');
    
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
    if (!isBatchAvailable(batchIdNum)) {
      // Get sold-out time
      const soldOutFile = path.join(process.cwd(), 'data', 'sold-out-times.json');
      let soldOutTime = null;
      
      try {
        if (fs.existsSync(soldOutFile)) {
          const soldOutTimes = JSON.parse(fs.readFileSync(soldOutFile, 'utf8'));
          soldOutTime = soldOutTimes[batchIdNum];
          
          // Als de batch net sold out is en we hebben geen tijd, sla de huidige tijd op
          if (!soldOutTime) {
            soldOutTime = Date.now();
            soldOutTimes[batchIdNum] = soldOutTime;
            fs.writeFileSync(soldOutFile, JSON.stringify(soldOutTimes));
          }
        } else {
          // Maak nieuw bestand als het niet bestaat
          const soldOutTimes = { [batchIdNum]: Date.now() };
          fs.writeFileSync(soldOutFile, JSON.stringify(soldOutTimes));
          soldOutTime = soldOutTimes[batchIdNum];
        }
      } catch (e) {
        console.error('Error handling sold-out times:', e);
      }
      
      return NextResponse.json({
        eligible: false,
        reason: 'batch_sold_out',
        message: `Batch ${batchIdNum} is sold out`,
        soldOutAt: soldOutTime
      });
    }
    
    // Check if the address is whitelisted for this batch
    if (!isWhitelisted(address, batchIdNum)) {
      // Check if address is whitelisted for any other batch
      let whitelistedBatch = null;
      for (let i = 1; i <= 16; i++) {
        if (isWhitelisted(address, i)) {
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
    if (hasWalletMinted(batchIdNum, address)) {
      return NextResponse.json({
        eligible: false,
        reason: 'already_minted',
        message: `Address ${address} has already minted from batch ${batchIdNum}`
      });
    }

    // Check total Tigers minted by this wallet
    let totalTigersMinted = 0;
    for (const orderId in orders) {
      const order = orders[orderId];
      if ((order.status === 'paid' || order.status === 'completed') && 
          order.btcAddress === address) {
        totalTigersMinted += order.quantity;
      }
    }
    
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