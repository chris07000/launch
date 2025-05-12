import { NextResponse } from 'next/server';
import { validateAdminPassword } from '@/api/mint';
import { getOrders, saveOrders, getWhitelist, saveWhitelist, getBatches, saveBatches } from '@/lib/storage';

// Validate a Bitcoin Ordinal address (bc1p...)
function isValidOrdinalAddress(address: string): boolean {
  return typeof address === 'string' && address.startsWith('bc1p');
}

// Handle GET requests
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminPassword = searchParams.get('adminPassword');

    if (!validateAdminPassword(adminPassword || '')) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }

    const [orders, whitelist, batches] = await Promise.all([
      getOrders(),
      getWhitelist(),
      getBatches()
    ]);

    return NextResponse.json({
      orders,
      whitelist,
      batches
    });
  } catch (error: any) {
    console.error('Error in admin GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Handle POST requests
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adminPassword, action, data } = body;

    if (!validateAdminPassword(adminPassword)) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }

    switch (action) {
      case 'updateOrders':
        if (!Array.isArray(data)) {
          return NextResponse.json({ error: 'Invalid orders data' }, { status: 400 });
        }
        await saveOrders(data);
        return NextResponse.json({ success: true });

      case 'updateWhitelist':
        if (!Array.isArray(data)) {
          return NextResponse.json({ error: 'Invalid whitelist data' }, { status: 400 });
        }
        await saveWhitelist(data);
        return NextResponse.json({ success: true });

      case 'updateBatches':
        if (!Array.isArray(data)) {
          return NextResponse.json({ error: 'Invalid batches data' }, { status: 400 });
        }
        await saveBatches(data);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in admin POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 