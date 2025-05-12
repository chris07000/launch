import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Helper function to get all image files in a directory
function getImageFiles(dir: string): any[] {
  try {
    if (!fs.existsSync(dir)) {
      return [];
    }
    
    const fileList = fs.readdirSync(dir);
    const imageFiles = fileList.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
    });
    
    return imageFiles.map(file => {
      // Get the filename without extension as the ID
      const fileNameWithoutExt = path.basename(file, path.extname(file));
      
      return {
        name: file,
        path: `/images/tigers/${file}`, // This path is relative to public directory
        fullPath: path.join(dir, file),
        id: fileNameWithoutExt // Use the numeric filename as ID
      };
    });
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get('path') || 'public/images/tigers';
    
    // For security, only allow paths within the public directory
    const safePath = path.join(process.cwd(), 
      folderPath.startsWith('public/') ? folderPath : `public/${folderPath}`);
    
    // Get image files from the directory
    const images = getImageFiles(safePath);
    
    return NextResponse.json({ 
      images, 
      total: images.length,
      path: safePath
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to scan directory'
    }, { status: 500 });
  }
} 