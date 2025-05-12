import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inscriptionId = searchParams.get('inscriptionId');

    if (!inscriptionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Inscription ID is required' 
      }, { status: 400 });
    }

    // Fetch content from Magic Eden's API
    const response = await axios.get(
      `https://ord-mirror.magiceden.dev/content/${inscriptionId}`,
      {
        responseType: 'arraybuffer',
        headers: {
          'Accept': 'image/avif,image/webp,*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    );

    // Create response with proper content type
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    
    return new NextResponse(response.data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error: any) {
    console.error('Error proxying to Magic Eden:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to proxy request' 
    }, { status: 500 });
  }
} 