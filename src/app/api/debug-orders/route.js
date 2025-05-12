import fs from 'fs';
import path from 'path';
import os from 'os';
import { NextResponse } from 'next/server';

// Get the OS temporary directory
const tmpDir = os.tmpdir();

// Constants for file paths
const ORDERS_FILE = path.join(tmpDir, 'orders.json');

export async function GET() {
  try {
    if (!fs.existsSync(ORDERS_FILE)) {
      return NextResponse.json({ success: false, error: 'Orders file not found' });
    }
    const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8') || '[]');
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('Error reading orders:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
} 