import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Check if the batch_durations table exists
    const { rows: tableCheck } = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'batch_durations'
      ) as exists
    `;
    
    if (!tableCheck[0].exists) {
      // If table doesn't exist, return empty results
      return NextResponse.json({}, { status: 200 });
    }
    
    // Get all batch durations
    const { rows } = await sql`
      SELECT * FROM batch_durations
    `;
    
    // Format response data
    const batchTimers: { [key: string]: {
      batchId: number,
      startTime: number | null,
      endTime: number | null,
      durationMinutes: number | null
    }} = {};
    
    rows.forEach(row => {
      batchTimers[row.batch_id] = {
        batchId: parseInt(row.batch_id),
        startTime: row.start_time ? parseInt(row.start_time) : null,
        endTime: row.end_time ? parseInt(row.end_time) : null,
        durationMinutes: row.duration_minutes ? parseInt(row.duration_minutes) : null
      };
    });
    
    return NextResponse.json(batchTimers, { status: 200 });
  } catch (error: any) {
    console.error('Error getting batch timers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { batchId, durationMinutes, password } = await request.json();
    
    // Verify admin password
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    // Validate inputs
    if (!batchId || batchId < 1 || batchId > 16) {
      return NextResponse.json({ error: 'Invalid batch ID' }, { status: 400 });
    }
    
    if (!durationMinutes || durationMinutes < 1 || durationMinutes > 10080) { // max 1 week (7 * 24 * 60)
      return NextResponse.json({ error: 'Invalid duration. Must be between 1 minute and 1 week' }, { status: 400 });
    }
    
    // Create batch_durations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS batch_durations (
        batch_id VARCHAR(255) PRIMARY KEY,
        start_time BIGINT,
        end_time BIGINT,
        duration_minutes INT
      )
    `;
    
    const now = Date.now();
    const endTime = now + (durationMinutes * 60 * 1000);
    
    // Check if a timer already exists for this batch
    const { rows: existing } = await sql`
      SELECT * FROM batch_durations WHERE batch_id = ${batchId.toString()}
    `;
    
    if (existing.length > 0) {
      // Update existing timer
      await sql`
        UPDATE batch_durations 
        SET start_time = ${now}, end_time = ${endTime}, duration_minutes = ${durationMinutes}
        WHERE batch_id = ${batchId.toString()}
      `;
    } else {
      // Insert new timer
      await sql`
        INSERT INTO batch_durations (batch_id, start_time, end_time, duration_minutes)
        VALUES (${batchId.toString()}, ${now}, ${endTime}, ${durationMinutes})
      `;
    }
    
    return NextResponse.json({ 
      success: true,
      batchId,
      startTime: now,
      endTime,
      durationMinutes
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error setting batch timer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const password = searchParams.get('password');
    
    // Verify admin password
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    // Validate batchId
    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }
    
    // Check if table exists
    const { rows: tableCheck } = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'batch_durations'
      ) as exists
    `;
    
    if (!tableCheck[0].exists) {
      return NextResponse.json({ success: true, message: 'No timers exist' }, { status: 200 });
    }
    
    // Delete the specified timer
    await sql`
      DELETE FROM batch_durations WHERE batch_id = ${batchId.toString()}
    `;
    
    return NextResponse.json({ 
      success: true,
      message: `Timer for batch ${batchId} removed successfully`
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting batch timer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 