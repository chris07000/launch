import { NextResponse } from 'next/server';
import axios from 'axios';

/**
 * This API route proxies requests to Magic Eden to fetch inscription images
 * This helps avoid CORS issues and improves reliability
 */
export async function GET(request) {
  const url = new URL(request.url);
  const inscriptionId = url.searchParams.get('inscriptionId');
  
  if (!inscriptionId) {
    return NextResponse.json({ error: 'Missing inscriptionId parameter' }, { status: 400 });
  }
  
  // Clean inscription ID - handle various formats and suffixes
  let cleanId = inscriptionId;
  
  // Strip all suffixes - sometimes there can be i0, i1, etc.
  if (/^[0-9a-f]{64}i\d+$/i.test(cleanId)) {
    cleanId = cleanId.replace(/i\d+$/, '');
  } else if (cleanId.endsWith('i0')) {
    cleanId = cleanId.substring(0, cleanId.length - 2);
  }
  
  console.log(`Fetching content for inscription: ${cleanId}`);
  console.log(`Original inscriptionId: ${inscriptionId}`);

  try {
    // First try direct content URL - this is most reliable
    let imageData = null;
    let contentType = null;
    
    // Try direct content URLs first
    const contentUrls = [
      `https://ord-mirror.magiceden.dev/content/${cleanId}`,
      `https://ordin.s3.amazonaws.com/content/${cleanId}`,
      `https://turbo.ordinalswallet.com/inscription/content/${cleanId}`,
      `https://ordinals.com/content/${cleanId}`
    ];
    
    for (const source of contentUrls) {
      try {
        console.log(`Trying to fetch from: ${source}`);
        const response = await axios.get(source, {
          responseType: 'arraybuffer',
          timeout: 5000,
          headers: {
            'Accept': 'image/*,*/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
          }
        });
        
        if (response.status === 200) {
          contentType = response.headers['content-type'];
          imageData = response.data;
          console.log(`Successfully fetched from ${source} with content type: ${contentType}`);
          break;
        }
      } catch (err) {
        console.error(`Failed to fetch from ${source}:`, err.message);
      }
    }
    
    // If direct content URLs failed, try the preview page
    if (!imageData) {
      // Try preview page as fallback
      try {
        const previewUrls = [
          `https://ord-mirror.magiceden.dev/preview/${cleanId}`,
          `https://ord-mirror.magiceden.dev/preview/${cleanId}i0`
        ];
        
        for (const previewUrl of previewUrls) {
          try {
            console.log(`Trying to fetch from preview page: ${previewUrl}`);
            
            const response = await axios.get(previewUrl, {
              timeout: 8000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
              }
            });
            
            if (response.status === 200) {
              const html = response.data;
              console.log('Preview page loaded successfully');
              
              // Look for an image tag in the HTML
              const imgMatch = html.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
              
              if (imgMatch && imgMatch[1]) {
                // Found the image URL
                const imageUrl = imgMatch[1].startsWith('http') 
                  ? imgMatch[1] 
                  : `https://ord-mirror.magiceden.dev${imgMatch[1]}`;
                  
                console.log(`Found image URL: ${imageUrl}`);
                
                // Fetch the image
                const imgResponse = await axios.get(imageUrl, {
                  responseType: 'arraybuffer',
                  timeout: 5000,
                  headers: {
                    'Accept': 'image/*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
                  }
                });
                
                if (imgResponse.status === 200) {
                  contentType = imgResponse.headers['content-type'];
                  imageData = imgResponse.data;
                  console.log(`Successfully fetched image with content type: ${contentType}`);
                  break;
                }
              } else {
                // Try to parse JSON data
                try {
                  if (html.includes('"content"')) {
                    const jsonMatch = html.match(/"content":\s*"([^"]+)"/);
                    if (jsonMatch && jsonMatch[1]) {
                      console.log('Found content in JSON format');
                      const contentData = jsonMatch[1];
                      imageData = Buffer.from(contentData, 'base64');
                      contentType = 'image/png'; // Assume PNG
                      break;
                    }
                  }
                } catch (err) {
                  console.error('Error parsing JSON from HTML:', err.message);
                }
              }
            }
          } catch (err) {
            console.error(`Failed to fetch from preview page ${previewUrl}:`, err.message);
          }
        }
      } catch (err) {
        console.error('Error in preview page processing:', err.message);
      }
    }
    
    // If we have image data, return it
    if (imageData) {
      return new NextResponse(imageData, {
        headers: {
          'Content-Type': contentType || 'image/png',
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        }
      });
    }
    
    // If all attempts failed, create a placeholder
    console.log('Creating placeholder image...');
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
        <rect width="400" height="400" fill="#1a1a1a" />
        <text x="50%" y="45%" font-family="monospace" font-size="14" fill="#ffd700" text-anchor="middle">
          ${cleanId.substring(0, 16)}...
        </text>
        <text x="50%" y="55%" font-family="monospace" font-size="12" fill="#ffffff" text-anchor="middle">
          Image Not Available
        </text>
      </svg>
    `;
    
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400',
      }
    });
    
  } catch (error) {
    console.error('Error proxying Magic Eden request:', error);
    
    // Return a placeholder image with error information
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
        <rect width="400" height="400" fill="#1a1a1a" />
        <text x="50%" y="45%" font-family="monospace" font-size="14" fill="#ff4444" text-anchor="middle">
          Error Loading Image
        </text>
        <text x="50%" y="55%" font-family="monospace" font-size="12" fill="#ffffff" text-anchor="middle">
          ID: ${cleanId.substring(0, 16)}...
        </text>
      </svg>
    `;
    
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      }
    });
  }
} 