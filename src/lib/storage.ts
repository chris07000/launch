import fs from 'fs';
import path from 'path';

// Use /tmp in production (Vercel) and data directory locally
const BASE_DIR = process.env.VERCEL
  ? '/tmp/data'
  : path.join(process.cwd(), 'data');

// Ensure the base directory exists
if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR, { recursive: true });
}

// On startup in production, copy data files from the repository to /tmp
if (process.env.VERCEL) {
  const sourceDir = path.join(process.cwd(), 'data');
  if (fs.existsSync(sourceDir)) {
    const files = fs.readdirSync(sourceDir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(BASE_DIR, file);
        try {
          if (!fs.existsSync(targetPath)) {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`Copied ${file} to /tmp`);
          }
        } catch (error) {
          console.error(`Error copying ${file}:`, error);
        }
      }
    });
  }
}

// Define all data file paths
export const DATA_FILES = {
  whitelist: path.join(BASE_DIR, 'whitelist.json'),
  batches: path.join(BASE_DIR, 'batches.json'),
  orders: path.join(BASE_DIR, 'orders.json'),
  mintStart: path.join(BASE_DIR, 'mint-start.json'),
  mintedWallets: path.join(BASE_DIR, 'minted-wallets.json'),
  inscriptions: path.join(BASE_DIR, 'inscriptions.json'),
  usedTransactions: path.join(BASE_DIR, 'used-transactions.json'),
  currentBatch: path.join(BASE_DIR, 'current-batch.json'),
  soldOutTimes: path.join(BASE_DIR, 'sold-out-times.json'),
  batchCooldown: path.join(BASE_DIR, 'batch-cooldown.json')
};

// Generic read function
export function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return defaultValue;
  }
}

// Generic write function
export function writeJsonFile<T>(filePath: string, data: T): boolean {
  try {
    // Ensure the directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Successfully wrote to ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
    return false;
  }
}

// Specific functions for each data type
export interface WhitelistEntry {
  address: string;
  batchId: number;
  createdAt: string;
  updatedAt?: string;  // Optional because it only exists after an update
}

export interface Batch {
  id: number;
  price: number;
  mintedWallets: number;
  maxWallets: number;
  ordinals: number;
  isSoldOut: boolean;
  isFCFS?: boolean;
}

export interface Order {
  id: string;
  btcAddress: string;
  quantity: number;
  totalPrice: number;
  batchId: number;
  paymentAddress: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  inscriptionId?: string;
}

// Helper functions for specific data types
export function getWhitelist(): WhitelistEntry[] {
  return readJsonFile<WhitelistEntry[]>(DATA_FILES.whitelist, []);
}

export function getBatches(): Batch[] {
  return readJsonFile<Batch[]>(DATA_FILES.batches, []);
}

export function getOrders(): Record<string, Order> {
  return readJsonFile<Record<string, Order>>(DATA_FILES.orders, {});
}

export function getMintedWallets(): string[] {
  return readJsonFile<string[]>(DATA_FILES.mintedWallets, []);
}

// Save functions
export function saveWhitelist(data: WhitelistEntry[]): boolean {
  return writeJsonFile(DATA_FILES.whitelist, data);
}

export function saveBatches(data: Batch[]): boolean {
  return writeJsonFile(DATA_FILES.batches, data);
}

export function saveOrders(data: Record<string, Order>): boolean {
  return writeJsonFile(DATA_FILES.orders, data);
}

export function saveMintedWallets(data: string[]): boolean {
  return writeJsonFile(DATA_FILES.mintedWallets, data);
} 