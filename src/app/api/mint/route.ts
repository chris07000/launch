import { NextRequest, NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';

export const dynamic = 'force-dynamic';

// BTC/USD koers voor conversie
const BTC_TO_USD_RATE = parseInt(process.env.BTC_TO_USD_RATE || '40000', 10);

// Functie voor USD naar BTC conversie
function usdToBtc(usdAmount: number): number {
  return usdAmount / BTC_TO_USD_RATE;
}

// Helper function for getting current batch ID
async function getCurrentBatchId(): Promise<number> {
  try {
    const { currentBatch } = await storage.getCurrentBatch();
    return currentBatch;
  } catch (error) {
    console.error('Error getting current batch ID:', error);
    return 1; // Fallback to batch 1
  }
}

// Helper function for CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

// Voeg OPTIONS handler toe voor preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

// Function to get batch info
async function getBatchInfo(batchId: number) {
  const batches = await storage.getBatches();
  const batch = batches.find(b => b.id === batchId);
  
  if (!batch) {
    throw new Error(`Batch #${batchId} not found`);
  }
  
  // Bereken het aantal geminte tigers als het niet direct beschikbaar is
  const mintedTigers = batch.mintedTigers !== undefined 
    ? batch.mintedTigers 
    : batch.mintedWallets * 2;
  
  // Voeg mintedTigers toe aan de batch info
  const batchInfo = {
    ...batch,
    mintedTigers,
    totalTigers: batch.ordinals
  };
  
  return { batch: batchInfo };
}

// Function to get all batches
async function getAllBatches() {
  const batches = await storage.getBatches();
  return { batches };
}

// Function to create a mint order
async function createMintOrder(btcAddress: string, quantity: number, batchId: number) {
  // Validate Bitcoin address format
  if (!btcAddress.startsWith('bc1p')) {
    throw new Error('Invalid Bitcoin address format. Must start with bc1p');
  }
  
  // Get batch info
  const batches = await storage.getBatches();
  const batch = batches.find(b => b.id === batchId);
  
  if (!batch) {
    throw new Error(`Batch #${batchId} not found`);
  }
  
  if (batch.isSoldOut) {
    throw new Error(`Batch #${batchId} is sold out`);
  }
  
  // Generate a random payment address (in a real app, this would be a real BTC address)
  const paymentAddress = process.env.PAYMENT_BTC_WALLET || 'bc1qwfdxl0pq8d4tefd80enw3yae2k2dsszemrv6j0';
  
  // Generate a unique payment reference
  const paymentReference = Math.random().toString(36).substring(2, 15);
  
  // Calculate USD and BTC amounts
  const pricePerUnitUsd = batch.price;
  const totalPriceUsd = pricePerUnitUsd * quantity;
  const pricePerUnitBtc = usdToBtc(pricePerUnitUsd);
  const totalPriceBtc = usdToBtc(totalPriceUsd);
  
  console.log(`Creating order with BTC price: ${totalPriceBtc} (${totalPriceUsd} USD)`);
  
  // Create order
  const order: storage.Order = {
    id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    btcAddress,
    quantity,
    totalPrice: totalPriceBtc,
    totalPriceUsd: totalPriceUsd,
    pricePerUnit: pricePerUnitUsd,
    pricePerUnitBtc: pricePerUnitBtc,
    batchId,
    paymentAddress,
    paymentReference,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Get existing orders
  const orders = await storage.getOrders();
  
  // Add new order
  orders.push(order);
  
  // Save orders
  await storage.saveOrders(orders);
  
  return {
    ...order,
    totalPriceBtc, // Expliciete BTC bedragen toevoegen aan de response
    pricePerUnitBtc
  };
}

export async function GET(request: NextRequest) {
  try {
    const batches = await storage.getBatches();
    const currentBatchId = await getCurrentBatchId();
    
    // Process batch data for response
    const processedBatches = batches.map(batch => {
      // Ensure we have mintedTigers value - prefer direct value if available
      const mintedTigers = batch.mintedTigers !== undefined
        ? batch.mintedTigers
        : batch.mintedWallets * 2;
      
      // Voeg mintedTigers toe aan de batch info
      return {
        ...batch,
        mintedTigers,
        isActive: batch.id === currentBatchId
      };
    });

    return NextResponse.json({
      currentBatch: currentBatchId,
      batches: processedBatches
    });
  } catch (error) {
    console.error('Error in /api/mint route:', error);
    return NextResponse.json({
      error: 'Failed to load mint data'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { btcAddress, quantity, batchId } = body;

    // Validate required fields
    if (!btcAddress) {
      return new Response(JSON.stringify({ error: 'BTC address is required' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders()
        }
      });
    }

    if (!quantity || quantity < 1) {
      return new Response(JSON.stringify({ error: 'Quantity must be at least 1' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders()
        }
      });
    }

    // Create mint order
    const order = await createMintOrder(btcAddress, quantity, batchId);
    
    // Log de order om te debuggen
    console.log('Created order:', order);

    // Zorg ervoor dat we altijd een orderId in de response hebben, ongeacht welke createMintOrder functie we gebruiken
    const responseData = {
      ...order,
      // Controleer welke property beschikbaar is (id of orderId) en gebruik die
      orderId: 'orderId' in order ? order.orderId : ('id' in order ? order.id : `order_${Date.now()}`)
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders()
      }
    });
  } catch (error: any) {
    console.error('Error creating mint order:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders()
      }
    });
  }
} 