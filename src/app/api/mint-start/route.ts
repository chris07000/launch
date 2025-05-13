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
    
    // Parse time correctly and return as timestamp
    const startTimeValue = rows.length > 0 ? 
      (rows[0].start_time instanceof Date ? rows[0].start_time.getTime() : new Date(rows[0].start_time).getTime()) 
      : null;

    return NextResponse.json({ 
      startTime: startTimeValue,
      formattedTime: startTimeValue ? new Date(startTimeValue).toISOString() : null
    });
  } catch (error) {
    console.error('Error reading mint start time:', error);
    return NextResponse.json({ 
      startTime: null, 
      error: 'Failed to read mint start time',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

// POST endpoint to set the start time
export async function POST(req: Request) {
  try {
    const { startTime, password } = await req.json();

    // Log de ontvangen data voor debugging
    console.log('Received startTime:', startTime, 'Type:', typeof startTime);

    // Validate admin password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    if (!startTime) {
      return NextResponse.json({ 
        success: false, 
        error: 'Start time is required' 
      }, { status: 400 });
    }

    // Convert to valid timestamp if needed
    let timeToSave;
    try {
      if (typeof startTime === 'string') {
        timeToSave = new Date(startTime).toISOString();
      } else if (typeof startTime === 'number') {
        timeToSave = new Date(startTime).toISOString();
      } else {
        throw new Error('Invalid date format');
      }
    } catch (dateError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid date format',
        details: 'Please provide a valid date string or timestamp' 
      }, { status: 400 });
    }

    await initializeTable();

    // Save the start time
    const result = await sql`
      INSERT INTO mint_start (id, start_time)
      VALUES (1, ${timeToSave}::timestamp)
      ON CONFLICT (id) DO UPDATE
      SET start_time = EXCLUDED.start_time;
    `;

    return NextResponse.json({ 
      success: true,
      startTime,
      savedTime: timeToSave
    });
  } catch (error) {
    console.error('Error setting mint start time:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to set mint start time',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 