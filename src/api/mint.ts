import fs from 'fs';
import path from 'path';
import os from 'os';
import * as storage from '../lib/storage-wrapper';
import { BatchConfig, Batch } from '../lib/types';
import { sql } from '@vercel/postgres';

// Check if running in Vercel environment
const isVercel = process.env.VERCEL === '1';

// Get the OS temporary directory
const tmpDir = os.tmpdir();

// Constants for file paths
const ORDERS_FILE = path.join(tmpDir, 'orders.json');
const USED_TRANSACTIONS_FILE = path.join(tmpDir, 'used-transactions.json');

interface UsedTransaction {
  orderId: string;
  amount: number;
  timestamp: string;
}

// Inscription interface
interface Inscription {
  inscriptionId: string;
  imageUrl: string;
  batchId: number;
  assignedToOrder?: string; // Order ID if assigned
}

// File path for persisting inscriptions
const INSCRIPTIONS_FILE_PATH = path.join(process.cwd(), 'data', 'inscriptions.json');

// File path for whitelist
const WHITELIST_FILE_PATH = path.join(process.cwd(), 'data', 'whitelist.json');

// Het BTC adres waar alle betalingen naartoe gaan (project wallet)
const PROJECT_BTC_ADDRESS = process.env.PROJECT_BTC_WALLET || 'bc1p9rf34vgvaz2rswpqh7d0zdvghzqreglp8qzk9eun3fscyj6pm5kqk96605';

// Het BTC adres voor betalingen (payment wallet)
const PAYMENT_BTC_ADDRESS = process.env.PAYMENT_BTC_WALLET || 'bc1qwfdxl0pq8d4tefd80enw3yae2k2dsszemrv6j0';

// Admin wachtwoord voor toegang tot beheersfuncties
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bitcointigers2024';

// Maximaal aantal Tigers per wallet
export const MAX_TIGERS_PER_WALLET = process.env.MAX_TIGERS_PER_WALLET ? parseInt(process.env.MAX_TIGERS_PER_WALLET, 10) : 2;

// BTC naar USD conversie (in een echte implementatie zou je een API gebruiken)
const BTC_TO_USD_RATE = parseInt(process.env.BTC_TO_USD_RATE || '40000', 10); // 1 BTC = $40,000 USD voor testing

// In-memory storage voor whitelisted adressen
let whitelistedAddresses: storage.WhitelistEntry[] = [];

// Load whitelist
async function loadWhitelist() {
  whitelistedAddresses = await storage.getWhitelist();
  console.log('Whitelist loaded with entries:', whitelistedAddresses);
}

// Initialize whitelist
loadWhitelist();

