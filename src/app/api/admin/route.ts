import { NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper';
import { Batch, WhitelistEntry } from '@/lib/types';

// Define default batches
const defaultBatches = [
  { id: 1, price: 250.00, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 2, price: 260.71, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 3, price: 271.43, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 4, price: 282.14, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 5, price: 292.86, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 6, price: 303.57, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 7, price: 314.29, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 8, price: 325.00, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 9, price: 335.71, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 10, price: 346.43, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 11, price: 357.14, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 12, price: 367.86, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 13, price: 378.57, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 14, price: 389.29, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 15, price: 400.00, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
  { id: 16, price: 450.00, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false, isFCFS: true }
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
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
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
        return NextResponse.json({
          whitelistedAddresses,
          batches: batchesWithAvailability,
          currentBatch: currentBatchInfo.currentBatch,
          orders,
          mintedWallets
        });
      } catch (error: any) {
        console.error('Dashboard error:', error);
        return NextResponse.json({ error: 'Error loading dashboard data.' }, { status: 500 });
      }
    }

    // Inscriptions action
    if (action === 'inscriptions') {
      try {
        // In a real implementation, you would fetch inscriptions from database
        // For now, we'll return an empty array
        return NextResponse.json({ inscriptions: [] });
      } catch (error: any) {
        console.error('Inscriptions error:', error);
        return NextResponse.json({ error: 'Error loading inscriptions.' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in admin GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Handle POST requests
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { action, password, address, batchId, inscriptionId, orderId, btcAddress, quantity } = data;
    
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Handle different actions
    if (action === 'addToWhitelist') {
      console.log('Adding to whitelist:', { address, batchId });
      
      // Validate the address
      if (!address) {
        console.log('Address is missing');
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
      }
      
      if (!isValidOrdinalAddress(address)) {
        console.log('Invalid ordinal address:', address);
        return NextResponse.json({ error: 'Invalid Ordinal address (must start with bc1p...)' }, { status: 400 });
      }
      
      // Check if batch is valid
      if (!batchId) {
        console.log('Batch ID is missing');
        return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
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
        
        return NextResponse.json({ 
          success: true, 
          message: existingIndex !== -1 ? 'Address already in whitelist, batch updated' : 'Address added to whitelist' 
        });
      } catch (error: any) {
        console.error('Error adding to whitelist:', error);
        return NextResponse.json({ error: 'Failed to update whitelist' }, { status: 500 });
      }
    }
    else if (action === 'removeFromWhitelist') {
      // Validate the address
      if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
      }
      
      try {
        // Get current whitelist
        const whitelist = await storage.getWhitelist();
        
        // Remove address from whitelist
        const updatedWhitelist = whitelist.filter(entry => entry.address !== address);
        
        // Save whitelist
        await storage.saveWhitelist(updatedWhitelist);
        
        return NextResponse.json({ success: true });
      } catch (error: any) {
        console.error('Error removing from whitelist:', error);
        return NextResponse.json({ error: 'Failed to update whitelist' }, { status: 500 });
      }
    }
    else if (action === 'addOrder') {
      // Validate inputs
      if (!btcAddress) {
        return NextResponse.json({ error: 'Bitcoin address is required' }, { status: 400 });
      }
      
      if (!isValidOrdinalAddress(btcAddress)) {
        return NextResponse.json({ error: 'Invalid Ordinal address (must start with bc1p...)' }, { status: 400 });
      }
      
      if (!quantity || quantity <= 0 || quantity > 2) {
        return NextResponse.json({ error: 'Quantity must be between 1 and 2' }, { status: 400 });
      }
      
      const actualBatchId = batchId || 1;
      
      try {
        // Get batches info
        const batches = await storage.getBatches();
        
        // Find the batch
        const batchIndex = batches.findIndex(b => b.id === actualBatchId);
        if (batchIndex === -1) {
          return NextResponse.json({ error: `Batch ${actualBatchId} does not exist` }, { status: 400 });
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
        
        // Update batches - increment mintedWallets by 1
        batches[batchIndex].mintedWallets += 1;
        await storage.saveBatches(batches);
        
        return NextResponse.json({ 
          success: true, 
          message: `Order added and minted wallet registered for batch ${actualBatchId}`,
          orderId: newOrder.id
        });
      } catch (error: any) {
        console.error('Error adding order:', error);
        return NextResponse.json({ error: 'Failed to add order' }, { status: 500 });
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
        
        return NextResponse.json({ 
          success: true, 
          message: 'All data has been reset successfully' 
        });
      } catch (error: any) {
        console.error('Error resetting data:', error);
        return NextResponse.json({ error: 'Failed to reset data' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in admin POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 