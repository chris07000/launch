import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

// Voeg een helper functie toe voor CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Voeg OPTIONS handler toe voor preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

export async function GET() {
  const isVercel = process.env.VERCEL === '1';
  const checks = [];

  try {
    // Check database connection
    try {
      const result = await sql`SELECT NOW()`;
      checks.push({ check: 'database_connection', status: 'healthy' });
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      checks.push({ check: 'database_connection', status: 'unhealthy', error: dbError instanceof Error ? dbError.message : 'Unknown error' });
    }

    // Get memory usage
    const memoryUsage = process.memoryUsage();

    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: isVercel ? 'vercel' : 'local',
      checks,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB'
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders() 
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return new Response(JSON.stringify(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        environment: isVercel ? 'vercel' : 'local',
        checks
      }
    ), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders() 
      }
    });
  }
} 