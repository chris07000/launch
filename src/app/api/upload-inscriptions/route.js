// NOTE: Dit bestand is uitgezet voor Vercel deployment
// Een Vercel-compatibele versie van upload-inscriptions endpoint
// Deze alleen gebruikt op de development/lokale omgeving

export const dynamic = 'force-dynamic';

export async function POST() {
  return new Response(JSON.stringify({
    status: 'error',
    message: 'This endpoint is disabled in production - uploading inscriptions is only available in development environment'
  }), {
    status: 400,
    headers: {
      'Content-Type': 'application/json'
    }
  });
} 