import fs from 'fs/promises';
import path from 'path';

export interface WhitelistEntry {
  address: string;
  batchId: number;
  createdAt: string;
}

export async function loadWhitelist(): Promise<WhitelistEntry[]> {
  const whitelistPath = path.join(process.cwd(), 'data', 'whitelist.json');
  try {
    const data = await fs.readFile(whitelistPath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error loading whitelist:', error);
    return [];
  }
} 