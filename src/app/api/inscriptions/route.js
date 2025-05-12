import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const INSCRIPTIONS_FILE = path.join(DATA_DIR, 'inscriptions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure inscriptions file exists
if (!fs.existsSync(INSCRIPTIONS_FILE)) {
  fs.writeFileSync(INSCRIPTIONS_FILE, JSON.stringify([], null, 2));
}

export async function GET() {
  try {
    const inscriptionsData = fs.readFileSync(INSCRIPTIONS_FILE, 'utf8');
    const inscriptions = JSON.parse(inscriptionsData || '[]');
    return NextResponse.json(inscriptions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch inscriptions' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, id, imageUrl, batch, inscriptions: reqInscriptions, batchId } = body;
    
    // Read current inscriptions
    const inscriptionsData = fs.readFileSync(INSCRIPTIONS_FILE, 'utf8');
    let currentInscriptions = JSON.parse(inscriptionsData || '[]');
    
    if (action === 'add') {
      // Add a single inscription
      if (!id || !imageUrl || !batch) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      // Check for duplicate ID
      if (currentInscriptions.some(insc => insc.id === id)) {
        return NextResponse.json({ error: 'Inscription ID already exists' }, { status: 400 });
      }
      
      const newInscription = { id, imageUrl, batch, createdAt: new Date().toISOString() };
      currentInscriptions.push(newInscription);
    } 
    else if (action === 'batchImport') {
      // Batch import inscriptions
      if (!reqInscriptions || !Array.isArray(reqInscriptions) || reqInscriptions.length === 0) {
        return NextResponse.json({ error: 'No valid inscriptions provided' }, { status: 400 });
      }
      
      // Filter out inscriptions with duplicate IDs
      const existingIds = new Set(currentInscriptions.map(insc => insc.id));
      const newValidInscriptions = reqInscriptions.filter(insc => {
        if (!insc.id || !insc.imageUrl || !insc.batch) return false;
        if (existingIds.has(insc.id)) return false;
        existingIds.add(insc.id); // Add to set to prevent duplicates within batch
        return true;
      });
      
      if (newValidInscriptions.length === 0) {
        return NextResponse.json({ error: 'All inscription IDs already exist or invalid' }, { status: 400 });
      }
      
      // Add timestamp to each new inscription
      const timestamp = new Date().toISOString();
      newValidInscriptions.forEach(insc => insc.createdAt = timestamp);
      
      // Add to existing inscriptions
      currentInscriptions = [...currentInscriptions, ...newValidInscriptions];
    }
    else if (action === 'delete') {
      // Delete an inscription
      if (!id) {
        return NextResponse.json({ error: 'Missing inscription ID' }, { status: 400 });
      }
      
      currentInscriptions = currentInscriptions.filter(insc => insc.id !== id);
    }
    else if (action === 'update') {
      // Update an inscription
      if (!id) {
        return NextResponse.json({ error: 'Missing inscription ID' }, { status: 400 });
      }
      
      const index = currentInscriptions.findIndex(insc => insc.id === id);
      if (index === -1) {
        return NextResponse.json({ error: 'Inscription not found' }, { status: 404 });
      }
      
      // Update fields
      if (imageUrl) currentInscriptions[index].imageUrl = imageUrl;
      if (batch) currentInscriptions[index].batch = batch;
      currentInscriptions[index].updatedAt = new Date().toISOString();
    }
    else if (action === 'clearAll') {
      // Clear all inscriptions
      currentInscriptions = [];
    }
    else if (action === 'clearBatch') {
      // Clear inscriptions by batch
      if (!batchId) {
        return NextResponse.json({ error: 'Missing batch ID' }, { status: 400 });
      }
      
      // Convert batchId to number if it's a string
      const batchIdNum = typeof batchId === 'string' ? parseInt(batchId) : batchId;
      
      // Keep inscriptions that don't match the batch
      currentInscriptions = currentInscriptions.filter(insc => {
        const inscBatch = insc.batch || insc.batchId;
        return inscBatch !== batchIdNum;
      });
    }
    else if (action === 'clearUnassigned') {
      // Clear all unassigned inscriptions
      currentInscriptions = currentInscriptions.filter(insc => insc.assignedToOrder);
    }
    else if (action === 'importTigerCollection') {
      // Import the tiger collection from the public folder with proper batch distribution
      const fs = require('fs');
      const path = require('path');
      
      // Folder containing tiger images
      const tigerDir = path.join(process.cwd(), 'public/images/tigers');
      
      if (!fs.existsSync(tigerDir)) {
        return NextResponse.json({ error: 'Tiger collection folder not found' }, { status: 404 });
      }
      
      // Get list of all png files in the directory
      const fileList = fs.readdirSync(tigerDir);
      const imageFiles = fileList.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.png';
      }).sort((a, b) => {
        // Sort numerically (1.png, 2.png, ..., 999.png)
        const numA = parseInt(path.basename(a, path.extname(a)));
        const numB = parseInt(path.basename(b, path.extname(b)));
        return numA - numB;
      });
      
      // Get existing inscription IDs to avoid duplicates
      const existingIds = new Set(currentInscriptions.map(insc => insc.id));
      
      // Create batch import data from files
      const newInscriptions = [];
      
      // Distribution constants
      const walletsPerBatch = 33;  // Number of wallets per batch
      const tigersPerWallet = 2;   // Number of tigers per wallet
      const tigersPerBatch = walletsPerBatch * tigersPerWallet; // 66 tigers per batch
      
      imageFiles.forEach((file, index) => {
        const fileNameWithoutExt = path.basename(file, path.extname(file));
        const id = fileNameWithoutExt;
        
        // Skip if this ID already exists
        if (existingIds.has(id)) return;
        
        // Calculate which batch this tiger belongs to
        // Batch 1: 0-65, Batch 2: 66-131, Batch 3: 132-197, etc.
        const batchNumber = Math.floor(index / tigersPerBatch) + 1;
        
        newInscriptions.push({
          id,
          imageUrl: `/images/tigers/${file}`,
          batch: batchNumber,
          inscriptionId: id,
          createdAt: new Date().toISOString()
        });
      });
      
      if (newInscriptions.length === 0) {
        return NextResponse.json({ 
          message: 'No new inscriptions to add',
          inscriptionsCount: currentInscriptions.length
        });
      }
      
      // Add new inscriptions to existing ones
      currentInscriptions = [...currentInscriptions, ...newInscriptions];
      
      // Log import stats with batch distribution
      const batchCounts = {};
      newInscriptions.forEach(insc => {
        batchCounts[insc.batch] = (batchCounts[insc.batch] || 0) + 1;
      });
      
      console.log(`Imported ${newInscriptions.length} tiger images from collection`);
      console.log(`Batch distribution:`, batchCounts);
    }
    else if (action === 'generateTestInscriptions') {
      const { batchId = 1, count = 10 } = body;
      
      try {
        // Load existing inscriptions
        const inscriptions = await getInscriptions();
        
        // Generate sample inscriptions
        const sampleInscriptions = await generateSampleInscriptions(batchId, count);
        
        // Add new inscriptions to the list
        inscriptions.push(...sampleInscriptions);
        
        // Save updated inscriptions
        await saveInscriptions(inscriptions);
        
        return NextResponse.json({ 
          success: true, 
          message: `Added ${sampleInscriptions.length} test inscriptions to batch ${batchId}`,
          inscriptionsCount: inscriptions.length
        });
      } catch (error) {
        console.error('Error generating test inscriptions:', error);
        return NextResponse.json({ error: 'Failed to generate test inscriptions' }, { status: 500 });
      }
    }
    else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    // Save updated inscriptions
    fs.writeFileSync(INSCRIPTIONS_FILE, JSON.stringify(currentInscriptions, null, 2));
    
    return NextResponse.json({ 
      success: true,
      inscriptionsCount: currentInscriptions.length
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

// Add a new test function to generate sample inscriptions with the logo

async function generateSampleInscriptions(batchId = 1, count = 10) {
  const inscriptions = [];
  
  for (let i = 0; i < count; i++) {
    const id = `sample_${Date.now()}_${i}`;
    
    inscriptions.push({
      id,
      inscriptionId: id,
      imageUrl: '/images/tiger-logo.png', // Use the logo image
      batch: batchId,
      batchId: batchId,
      createdAt: new Date().toISOString(),
      assignedToOrder: null
    });
  }
  
  return inscriptions;
} 