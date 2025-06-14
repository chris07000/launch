import * as storage from '@/lib/storage-wrapper-db-only';
import { Batch, WhitelistEntry } from '@/lib/types';
import { synchronizeBatchCounter } from '@/app/api/payment/verify/route';
import { sql } from '@vercel/postgres';

// Define default batches
const defaultBatches = [
  { id: 1, price: 250.00, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
  { id: 2, price: 260.71, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
  { id: 3, price: 271.43, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
  { id: 4, price: 282.14, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
  { id: 5, price: 292.86, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
  { id: 6, price: 303.57, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
  { id: 7, price: 314.29, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
  { id: 8, price: 325.00, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
  { id: 9, price: 335.71, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
  { id: 10, price: 346.43, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
  { id: 11, price: 357.14, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
  { id: 12, price: 367.86, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
  { id: 13, price: 378.57, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
  { id: 14, price: 389.29, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
  { id: 15, price: 400.00, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false },
  { id: 16, price: 450.00, mintedWallets: 0, maxWallets: 999, ordinals: 66, isSoldOut: false, isFCFS: true }
];

// Validate a Bitcoin Ordinal address (bc1p...)
function isValidOrdinalAddress(address: string): boolean {
  return typeof address === 'string' && address.startsWith('bc1p');
}

export const dynamic = 'force-dynamic';

// Handle GET requests
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');
    const action = searchParams.get('action');
    
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Invalid password' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Dashboard action
    if (action === 'dashboard') {
      try {
        // Get all data using storage wrapper
        const [whitelistedAddresses, batches, orders, mintedWallets, currentBatchInfo] = await Promise.all([
          storage.getWhitelist(),
          storage.getBatches(),
          storage.getOrders(),
          storage.getMintedWallets(),
          storage.getCurrentBatch()
        ]);

        // Calculate available slots for each batch based on whitelist
        const batchesWithAvailability = batches.map((batch: Batch) => {
          const whitelistedForBatch = whitelistedAddresses.filter((entry: WhitelistEntry) => entry.batchId === batch.id);
          return {
            ...batch,
            available: whitelistedForBatch.length
          };
        });

        // Return dashboard data
        return new Response(JSON.stringify({
          whitelistedAddresses,
          batches: batchesWithAvailability,
          currentBatch: currentBatchInfo.currentBatch,
      orders,
          mintedWallets
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('Dashboard error:', error);
        return new Response(JSON.stringify({ error: 'Error loading dashboard data.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Inscriptions action
    if (action === 'inscriptions') {
      try {
        // In a real implementation, you would fetch inscriptions from database
        // For now, we'll return an empty array
        return new Response(JSON.stringify({ inscriptions: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('Inscriptions error:', error);
        return new Response(JSON.stringify({ error: 'Error loading inscriptions.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error in admin GET:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle POST requests
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { action, password, address, batchId, inscriptionId, orderId, btcAddress, quantity } = data;
    
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Invalid password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle different actions
    if (action === 'addToWhitelist') {
      console.log('Adding to whitelist:', { address, batchId });
      
      // Validate the address
      if (!address) {
        console.log('Address is missing');
        return new Response(JSON.stringify({ error: 'Address is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (!isValidOrdinalAddress(address)) {
        console.log('Invalid ordinal address:', address);
        return new Response(JSON.stringify({ error: 'Invalid Ordinal address (must start with bc1p...)' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Check if batch is valid
      if (!batchId) {
        console.log('Batch ID is missing');
        return new Response(JSON.stringify({ error: 'Batch ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      try {
        // Get current whitelist
        const whitelist = await storage.getWhitelist();
        
        // Check if address is already whitelisted
        const existingIndex = whitelist.findIndex(entry => entry.address === address);
        
        if (existingIndex !== -1) {
          // Update the batch if the address already exists
          whitelist[existingIndex].batchId = batchId;
          whitelist[existingIndex].updatedAt = new Date().toISOString();
        } else {
          // Add address to whitelist
          whitelist.push({
            address,
            batchId,
            createdAt: new Date().toISOString()
          });
        }
        
        // Save whitelist
        await storage.saveWhitelist(whitelist);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: existingIndex !== -1 ? 'Address already in whitelist, batch updated' : 'Address added to whitelist' 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('Error adding to whitelist:', error);
        return new Response(JSON.stringify({ error: 'Failed to update whitelist' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    else if (action === 'removeFromWhitelist') {
      // Validate the address
      if (!address) {
        return new Response(JSON.stringify({ error: 'Address is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      try {
        // Get current whitelist
        const whitelist = await storage.getWhitelist();
        
        // Remove address from whitelist
        const updatedWhitelist = whitelist.filter(entry => entry.address !== address);
        
        // Save whitelist
        await storage.saveWhitelist(updatedWhitelist);
        
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('Error removing from whitelist:', error);
        return new Response(JSON.stringify({ error: 'Failed to update whitelist' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    else if (action === 'addOrder') {
      // Validate inputs
      if (!btcAddress) {
        return new Response(JSON.stringify({ error: 'Bitcoin address is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (!isValidOrdinalAddress(btcAddress)) {
        return new Response(JSON.stringify({ error: 'Invalid Ordinal address (must start with bc1p...)' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (!quantity || quantity <= 0 || quantity > 2) {
        return new Response(JSON.stringify({ error: 'Quantity must be between 1 and 2' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const actualBatchId = batchId || 1;
      
      try {
        // Get batches info
        const batches = await storage.getBatches();
        
        // Find the batch
        const batchIndex = batches.findIndex(b => b.id === actualBatchId);
        if (batchIndex === -1) {
          return new Response(JSON.stringify({ error: `Batch ${actualBatchId} does not exist` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Get the batch price
        const batchPrice = batches[batchIndex].price || 1.00;
        
        // Get orders
        const orders = await storage.getOrders();
        
        // Create a new order
        const newOrder = {
          id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          btcAddress,
          quantity,
          totalPrice: batchPrice * quantity,
          totalPriceUsd: batchPrice * quantity,
          pricePerUnit: batchPrice,
          pricePerUnitBtc: 0.00001, // Placeholder
          batchId: actualBatchId,
          paymentAddress: process.env.PAYMENT_BTC_WALLET || 'bc1qwfdxl0pq8d4tefd80enw3yae2k2dsszemrv6j0',
          paymentReference: Math.random().toString(36).substring(2, 10),
          status: 'paid' as 'pending' | 'paid' | 'completed' | 'failed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Add to orders array
        orders.push(newOrder);
        
        // Save orders
        await storage.saveOrders(orders);
        
        // Update minted wallets
        const mintedWallets = await storage.getMintedWallets();
        
        // Add to minted wallets
        mintedWallets.push({
          address: btcAddress,
          batchId: actualBatchId,
          quantity: 1, // Always 1 wallet, which gets quantity Tigers
          timestamp: new Date().toISOString()
        });
        
        // Save minted wallets
        await storage.saveMintedWallets(mintedWallets);
        
        // In plaats van handmatig de teller bij te werken, gebruiken we de synchronizatiefunctie
        await synchronizeBatchCounter(actualBatchId);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: `Order added and minted wallet registered for batch ${actualBatchId}`,
          orderId: newOrder.id
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('Error adding order:', error);
        return new Response(JSON.stringify({ error: 'Failed to add order' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    else if (action === 'reset') {
      try {
        // Reset whitelist
        await storage.saveWhitelist([]);
        
        // Reset orders
        await storage.saveOrders([]);
        
        // Reset minted wallets
        await storage.saveMintedWallets([]);
        
        // Reset batches to default state
        await storage.saveBatches(defaultBatches);
        
        // Reset current batch
        await storage.saveCurrentBatch({ currentBatch: 1, soldOutAt: null });
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'All data has been reset successfully' 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('Error resetting data:', error);
        return new Response(JSON.stringify({ error: 'Failed to reset data' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    // Add a new action to reset only orders and minted_wallets
    else if (action === 'reset-orders') {
      try {
        console.log('Resetting orders and minted_wallets only...');
        
        // Directe SQL TRUNCATE gebruiken voor orders en minted wallets
        const ordersTruncated = await storage.truncateOrders();
        console.log('Orders truncate result:', ordersTruncated);
        
        const walletsTruncated = await storage.truncateMintedWallets();
        console.log('Minted wallets truncate result:', walletsTruncated);
        
        // Voor de zekerheid ook nog een keer de leeg arrays proberen te saven
        await storage.saveOrders([]);
        await storage.saveMintedWallets([]);
        
        // Get current batches
        const batches = await storage.getBatches();
        
        // Reset mintedWallets counter for all batches
        const updatedBatches = batches.map(batch => ({
          ...batch,
          mintedWallets: 0
        }));
        
        // Save updated batches
        await storage.saveBatches(updatedBatches);
        console.log('Batch mintedWallets counters reset successfully');
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Orders and minted wallets have been reset successfully using TRUNCATE' 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('Error resetting orders and minted wallets:', error);
        return new Response(JSON.stringify({ error: 'Failed to reset orders and minted wallets' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    // Add a new action to correct the mintedWallets count for a specific batch
    else if (action === 'fix-batch-counter') {
      try {
        const { batchId, correctCount } = data;
        
        if (!batchId || correctCount === undefined) {
          return new Response(JSON.stringify({ error: 'batchId and correctCount are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Get the batches
        const batches = await storage.getBatches();
        
        // Find the batch to update
        const batchIndex = batches.findIndex(b => b.id === Number(batchId));
        
        if (batchIndex === -1) {
          return new Response(JSON.stringify({ error: `Batch ${batchId} not found` }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Update the mintedWallets count
        const oldCount = batches[batchIndex].mintedWallets;
        batches[batchIndex].mintedWallets = Number(correctCount);
        
        // Save the updated batches
        await storage.saveBatches(batches);
        
        // Log the change
        console.log(`Updated mintedWallets for batch ${batchId} from ${oldCount} to ${correctCount}`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: `Updated mintedWallets for batch ${batchId} from ${oldCount} to ${correctCount}` 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('Error fixing batch counter:', error);
        return new Response(JSON.stringify({ error: 'Failed to fix batch counter' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    // Add a new action to recalculate all mintedWallets counters based on actual data
    else if (action === 'recalculate-batch-wallets') {
      try {
        // Get all minted wallets
        const mintedWallets = await storage.getMintedWallets();
        
        // Get all batches
        const batches = await storage.getBatches();
        
        // Create a counter for each batch
        const batchCounts: Record<number, number> = {};
        
        // Initialize counts with 0
        batches.forEach(batch => {
          batchCounts[batch.id] = 0;
        });
        
        // Count wallets per batch, considering quantity
        mintedWallets.forEach(wallet => {
          if (batchCounts[wallet.batchId] !== undefined) {
            // Add the quantity of minted ordinals, not just count the wallet once
            batchCounts[wallet.batchId] += wallet.quantity;
          }
        });
        
        // Update each batch with the correct count
        let changes = 0;
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const correctCount = batchCounts[batch.id] || 0;
          
          if (batch.mintedWallets !== correctCount) {
            console.log(`Updating batch ${batch.id} mintedWallets from ${batch.mintedWallets} to ${correctCount}`);
            batches[i].mintedWallets = correctCount;
            changes++;
          }
        }
        
        // Save updated batches
        if (changes > 0) {
          await storage.saveBatches(batches);
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: `Recalculated mintedWallets counters based on quantity. Updated ${changes} batch(es).`,
          batchCounts
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('Error recalculating batch wallets:', error);
        return new Response(JSON.stringify({ error: 'Failed to recalculate batch wallets' }), {
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    // Quick fix for batch 1 counter
    else if (action === 'fix-batch-1') {
      try {
        // Get all batches
        const batches = await storage.getBatches();
        
        // Find batch 1
        const batchIndex = batches.findIndex(b => b.id === 1);
        
        if (batchIndex === -1) {
          return new Response(JSON.stringify({ error: 'Batch 1 not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Force set to 1 minted wallet
        const oldCount = batches[batchIndex].mintedWallets;
        batches[batchIndex].mintedWallets = 1;
        
        // Save updated batches
        await storage.saveBatches(batches);
        
        return new Response(JSON.stringify({
          success: true,
          message: `Updated batch 1 mintedWallets from ${oldCount} to 1`
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('Error fixing batch 1:', error);
        return new Response(JSON.stringify({ error: 'Failed to fix batch 1' }), {
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    // Volledige data reset die alles wist inclusief transactiegeschiedenis
    else if (action === 'reset-all-data') {
      try {
        console.log('COMPLETE DATA RESET: Resetting all application data...');
        
        // Reset orders
        await storage.saveOrders([]);
        console.log('Orders reset successfully');
        
        // Reset minted wallets
        await storage.saveMintedWallets([]);
        console.log('Minted wallets reset successfully');
        
        // Reset whitelist
        await storage.saveWhitelist([]);
        console.log('Whitelist reset successfully');
        
        // Reset batches to default state met 0 mintedWallets
        // Maak een diepe kopie van de defaultBatches om te zorgen dat we originele waarden gebruiken
        const freshBatches = JSON.parse(JSON.stringify(defaultBatches));
        
        // Zorg ervoor dat mintedWallets op 0 staat voor alle batches
        freshBatches.forEach((batch: any) => {
          batch.mintedWallets = 0;
          batch.isSoldOut = false;
        });
        
        await storage.saveBatches(freshBatches);
        console.log('Batches reset to default values successfully');
        
        // Reset current batch to 1
        await storage.saveCurrentBatch({ currentBatch: 1, soldOutAt: null });
        console.log('Current batch reset to 1 successfully');
        
        // Reset transaction history in database door de tabel te legen
        try {
          await sql`TRUNCATE used_transactions`;
          console.log('Transaction history cleared successfully');
        } catch (sqlError) {
          console.error('Error clearing transaction history:', sqlError);
          // Fail silently, this isn't critical
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Complete data reset successful - all application data has been reset to initial state' 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('Error during complete data reset:', error);
        return new Response(JSON.stringify({ error: 'Failed to reset all data' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    // FORCE RESET: Direct SQL gebruiken om alle tabellen te legen
    else if (action === 'force-reset') {
      try {
        console.log('FORCE RESET: Resetting all database tables directly with SQL...');
        
        // Gebruik directe SQL queries om tabellen te legen - dit is gegarandeerd effectief
        try {
          await sql`TRUNCATE orders RESTART IDENTITY CASCADE`;
          console.log('Orders table truncated successfully');
        } catch (sqlError) {
          console.error('Error truncating orders table:', sqlError);
        }
        
        try {
          await sql`TRUNCATE minted_wallets RESTART IDENTITY CASCADE`;
          console.log('Minted wallets table truncated successfully');
        } catch (sqlError) {
          console.error('Error truncating minted_wallets table:', sqlError);
        }
        
        try {
          await sql`TRUNCATE whitelist RESTART IDENTITY CASCADE`;
          console.log('Whitelist table truncated successfully');
        } catch (sqlError) {
          console.error('Error truncating whitelist table:', sqlError);
        }
        
        try {
          await sql`TRUNCATE used_transactions RESTART IDENTITY CASCADE`;
          console.log('Transactions table truncated successfully');
        } catch (sqlError) {
          console.error('Error truncating used_transactions table:', sqlError);
        }
        
        // Reset batches with direct SQL
        try {
          await sql`TRUNCATE batches RESTART IDENTITY CASCADE`;
          console.log('Batches table truncated successfully');
          
          // Herinitialiseren van batches tabel met default waarden
          for (const batch of defaultBatches) {
            await sql`
              INSERT INTO batches (id, price, minted_wallets, max_wallets, ordinals, is_sold_out, is_fcfs)
              VALUES (${batch.id}, ${batch.price}, 0, ${batch.maxWallets}, ${batch.ordinals}, false, ${batch.isFCFS || false})
            `;
          }
          console.log('Batches table reinitialized with default values');
        } catch (sqlError) {
          console.error('Error resetting batches table:', sqlError);
        }
        
        // Reset current_batch table
        try {
          await sql`TRUNCATE current_batch RESTART IDENTITY CASCADE`;
          await sql`INSERT INTO current_batch (current_batch, sold_out_at) VALUES (1, NULL)`;
          console.log('Current batch reset to 1 successfully');
        } catch (sqlError) {
          console.error('Error resetting current_batch table:', sqlError);
        }
        
        // Toch ook nog de storage functies aanroepen voor consistentie
        await storage.saveOrders([]);
        await storage.saveMintedWallets([]);
        await storage.saveWhitelist([]);
        
        // Reset batches to default state met 0 mintedWallets
        const freshBatches = JSON.parse(JSON.stringify(defaultBatches));
        freshBatches.forEach((batch: any) => {
          batch.mintedWallets = 0;
          batch.isSoldOut = false;
        });
        await storage.saveBatches(freshBatches);
        
        // Reset current batch to 1
        await storage.saveCurrentBatch({ currentBatch: 1, soldOutAt: null });
        
        // Voer nog een verplichte synchronisatie uit om zeker te zijn dat alles klopt
        await synchronizeBatchCounter(1); // Synchroniseer batch 1
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'FORCE RESET successful - all database tables have been directly truncated and reinitialized' 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        console.error('Error during force reset:', error);
        return new Response(JSON.stringify({ error: 'Failed to force reset all data: ' + error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error: any) {
    console.error('Error in admin POST:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 