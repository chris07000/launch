import { NextRequest, NextResponse } from 'next/server';
import { getOrderStatus, updateOrderStatus, isTransactionUsed, markTransactionAsUsed } from '@/api/mint';
import * as storage from '@/lib/storage-wrapper-db-only';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

// Add type definition at the top of the file
interface OrderStatus {
  id: string;
  status: 'pending' | 'paid' | 'completed' | 'failed';
  quantity: number;
  totalPrice: number;
  totalPriceUsd: number;
  paymentAddress: string;
  btcAddress: string;
  batchId: number;
  createdAt: string;
  updatedAt: string;
  pricePerUnit: number;
  inscriptionId: string | null;
  inscription: any | null;
  paymentReference: string;
  paymentTimeout?: string | Date;
}

const BLOCKCHAIN_API_DELAY = 2000; // 2 seconds

async function startInscriptionProcess(orderId: string): Promise<void> {
  try {
    // Simulate inscription process
    console.log(`Starting inscription process for order ${orderId}`);
    
    // Wait for 10 seconds to simulate inscription process
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Update order status to completed
    await updateOrderStatus(orderId, 'completed');
    console.log(`Inscription completed for order ${orderId}`);
  } catch (error) {
    console.error('Error in inscription process:', error);
    throw error;
  }
}

/**
 * Controleert of een betaling is ontvangen voor een specifiek Bitcoin-adres
 * via een publieke blockchain API
 */
