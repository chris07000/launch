export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(JSON.stringify({
    message: 'Basic API route is working!',
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'content-type': 'application/json'
    }
  });
} 