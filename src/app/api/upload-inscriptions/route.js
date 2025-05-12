import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';

// In Next.js App Router, we use a different approach for large files
export const config = {
  api: {
    // Increase the limit for file uploads
    responseLimit: '50mb',
  },
};

// Set up constants for paths
const DATA_DIR = path.join(process.cwd(), 'data');
const PUBLIC_IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'inscriptions');
const INSCRIPTIONS_FILE = path.join(DATA_DIR, 'inscriptions.json');

// Ensure required directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(PUBLIC_IMAGES_DIR)) {
  fs.mkdirSync(PUBLIC_IMAGES_DIR, { recursive: true });
}

// Ensure inscriptions file exists
if (!fs.existsSync(INSCRIPTIONS_FILE)) {
  fs.writeFileSync(INSCRIPTIONS_FILE, JSON.stringify([], null, 2));
}

// Helper function to read form data
async function readFormData(request) {
  const formData = await request.formData();
  const files = [];
  const batchId = formData.get('batchId') || '1';

  // Extract all files and metadata
  for (let i = 0; ; i++) {
    const file = formData.get(`file_${i}`);
    const metadataStr = formData.get(`metadata_${i}`);
    
    if (!file || !metadataStr) break;
    
    try {
      const metadata = JSON.parse(metadataStr);
      files.push({ file, metadata });
    } catch (err) {
      console.error(`Failed to parse metadata for file_${i}:`, err);
    }
  }

  return { files, batchId };
}

export async function POST(request) {
  try {
    // Read multipart form data
    const { files, batchId } = await readFormData(request);
    
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files received' }, { status: 400 });
    }

    // Read existing inscriptions data
    const inscriptionsData = fs.readFileSync(INSCRIPTIONS_FILE, 'utf8');
    let currentInscriptions = JSON.parse(inscriptionsData || '[]');
    
    // Set for quickly checking duplicate IDs
    const existingIds = new Set(currentInscriptions.map(insc => insc.id));
    
    // Process files
    const newInscriptions = [];
    const timestamp = new Date().toISOString();
    
    for (const { file, metadata } of files) {
      const id = metadata.id || `inscription_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Skip if ID already exists
      if (existingIds.has(id)) continue;
      
      // Generate a safe filename
      const fileExtension = file.name.split('.').pop() || 'png';
      const safeFilename = `${id.replace(/[^a-z0-9]/gi, '')}.${fileExtension}`;
      const imagePath = path.join(PUBLIC_IMAGES_DIR, safeFilename);
      const relativeImagePath = `/images/inscriptions/${safeFilename}`;
      
      // Save the file
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await writeFile(imagePath, fileBuffer);
      
      // Add to inscriptions
      const inscription = {
        id,
        imageUrl: relativeImagePath,
        batch: parseInt(metadata.batch || batchId),
        inscriptionId: id,
        createdAt: timestamp,
      };
      
      newInscriptions.push(inscription);
      existingIds.add(id);
    }
    
    // Update inscriptions data
    currentInscriptions = [...currentInscriptions, ...newInscriptions];
    fs.writeFileSync(INSCRIPTIONS_FILE, JSON.stringify(currentInscriptions, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      imported: newInscriptions.length,
      inscriptions: newInscriptions
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: 'Failed to process uploaded files',
      detail: error.message
    }, { status: 500 });
  }
} 