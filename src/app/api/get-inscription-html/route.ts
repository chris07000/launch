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

    // Fetch HTML content from Magic Eden's API
    const response = await axios.get(
      `https://ord-mirror.magiceden.dev/content/${inscriptionId}`,
      { 
        headers: { 
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        } 
      }
    );

    return NextResponse.json({ 
      success: true, 
      html: response.data 
    });
  } catch (error: any) {
    console.error('Error fetching inscription:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to fetch inscription data' 
    }, { status: 500 });
  }
} 