import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { loadWhitelist } from '../utils';
import * as storage from '@/lib/storage-wrapper';

// For backward compatibility
const CURRENT_BATCH_FILE = path.join(process.cwd(), 'data', 'current-batch.json');
const COOLDOWN_FILE_PATH = path.join(process.cwd(), 'data', 'batch-cooldown.json');

async function getCooldownMinutes(): Promise<number> {
  try {
    const isVercel = process.env.VERCEL === '1';
    
    if (isVercel) {
      // In production, use fixed cooldown
      return 15;
    } else {
      // In local dev, read from file
      const data = await fs.readFile(COOLDOWN_FILE_PATH, 'utf-8');
      const cooldown = JSON.parse(data);
      return cooldown.value || 15;
    }
  } catch (error) {
    return 15; // Default cooldown time
  }
}

export async function GET() {
  try {
    // Get current batch from storage wrapper
    const { currentBatch, soldOutAt } = await storage.getCurrentBatch();

    // If batch is marked as sold out, check if cooldown period has passed
    if (soldOutAt) {
      const cooldownMinutes = await getCooldownMinutes();
      const cooldownMs = cooldownMinutes * 60 * 1000;
      const now = Date.now();
      
      // If cooldown period has passed, increment batch and clear sold out status
      if (now - soldOutAt >= cooldownMs) {
        const newBatch = currentBatch + 1;
        await storage.saveCurrentBatch({ 
          currentBatch: newBatch,
          soldOutAt: null 
        });
        
        return NextResponse.json({ currentBatch: newBatch });
      }
      
      // If still in cooldown, return current status
      return NextResponse.json({ currentBatch, soldOutAt });
    }

    // If not sold out, just return current batch
    return NextResponse.json({ currentBatch });
  } catch (error) {
    console.error('Error getting current batch:', error);
    return NextResponse.json({ currentBatch: 1 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, password } = await request.json();
    
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    if (action === 'mark_sold_out') {
      const { currentBatch } = await storage.getCurrentBatch();
      
      // Mark current batch as sold out with timestamp
      await storage.saveCurrentBatch({ 
        currentBatch,
        soldOutAt: Date.now()
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating batch status:', error);
    return NextResponse.json({ error: 'Failed to update batch status' }, { status: 500 });
  }
} 