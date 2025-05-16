import { NextRequest, NextResponse } from 'next/server';
import { getOrderStatus, updateOrderStatus, markTransactionAsUsed } from '@/api/mint';
import * as storage from '@/lib/storage-wrapper-db-only';

export const dynamic = 'force-dynamic';

/**
 * Admin endpoint to manually fix orders by associating a transaction with them
 * POST /api/admin/fix-payment
 */
export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    const { orderId, txId, adminKey } = body;
    
    // Validate required fields
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    if (!txId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }
    
    // Validate admin key
    const validAdminKey = process.env.ADMIN_API_KEY;
    if (!validAdminKey || adminKey !== validAdminKey) {
      console.log('Unauthorized admin action attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Get order status
    let orderStatus;
    try {
      orderStatus = await getOrderStatus(orderId);
    } catch (error) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    console.log(`Admin fixing order ${orderId}, current status: ${orderStatus.status}`);
    
    // Mark the transaction as used for this order
    try {
      const amountBtc = typeof orderStatus.totalPrice === 'string' 
        ? parseFloat(orderStatus.totalPrice) 
        : orderStatus.totalPrice;
        
      await markTransactionAsUsed(txId, orderId, amountBtc);
      console.log(`Marked transaction ${txId} as used for order ${orderId}`);
    } catch (error) {
      console.error('Error marking transaction as used:', error);
      return NextResponse.json({ 
        error: 'Failed to mark transaction as used',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
    
    // Update order status to paid
    await updateOrderStatus(orderId, 'paid');
    
    // Update minted wallets list
    try {
      const mintedWallets = await storage.getMintedWallets();
      
      // Check if wallet is already in the list
      const existingWalletIndex = mintedWallets.findIndex(
        (w) => w.address === orderStatus.btcAddress && w.batchId === orderStatus.batchId
      );
      
      if (existingWalletIndex === -1) {
        // Add wallet to minted_wallets list
        mintedWallets.push({
          address: orderStatus.btcAddress,
          batchId: orderStatus.batchId,
          quantity: orderStatus.quantity,
          timestamp: new Date().toISOString()
        });
        await storage.saveMintedWallets(mintedWallets);
        console.log(`Added wallet ${orderStatus.btcAddress} to minted_wallets for batch ${orderStatus.batchId}`);
      }
      
      // Update batch counters - optional but ensures the mint count is accurate
      const batches = await storage.getBatches();
      const batchIndex = batches.findIndex(b => b.id === orderStatus.batchId);
      
      if (batchIndex !== -1) {
        // Increment mintedWallets counter
        batches[batchIndex].mintedWallets += 1;
        
        // Update mintedTigers directly if it exists
        if (batches[batchIndex].mintedTigers !== undefined) {
          batches[batchIndex].mintedTigers += orderStatus.quantity;
        } else {
          // If mintedTigers doesn't exist, calculate it
          batches[batchIndex].mintedTigers = batches[batchIndex].mintedWallets * 2;
        }
        
        // Save batches
        await storage.saveBatches(batches);
        console.log(`Updated batch counters for batch ${orderStatus.batchId}`);
      }
    } catch (error) {
      console.error('Error updating minted wallets or batch counters:', error);
      // Continue even if there's an error with this part
    }
    
    // Return success
    return NextResponse.json({
      success: true,
      message: `Order ${orderId} fixed and marked as paid. Transaction ${txId} associated.`,
      order: {
        id: orderId,
        status: 'paid',
        txId: txId
      }
    });
  } catch (error: any) {
    console.error('Error fixing payment:', error);
    return NextResponse.json(
      { error: error.message || 'Error fixing payment' },
      { status: 500 }
    );
  }
}

/**
 * Simple instructions for how to use this endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    info: "Admin tool to fix payment issues",
    usage: "Send a POST request with the following JSON body: { orderId: 'order_id', txId: 'transaction_id', adminKey: 'your_admin_key' }",
    example: {
      orderId: "order_1234567890",
      txId: "abcdef1234567890", 
      adminKey: "your_admin_key"
    }
  });
} 