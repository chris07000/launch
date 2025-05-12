import fs from 'fs';
import path from 'path';
import os from 'os';
import { Order, Batch, WhitelistEntry, MintedWallet } from './types';

// Re-export types
export type { Order, Batch, WhitelistEntry, MintedWallet };

// Get the OS temporary directory
const tmpDir = os.tmpdir();

// Constants for file paths - everything in /tmp
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
    console.log(`Reading file: ${filePath}`);
    if (!fs.existsSync(filePath)) {
      console.log(`File does not exist: ${filePath}`);
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    console.log(`Raw data from ${filePath}:`, data);
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

// Helper function to write JSON file
export function writeJsonFile<T>(filePath: string, data: T): boolean {
  try {
    console.log(`Writing to file: ${filePath}`);
    console.log('Data to write:', data);
    ensureDirectoryExists(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Successfully wrote to ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
}

// Initialize orders file if it doesn't exist
export function initializeOrdersFile() {
  console.log('Initializing orders file');
  if (!fs.existsSync(ORDERS_FILE)) {
    console.log(`Orders file does not exist: ${ORDERS_FILE}`);
    ensureDirectoryExists(ORDERS_FILE);
    writeJsonFile(ORDERS_FILE, []);
    console.log('Created empty orders file');
  } else {
    console.log('Orders file already exists');
  }
}

// Get orders from file
export function getOrders(): Order[] {
  console.log('Getting orders');
  initializeOrdersFile();
  const orders = readJsonFile<Order[]>(ORDERS_FILE) || [];
  console.log('Retrieved orders:', orders);
  return orders;
}

// Save orders to file
export function saveOrders(orders: Order[]): boolean {
  console.log('Saving orders:', orders);
  initializeOrdersFile();
  const result = writeJsonFile(ORDERS_FILE, orders);
  console.log('Save result:', result);
  return result;
}

// Get batches from file
export function getBatches(): Batch[] {
  const batches = readJsonFile<Batch[]>(BATCHES_FILE);
  if (!batches) {
    // Return default batches if file doesn't exist
    const defaultBatches = [
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
      { id: 16, price: 450.00, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false }
    ];
    writeJsonFile(BATCHES_FILE, defaultBatches);
    return defaultBatches;
  }
  return batches;
}

// Save batches to file
export function saveBatches(batches: Batch[]): boolean {
  return writeJsonFile(BATCHES_FILE, batches);
}

// Get whitelist from file
export function getWhitelist(): WhitelistEntry[] {
  return readJsonFile<WhitelistEntry[]>(WHITELIST_FILE) || [];
}

// Save whitelist to file
export function saveWhitelist(whitelist: WhitelistEntry[]): boolean {
  return writeJsonFile(WHITELIST_FILE, whitelist);
}

// Get minted wallets from file
export function getMintedWallets(): MintedWallet[] {
  return readJsonFile<MintedWallet[]>(MINTED_WALLETS_FILE) || [];
}

// Save minted wallets to file
export function saveMintedWallets(mintedWallets: MintedWallet[]): boolean {
  return writeJsonFile(MINTED_WALLETS_FILE, mintedWallets);
}

// Sync orders to batches
export async function syncOrdersToBatches(adminPassword: string): Promise<boolean> {
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return false;
  }

  try {
    const orders = getOrders();
    const batches = getBatches();
    const mintedWallets = getMintedWallets();

    // Reset mintedWallets count for all batches
    batches.forEach(batch => {
      batch.mintedWallets = 0;
    });

    // Count minted wallets per batch
    orders.forEach(order => {
      if (order.status === 'paid' || order.status === 'completed') {
        const batch = batches.find(b => b.id === order.batchId);
        if (batch) {
          batch.mintedWallets++;
        }

        // Add to mintedWallets if not already present
        const existingWallet = mintedWallets.find(
          w => w.address === order.btcAddress && w.batchId === order.batchId
        );
        if (!existingWallet) {
          mintedWallets.push({
            address: order.btcAddress,
            batchId: order.batchId,
            quantity: order.quantity,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    // Save updated batches and minted wallets
    await saveBatches(batches);
    await saveMintedWallets(mintedWallets);

    return true;
  } catch (error) {
    console.error('Error syncing orders to batches:', error);
    return false;
  }
} 