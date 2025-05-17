import { NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { addresses, batchId, admin_password } = body;
    
    // Verify admin password
    if (!admin_password || admin_password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    // Validate input
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json({ 
        error: 'Addresses must be a non-empty array' 
      }, { status: 400 });
    }
    
    if (!batchId || isNaN(Number(batchId))) {
      return NextResponse.json({ 
        error: 'Valid batchId is required' 
      }, { status: 400 });
    }

    // Get current whitelist
    const whitelist = await storage.getWhitelist();
    const now = new Date().toISOString();
    const batch = Number(batchId);
    
    // Process statistics
    const stats = {
      total: addresses.length,
      added: 0,
      updated: 0,
      invalid: 0,
      invalidAddresses: [] as string[]
    };
    
    // Process each address
    for (const address of addresses) {
      // Validate address format (must be Taproot)
      if (typeof address !== 'string' || !address.startsWith('bc1p')) {
        stats.invalid++;
        stats.invalidAddresses.push(address);
        continue;
      }
      
      // Check if address already exists
      const existingIndex = whitelist.findIndex(entry => entry.address === address);
      
      if (existingIndex !== -1) {
        // Update existing entry
        whitelist[existingIndex].batchId = batch;
        whitelist[existingIndex].createdAt = now;
        stats.updated++;
      } else {
        // Add new entry
        whitelist.push({
          address,
          batchId: batch,
          createdAt: now
        });
        stats.added++;
      }
    }
    
    // Save the updated whitelist
    const saveResult = await storage.saveWhitelist(whitelist);
    
    if (!saveResult) {
      return NextResponse.json({
        success: false,
        error: 'Failed to save whitelist'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      stats,
      message: `Successfully processed ${stats.total} addresses: added ${stats.added}, updated ${stats.updated}, invalid ${stats.invalid}`,
    });
    
  } catch (error) {
    console.error('Error in bulk whitelist:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Bulk whitelist API endpoint. Send a POST request with 'addresses' (array), 'batchId' (number), and 'admin_password' to add multiple addresses to the whitelist."
  });
} 