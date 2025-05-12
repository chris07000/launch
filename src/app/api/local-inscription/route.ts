// Disabled for Vercel compatibility
// This endpoint is only available in local development

export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(JSON.stringify({
    status: 'error',
    message: 'This endpoint is disabled in production'
  }), {
    status: 400,
    headers: {
      'Content-Type': 'application/json'
    }
  });
} 