import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get all inscriptions from the database
    const result = await sql`
      SELECT i.*, o.btc_address, o.status
      FROM inscriptions i
      LEFT JOIN orders o ON i.order_id = o.id
      ORDER BY i.created_at DESC
    `;

    const inscriptions = result.rows.map(row => ({
      id: row.id,
      orderId: row.order_id,
      inscriptionId: row.inscription_id,
      status: row.status,
      btcAddress: row.btc_address,
      createdAt: row.created_at
    }));

    return NextResponse.json({
      status: 'success',
      inscriptions
    });
  } catch (error) {
    console.error('Error scanning inscriptions:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 