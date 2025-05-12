import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Get all orders that need inscription scanning
    const { rows } = await sql`
      SELECT * FROM orders 
      WHERE status = 'paid' 
      AND inscription_id IS NULL 
      ORDER BY created_at ASC
    `;

    if (rows.length === 0) {
      return NextResponse.json({ message: 'No orders to scan' });
    }

    // Process each order
    const results = [];
    for (const order of rows) {
      try {
        // Simulate scanning for inscriptions
        // TODO: Implement actual inscription scanning logic
        const inscriptionId = `inscription_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        // Update the order with the inscription ID
        await sql`
          UPDATE orders 
          SET inscription_id = ${inscriptionId},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${order.id}
        `;

        results.push({
          orderId: order.id,
          inscriptionId,
          status: 'scanned'
        });
      } catch (error: any) {
        console.error(`Error scanning order ${order.id}:`, error);
        results.push({
          orderId: order.id,
          error: error.message,
          status: 'failed'
        });
      }
    }

    return NextResponse.json({
      scanned: results.length,
      results
    });
  } catch (error: any) {
    console.error('Error in scan-inscriptions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scan inscriptions' },
      { status: 500 }
    );
  }
} 