import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { validateAdminPassword } from '@/api/mint';

export async function POST(request: NextRequest) {
  try {
    const { batchId, maxWallets, adminPassword } = await request.json();

    // Validate admin password
    if (!validateAdminPassword(adminPassword)) {
      return NextResponse.json(
        { error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    // Validate input
    if (!batchId || !maxWallets || maxWallets < 1) {
      return NextResponse.json(
        { error: 'Invalid batch ID or wallet limit' },
        { status: 400 }
      );
    }

    // Read current batches
    const batchesFile = path.join(process.cwd(), 'data', 'batches.json');
    let batches = [];
    
    if (fs.existsSync(batchesFile)) {
      const batchesData = fs.readFileSync(batchesFile, 'utf8');
      batches = JSON.parse(batchesData || '[]');
    }

    // Find and update the batch
    const batchIndex = batches.findIndex((b: any) => b.id === batchId);
    if (batchIndex === -1) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    // Update maxWallets for the batch
    batches[batchIndex].maxWallets = maxWallets;

    // Save updated batches
    fs.writeFileSync(batchesFile, JSON.stringify(batches, null, 2));

    return NextResponse.json({
      success: true,
      message: `Updated wallet limit for batch ${batchId} to ${maxWallets}`
    });

  } catch (error: any) {
    console.error('Error in set-wallet-limit endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update wallet limit' },
      { status: 500 }
    );
  }
} 