// Configuratie van batches
const batchesConfig: Record<number, BatchConfig> = {
  1: { id: 1, price: 250.00, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
  2: { id: 2, price: 260.71, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
  3: { id: 3, price: 271.43, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
  4: { id: 4, price: 282.14, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
  5: { id: 5, price: 292.86, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
  6: { id: 6, price: 303.57, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
  7: { id: 7, price: 314.29, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
  8: { id: 8, price: 325.00, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
  9: { id: 9, price: 335.71, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
  10: { id: 10, price: 346.43, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
  11: { id: 11, price: 357.14, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
  12: { id: 12, price: 367.86, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
  13: { id: 13, price: 378.57, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
  14: { id: 14, price: 389.29, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
  15: { id: 15, price: 400.00, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false },
  16: { id: 16, price: 450.00, maxWallets: 33, mintedWallets: 0, ordinals: 66, isSoldOut: false }
};

// In-memory storage for inscriptions
let inscriptions: Inscription[] = [];

/**
 * Check of een wallet al heeft gemint in een specifieke batch
 */
export async function hasWalletMinted(batchId: number, btcAddress: string): Promise<boolean> {
  const orders = await storage.getOrders();
  return orders.some(order => 
    order.batchId === batchId && 
    order.btcAddress === btcAddress && 
    (order.status === 'paid' || order.status === 'completed')
  );
}

/**
 * Check of een batch nog ruimte heeft voor nieuwe mints
 */
export async function isBatchAvailable(batchId: number): Promise<boolean> {
  const batches = await storage.getBatches();
  const batch = batches.find(b => b.id === batchId);
  if (!batch) return false;
  
  // Modern approach - check tigers if available
  if (batch.mintedTigers !== undefined && batch.ordinals) {
    return batch.mintedTigers < batch.ordinals;
  }
  
  // Legacy approach - fallback to wallets with null check
  const maxWallets = batch.maxWallets || 33; // Default to 33 if maxWallets is undefined
  return batch.mintedWallets < maxWallets;
}

/**
 * Markeer een batch als sold out en start de timer
 */
export async function markBatchAsSoldOut(
  batch: Batch,
  batches: Batch[],
  storage: any
) {
  if (!batch) return;

  // Mark the batch as sold out
  batch.isSoldOut = true;
  
  // Get the next batch if it exists
  const nextBatchId = batch.id + 1;
  const nextBatch = batches.find((b) => b.id === nextBatchId);

  // Save the updated batch status
  await storage.saveBatches(batches);
  
  // Modern approach - use tiger count if available
  if (batch.mintedTigers !== undefined && batch.ordinals) {
    console.log(
      `Batch ${batch.id} has reached its maximum tigers (${batch.ordinals}). Setting to sold out.`
    );
  } else {
    // Legacy approach - use wallet count
    const maxWallets = batch.maxWallets || 33; // Default to 33 if maxWallets is undefined
    console.log(
      `Batch ${batch.id} has reached its maximum wallets (${maxWallets}). Setting to sold out.`
    );
  }
}

/**
 * Find the next available batch after the current one
 */
async function findNextAvailableBatch(currentBatchId: number): Promise<number> {
  for (let i = currentBatchId + 1; i <= 16; i++) {
    const available = await isBatchAvailable(i);
    if (available) {
      return i;
    }
  }
  return currentBatchId; // Stay on current batch if no next available batch found
}

/**
 * Helper function to get cooldown duration for a specific batch
 */
async function getBatchCooldownMilliseconds(batchId: number): Promise<number> {
  try {
    if (isVercel) {
      // First, try to get batch-specific cooldown
      const { rows: batchSpecific } = await sql`
        SELECT cooldown_value, cooldown_unit FROM batch_cooldowns 
        WHERE batch_id = ${batchId.toString()}
      `;
      
      // If batch-specific setting exists, use it
      if (batchSpecific.length > 0) {
        const { cooldown_value, cooldown_unit } = batchSpecific[0];
        return convertToMilliseconds(cooldown_value, cooldown_unit);
      }
      
      // Otherwise, try to get default cooldown
      const { rows: defaultCooldown } = await sql`
        SELECT cooldown_value, cooldown_unit FROM batch_cooldowns 
        WHERE batch_id = 'default'
      `;
      
      // If default setting exists, use it
      if (defaultCooldown.length > 0) {
        const { cooldown_value, cooldown_unit } = defaultCooldown[0];
        return convertToMilliseconds(cooldown_value, cooldown_unit);
      }
    }
    
    // Fall back to 2 dagen (48 uur) if nothing is configured or not in Vercel
    const twoDaysInMilliseconds = 2 * 24 * 60 * 60 * 1000; // 2 dagen in milliseconds
    return twoDaysInMilliseconds;
  } catch (error) {
    console.error('Error getting batch cooldown:', error);
    // Default to 2 dagen in case of error
    const twoDaysInMilliseconds = 2 * 24 * 60 * 60 * 1000; // 2 dagen in milliseconds
    return twoDaysInMilliseconds;
  }
}

/**
 * Helper function to convert cooldown settings to milliseconds
 */
function convertToMilliseconds(value: number, unit: string): number {
  switch (unit) {
    case 'minutes':
      return value * 60 * 1000;
    case 'hours':
      return value * 60 * 60 * 1000;
    case 'days':
      return value * 24 * 60 * 60 * 1000;
    default:
      return value * 60 * 1000; // Default to minutes
  }
}

/**
 * Haal de huidige actieve batch op
 */
export async function getCurrentBatch(): Promise<number> {
  try {
    const { currentBatch, soldOutAt } = await storage.getCurrentBatch();
    
    // If we have a sold out time, check if cooldown period has elapsed
    if (soldOutAt) {
      const now = Date.now();
      const timeSinceSoldOut = now - soldOutAt;
      
      // Get cooldown duration from database
      const cooldownDuration = await getBatchCooldownMilliseconds(currentBatch);
      
      if (timeSinceSoldOut >= cooldownDuration) {
        // Find next available batch
        const nextBatch = await findNextAvailableBatch(currentBatch);
        
        // Update current batch
        await storage.saveCurrentBatch({
          currentBatch: nextBatch,
          soldOutAt: null
        });
        
        return nextBatch;
      }
    }
    
    return currentBatch;
  } catch (error) {
    console.error('Error getting current batch:', error);
    return 1; // Default to batch 1
  }
}

/**
 * Converteer USD naar BTC (simpele implementatie)
 */
function usdToBtc(usdAmount: number): number {
  // Return a real conversion value instead of the extremely low value
  return usdAmount / BTC_TO_USD_RATE;
}

/**
 * Valideer admin wachtwoord
 */
export function validateAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

/**
 * Voeg een adres toe aan de whitelist
 */
export async function addToWhitelist(address: string, adminPassword: string, batchId: number = 1): Promise<boolean> {
  if (!validateAdminPassword(adminPassword)) {
    return false;
  }
  
  if (!isValidOrdinalAddress(address)) {
    return false;
  }
  
  try {
    // Get current whitelist
    const whitelist = await storage.getWhitelist();
    
    // Check if address already exists
    const existingIndex = whitelist.findIndex(entry => entry.address === address);
    
    if (existingIndex !== -1) {
      // Update existing entry
      whitelist[existingIndex].batchId = batchId;
      whitelist[existingIndex].updatedAt = new Date().toISOString();
    } else {
      // Add new entry
      whitelist.push({
        address,
        batchId,
        createdAt: new Date().toISOString()
      });
    }
    
    // Save whitelist
    await storage.saveWhitelist(whitelist);
    
    // Update in-memory cache
    whitelistedAddresses = whitelist;
    
    return true;
  } catch (error) {
    console.error('Error adding to whitelist:', error);
    return false;
  }
}

/**
 * Verwijder een adres van de whitelist
 */
export async function removeFromWhitelist(address: string, adminPassword: string): Promise<boolean> {
  if (!validateAdminPassword(adminPassword)) {
    return false;
  }
  
  try {
    // Get current whitelist
    const whitelist = await storage.getWhitelist();
    
    // Filter out the address
    const newWhitelist = whitelist.filter(entry => entry.address !== address);
    
    // Save whitelist
    await storage.saveWhitelist(newWhitelist);
    
    // Update in-memory cache
    whitelistedAddresses = newWhitelist;
    
    return true;
  } catch (error) {
    console.error('Error removing from whitelist:', error);
    return false;
  }
}

/**
 * Haal alle whitelisted adressen op
 */
export async function getWhitelistedAddresses(adminPassword: string): Promise<storage.WhitelistEntry[] | null> {
  if (!validateAdminPassword(adminPassword)) {
    return null;
  }
  
  try {
    return await storage.getWhitelist();
  } catch (error) {
    console.error('Error getting whitelist:', error);
    return null;
  }
}

/**
 * Check of een adres in de whitelist staat voor een specifieke batch
 */
export async function isWhitelisted(address: string, batchId?: number): Promise<boolean> {
  const whitelist = await storage.getWhitelist();
  console.log(`Checking whitelist for address: ${address}, batch: ${batchId}, whitelist entries: ${whitelist.length}`);
  
  // Debug: print the whitelist entries
  whitelist.forEach((entry, index) => {
    console.log(`Whitelist entry ${index}: address=${entry.address}, batchId=${entry.batchId}`);
  });
  
  // Als de whitelist leeg is, staat niemand op de whitelist
  if (whitelist.length === 0) {
    console.log('Whitelist is empty, returning false');
    return false;
  }
  
  // Als geen batch is opgegeven, check of het adres in de whitelist staat voor elke batch
  if (batchId === undefined) {
    const result = whitelist.some(entry => entry.address === address);
    console.log(`No batch specified, checking any batch. Result: ${result}`);
    return result;
  }
  
  // Check of het adres in de whitelist staat voor de opgegeven batch
  const result = whitelist.some(entry => entry.address === address && entry.batchId === batchId);
  console.log(`Checking for batch ${batchId}. Result: ${result}`);
  return result;
}

/**
 * Admin functie: Haal alle minted wallets op voor alle batches
 */
export async function getMintedWallets(adminPassword: string): Promise<Record<number, number> | null> {
  if (!validateAdminPassword(adminPassword)) {
    return null;
  }
  
  try {
    const batches = await storage.getBatches();
    
    const result: Record<number, number> = {};
    for (const batch of batches) {
      result[batch.id] = batch.mintedWallets;
    }
    
    return result;
  } catch (error) {
    console.error('Error getting minted wallets:', error);
    return null;
  }
}

/**
 * Admin functie: Haal alle orders op
 */
export async function getAllOrders(adminPassword: string): Promise<storage.Order[] | null> {
  if (!validateAdminPassword(adminPassword)) {
    return null;
  }
  
  try {
    return await storage.getOrders();
  } catch (error) {
    console.error('Error getting all orders:', error);
    return null;
  }
}

/**
 * Check of een wallet eligible is om te minten
 */
export async function isWalletEligible(batchId: number, btcAddress: string): Promise<boolean> {
  console.log(`Checking eligibility for address: ${btcAddress}, batch: ${batchId}`);
  
  // Check of het adres op de whitelist staat
  const whitelisted = await isWhitelisted(btcAddress, batchId);
  if (!whitelisted) {
    console.log(`Address ${btcAddress} is not whitelisted for batch ${batchId}`);
    return false;
  }
  
  // Check of het adres al heeft gemint in deze batch
  const hasMinted = await hasWalletMinted(batchId, btcAddress);
  console.log(`Address ${btcAddress} has ${hasMinted ? 'already' : 'not'} minted in batch ${batchId}`);
  
  if (hasMinted) {
    return false;
  }

  // Check total Tigers minted by this wallet across all batches
  const orders = await storage.getOrders();
  const totalTigersMinted = orders.reduce((total, order) => {
    if ((order.status === 'paid' || order.status === 'completed') && 
        order.btcAddress === btcAddress) {
      return total + order.quantity;
    }
    return total;
  }, 0);
  
  console.log(`Total Tigers minted by ${btcAddress}: ${totalTigersMinted}`);
  
  if (totalTigersMinted >= MAX_TIGERS_PER_WALLET) {
    console.log(`Address ${btcAddress} has reached the maximum limit of ${MAX_TIGERS_PER_WALLET} Tigers`);
    return false;
  }
  
  return true;
}

/**
 * Check of een adres de juiste format heeft voor een Ordinals-ontvangst adres (Taproot)
 */
export function isValidOrdinalAddress(address: string): boolean {
  return address.startsWith('bc1p');
}

/**
 * Check of een adres de juiste format heeft voor een betaling
 */
export function isValidPaymentAddress(address: string): boolean {
  // Voor betalingen zijn bc1q adressen (segwit) aanbevolen
  // Andere formaten worden nog wel ondersteund voor compatibiliteit
  return address.startsWith('bc1q') || address.startsWith('1') || address.startsWith('3');
}

/**
 * API handler voor het aanmaken van een nieuwe mint order
 */
export async function createMintOrder(
  btcAddress: string,
  quantity: number,
  batchId?: number
) {
  console.log('Creating mint order:', { btcAddress, quantity, batchId });
  
  // Validate the BTC address
  if (!isValidOrdinalAddress(btcAddress)) {
    throw new Error('Invalid BTC address format');
  }
  
  // Get current batch if not specified
  const currentBatchId = batchId || await getCurrentBatch();
  
  // Check if wallet is eligible to mint
  const eligible = await isWalletEligible(currentBatchId, btcAddress);
  if (!eligible) {
    throw new Error('Wallet is not eligible to mint from this batch');
  }
  
  // Get batch info to determine price
  const batches = await storage.getBatches();
  const batchInfo = batches.find(b => b.id === currentBatchId);
  
  if (!batchInfo) {
    throw new Error(`Batch ${currentBatchId} not found`);
  }
  
  // Calculate total price in USD
  const pricePerUnit = batchInfo.price;
  const totalPriceUSD = pricePerUnit * quantity;
  
  // Convert USD to BTC
  const totalPriceBTC = usdToBtc(totalPriceUSD);
  
  // Generate unique payment reference (timestamp + random)
  const paymentReference = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  // Create new order with consistent ID format
  const orderId = `ord_${Math.random().toString(36).substring(2, 10)}`;
  const newOrder: storage.Order = {
    id: orderId,
    btcAddress,
    quantity,
    totalPrice: totalPriceBTC,
    totalPriceUsd: totalPriceUSD,
    pricePerUnit: pricePerUnit,
    pricePerUnitBtc: usdToBtc(pricePerUnit),
    batchId: currentBatchId,
    paymentAddress: PAYMENT_BTC_ADDRESS,
    paymentReference,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  console.log('New order created:', newOrder);
  
  // Get existing orders and add the new one
  const existingOrders = await storage.getOrders();
  existingOrders.push(newOrder);
  
  // Save all orders
  const saved = await storage.saveOrders(existingOrders);
  console.log('Save result:', saved);
  
  if (!saved) {
    console.error('Failed to save order');
    throw new Error('Failed to save order');
  }
  
  // Return order details
  const orderDetails = {
    orderId: orderId,
    btcAddress: PAYMENT_BTC_ADDRESS,
    paymentReference,
    amountUSD: totalPriceUSD,
    amountBTC: totalPriceBTC,
    totalPriceUsd: totalPriceUSD,
    totalPriceBtc: totalPriceBTC,
    pricePerUnit: pricePerUnit,
    pricePerUnitBtc: usdToBtc(pricePerUnit),
    quantity: quantity,
    batchId: currentBatchId
  };
  
  console.log('Returning order details:', orderDetails);
  return orderDetails;
}

/**
 * API handler voor het ophalen van een order status
 */
export async function getOrderStatus(orderId: string): Promise<storage.Order> {
  console.log(`Looking for order with ID: ${orderId}`);
  
  const orders = await storage.getOrders();
  console.log(`Available orders: ${orders.length}`);
  
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }
  
  console.log(`Order ${orderId} status retrieved:`, order);
  return order;
}

/**
 * API handler voor het updaten van een order status
 */
export async function updateOrderStatus(orderId: string, status: storage.Order['status']): Promise<boolean> {
  try {
    const orders = await storage.getOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
      console.error(`Order ${orderId} not found`);
      return false;
    }
    
    const order = orders[orderIndex];
    order.status = status;
    order.updatedAt = new Date().toISOString();
    
    // Update batch status if order is paid
    if (status === 'paid') {
      const batches = await storage.getBatches();
      const batchIndex = batches.findIndex(b => b.id === order.batchId);
      
      if (batchIndex !== -1) {
        // Verhoog het aantal geminte tigers direct
        const tigersInOrder = order.quantity * 2; // Elke order bevat 2 tigers
        batches[batchIndex].mintedWallets += 1;
        
        // Update mintedTigers direct
        if (batches[batchIndex].mintedTigers !== undefined) {
          batches[batchIndex].mintedTigers += tigersInOrder;
        } else {
          // Als mintedTigers nog niet bestaat, maak deze aan
          batches[batchIndex].mintedTigers = (batches[batchIndex].mintedWallets * 2);
        }
        
        // Bereken het totale aantal geminte tigers
        const totalMintedTigers = batches[batchIndex].mintedTigers;
        const totalTigersInBatch = batches[batchIndex].ordinals;
        
        console.log(`Batch ${order.batchId}: ${totalMintedTigers}/${totalTigersInBatch} tigers gemint`);
        
        // Check if batch is now sold out (alleen als ALLE tigers zijn gemint)
        if (totalMintedTigers >= totalTigersInBatch) {
          batches[batchIndex].isSoldOut = true;
          console.log(`Batch ${order.batchId} is nu gemarkeerd als sold out (alle ${totalTigersInBatch} tigers zijn gemint)`);
          await markBatchAsSoldOut(batches[batchIndex], batches, storage);
        }
        
        await storage.saveBatches(batches);
      }
    }
    
    return await storage.saveOrders(orders);
  } catch (error) {
    console.error('Error updating order status:', error);
    return false;
  }
}

/**
 * API handler voor het ophalen van batch informatie
 */
export async function getBatchInfo(batchId: number) {
  try {
    const batches = await storage.getBatches();
    const batch = batches.find(b => b.id === batchId);
    
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }
    
    // Bereken het aantal tigers als de property niet bestaat
    const mintedTigers = batch.mintedTigers !== undefined 
      ? batch.mintedTigers 
      : batch.mintedWallets * 2;
    
    // Bereken de totale aantal tigers in de batch
    const totalTigers = batch.ordinals;
    const maxWallets = batch.maxWallets || Math.ceil(totalTigers / 2);
    
    return {
      id: batch.id,
      price: batch.price,
      maxWallets: maxWallets,
      mintedWallets: batch.mintedWallets,
      mintedTigers: mintedTigers,
      totalTigers: totalTigers,
      availableTigers: totalTigers - mintedTigers,
      available: maxWallets - batch.mintedWallets,
      isSoldOut: batch.isSoldOut,
      ordinals: batch.ordinals
    };
  } catch (error) {
    console.error('Error getting batch info:', error);
    throw error;
  }
}

/**
 * Get all batches with their current status
 */
export async function getAllBatches() {
  try {
    // Get batches
    const batches = await storage.getBatches();
    
    // Get current batch 
    const currentBatchId = await getCurrentBatch();
    
    return {
      batches,
      currentBatch: currentBatchId
    };
  } catch (error) {
    console.error('Error getting all batches:', error);
    return {
      batches: [],
      currentBatch: 1
    };
  }
}

// Update isTransactionUsed and markTransactionAsUsed to use database
export async function isTransactionUsed(txId: string): Promise<boolean> {
  if (isVercel) {
    try {
      const { rows } = await sql`
        SELECT * FROM used_transactions WHERE tx_id = ${txId}
      `;
      return rows.length > 0;
    } catch (error) {
      console.error('Error checking if transaction is used:', error);
      return false;
    }
  } else {
    try {
      if (!fs.existsSync(USED_TRANSACTIONS_FILE)) {
        return false;
      }
      
      const data = fs.readFileSync(USED_TRANSACTIONS_FILE, 'utf8');
      const transactions = JSON.parse(data);
      return !!transactions[txId];
    } catch (error) {
      console.error('Error checking if transaction is used:', error);
      return false;
    }
  }
}

export async function markTransactionAsUsed(txId: string, orderId: string, amount: number): Promise<boolean> {
  if (isVercel) {
    try {
      await sql`
        INSERT INTO used_transactions (tx_id, order_id, amount, timestamp)
        VALUES (${txId}, ${orderId}, ${amount}, ${new Date().toISOString()}::timestamp)
      `;
      return true;
    } catch (error) {
      console.error('Error marking transaction as used:', error);
      return false;
    }
  } else {
    try {
      // Load existing transactions
      let transactions: Record<string, UsedTransaction> = {};
      
      if (fs.existsSync(USED_TRANSACTIONS_FILE)) {
        const data = fs.readFileSync(USED_TRANSACTIONS_FILE, 'utf8');
        transactions = JSON.parse(data);
      }
      
      // Add new transaction
      transactions[txId] = {
        orderId,
        amount,
        timestamp: new Date().toISOString()
      };
      
      // Save transactions
      fs.writeFileSync(USED_TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
      
      return true;
    } catch (error) {
      console.error('Error marking transaction as used:', error);
      return false;
    }
  }
} 