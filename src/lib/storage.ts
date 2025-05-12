import { Order, Batch, WhitelistEntry, MintedWallet } from './types';
import * as db from './db';

// Re-export types
export type { Order, Batch, WhitelistEntry, MintedWallet };

// Get orders from database
export async function getOrders(): Promise<Order[]> {
  console.log('Getting orders from database');
  try {
    const orders = await db.getOrders();
    console.log('Retrieved orders:', orders);
    return orders;
  } catch (error) {
    console.error('Error getting orders:', error);
    return [];
  }
}

// Save order to database
export async function saveOrder(order: Order): Promise<boolean> {
  console.log('Saving order to database:', order);
  try {
    const result = await db.saveOrder(order);
    console.log('Save result:', result);
    return result;
  } catch (error) {
    console.error('Error saving order:', error);
    return false;
  }
}

// Save multiple orders to database
export async function saveOrders(orders: Order[]): Promise<boolean> {
  console.log('Saving multiple orders to database');
  try {
    // Save each order individually
    const results = await Promise.all(orders.map(order => db.saveOrder(order)));
    return results.every(result => result === true);
  } catch (error) {
    console.error('Error saving orders:', error);
    return false;
  }
}

// Get batches from database
export async function getBatches(): Promise<Batch[]> {
  try {
    const batches = await db.getBatches();
    if (batches.length === 0) {
      // Return and save default batches if none exist
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
      await Promise.all(defaultBatches.map(batch => db.saveBatch(batch)));
      return defaultBatches;
    }
    return batches;
  } catch (error) {
    console.error('Error getting batches:', error);
    return [];
  }
}

// Save batches to database
export async function saveBatches(batches: Batch[]): Promise<boolean> {
  try {
    const results = await Promise.all(batches.map(batch => db.saveBatch(batch)));
    return results.every(result => result === true);
  } catch (error) {
    console.error('Error saving batches:', error);
    return false;
  }
}

// Get whitelist from database
export async function getWhitelist(): Promise<WhitelistEntry[]> {
  try {
    return await db.getWhitelist();
  } catch (error) {
    console.error('Error getting whitelist:', error);
    return [];
  }
}

// Save whitelist to database
export async function saveWhitelist(whitelist: WhitelistEntry[]): Promise<boolean> {
  try {
    const results = await Promise.all(whitelist.map(entry => db.saveWhitelistEntry(entry)));
    return results.every(result => result === true);
  } catch (error) {
    console.error('Error saving whitelist:', error);
    return false;
  }
}

// Get minted wallets from database
export async function getMintedWallets(): Promise<MintedWallet[]> {
  try {
    return await db.getMintedWallets();
  } catch (error) {
    console.error('Error getting minted wallets:', error);
    return [];
  }
}

// Save minted wallets to database
export async function saveMintedWallets(mintedWallets: MintedWallet[]): Promise<boolean> {
  try {
    const results = await Promise.all(mintedWallets.map(wallet => db.saveMintedWallet(wallet)));
    return results.every(result => result === true);
  } catch (error) {
    console.error('Error saving minted wallets:', error);
    return false;
  }
}

// Initialize database
export async function initializeStorage(): Promise<void> {
  try {
    await db.initializeDatabase();
    console.log('Storage initialized successfully');
  } catch (error) {
    console.error('Error initializing storage:', error);
    throw error;
  }
} 