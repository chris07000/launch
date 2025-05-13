import { NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';
import { synchronizeBatchCounter } from '@/app/api/payment/verify/route';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, password } = body;
    
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    console.log(`Deleting order ${orderId}...`);
    
    // Haal alle orders op
    const orders = await storage.getOrders();
    
    // Vind de order die verwijderd moet worden
    const orderIndex = orders.findIndex(order => order.id === orderId);
    
    if (orderIndex === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Bewaar het batchId van de order voor later
    const batchId = orders[orderIndex].batchId;
    
    // Verwijder de order uit de array
    orders.splice(orderIndex, 1);
    
    // Sla de bijgewerkte orders array op
    await storage.saveOrders(orders);
    
    // Synchroniseer de mintedWallets teller voor deze batch
    await synchronizeBatchCounter(batchId);
    
    return NextResponse.json({ 
      success: true, 
      message: `Order ${orderId} has been deleted successfully`,
      remainingOrders: orders.length
    });
  } catch (error: any) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 