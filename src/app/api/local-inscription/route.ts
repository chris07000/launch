import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing inscription ID' }, { status: 400 });
    }
    
    // In a real application, we would look up the actual image file
    // For now, we'll serve a placeholder image or a sample tiger image if available
    
    // Try to find a real tiger image in the public directory
    const tigerDir = path.join(process.cwd(), 'public/images/tigers');
    const tigerImage = path.join(tigerDir, `${id}.png`);
    
    if (fs.existsSync(tigerImage)) {
      // If the actual image exists, serve it
      const imageBuffer = fs.readFileSync(tigerImage);
      
      // Determine content type based on file extension
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }
    
    // If no real image exists, serve the placeholder or tiger preview
    const fallbackImage = path.join(process.cwd(), 'public/images/tigercollection.png');
    
    if (fs.existsSync(fallbackImage)) {
      const imageBuffer = fs.readFileSync(fallbackImage);
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }
    
    // If all else fails, return an error
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 });
  }
} 