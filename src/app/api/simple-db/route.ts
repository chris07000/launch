export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { Pool } from 'pg';

export async function GET() {
  try {
    // Connect to the database using Pool for better performance
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Test connection
    const client = await pool.connect();
    try {
      // Query database
      const result = await client.query('SELECT NOW() as time');
      
      // Create response
      return new Response(JSON.stringify({
        status: 'success',
        message: 'Database connection successful',
        time: result.rows[0].time,
        timestamp: new Date().toISOString()
      }), {
        headers: {
          'content-type': 'application/json'
        }
      });
    } finally {
      // Release client back to pool
      client.release();
    }
  } catch (error: any) {
    console.error('Database error:', error);
    
    // Return error response
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Failed to connect to database',
      error: error.message || String(error),
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'content-type': 'application/json'
      }
    });
  }
} 