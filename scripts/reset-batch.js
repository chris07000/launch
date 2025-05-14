// reset-batch.js
// Script to reset a batch's status in the database

const { createClient } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

// Get batch ID from command line argument
const batchId = parseInt(process.argv[2] || '1', 10);

async function main() {
  const client = createClient({
    connectionString: process.env.POSTGRES_URL
  });
  
  try {
    console.log(`🔄 Resetting status for batch #${batchId}...`);
    
    await client.connect();
    
    // Get current batch info
    const batchResult = await client.query('SELECT * FROM batches WHERE id = $1', [batchId]);
    
    if (batchResult.rows.length === 0) {
      console.error(`❌ Batch #${batchId} not found in database`);
      return;
    }
    
    const batch = batchResult.rows[0];
    console.log('Current batch status:', {
      id: batch.id,
      mintedWallets: batch.minted_wallets,
      maxWallets: batch.max_wallets,
      mintedTigers: batch.minted_tigers,
      ordinals: batch.ordinals,
      isSoldOut: batch.is_sold_out
    });
    
    // Reset batch status
    await client.query(`
      UPDATE batches 
      SET is_sold_out = false,
          minted_wallets = 0,
          minted_tigers = 0
      WHERE id = $1
    `, [batchId]);
    
    console.log(`✅ Reset batch #${batchId} status to not sold out and 0 minted wallets/tigers`);
    
    // If this is the current batch, also reset current_batch
    const currentBatchResult = await client.query('SELECT * FROM current_batch');
    const currentBatchId = currentBatchResult.rows[0]?.current_batch;
    
    if (currentBatchId === batchId) {
      await client.query('UPDATE current_batch SET sold_out_at = NULL WHERE current_batch = $1', [batchId]);
      console.log(`✅ Reset current_batch sold_out_at to NULL`);
    }
    
    // Reset minted wallets for this batch
    await client.query('DELETE FROM minted_wallets WHERE batch_id = $1', [batchId]);
    console.log(`✅ Removed all minted wallets for batch #${batchId}`);
    
    // Get new batch status to confirm
    const newBatchResult = await client.query('SELECT * FROM batches WHERE id = $1', [batchId]);
    const newBatch = newBatchResult.rows[0];
    
    console.log('New batch status:', {
      id: newBatch.id,
      mintedWallets: newBatch.minted_wallets,
      maxWallets: newBatch.max_wallets,
      mintedTigers: newBatch.minted_tigers,
      ordinals: newBatch.ordinals,
      isSoldOut: newBatch.is_sold_out
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('👋 Disconnected from database');
  }
}

main(); 