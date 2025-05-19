import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');
    
    // Verify admin password
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    // Get count of addresses in each batch
    const { rows: batchCounts } = await sql`
      SELECT batch_id, COUNT(*) as count 
      FROM whitelist 
      GROUP BY batch_id 
      ORDER BY batch_id
    `;
    
    // Get total count of addresses
    const { rows: totalCount } = await sql`
      SELECT COUNT(*) as total FROM whitelist
    `;
    
    return NextResponse.json({
      batchCounts,
      totalAddresses: parseInt(totalCount[0].total)
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching whitelist statistics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 