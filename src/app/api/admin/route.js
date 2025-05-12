import * as storage from '@/lib/storage-wrapper-db-only';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const adminPassword = url.searchParams.get('password');
    
    // Check admin password
    const expectedPassword = process.env.ADMIN_PASSWORD || 'bitcointigers2024';
    if (adminPassword !== expectedPassword) {
      return new Response(JSON.stringify({
        error: 'Invalid admin password'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Process action
    if (action === 'getOrders') {
      const orders = await storage.getOrders();
      return new Response(JSON.stringify({
        success: true,
        orders
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'getWhitelist') {
      const whitelist = await storage.getWhitelist();
      return new Response(JSON.stringify({
        success: true,
        whitelist
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'dashboard') {
      const [batches, whitelist, orders, mintedWallets, currentBatchInfo] = await Promise.all([
        storage.getBatches(),
        storage.getWhitelist(),
        storage.getOrders(),
        storage.getMintedWallets(),
        storage.getCurrentBatch()
      ]);
      
      return new Response(JSON.stringify({
        success: true,
        batches,
        whitelistedAddresses: whitelist,
        orders,
        mintedWallets,
        currentBatch: currentBatchInfo.currentBatch
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Invalid action',
      availableActions: ['getOrders', 'getWhitelist', 'dashboard']
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Admin API error:', error);
    return new Response(JSON.stringify({
      error: 'Admin API error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { action, password, address, batchId } = data;
    
    // Check admin password
    const expectedPassword = process.env.ADMIN_PASSWORD || 'bitcointigers2024';
    if (password !== expectedPassword) {
      return new Response(JSON.stringify({
        error: 'Invalid admin password'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Add to whitelist
    if (action === 'addToWhitelist') {
      if (!address) {
        return new Response(JSON.stringify({
          error: 'Address is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Validate address format
      if (!address.startsWith('bc1p')) {
        return new Response(JSON.stringify({
          error: 'Invalid Ordinal address (must start with bc1p)'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Get current whitelist
      const whitelist = await storage.getWhitelist();
      
      // Check if address already exists
      const existingIndex = whitelist.findIndex(entry => entry.address === address);
      
      if (existingIndex !== -1) {
        // Update existing whitelist entry
        whitelist[existingIndex].batchId = batchId || 1;
        whitelist[existingIndex].updatedAt = new Date().toISOString();
      } else {
        // Add new whitelist entry
        whitelist.push({
          address,
          batchId: batchId || 1,
          createdAt: new Date().toISOString()
        });
      }
      
      // Save whitelist
      await storage.saveWhitelist(whitelist);
      
      return new Response(JSON.stringify({
        success: true,
        message: existingIndex !== -1 ? 'Address batch updated' : 'Address added to whitelist'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Remove from whitelist
    if (action === 'removeFromWhitelist') {
      if (!address) {
        return new Response(JSON.stringify({
          error: 'Address is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Get current whitelist
      const whitelist = await storage.getWhitelist();
      
      // Filter out the address
      const updatedWhitelist = whitelist.filter(entry => entry.address !== address);
      
      // Save whitelist
      await storage.saveWhitelist(updatedWhitelist);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Address removed from whitelist'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Invalid action',
      availableActions: ['addToWhitelist', 'removeFromWhitelist']
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Admin API error:', error);
    return new Response(JSON.stringify({
      error: 'Admin API error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 