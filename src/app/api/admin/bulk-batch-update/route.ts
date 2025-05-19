import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const { password, sourceBatchId, targetBatchId } = await request.json();
    
    // Verify admin password
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    // Validate inputs
    if (!sourceBatchId || !targetBatchId) {
      return NextResponse.json({ error: 'Source and target batch IDs are required' }, { status: 400 });
    }
    
    if (sourceBatchId === targetBatchId) {
      return NextResponse.json({ error: 'Source and target batches must be different' }, { status: 400 });
    }
    
    // Begin transaction to ensure data consistency
    await sql`BEGIN`;
    
    try {
      // Count how many addresses will be updated
      const { rows: countRows } = await sql`
        SELECT COUNT(*) as total FROM whitelist
        WHERE batch_id = ${sourceBatchId.toString()}
      `;
      
      const totalAddresses = parseInt(countRows[0].total);
      
      if (totalAddresses === 0) {
        await sql`ROLLBACK`;
        return NextResponse.json({ error: 'No addresses found in the source batch' }, { status: 400 });
      }
      
      // Move addresses from source batch to target batch
      const { rowCount } = await sql`
        UPDATE whitelist
        SET batch_id = ${targetBatchId.toString()}
        WHERE batch_id = ${sourceBatchId.toString()}
      `;
      
      // Commit transaction if successful
      await sql`COMMIT`;
      
      return NextResponse.json({ 
        success: true,
        message: `Successfully moved ${rowCount} addresses from Batch #${sourceBatchId} to Batch #${targetBatchId}`,
        updatedAddresses: rowCount,
        totalInSourceBatch: totalAddresses
      }, { status: 200 });
    } catch (error) {
      // Rollback transaction if an error occurs
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error: any) {
    console.error('Error updating batch IDs in bulk:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 