async function checkBitcoinPayment(
  address: string, 
  expectedAmountBtc: number,
  orderCreatedAt: Date,
  orderId: string
): Promise<boolean> {
  try {
    // Log voor debugging
    console.log(`Starting checkBitcoinPayment for ${address}`);
    console.log(`Expected amount: ${expectedAmountBtc} BTC`);
    console.log(`Order created at: ${orderCreatedAt.toISOString()}`);
    console.log(`Order ID: ${orderId}`);
    
    // Mempool.space API gebruiken om transacties te controleren
    console.log(`Fetching transactions from mempool.space API for address: ${address}`);
    const response = await fetch(`https://mempool.space/api/address/${address}/txs`);
    
    if (!response.ok) {
      console.error(`Error fetching transactions: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const transactions = await response.json();
    console.log(`API response received:`, JSON.stringify(transactions).substring(0, 500) + '...');
    
    // Geen transacties gevonden
    if (!Array.isArray(transactions) || transactions.length === 0) {
      console.log(`No transactions found for address ${address}`);
      return false;
    }
    
    const expectedAmountSats = Math.round(expectedAmountBtc * 100000000);
    console.log(`Expected amount in satoshis: ${expectedAmountSats}`);
    console.log(`Found ${transactions.length} transactions`);
    
    // Keep track of total received amount
    let totalReceivedSats = 0;
    
    // Converteer orderCreatedAt naar timestamp
    const orderTimestamp = orderCreatedAt.getTime();
    console.log(`Order timestamp: ${orderTimestamp}`);
    
    // Loop door elke transactie
    for (const tx of transactions) {
      console.log(`Processing transaction: ${tx.txid}`);
      
      // Skip if transaction is already used
      const isUsed = await isTransactionUsed(tx.txid);
      if (isUsed) {
        console.log(`Skipping already used transaction ${tx.txid}`);
        continue;
      }
      
      // Get transaction time (try different fields)
      let txTime = Date.now(); // Default to now if we can't determine actual time
      
      if (tx.status && tx.status.block_time) {
        // Block time is in seconds, convert to ms
        txTime = tx.status.block_time * 1000;
        console.log(`Using block_time: ${new Date(txTime).toISOString()}`);
      } else if (tx.firstSeen) {
        // firstSeen might be in ms or seconds
        txTime = tx.firstSeen > 1600000000000 ? tx.firstSeen : tx.firstSeen * 1000;
        console.log(`Using firstSeen: ${new Date(txTime).toISOString()}`);
      } else if (tx.time) {
        // Some APIs use 'time' field
        txTime = tx.time > 1600000000000 ? tx.time : tx.time * 1000;
        console.log(`Using time: ${new Date(txTime).toISOString()}`);
      }
      
      // Skip transactions from before the order was created
      if (txTime < orderTimestamp) {
        console.log(`Skipping old transaction from ${new Date(txTime).toISOString()}`);
        continue;
      }
      
      // Controleer outputs om het betaalde bedrag te vinden
      let txAmount = 0;
      
      // Handle different API formats
      if (tx.vout && Array.isArray(tx.vout)) {
        for (const output of tx.vout) {
          // Try different field names for the address
          const outputAddress = output.scriptpubkey_address || 
                              output.scriptPubKeyAddress || 
                              (output.scriptpubkey && output.scriptpubkey.address) ||
                              output.address;
                              
          // Try different field names for the value
          const value = output.value || output.valueSat || output.amount || 0;
          
          if (outputAddress === address) {
            console.log(`Found payment output: ${value} sats to ${address}`);
            txAmount += Number(value);
          }
        }
      } else if (tx.outputs && Array.isArray(tx.outputs)) {
        // Alternative API format
        for (const output of tx.outputs) {
          const outputAddress = output.address || 
                             (output.scriptpubkey && output.scriptpubkey.address);
          const value = output.value || output.amount || 0;
          
          if (outputAddress === address) {
            console.log(`Found payment output: ${value} sats to ${address}`);
            txAmount += Number(value);
          }
        }
      }
      
      // Als deze transactie een betaling bevat, markeer als gebruikt
      if (txAmount > 0) {
        console.log(`Transaction ${tx.txid} has payment of ${txAmount} sats`);
        await markTransactionAsUsed(tx.txid, orderId, txAmount);
        totalReceivedSats += txAmount;
      } else {
        console.log(`Transaction ${tx.txid} has no payments to our address`);
      }
    }
    
    console.log(`Total received: ${totalReceivedSats} sats (expected: ${expectedAmountSats} sats)`);
    
    // Check if we received the full expected amount
    // Allow a small margin of error (1%)
    const minAcceptableAmount = expectedAmountSats * 0.99;
    if (totalReceivedSats >= minAcceptableAmount) {
      console.log(`Payment verified! Received ${totalReceivedSats} sats (needed at least ${minAcceptableAmount})`);
      return true;
    }
    
    // Geen geldige betaling gevonden
    console.log(`Payment verification failed. Received ${totalReceivedSats} < ${minAcceptableAmount} required`);
    return false;
  } catch (error) {
    console.error('Error checking Bitcoin payment:', error);
    return false;
  }
}

/**
 * Route to verify if a payment has been received for an order
 */
export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    const { orderId } = body;
    
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }
    
    console.log(`POST /api/payment/verify - Verifying payment for order ${orderId}`);
    
    // Get the current order status
    let orderStatus;
    try {
      orderStatus = await getOrderStatus(orderId);
    } catch (err) {
      return NextResponse.json(
        { error: "Order not found", verified: false },
        { status: 404 }
      );
    }
    
    // If order is already paid or completed, return success
    if (orderStatus.status === 'paid' || orderStatus.status === 'completed') {
      return NextResponse.json({
        verified: true,
        status: orderStatus.status,
        message: `Payment is already ${orderStatus.status}`,
        orderId
      });
    }
    
    // Check for real Bitcoin payment
    const isVerified = await checkBitcoinPayment(
      orderStatus.paymentAddress,
      orderStatus.totalPrice,
      new Date(orderStatus.createdAt),
      orderId
    );
    
    if (isVerified) {
      // Update order status to paid
      await updateOrderStatus(orderId, 'paid');
      
      // Update batch minted_wallets count in database and increment by 1
      const batches = await storage.getBatches();
      const batchIndex = batches.findIndex(b => b.id === orderStatus.batchId);
      
      if (batchIndex !== -1) {
        batches[batchIndex].mintedWallets += 1;
        await storage.saveBatches(batches);
      }
      
      // Add wallet to minted_wallets list
      const mintedWallets = await storage.getMintedWallets();
      mintedWallets.push({
        address: orderStatus.btcAddress,
        batchId: orderStatus.batchId,
        quantity: orderStatus.quantity,
        timestamp: new Date().toISOString()
      });
      await storage.saveMintedWallets(mintedWallets);
      
      // Start inscription process in the background
      startInscriptionProcess(orderId).catch(error => {
        console.error('Error in background inscription process:', error);
      });

      return NextResponse.json({
        verified: true,
        status: 'paid',
        message: 'Payment detected, starting inscription process',
        orderId
      });
    }
    
    // Payment not verified yet
    return NextResponse.json({
      verified: false,
      status: orderStatus.status,
      message: 'Payment not detected yet',
      orderId
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 });
    }

    // Get the order from the database
    const orders = await storage.getOrders();
    const order = orders.find(o => o.paymentReference === reference);
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if payment is already marked as completed
    if (order.status === 'completed') {
      return NextResponse.json({ status: 'completed' });
    }

    // Check payment status
    const paymentResult = await checkPayment(reference);
    
    if (paymentResult.confirmed) {
      // Update order status
      await updateOrderStatus(order.id, 'completed');

      // We have already incremented the mintedWallets counter in the POST method,
      // So we don't need to do it again here to avoid double counting
      // Instead, just log that we're skipping this step to avoid duplication
      console.log(`Skipping mintedWallets increment for order ${order.id} - already counted in POST handler`);

      // We don't need to add the wallet to minted_wallets list again either,
      // as this was already done in the POST method
      console.log(`Skipping adding to mintedWallets list for order ${order.id} - already added in POST handler`);

      return NextResponse.json({ status: 'completed' });
    }

    return NextResponse.json({ status: 'pending' });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function checkPayment(reference: string): Promise<{ confirmed: boolean }> {
  // TODO: Implement actual payment verification logic
  // For now, just return confirmed: true
  return { confirmed: true };
} 