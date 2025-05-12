import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bitcointigers2024';

// Initialize the table
async function initializeTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS mint_start (
      id INTEGER PRIMARY KEY DEFAULT 1,
      start_time TIMESTAMP
    );
  `;
}

// GET endpoint to get the start time
export async function GET() {
  try {
    await initializeTable();
    
    const { rows } = await sql`
      SELECT start_time FROM mint_start WHERE id = 1;
    `;
    
    return NextResponse.json({ 
      startTime: rows.length > 0 ? rows[0].start_time.toISOString() : null 
    });
  } catch (error) {
    console.error('Error reading mint start time:', error);
    return NextResponse.json({ startTime: null });
  }
}

// POST endpoint to set the start time
export async function POST(req: Request) {
  try {
    const { startTime, password } = await req.json();

    // Validate admin password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    await initializeTable();

    // Save the start time
    await sql`
      INSERT INTO mint_start (id, start_time)
      VALUES (1, ${startTime}::timestamp)
      ON CONFLICT (id) DO UPDATE
      SET start_time = EXCLUDED.start_time;
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting mint start time:', error);
    return NextResponse.json({ error: 'Failed to set mint start time' }, { status: 500 });
  }
} 