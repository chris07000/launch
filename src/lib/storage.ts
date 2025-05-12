import fs from 'fs';
import path from 'path';

// Types
export interface WhitelistEntry {
  address: string;
  batchId: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Batch {
  id: number;
  price: number;
  mintedWallets: number;
  maxWallets: number;
  ordinals: number;
  isSoldOut: boolean;
  isFCFS?: boolean;
  available?: number;
}

export interface Order {
  id: string;
  btcAddress: string;
  quantity: number;
  totalPrice: number;
  totalPriceUsd: number;
  pricePerUnit: number;
  pricePerUnitBtc: number;
  batchId: number;
  paymentAddress: string;
  paymentReference: string;
  status: 'pending' | 'paid' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  inscriptionId?: string;
}

export interface MintedWallet {
  address: string;
  batchId: number;
  mintedAt: string;
}

// Get base directory based on environment
const getBaseDir = () => {
  // Use /tmp in production (Vercel), data directory in development
  const baseDir = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(process.cwd(), 'data');
  
  // Ensure directory exists
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  return baseDir;
};

// File paths
const getFilePath = (filename: string) => path.join(getBaseDir(), filename);

const WHITELIST_FILE = 'whitelist.json';
const BATCHES_FILE = 'batches.json';
const ORDERS_FILE = 'orders.json';
const MINTED_WALLETS_FILE = 'minted-wallets.json';
const SOLD_OUT_TIMES_FILE = 'sold-out-times.json';

// Generic read function
function readJsonFile<T>(filename: string, defaultValue: T): T {
  const filePath = getFilePath(filename);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data || JSON.stringify(defaultValue));
    }
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
  }
  return defaultValue;
}

// Generic write function
function writeJsonFile<T>(filename: string, data: T): boolean {
  const filePath = getFilePath(filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    return false;
  }
}

// Whitelist functions
export function getWhitelist(): WhitelistEntry[] {
  return readJsonFile<WhitelistEntry[]>(WHITELIST_FILE, []);
}

export function saveWhitelist(whitelist: WhitelistEntry[]): boolean {
  return writeJsonFile(WHITELIST_FILE, whitelist);
}

// Batches functions
export function getBatches(): Batch[] {
  return readJsonFile<Batch[]>(BATCHES_FILE, []);
}

export function saveBatches(batches: Batch[]): boolean {
  return writeJsonFile(BATCHES_FILE, batches);
}

// Orders functions
export function getOrders(): Record<string, Order> {
  return readJsonFile<Record<string, Order>>(ORDERS_FILE, {});
}

export function saveOrders(orders: Record<string, Order>): boolean {
  return writeJsonFile(ORDERS_FILE, orders);
}

// Minted wallets functions
export function getMintedWallets(): MintedWallet[] {
  return readJsonFile<MintedWallet[]>(MINTED_WALLETS_FILE, []);
}

export function saveMintedWallets(wallets: MintedWallet[]): boolean {
  return writeJsonFile(MINTED_WALLETS_FILE, wallets);
}

// Sold out times functions
export function getSoldOutTimes(): Record<number, number> {
  return readJsonFile<Record<number, number>>(SOLD_OUT_TIMES_FILE, {});
}

export function saveSoldOutTimes(times: Record<number, number>): boolean {
  return writeJsonFile(SOLD_OUT_TIMES_FILE, times);
} 