import fs from 'fs';
import path from 'path';
import os from 'os';
import { Order, Batch, WhitelistEntry, MintedWallet } from './types';

// Get the OS temporary directory
const tmpDir = os.tmpdir();

// Constants for file paths
const ORDERS_FILE = path.join(tmpDir, 'orders.json');
const BATCHES_FILE = path.join(tmpDir, 'batches.json');
const WHITELIST_FILE = path.join(tmpDir, 'whitelist.json');
const MINTED_WALLETS_FILE = path.join(tmpDir, 'minted-wallets.json');

// Helper function to ensure directory exists
export function ensureDirectoryExists(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Helper function to read JSON file
export function readJsonFile<T>(filePath: string): T | null {
  try {
    ensureDirectoryExists(filePath);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || '{}');
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

// Helper function to write JSON file
export function writeJsonFile<T>(filePath: string, data: T): boolean {
  try {
    ensureDirectoryExists(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
}

export function getOrders(): Order[] {
  const orders = readJsonFile<Order[]>(ORDERS_FILE);
  console.log(`Loaded ${orders ? orders.length : 0} orders from disk`);
  return orders || [];
}

export function saveOrders(orders: Order[]): boolean {
  console.log(`Saving ${orders.length} orders to disk`);
  return writeJsonFile(ORDERS_FILE, orders);
}

export function getBatches(): Batch[] {
  const batches = readJsonFile<Batch[]>(BATCHES_FILE);
  if (!batches) {
    // Return default batches if file doesn't exist
    return [
      { id: 1, price: 250.00, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
      { id: 2, price: 260.71, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
      { id: 3, price: 271.43, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
      { id: 4, price: 282.14, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
      { id: 5, price: 292.86, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
      { id: 6, price: 303.57, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
      { id: 7, price: 314.29, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
      { id: 8, price: 325.00, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
      { id: 9, price: 335.71, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
      { id: 10, price: 346.43, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
      { id: 11, price: 357.14, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
      { id: 12, price: 367.86, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
      { id: 13, price: 378.57, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
      { id: 14, price: 389.29, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
      { id: 15, price: 400.00, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false },
      { id: 16, price: 450.00, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false, isFCFS: true }
    ];
  }
  return batches;
}

export function saveBatches(batches: Batch[]): boolean {
  return writeJsonFile(BATCHES_FILE, batches);
}

export function getWhitelist(): WhitelistEntry[] {
  return readJsonFile<WhitelistEntry[]>(WHITELIST_FILE) || [];
}

export function saveWhitelist(whitelist: WhitelistEntry[]): boolean {
  return writeJsonFile(WHITELIST_FILE, whitelist);
}

export function getMintedWallets(): MintedWallet[] {
  return readJsonFile<MintedWallet[]>(MINTED_WALLETS_FILE) || [];
}

export function saveMintedWallets(mintedWallets: MintedWallet[]): boolean {
  return writeJsonFile(MINTED_WALLETS_FILE, mintedWallets);
}

export async function syncOrdersToBatches(password: string): Promise<boolean> {
  try {
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      console.error('Invalid password for syncOrdersToBatches');
      return false;
    }

    const orders = getOrders();
    const batches = getBatches();
    
    // Reset mintedWallets count
    batches.forEach((batch: Batch) => {
      batch.mintedWallets = 0;
    });
    
    // Count paid orders per batch
    orders.forEach(order => {
      if (order.status === 'paid' || order.status === 'completed') {
        const batch = batches.find((b: Batch) => b.id === order.batchId);
        if (batch) {
          batch.mintedWallets += 1;
        }
      }
    });
    
    // Update isSoldOut status
    batches.forEach((batch: Batch) => {
      batch.isSoldOut = batch.mintedWallets >= batch.maxWallets;
    });
    
    // Save updated batches
    return saveBatches(batches);
  } catch (error) {
    console.error('Error in syncOrdersToBatches:', error);
    return false;
  }
} 