// fix-whitelist.js
// Script to diagnose and fix issues with whitelist and batch status

const { createClient } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = createClient({
    connectionString: process.env.POSTGRES_URL
  });
  
  try {
    console.log("🔄 Connecting to database...");
    await client.connect();
    console.log("✅ Connected to database successfully");

    // 1. Check batch status
    console.log("\n📊 CHECKING BATCH STATUS");
    const batchesResult = await client.query('SELECT * FROM batches ORDER BY id');
    const batches = batchesResult.rows;
    
    console.log(`Found ${batches.length} batches:`);
    batches.forEach(batch => {
      console.log(`Batch #${batch.id}: ${batch.minted_wallets}/${batch.max_wallets} wallets, ${batch.minted_tigers || 0}/${batch.ordinals} tigers, Sold out: ${batch.is_sold_out}`);
    });

    // 2. Check current batch information
    console.log("\n🔍 CHECKING CURRENT BATCH INFO");
    const currentBatchResult = await client.query('SELECT * FROM current_batch');
    const currentBatch = currentBatchResult.rows[0];
    
    console.log(`Current batch: #${currentBatch.current_batch}`);
    console.log(`Sold out at: ${currentBatch.sold_out_at || 'Not sold out'}`);

    // 3. Check whitelist
    console.log("\n📋 CHECKING WHITELIST");
    const whitelistResult = await client.query('SELECT * FROM whitelist ORDER BY batch_id');
    const whitelist = whitelistResult.rows;
    
    console.log(`Found ${whitelist.length} whitelisted addresses:`);
    
    const whitelistByBatch = {};
    whitelist.forEach(entry => {
      const batchId = entry.batch_id;
      if (!whitelistByBatch[batchId]) {
        whitelistByBatch[batchId] = [];
      }
      whitelistByBatch[batchId].push(entry.address);
    });
    
    Object.keys(whitelistByBatch).forEach(batchId => {
      console.log(`Batch #${batchId}: ${whitelistByBatch[batchId].length} addresses`);
    });

    // 4. Check minted wallets
    console.log("\n💰 CHECKING MINTED WALLETS");
    const mintedWalletsResult = await client.query('SELECT * FROM minted_wallets');
    const mintedWallets = mintedWalletsResult.rows;
    
    console.log(`Found ${mintedWallets.length} minted wallets:`);
    
    const mintedByBatch = {};
    mintedWallets.forEach(wallet => {
      const batchId = wallet.batch_id;
      if (!mintedByBatch[batchId]) {
        mintedByBatch[batchId] = [];
      }
      mintedByBatch[batchId].push(wallet.address);
    });
    
    Object.keys(mintedByBatch).forEach(batchId => {
      console.log(`Batch #${batchId}: ${mintedByBatch[batchId].length} minted wallets`);
    });

    // 5. Check specific wallet status (example)
    const testWallet = "bc1p56aezm44a9yvnrkx0eduqrgf7rdjl6l7fnv0at3wm9stt36hfvaqjwqda8";
    console.log(`\n🔍 CHECKING SPECIFIC WALLET: ${testWallet}`);
    
    const walletWhitelist = whitelist.filter(entry => entry.address === testWallet);
    if (walletWhitelist.length > 0) {
      console.log(`✅ Wallet is whitelisted for Batch #${walletWhitelist[0].batch_id}`);
    } else {
      console.log(`❌ Wallet is NOT on the whitelist`);
    }
    
    const walletMinted = mintedWallets.filter(entry => entry.address === testWallet);
    if (walletMinted.length > 0) {
      console.log(`❌ Wallet has already minted from Batch #${walletMinted[0].batch_id}`);
    } else {
      console.log(`✅ Wallet has NOT minted yet`);
    }

    // 6. Offer to fix issues
    if (batches[0].is_sold_out && batches[0].minted_wallets === 0 && batches[0].minted_tigers === 0) {
      console.log("\n🔧 FIXES AVAILABLE");
      console.log("Issue detected: Batch #1 is marked as sold out but has 0 minted wallets/tigers");
      console.log("Would you like to fix this issue? Run the script with --fix flag");
      
      // Check for --fix flag
      if (process.argv.includes('--fix')) {
        console.log("\n🛠️ APPLYING FIXES");
        
        // Fix 1: Reset batch 1 sold out status
        await client.query('UPDATE batches SET is_sold_out = false WHERE id = 1');
        console.log("✅ Reset Batch #1 sold_out status to false");
        
        // Fix 2: Reset current batch sold_out_at
        await client.query('UPDATE current_batch SET sold_out_at = NULL WHERE current_batch = 1');
        console.log("✅ Reset current_batch sold_out_at to NULL");
        
        // Fix 3: Add the test wallet to whitelist if not already there
        if (walletWhitelist.length === 0) {
          await client.query('INSERT INTO whitelist (address, batch_id, created_at) VALUES ($1, 1, $2)', 
                            [testWallet, new Date().toISOString()]);
          console.log(`✅ Added wallet ${testWallet} to Batch #1 whitelist`);
        }
        
        console.log("\n🎉 Fixes applied successfully! Please try minting again.");
      }
    } else if (walletWhitelist.length === 0 && testWallet.startsWith('bc1p')) {
      console.log("\n🔧 FIXES AVAILABLE");
      console.log(`Test wallet ${testWallet} is not on whitelist`);
      
      if (process.argv.includes('--fix')) {
        await client.query('INSERT INTO whitelist (address, batch_id, created_at) VALUES ($1, 1, $2)', 
                          [testWallet, new Date().toISOString()]);
        console.log(`✅ Added wallet ${testWallet} to Batch #1 whitelist`);
      }
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.end();
    console.log("\n👋 Disconnected from database");
  }
}

main(); 