import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MINT_START_FILE = path.join(process.cwd(), 'data', 'mint-start.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bitcointigers2024';

// GET endpoint om de start tijd op te halen
export async function GET() {
  try {
    if (!fs.existsSync(MINT_START_FILE)) {
      return NextResponse.json({ startTime: null });
    }

    const data = fs.readFileSync(MINT_START_FILE, 'utf8');
    const { startTime } = JSON.parse(data);
    return NextResponse.json({ startTime });
  } catch (error) {
    console.error('Error reading mint start time:', error);
    return NextResponse.json({ startTime: null });
  }
}

// POST endpoint om de start tijd in te stellen
export async function POST(req: Request) {
  try {
    const { startTime, password } = await req.json();

    // Validate admin password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save the start time
    fs.writeFileSync(MINT_START_FILE, JSON.stringify({ startTime }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting mint start time:', error);
    return NextResponse.json({ error: 'Failed to set mint start time' }, { status: 500 });
  }
} 