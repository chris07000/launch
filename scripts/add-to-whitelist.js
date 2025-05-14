// add-to-whitelist.js
// Script to add a wallet to the whitelist for a specific batch

const { createClient } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

// Get wallet address from command line argument
const walletAddress = process.argv[2];
const batchId = parseInt(process.argv[3] || '1', 10);

if (!walletAddress || !walletAddress.startsWith('bc1p')) {
  console.error('❌ Please provide a valid taproot wallet address (bc1p...)');
  console.error('Usage: node add-to-whitelist.js <wallet-address> [batch-id]');
  process.exit(1);
}

async function main() {
  const client = createClient({
    connectionString: process.env.POSTGRES_URL
  });
  
  try {
    console.log(`🔄 Adding wallet ${walletAddress} to batch #${batchId}...`);
    
    await client.connect();
    
    // Check if wallet already exists in whitelist
    const checkResult = await client.query(
      'SELECT * FROM whitelist WHERE address = $1',
      [walletAddress]
    );
    
    if (checkResult.rows.length > 0) {
      const existingBatch = checkResult.rows[0].batch_id;
      
      if (existingBatch === batchId) {
        console.log(`ℹ️ Wallet already whitelisted for batch #${batchId}`);
      } else {
        // Update existing wallet to new batch
        await client.query(
          'UPDATE whitelist SET batch_id = $1 WHERE address = $2',
          [batchId, walletAddress]
        );
        console.log(`✅ Updated wallet from batch #${existingBatch} to batch #${batchId}`);
      }
    } else {
      // Add new wallet to whitelist
      await client.query(
        'INSERT INTO whitelist (address, batch_id, created_at) VALUES ($1, $2, $3)',
        [walletAddress, batchId, new Date().toISOString()]
      );
      console.log(`✅ Successfully added wallet to batch #${batchId}`);
    }
    
    // Make sure the current batch isn't marked as sold out
    await client.query('UPDATE batches SET is_sold_out = false WHERE id = $1', [batchId]);
    console.log(`✅ Ensured batch #${batchId} is not marked as sold out`);
    
    // If this is batch 1, also update current_batch table
    if (batchId === 1) {
      await client.query('UPDATE current_batch SET sold_out_at = NULL WHERE current_batch = 1');
      console.log(`✅ Reset current_batch sold_out_at to NULL`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

main(); 