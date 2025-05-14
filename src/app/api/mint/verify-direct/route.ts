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
    
    console.log(`DIRECT VERIFY: Checking address ${address} for batch ${requestedBatchId}`);
    
    // HARDCODED TEST: Als het adres bc1p56... is, forceer whitelisting voor batch 1
    const testAddress = "bc1p56aezm44a9yvnrkx0eduqrgf7rdjl6l7fnv0at3wm9stt36hfvaqjwqda8";
    
    // Direct check of adres in whitelist staat
    const whitelistQuery = await sql`SELECT * FROM whitelist WHERE address = ${address}`;
    const whitelistedBatchId = whitelistQuery.rows.length > 0 ? whitelistQuery.rows[0].batch_id : null;
    
    console.log(`Direct SQL whitelist check: address ${address} is ${whitelistQuery.rows.length > 0 ? 'FOUND' : 'NOT FOUND'}`);
    
    // Als adres niet in whitelist staat maar overeenkomt met testadres, voeg dan toe
    if (whitelistQuery.rows.length === 0 && address === testAddress) {
      try {
        await sql`
          INSERT INTO whitelist (address, batch_id, created_at)
          VALUES (${address}, 1, ${new Date().toISOString()})
        `;
        console.log(`ADDED TEST ADDRESS ${address} to whitelist for batch 1`);
      } catch (error) {
        console.error(`Error adding test address to whitelist:`, error);
      }
    }
    
    // Krijg batch info
    const batchQuery = await sql`SELECT * FROM batches WHERE id = ${requestedBatchId}`;
    if (batchQuery.rows.length === 0) {
      return NextResponse.json({
        eligible: false,
        reason: 'invalid_batch',
        message: `Batch #${requestedBatchId} not found`,
        whitelistedBatch: whitelistedBatchId
      });
    }
    
    const batch = batchQuery.rows[0];
    
    // Reset batch 1 direct als die sold out is maar 0 wallets heeft
    if (batch.is_sold_out && batch.minted_wallets === 0 && requestedBatchId === 1) {
      try {
        await sql`UPDATE batches SET is_sold_out = false WHERE id = 1`;
        await sql`UPDATE current_batch SET sold_out_at = NULL WHERE current_batch = 1`;
        console.log(`Reset batch 1 sold_out status because it had 0 minted wallets`);
        batch.is_sold_out = false;
      } catch (error) {
        console.error(`Error resetting batch status:`, error);
      }
    }
    
    // Check of batch sold out is
    if (batch.is_sold_out) {
      return NextResponse.json({
        eligible: false,
        reason: 'batch_sold_out',
        whitelistedBatch: whitelistedBatchId,
        message: `Batch #${requestedBatchId} is sold out`
      });
    }
    
    // SPECIALE REGELING: Als het adres testAddress is, sta dan altijd minten toe
    if (address === testAddress) {
      console.log(`ALLOWING TEST ADDRESS ${address} to mint from batch ${requestedBatchId}`);
      return NextResponse.json({
        eligible: true,
        batchId: requestedBatchId,
        whitelistedBatch: 1,
        message: `Test address is eligible to mint from batch #${requestedBatchId}`,
        isTestWallet: true
      });
    }
    
    // Check of wallet is whitelisted
    if (!whitelistedBatchId) {
      return NextResponse.json({
        eligible: false,
        reason: 'not_whitelisted',
        message: 'Address is not whitelisted for any batch'
      });
    }
    
    // Check of het adres al heeft gemint
    const mintedWalletsQuery = await sql`SELECT * FROM minted_wallets WHERE address = ${address} AND batch_id = ${requestedBatchId}`;
    if (mintedWalletsQuery.rows.length > 0) {
      return NextResponse.json({
        eligible: false,
        reason: 'already_minted',
        whitelistedBatch: whitelistedBatchId,
        message: `Address has already minted from batch #${requestedBatchId}`
      });
    }
    
    // Eenvoudig: check of het wallet op de whitelist staat voor de juiste batch of voor een eerder uitverkochte batch
    if (whitelistedBatchId === requestedBatchId) {
      // Perfect, adres is gewhitelist voor deze batch
      return NextResponse.json({
        eligible: true,
        batchId: requestedBatchId,
        whitelistedBatch: whitelistedBatchId,
        message: `Address is eligible to mint from batch #${requestedBatchId}`
      });
    } else {
      // Adres is gewhitelist voor een andere batch - check of die batch sold out is
      const whitelistedBatchQuery = await sql`SELECT * FROM batches WHERE id = ${whitelistedBatchId}`;
      const isWhitelistedBatchSoldOut = whitelistedBatchQuery.rows.length > 0 ? whitelistedBatchQuery.rows[0].is_sold_out : false;
      
      if (isWhitelistedBatchSoldOut) {
        // Originele batch is sold out, we staan upgraden toe
        return NextResponse.json({
          eligible: true,
          batchId: requestedBatchId,
          whitelistedBatch: whitelistedBatchId,
          message: `Address is eligible to mint from batch #${requestedBatchId} (upgraded from sold-out batch #${whitelistedBatchId})`
        });
      } else {
        // Originele batch is niet sold out, adres moet van die batch minten
        return NextResponse.json({
          eligible: false,
          reason: 'not_whitelisted_for_batch',
          whitelistedBatch: whitelistedBatchId,
          message: `Address is whitelisted for batch #${whitelistedBatchId}, not for batch #${requestedBatchId}`
        });
      }
    }
  } catch (error) {
    console.error('Verify endpoint error:', error);
    return NextResponse.json({
      eligible: false,
      reason: 'error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 