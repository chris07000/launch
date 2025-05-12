import { NextRequest, NextResponse } from 'next/server';
import { getOrderStatus, updateOrderStatus, isTransactionUsed, markTransactionAsUsed } from '@/api/mint';
import { syncOrdersToBatches } from '@/lib/storage';

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
    // Mempool.space API gebruiken om transacties te controleren
    const response = await fetch(`https://mempool.space/api/address/${address}/txs`);
    
    if (!response.ok) {
      console.error(`Error fetching transactions: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const transactions = await response.json();
    
    // Geen transacties gevonden
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return false;
    }
    
    const expectedAmountSats = Math.round(expectedAmountBtc * 100000000);
    
    // Log voor debugging
    console.log(`Checking transactions for ${address}`);
    console.log(`Expected amount: ${expectedAmountBtc} BTC (${expectedAmountSats} sats)`);
    console.log(`Order created at: ${orderCreatedAt.toISOString()}`);
    console.log(`Found ${transactions.length} transactions`);
    
    // Keep track of total received amount
    let totalReceivedSats = 0;
    
    // Converteer orderCreatedAt naar timestamp
    const orderTimestamp = orderCreatedAt.getTime();
    
    for (const tx of transactions) {
      // Skip if transaction is already used
      if (isTransactionUsed(tx.txid)) {
        console.log(`Skipping already used transaction ${tx.txid}`);
        continue;
      }
      
      // Get transaction time (either block time or first seen time)
      const txTime = tx.status.block_time ? tx.status.block_time * 1000 : tx.firstSeen * 1000;
      
      // Skip transactions from before the order was created
      if (txTime < orderTimestamp) {
        console.log(`Skipping old transaction from ${new Date(txTime).toISOString()}`);
        continue;
      }
      
      // Controleer outputs om het betaalde bedrag te vinden
      let txAmount = 0;
      for (const output of tx.vout) {
        if (output.scriptpubkey_address === address) {
          const receivedSats = output.value;
          console.log(`Found payment output: ${receivedSats} sats to ${address}`);
          txAmount += receivedSats;
        }
      }
      
      // Als deze transactie een betaling bevat, markeer als gebruikt
      if (txAmount > 0) {
        markTransactionAsUsed(tx.txid, orderId, txAmount);
        totalReceivedSats += txAmount;
      }
    }
    
    console.log(`Total received: ${totalReceivedSats} sats (expected: ${expectedAmountSats} sats)`);
    
    // Check if we received the full expected amount
    if (totalReceivedSats >= expectedAmountSats) {
      console.log(`Payment verified! Received ${totalReceivedSats} sats`);
      return true;
    }
    
    // Geen geldige betaling gevonden
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
      
      // Sync orders with batches
      await syncOrdersToBatches(process.env.ADMIN_PASSWORD || '');
      
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
    
    // Payment not yet verified
    return NextResponse.json({
      verified: false,
      status: orderStatus.status,
      message: 'Payment not yet verified',
      orderId
    });
  } catch (error) {
    console.error('Error in payment verification:', error);
    return NextResponse.json(
      { error: 'Something went wrong', verified: false },
      { status: 500 }
    );
  }
} 