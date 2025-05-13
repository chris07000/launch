import { NextRequest } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';

export const dynamic = 'force-dynamic';

// Voeg een helper functie toe voor CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
  
  return { batch };
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
  
  // Create order
  const order: storage.Order = {
    id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    btcAddress,
    quantity,
    totalPrice: batch.price * quantity,
    totalPriceUsd: batch.price * quantity,
    pricePerUnit: batch.price,
    pricePerUnitBtc: 0.00001, // Placeholder, would be calculated from real BTC rate
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
  
  return order;
}

export async function GET(request: NextRequest) {
  try {
    // Haal de batchId uit de URL als die er is
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    
    if (batchId) {
      // Specifieke batch informatie ophalen
      const batchInfo = await getBatchInfo(parseInt(batchId, 10));
      return new Response(JSON.stringify(batchInfo), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders()
        }
      });
    } else {
      // Alle batches ophalen
      const allBatches = await getAllBatches();
      return new Response(JSON.stringify(allBatches), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders()
        }
      });
    }
  } catch (error: any) {
    // Error handling
    const errorMessage = error.message || 'Something went wrong';
    console.error('GET /api/mint error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders()
      }
    });
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