import { NextRequest, NextResponse } from 'next/server';
import { getOrderStatus, updateOrderStatus } from '@/api/mint';

// GET /api/mint/[orderId] - Haal order status op
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    
    console.log(`GET /api/mint/${orderId} - Retrieving order status`);
    
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    
    // Order status ophalen
    const orderStatus = await getOrderStatus(orderId);
    console.log(`Order ${orderId} status retrieved:`, orderStatus);
    
    // Response teruggeven
    return NextResponse.json(orderStatus);
  } catch (error: any) {
    // Error handling
    const errorMessage = error.message || 'Something went wrong';
    console.error(`GET /api/mint/${params.orderId} error:`, errorMessage);
    
    // Return a more helpful error message
    return NextResponse.json(
      { 
        error: errorMessage,
        orderId: params.orderId,
        suggestion: "The order might not exist. Please try creating a new order."
      },
      { status: 404 }
    );
  }
}

// PATCH /api/mint/[orderId] - Update order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    
    console.log(`PATCH /api/mint/${orderId} - Updating order status`);
    
    // Request body ophalen
    const body = await request.json();
    const { status } = body;
    
    // Valideer status
    if (!status || !['pending', 'paid', 'completed', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }
    
    // Order status updaten
    const updatedOrder = await updateOrderStatus(
      orderId,
      status as 'pending' | 'paid' | 'completed' | 'failed'
    );
    
    console.log(`Order ${orderId} status updated to ${status}:`, updatedOrder);
    
    // Response teruggeven
    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    // Error handling
    const errorMessage = error.message || 'Something went wrong';
    console.error(`PATCH /api/mint/${params.orderId} error:`, errorMessage);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}

// POST /api/mint/[orderId]/verify - Verify payment (simulate blockchain check)
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    
    console.log(`POST /api/mint/${orderId}/verify - Verifying payment`);
    
    // Get the current order
    const orderStatus = await getOrderStatus(orderId);
    
    // In a real implementation, this would check the blockchain for payment
    // For demo purposes, let's simulate a payment success or failure randomly
    
    // Simulate blockchain check (would check if payment has arrived)
    const paymentReceived = Math.random() > 0.3; // 70% chance of success for demo
    
    if (paymentReceived) {
      // Update order status to paid
      const updatedOrder = await updateOrderStatus(orderId, 'paid');
      
      // Return success
      return NextResponse.json({
        verified: true,
        status: 'paid',
        message: 'Payment verified successfully',
        order: updatedOrder
      });
    } else {
      // Return not yet verified
      return NextResponse.json({
        verified: false,
        status: orderStatus.status,
        message: 'Payment not yet verified',
        order: orderStatus
      });
    }
  } catch (error: any) {
    // Error handling
    const errorMessage = error.message || 'Something went wrong';
    console.error(`POST /api/mint/${params.orderId}/verify error:`, errorMessage);
    
    return NextResponse.json(
      { error: errorMessage, verified: false },
      { status: 400 }
    );
  }
} 