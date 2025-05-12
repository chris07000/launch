export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // Test database connection
    const result = await sql`SELECT NOW() as time`;
    
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