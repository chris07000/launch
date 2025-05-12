import { NextResponse } from 'next/server';
import axios from 'axios';

/**
 * This API route fetches the raw HTML from Magic Eden
 * This helps with debugging
 */
export async function GET(request) {
  const url = new URL(request.url);
  const inscriptionId = url.searchParams.get('inscriptionId');
  
  if (!inscriptionId) {
    return NextResponse.json({ error: 'Missing inscriptionId parameter' }, { status: 400 });
  }
  
  // Clean inscription ID - remove 'i0' suffix if it exists
  let cleanId = inscriptionId;
  if (cleanId.endsWith('i0')) {
    cleanId = cleanId.substring(0, cleanId.length - 2);
  }
  
  console.log(`Fetching HTML for inscription: ${cleanId}`);

  try {
    const previewUrl = `https://ord-mirror.magiceden.dev/preview/${cleanId}i0`;
    console.log(`Preview URL: ${previewUrl}`);
    
    const response = await axios.get(previewUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
      }
    });
    
    if (response.status === 200) {
      const html = response.data;
      
      return NextResponse.json({ 
        success: true, 
        inscriptionId: cleanId,
        html: html,
        url: previewUrl
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to fetch inscription page',
        inscriptionId: cleanId,
        status: response.status,
        url: previewUrl
      }, { status: response.status });
    }
  } catch (error) {
    console.error('Error fetching Magic Eden page:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch inscription page',
      message: error.message,
      inscriptionId: cleanId
    }, { status: 500 });
  }
} 