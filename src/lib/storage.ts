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

// File paths
const ORDERS_FILE = '/tmp/orders.json';
const BATCHES_FILE = '/tmp/batches.json';
const INSCRIPTIONS_FILE = '/tmp/inscriptions.json';
const USED_TRANSACTIONS_FILE = '/tmp/used-transactions.json';
const WHITELIST_FILE = '/tmp/whitelist.json';

// Generic read function
function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || JSON.stringify(defaultValue));
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return defaultValue;
  }
}

// Generic write function
function writeJsonFile<T>(filePath: string, data: T): boolean {
  try {
    // Create /tmp directory if it doesn't exist
    const tmpDir = '/tmp';
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
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

// Initialize batches if they don't exist
function initializeBatches(): void {
  const defaultBatches = [
    {
      id: 1,
      price: 250,
      mintedWallets: 0,
      maxWallets: 40,
      ordinals: 66,
      isSoldOut: false
    },
    {
      id: 2,
      price: 260.71,
      mintedWallets: 0,
      maxWallets: 33,
      ordinals: 66,
      isSoldOut: false
    },
    {
      id: 3,
      price: 271.43,
      mintedWallets: 0,
      maxWallets: 33,
      ordinals: 66,
      isSoldOut: false
    },
    {
      id: 4,
      price: 282.14,
      mintedWallets: 0,
      maxWallets: 33,
      ordinals: 66,
      isSoldOut: false
    },
    {
      id: 5,
      price: 292.86,
      mintedWallets: 0,
      maxWallets: 33,
      ordinals: 66,
      isSoldOut: false
    },
    {
      id: 6,
      price: 303.57,
      mintedWallets: 0,
      maxWallets: 33,
      ordinals: 66,
      isSoldOut: false
    },
    {
      id: 7,
      price: 314.29,
      mintedWallets: 0,
      maxWallets: 33,
      ordinals: 66,
      isSoldOut: false
    },
    {
      id: 8,
      price: 325,
      mintedWallets: 0,
      maxWallets: 33,
      ordinals: 66,
      isSoldOut: false
    },
    {
      id: 9,
      price: 335.71,
      mintedWallets: 0,
      maxWallets: 33,
      ordinals: 66,
      isSoldOut: false
    },
    {
      id: 10,
      price: 346.43,
      mintedWallets: 0,
      maxWallets: 33,
      ordinals: 66,
      isSoldOut: false
    },
    {
      id: 11,
      price: 357.14,
      mintedWallets: 0,
      maxWallets: 33,
      ordinals: 66,
      isSoldOut: false
    },
    {
      id: 12,
      price: 367.86,
      mintedWallets: 0,
      maxWallets: 33,
      ordinals: 66,
      isSoldOut: false
    },
    {
      id: 13,
      price: 378.57,
      mintedWallets: 0,
      maxWallets: 33,
      ordinals: 66,
      isSoldOut: false
    },
    {
      id: 14,
      price: 389.29,
      mintedWallets: 0,
      maxWallets: 33,
      ordinals: 66,
      isSoldOut: false
    },
    {
      id: 15,
      price: 400,
      mintedWallets: 0,
      maxWallets: 33,
      ordinals: 66,
      isSoldOut: false
    }
  ];

  if (!fs.existsSync(BATCHES_FILE)) {
    writeJsonFile(BATCHES_FILE, defaultBatches);
  }
}

// Batches functions
export function getBatches(): Batch[] {
  initializeBatches();
  return readJsonFile<Batch[]>(BATCHES_FILE, []);
}

export function saveBatches(batches: Batch[]): boolean {
  return writeJsonFile(BATCHES_FILE, batches);
}

// Orders functions
export function getOrders(): Record<string, Order> {
  if (!fs.existsSync(ORDERS_FILE)) {
    writeJsonFile(ORDERS_FILE, {});
  }
  return readJsonFile<Record<string, Order>>(ORDERS_FILE, {});
}

export function saveOrders(orders: Record<string, Order>): boolean {
  return writeJsonFile(ORDERS_FILE, orders);
}

// Minted wallets functions
export function getMintedWallets(): MintedWallet[] {
  return readJsonFile<MintedWallet[]>(USED_TRANSACTIONS_FILE, []);
}

export function saveMintedWallets(wallets: MintedWallet[]): boolean {
  return writeJsonFile(USED_TRANSACTIONS_FILE, wallets);
}

// Sold out times functions
export function getSoldOutTimes(): Record<number, number> {
  return readJsonFile<Record<number, number>>(INSCRIPTIONS_FILE, {});
}

export function saveSoldOutTimes(times: Record<number, number>): boolean {
  return writeJsonFile(INSCRIPTIONS_FILE, times);
}

/**
 * Admin functie: Synchroniseer alle orders met batches
 * Deze functie doorloopt alle orders en update de geminte wallets in batches.json
 */
export function syncOrdersToBatches(adminPassword: string): boolean {
  try {
    // Get current orders and batches
    const existingOrders = getOrders();
    const batches = getBatches();
    
    // Reset batch counters
    batches.forEach((batch: Batch) => {
      batch.mintedWallets = 0;
      batch.isSoldOut = false;
    });
    
    // Count orders per batch
    Object.values(existingOrders).forEach(order => {
      if (order.status === 'paid' || order.status === 'completed') {
        const batch = batches.find((b: Batch) => b.id === order.batchId);
        if (batch) {
          batch.mintedWallets += order.quantity;
          batch.isSoldOut = batch.mintedWallets >= batch.maxWallets;
        }
      }
    });
    
    // Save updated batches
    const saved = saveBatches(batches);
    if (!saved) {
      throw new Error('Failed to save batches');
    }
    
    return true;
  } catch (error: any) {
    console.error('Error syncing orders to batches:', error);
    return false;
  }
} 