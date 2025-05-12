import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Batches configuratie
interface BatchConfig {
  id: number;
  price: number;      // in USD
  maxWallets: number; // maximaal aantal wallets dat kan minten
  mintedWallets: string[]; // lijst van wallets die al hebben gemint in deze batch
  ordinals: number;   // aantal ordinals per batch
}

// Order interface
interface Order {
  id: string;
  btcAddress: string;
  quantity: number;
  totalPrice: number;
  totalPriceUsd: number;
  pricePerUnit: number;
  pricePerUnitBtc: number;
  batchId: number;
  paymentAddress: string;
  paymentReference: string; // Unique reference for this payment
  status: 'pending' | 'paid' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  inscriptionId?: string;
}

// Inscription interface
interface Inscription {
  inscriptionId: string;
  imageUrl: string;
  batchId: number;
  assignedToOrder?: string; // Order ID if assigned
}

// File path for persisting orders
const ORDERS_FILE_PATH = path.join(process.cwd(), 'data', 'orders.json');

// File path for persisting inscriptions
const INSCRIPTIONS_FILE_PATH = path.join(process.cwd(), 'data', 'inscriptions.json');

// File path for whitelist
const WHITELIST_FILE_PATH = path.join(process.cwd(), 'data', 'whitelist.json');

// Whitelist interface
interface WhitelistEntry {
  address: string;
  batchId: number; // The batch this address is whitelisted for
  createdAt?: string; // Optional timestamp
}

// File path voor gebruikte transacties
const USED_TRANSACTIONS_FILE_PATH = path.join(process.cwd(), 'data', 'used-transactions.json');

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

// In-memory storage voor whitelisted adressen (in productie zou je dit in een database opslaan)
let whitelistedAddresses: WhitelistEntry[] = [];

// In-memory storage voor gebruikte transacties
let usedTransactions: UsedTransaction[] = [];

// Houdt bij wanneer een batch sold out is gegaan
let batchSoldOutTimers: Record<number, Date> = {};

// Load whitelist from disk
const loadWhitelist = (): WhitelistEntry[] => {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Check if whitelist file exists
    if (!fs.existsSync(WHITELIST_FILE_PATH)) {
      return [];
    }
    
    const whitelistData = fs.readFileSync(WHITELIST_FILE_PATH, 'utf8');
    const parsedWhitelist = JSON.parse(whitelistData);
    
    console.log(`Loaded ${parsedWhitelist.length} whitelist entries from disk`);
    return parsedWhitelist;
  } catch (error) {
    console.error('Error loading whitelist from disk:', error);
    return [];
  }
};

// Save whitelist to disk
const saveWhitelist = (whitelistToSave: WhitelistEntry[]): void => {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(WHITELIST_FILE_PATH, JSON.stringify(whitelistToSave, null, 2));
    console.log(`Saved ${whitelistToSave.length} whitelist entries to disk`);
  } catch (error) {
    console.error('Error saving whitelist to disk:', error);
  }
};

// Load used transactions from disk
const loadUsedTransactions = (): UsedTransaction[] => {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Check if file exists
    if (!fs.existsSync(USED_TRANSACTIONS_FILE_PATH)) {
      return [];
    }
    
    const data = fs.readFileSync(USED_TRANSACTIONS_FILE_PATH, 'utf8');
    const parsed = JSON.parse(data);
    
    // Convert date strings back to Date objects
    return parsed.map((tx: any) => ({
      ...tx,
      timestamp: new Date(tx.timestamp)
    }));
  } catch (error) {
    console.error('Error loading used transactions:', error);
    return [];
  }
};

// Save used transactions to disk
const saveUsedTransactions = (transactions: UsedTransaction[]): void => {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(USED_TRANSACTIONS_FILE_PATH, JSON.stringify(transactions, null, 2));
  } catch (error) {
    console.error('Error saving used transactions:', error);
  }
};

// Configuratie van batches
const batchesConfig: Record<number, BatchConfig> = {
  1: { id: 1, price: 250.00, maxWallets: 33, mintedWallets: [], ordinals: 66 },
  2: { id: 2, price: 260.71, maxWallets: 33, mintedWallets: [], ordinals: 66 },
  3: { id: 3, price: 271.43, maxWallets: 33, mintedWallets: [], ordinals: 66 },
  4: { id: 4, price: 282.14, maxWallets: 33, mintedWallets: [], ordinals: 66 },
  5: { id: 5, price: 292.86, maxWallets: 33, mintedWallets: [], ordinals: 66 },
  6: { id: 6, price: 303.57, maxWallets: 33, mintedWallets: [], ordinals: 66 },
  7: { id: 7, price: 314.29, maxWallets: 33, mintedWallets: [], ordinals: 66 },
  8: { id: 8, price: 325.00, maxWallets: 33, mintedWallets: [], ordinals: 66 },
  9: { id: 9, price: 335.71, maxWallets: 33, mintedWallets: [], ordinals: 66 },
  10: { id: 10, price: 346.43, maxWallets: 33, mintedWallets: [], ordinals: 66 },
  11: { id: 11, price: 357.14, maxWallets: 33, mintedWallets: [], ordinals: 66 },
  12: { id: 12, price: 367.86, maxWallets: 33, mintedWallets: [], ordinals: 66 },
  13: { id: 13, price: 378.57, maxWallets: 33, mintedWallets: [], ordinals: 66 },
  14: { id: 14, price: 389.29, maxWallets: 33, mintedWallets: [], ordinals: 66 },
  15: { id: 15, price: 400.00, maxWallets: 33, mintedWallets: [], ordinals: 66 },
  16: { id: 16, price: 450.00, maxWallets: 33, mintedWallets: [], ordinals: 66 }
};

// In-memory storage for inscriptions
let inscriptions: Inscription[] = [];

// Load orders from disk
const loadOrders = (): Record<string, Order> => {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Check if orders file exists
    if (!fs.existsSync(ORDERS_FILE_PATH)) {
      return {};
    }
    
    const orderData = fs.readFileSync(ORDERS_FILE_PATH, 'utf8');
    const parsedOrders = JSON.parse(orderData);
    
    // Convert date strings back to Date objects
    const processedOrders: Record<string, Order> = {};
    Object.keys(parsedOrders).forEach(key => {
      const order = parsedOrders[key];
      processedOrders[key] = {
        ...order,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt)
      };
    });
    
    console.log(`Loaded ${Object.keys(processedOrders).length} orders from disk`);
    return processedOrders;
  } catch (error) {
    console.error('Error loading orders from disk:', error);
    return {};
  }
};

// Save orders to disk
const saveOrders = (ordersToSave: Record<string, Order>): void => {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(ordersToSave, null, 2));
    console.log(`Saved ${Object.keys(ordersToSave).length} orders to disk`);
  } catch (error) {
    console.error('Error saving orders to disk:', error);
  }
};

// Load inscriptions from disk
const loadInscriptions = (): Inscription[] => {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Check if inscriptions file exists
    if (!fs.existsSync(INSCRIPTIONS_FILE_PATH)) {
      return [];
    }
    
    const inscriptionsData = fs.readFileSync(INSCRIPTIONS_FILE_PATH, 'utf8');
    const parsedInscriptions = JSON.parse(inscriptionsData);
    
    console.log(`Loaded ${parsedInscriptions.length} inscriptions from disk`);
    return parsedInscriptions;
  } catch (error) {
    console.error('Error loading inscriptions from disk:', error);
    return [];
  }
};

// Save inscriptions to disk
const saveInscriptions = (inscriptionsToSave: Inscription[]): void => {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(INSCRIPTIONS_FILE_PATH, JSON.stringify(inscriptionsToSave, null, 2));
    console.log(`Saved ${inscriptionsToSave.length} inscriptions to disk`);
  } catch (error) {
    console.error('Error saving inscriptions to disk:', error);
  }
};

// In-memory storage voor orders
export const orders: { [key: string]: Order } = loadOrders();

// Initialize inscriptions
inscriptions = loadInscriptions();

// Initialize whitelist
whitelistedAddresses = loadWhitelist();
console.log('Whitelist loaded with entries:', whitelistedAddresses);

// Initialize used transactions
usedTransactions = loadUsedTransactions();

/**
 * Check of een wallet al heeft gemint in een specifieke batch
 */
export function hasWalletMinted(batchId: number, btcAddress: string): boolean {
  const batch = batchesConfig[batchId];
  if (!batch) return false;
  
  return batch.mintedWallets.includes(btcAddress);
}

/**
 * Check of een batch nog ruimte heeft voor nieuwe mints
 */
export function isBatchAvailable(batchId: number): boolean {
  const batch = batchesConfig[batchId];
  if (!batch) return false;
  
  return batch.mintedWallets.length < batch.maxWallets;
}

/**
 * Markeer een batch als sold out en start de timer
 */
export function markBatchAsSoldOut(batchId: number) {
  const soldOutTime = Date.now();
  
  // Save the sold-out time to file
  const soldOutFile = path.join(process.cwd(), 'data', 'sold-out-times.json');
  let soldOutTimes: Record<number, number> = {};
  
  try {
    if (fs.existsSync(soldOutFile)) {
      const fileContent = fs.readFileSync(soldOutFile, 'utf8');
      soldOutTimes = JSON.parse(fileContent) as { [key: string]: number };
    }
  } catch (e) {
    console.error('Error reading sold-out times:', e);
  }
  
  soldOutTimes[batchId] = soldOutTime;
  fs.writeFileSync(soldOutFile, JSON.stringify(soldOutTimes));
  
  console.log(`Batch ${batchId} marked as sold out at ${new Date(soldOutTime).toISOString()}`);
  
  // Update batches.json to mark the batch as sold out
  const batchesFile = path.join(process.cwd(), 'data', 'batches.json');
  if (fs.existsSync(batchesFile)) {
    try {
      const batchesData = fs.readFileSync(batchesFile, 'utf8');
      const batches = JSON.parse(batchesData);
      const batchIndex = batches.findIndex((b: any) => b.id === batchId);
      if (batchIndex !== -1) {
        batches[batchIndex].isSoldOut = true;
        fs.writeFileSync(batchesFile, JSON.stringify(batches, null, 2));
      }
    } catch (e) {
      console.error('Error updating batches.json:', e);
    }
  }

  // Update current-batch.json
  const currentBatchFile = path.join(process.cwd(), 'data', 'current-batch.json');
  fs.writeFileSync(currentBatchFile, JSON.stringify({
    currentBatch: batchId,
    soldOutAt: soldOutTime,
    nextBatch: findNextAvailableBatch(batchId)
  }, null, 2));
}

/**
 * Find the next available batch after the current one
 */
function findNextAvailableBatch(currentBatchId: number): number {
  for (let i = currentBatchId + 1; i <= 16; i++) {
    if (isBatchAvailable(i)) {
      return i;
    }
  }
  return currentBatchId; // Stay on current batch if no next available batch found
}

/**
 * Haal de huidige actieve batch op
 */
export function getCurrentBatch(): number {
  const currentBatchFile = path.join(process.cwd(), 'data', 'current-batch.json');
  
  try {
    if (fs.existsSync(currentBatchFile)) {
      const data = JSON.parse(fs.readFileSync(currentBatchFile, 'utf8'));
      const { currentBatch, soldOutAt, nextBatch } = data;
      
      // If we have a valid current batch, use it
      if (currentBatch && !isNaN(currentBatch)) {
        // If we have a sold out time, check if we should move to next batch
        if (soldOutAt) {
          const timeSinceSoldOut = Date.now() - soldOutAt;
          if (timeSinceSoldOut >= 15 * 60 * 1000) { // 15 minutes passed
            if (nextBatch && isBatchAvailable(nextBatch)) {
              // Update current-batch.json with the next batch
              const newData = {
                currentBatch: nextBatch,
                soldOutAt: null,
                nextBatch: null
              };
              fs.writeFileSync(currentBatchFile, JSON.stringify(newData, null, 2));
              return nextBatch;
            }
          }
        }
        return currentBatch;
      }
    }
  } catch (e) {
    console.error('Error reading current-batch.json:', e);
  }

  // If we get here, we need to find the first available batch
  let firstAvailableBatch = 1;
  for (let i = 1; i <= 16; i++) {
    if (isBatchAvailable(i)) {
      firstAvailableBatch = i;
      break;
    }
  }

  // Create or update current-batch.json
  const newData = {
    currentBatch: firstAvailableBatch,
    soldOutAt: null,
    nextBatch: null
  };
  fs.writeFileSync(currentBatchFile, JSON.stringify(newData, null, 2));
  
  return firstAvailableBatch;
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
export function addToWhitelist(address: string, adminPassword: string, batchId: number = 1): boolean {
  if (!validateAdminPassword(adminPassword)) {
    return false;
  }
  
  if (!isValidOrdinalAddress(address)) {
    return false;
  }
  
  // Check if the batch exists
  if (!batchesConfig[batchId]) {
    return false;
  }
  
  // Check if the address is already in the whitelist
  const existingIndex = whitelistedAddresses.findIndex(entry => entry.address === address);
  if (existingIndex !== -1) {
    // Update the batch if the address already exists
    whitelistedAddresses[existingIndex].batchId = batchId;
  } else {
    // Add new entry if address doesn't exist
    whitelistedAddresses.push({ 
      address, 
      batchId,
      createdAt: new Date().toISOString()
    });
  }
  
  // Save whitelist to file
  saveWhitelist(whitelistedAddresses);
  
  return true;
}

/**
 * Verwijder een adres van de whitelist
 */
export function removeFromWhitelist(address: string, adminPassword: string): boolean {
  if (!validateAdminPassword(adminPassword)) {
    return false;
  }
  
  const index = whitelistedAddresses.findIndex(entry => entry.address === address);
  if (index !== -1) {
    whitelistedAddresses.splice(index, 1);
    
    // Save whitelist to file
    saveWhitelist(whitelistedAddresses);
    
    return true;
  }
  
  return false;
}

/**
 * Haal alle whitelisted adressen op
 */
export function getWhitelistedAddresses(adminPassword: string): WhitelistEntry[] | null {
  if (!validateAdminPassword(adminPassword)) {
    return null;
  }
  
  return [...whitelistedAddresses];
}

/**
 * Check of een adres in de whitelist staat voor een specifieke batch
 */
export function isWhitelisted(address: string, batchId?: number): boolean {
  console.log(`Checking whitelist for address: ${address}, batch: ${batchId}, whitelist entries: ${whitelistedAddresses.length}`);
  
  // Debug: print the whitelist entries
  whitelistedAddresses.forEach((entry, index) => {
    console.log(`Whitelist entry ${index}: address=${entry.address}, batchId=${entry.batchId}`);
  });
  
  // Als de whitelist leeg is, staat niemand op de whitelist
  // Dit zorgt ervoor dat alleen whitelisted adressen toegang hebben als er een whitelist is
  if (whitelistedAddresses.length === 0) {
    console.log('Whitelist is empty, returning false');
    return false; // Wijziging: standaard false in plaats van true
  }
  
  // Als geen batch is opgegeven, check of het adres in de whitelist staat voor elke batch
  if (batchId === undefined) {
    const result = whitelistedAddresses.some(entry => entry.address === address);
    console.log(`No batch specified, checking any batch. Result: ${result}`);
    return result;
  }
  
  // Check of het adres in de whitelist staat voor de opgegeven batch
  const result = whitelistedAddresses.some(entry => entry.address === address && entry.batchId === batchId);
  console.log(`Checking for batch ${batchId}. Result: ${result}`);
  return result;
}

/**
 * Admin functie: Haal alle minted wallets op voor alle batches
 */
export function getMintedWallets(adminPassword: string): Record<number, string[]> | null {
  if (!validateAdminPassword(adminPassword)) {
    return null;
  }
  
  const result: Record<number, string[]> = {};
  
  for (const batchId in batchesConfig) {
    result[Number(batchId)] = [...batchesConfig[Number(batchId)].mintedWallets];
  }
  
  return result;
}

/**
 * Admin functie: Haal alle orders op
 */
export function getAllOrders(adminPassword: string): Order[] | null {
  if (!validateAdminPassword(adminPassword)) {
    return null;
  }
  
  return Object.values(orders);
}

/**
 * Check of een wallet eligible is om te minten
 * Voorwaarden:
 * 1. De wallet staat in de whitelist (als er een whitelist is)
 * 2. De wallet heeft nog niet gemint in de huidige batch
 */
export function isWalletEligible(batchId: number, btcAddress: string): boolean {
  console.log(`Checking eligibility for address: ${btcAddress}, batch: ${batchId}`);
  
  // Check of het adres op de whitelist staat (als er een whitelist is)
  const whitelisted = isWhitelisted(btcAddress, batchId);
  if (!whitelisted) {
    console.log(`Address ${btcAddress} is not whitelisted for batch ${batchId}`);
    return false;
  }
  
  // Check of het adres al heeft gemint in deze batch
  const hasMinted = hasWalletMinted(batchId, btcAddress);
  console.log(`Address ${btcAddress} has ${hasMinted ? 'already' : 'not'} minted in batch ${batchId}`);
  
  if (hasMinted) {
    return false;
  }

  // Check total Tigers minted by this wallet across all batches
  let totalTigersMinted = 0;
  for (const orderId in orders) {
    const order = orders[orderId];
    if ((order.status === 'paid' || order.status === 'completed') && 
        order.btcAddress === btcAddress) {
      totalTigersMinted += order.quantity;
    }
  }
  
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
  
  // Load existing orders
  const existingOrders = loadOrders();
  
  // Validate the BTC address
  if (!isValidOrdinalAddress(btcAddress)) {
    throw new Error('Invalid BTC address format');
  }
  
  // Get current batch if not specified
  const currentBatchId = batchId || getCurrentBatch();
  
  // Check if wallet is eligible to mint
  if (!isWalletEligible(currentBatchId, btcAddress)) {
    throw new Error('Wallet is not eligible to mint from this batch');
  }
  
  // Calculate total price in USD
  const batchConfig = batchesConfig[currentBatchId];
  const pricePerUnit = batchConfig.price;
  const totalPriceUSD = pricePerUnit * quantity;
  
  // Convert USD to BTC
  const totalPriceBTC = usdToBtc(totalPriceUSD);
  
  // Generate unique payment reference (timestamp + random)
  const paymentReference = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  // Create new order with consistent ID format
  const orderId = `ord_${Math.random().toString(36).substring(2, 10)}`;
  const newOrder: Order = {
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
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Save order to global orders object
  orders[orderId] = newOrder;
  
  // Save order to file system
  existingOrders[orderId] = newOrder;
  saveOrders(existingOrders);
  
  console.log('Order created successfully:', newOrder);
  
  // Return order details
  return {
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
}

/**
 * API handler voor het ophalen van een order status
 */
export async function getOrderStatus(orderId: string) {
  // Order ophalen en uitgebreide logging toevoegen
  console.log(`Looking for order with ID: ${orderId}`);
  console.log(`Available orders: ${Object.keys(orders).length}`);
  
  const order = orders[orderId];
  
  if (!order) {
    // Log probleem en beschikbare order IDs voor debugging
    console.error(`Order not found: ${orderId}`);
    console.error(`Available order IDs: ${Object.keys(orders).join(', ') || 'none'}`);
    throw new Error(`Order not found with ID: ${orderId}`);
  }
  
  console.log(`Found order ${orderId}:`, order);
  
  // Calculate USD price based on the order's BTC price and batch
  const batch = batchesConfig[order.batchId];
  const pricePerUnit = batch ? batch.price : 1.00; // Default fallback price
  const totalPriceUsd = order.quantity * pricePerUnit;
  const totalPriceBtc = usdToBtc(totalPriceUsd); // Convert USD to BTC
  
  // Get associated inscription if any
  const inscription = order.inscriptionId ? getInscriptionForOrder(orderId) : null;
  
  return {
    id: order.id,
    status: order.status,
    quantity: order.quantity,
    totalPrice: totalPriceBtc, // Use BTC price here
    totalPriceUsd,
    totalPriceBtc, // Add explicit BTC price
    paymentAddress: order.paymentAddress,
    paymentReference: order.paymentReference,
    btcAddress: order.btcAddress,
    batchId: order.batchId,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    pricePerUnit,
    pricePerUnitBtc: usdToBtc(pricePerUnit), // Add BTC price per unit
    inscriptionId: order.inscriptionId || null,
    inscription: inscription
  };
}

/**
 * API handler voor het updaten van een order status
 * (In een echte implementatie zou dit automatisch gebeuren via webhooks of een payment processor)
 */
export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'paid' | 'completed' | 'failed'
) {
  const order = orders[orderId];
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  // Only update batch info if transitioning from pending to paid/completed
  const shouldUpdateBatch = (order.status === 'pending' && (status === 'paid' || status === 'completed'));
  
  order.status = status;
  order.updatedAt = new Date();
  
  // Als de status 'paid' is, update de batch informatie
  if (shouldUpdateBatch) {
    try {
      const batchesFile = path.join(process.cwd(), 'data', 'batches.json');
      if (fs.existsSync(batchesFile)) {
        let batches = [];
        try {
          const batchesData = fs.readFileSync(batchesFile, 'utf8');
          batches = JSON.parse(batchesData || '[]');
        } catch (e) {
          console.error('Error reading batches file:', e);
          batches = [];
        }
        
        // Find batch in file
        const batchIndex = batches.findIndex((b: { id: number }) => b.id === order.batchId);
        if (batchIndex !== -1) {
          // Update the mintedWallets count with the actual order quantity
          batches[batchIndex].mintedWallets = (batches[batchIndex].mintedWallets || 0) + order.quantity;
          
          // Check if batch is now sold out
          const isSoldOut = batches[batchIndex].mintedWallets >= batches[batchIndex].maxWallets;
          batches[batchIndex].isSoldOut = isSoldOut;
          
          // Als de batch sold out is, start de timer
          if (isSoldOut) {
            markBatchAsSoldOut(order.batchId);
          }
          
          // Save updated batches
          fs.writeFileSync(batchesFile, JSON.stringify(batches, null, 2));
          console.log(`Updated batch ${order.batchId} with ${order.quantity} more Tigers. Total minted: ${batches[batchIndex].mintedWallets}`);
        }
      }
    } catch (error) {
      console.error('Error updating batches.json:', error);
    }
  }
  
  // Save updated order to file
  const ordersFile = path.join(process.cwd(), 'data', 'orders.json');
  const existingOrders = loadOrders();
  existingOrders[orderId] = order;
  saveOrders(existingOrders);
  
  return order;
}

/**
 * API handler voor het ophalen van batch informatie
 */
export async function getBatchInfo(batchId: number) {
  const batch = batchesConfig[batchId];
  
  if (!batch) {
    throw new Error(`Batch ${batchId} does not exist`);
  }
  
  return {
    id: batch.id,
    price: batch.price,
    maxWallets: batch.maxWallets,
    mintedWallets: batch.mintedWallets.length,
    available: batch.maxWallets - batch.mintedWallets.length,
    isSoldOut: batch.mintedWallets.length >= batch.maxWallets,
    ordinals: batch.ordinals
  };
}

/**
 * Get all batches with their current status
 */
export async function getAllBatches() {
  try {
    let batches: Batch[] = [];
    
    // First check if we have a current batch file
    const currentBatchFile = path.join(process.cwd(), 'data', 'current-batch.json');
    let currentBatchId = 1;
    
    if (fs.existsSync(currentBatchFile)) {
      try {
        const currentBatchData = JSON.parse(fs.readFileSync(currentBatchFile, 'utf8'));
        if (currentBatchData.currentBatch) {
          currentBatchId = currentBatchData.currentBatch;
        }
      } catch (e) {
        console.error('Error reading current batch file:', e);
      }
    }
    
    // Get batches from configuration file
    const batchesFile = path.join(process.cwd(), 'data', 'batches.json');
    if (fs.existsSync(batchesFile)) {
      try {
        const batchesData = fs.readFileSync(batchesFile, 'utf8');
        batches = JSON.parse(batchesData || '[]');
      } catch (e) {
        console.error('Error reading batches file:', e);
        batches = defaultBatches;
      }
    } else {
      batches = defaultBatches;
    }
    
    // Ensure we have the correct current batch
    const finalCurrentBatch = getCurrentBatch();
    
    // Return batches and current batch
    return {
      batches,
      currentBatch: finalCurrentBatch
    };
  } catch (error) {
    console.error('Error getting all batches:', error);
    return {
      batches: defaultBatches,
      currentBatch: 1
    };
  }
}

/**
 * Admin function: Get all inscriptions
 */
export function getAllInscriptions(adminPassword: string): Inscription[] | null {
  if (!validateAdminPassword(adminPassword)) {
    return null;
  }
  
  return [...inscriptions];
}

/**
 * Admin function: Add a new inscription
 */
export function addInscription(
  inscriptionId: string, 
  imageUrl: string, 
  batchId: number, 
  adminPassword: string
): boolean {
  if (!validateAdminPassword(adminPassword)) {
    return false;
  }
  
  // Check if inscription already exists
  const existingInscription = inscriptions.find(insc => insc.inscriptionId === inscriptionId);
  if (existingInscription) {
    return false;
  }
  
  // Add new inscription
  inscriptions.push({
    inscriptionId,
    imageUrl,
    batchId
  });
  
  // Save to disk
  saveInscriptions(inscriptions);
  
  return true;
}

/**
 * Admin function: Assign inscription to order
 */
export function assignInscriptionToOrder(
  inscriptionId: string, 
  orderId: string, 
  adminPassword: string
): boolean {
  if (!validateAdminPassword(adminPassword)) {
    return false;
  }
  
  // Check if inscription exists
  const inscriptionIndex = inscriptions.findIndex(insc => insc.inscriptionId === inscriptionId);
  if (inscriptionIndex === -1) {
    return false;
  }
  
  // Check if order exists
  if (!orders[orderId]) {
    return false;
  }
  
  // Update inscription
  inscriptions[inscriptionIndex].assignedToOrder = orderId;
  
  // Update order with the inscription
  orders[orderId].inscriptionId = inscriptionId;
  
  // Save both to disk
  saveInscriptions(inscriptions);
  saveOrders(orders);
  
  return true;
}

/**
 * Get inscription for an order
 */
export function getInscriptionForOrder(orderId: string): Inscription | null {
  // Get the order
  const order = orders[orderId];
  if (!order || !order.inscriptionId) {
    return null;
  }
  
  // Find the inscription
  const inscription = inscriptions.find(insc => insc.inscriptionId === order.inscriptionId);
  return inscription || null;
}

/**
 * Admin functie: Synchroniseer alle orders met batches
 * Deze functie doorloopt alle orders en update de geminte wallets in batches.json
 */
export function syncOrdersToBatches(adminPassword: string): boolean {
  if (!validateAdminPassword(adminPassword)) {
    return false;
  }
  
  try {
    console.log("Starting orders to batches synchronization...");
    
    // Verzamel alle geminte wallets per batch
    const mintedWalletsByBatch: Record<number, string[]> = {};
    
    // Houd het totaal aantal Tigers per batch bij
    const mintedTigersByBatch: Record<number, number> = {};
    
    // Doorloop alle orders met status 'paid' of 'completed'
    for (const orderId in orders) {
      const order = orders[orderId];
      if (order.status === 'paid' || order.status === 'completed') {
        const batchId = order.batchId;
        
        // Initialiseer arrays en tellers als ze nog niet bestaan
        if (!mintedWalletsByBatch[batchId]) {
          mintedWalletsByBatch[batchId] = [];
        }
        if (!mintedTigersByBatch[batchId]) {
          mintedTigersByBatch[batchId] = 0;
        }
        
        // Voeg wallet toe als deze nog niet in de lijst staat
        if (!mintedWalletsByBatch[batchId].includes(order.btcAddress)) {
          mintedWalletsByBatch[batchId].push(order.btcAddress);
        }
        
        // Verhoog het aantal geminte tigers voor deze batch
        mintedTigersByBatch[batchId] += order.quantity || 1;
      }
    }
    
    console.log("Collected minted wallets by batch:", mintedWalletsByBatch);
    console.log("Collected minted tigers by batch:", mintedTigersByBatch);
    
    // Update de in-memory batchesConfig
    for (const batchId in mintedWalletsByBatch) {
      const numericBatchId = Number(batchId);
      if (batchesConfig[numericBatchId]) {
        batchesConfig[numericBatchId].mintedWallets = [...mintedWalletsByBatch[numericBatchId]];
        console.log(`Updated batch ${batchId} with ${batchesConfig[numericBatchId].mintedWallets.length} minted wallets`);
      }
    }
    
    // Update het batches.json bestand
    const batchesFile = path.join(process.cwd(), 'data', 'batches.json');
    if (fs.existsSync(batchesFile)) {
      let batches = [];
      try {
        const batchesData = fs.readFileSync(batchesFile, 'utf8');
        batches = JSON.parse(batchesData || '[]');
      } catch (e) {
        console.error('Error reading batches file:', e);
        batches = [];
      }
      
      // Update elke batch in het bestand
      for (const batch of batches) {
        const batchId = batch.id;
        if (mintedTigersByBatch[batchId]) {
          // Gebruik het werkelijke aantal geminte tigers in plaats van het aantal wallets
          batch.mintedWallets = mintedTigersByBatch[batchId];
          // Update isSoldOut flag
          batch.isSoldOut = batch.mintedWallets >= batch.maxWallets;
        } else {
          batch.mintedWallets = 0;
          batch.isSoldOut = false;
        }
      }
      
      // Sla de bijgewerkte batches op
      fs.writeFileSync(batchesFile, JSON.stringify(batches, null, 2));
      console.log(`Updated batches.json with new minted tiger counts`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in syncOrdersToBatches:', error);
    return false;
  }
}

// Define Batch interface
interface Batch {
  id: number;
  price: number;
  mintedWallets: number;
  maxWallets: number;
  ordinals: number;
  isSoldOut: boolean;
}

// Default batches als fallback
const defaultBatches: Batch[] = [
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

// Interface voor gebruikte transacties
interface UsedTransaction {
  txid: string;
  orderId: string;
  amount: number;
  timestamp: Date;
}

// Check if a transaction has been used
export function isTransactionUsed(txid: string): boolean {
  return usedTransactions.some(tx => tx.txid === txid);
}

// Mark a transaction as used
export function markTransactionAsUsed(txid: string, orderId: string, amount: number): void {
  const transaction: UsedTransaction = {
    txid,
    orderId,
    amount,
    timestamp: new Date()
  };
  
  usedTransactions.push(transaction);
  saveUsedTransactions(usedTransactions);
}

/**
 * Update de batch status na een succesvolle mint
 */
export function updateBatchStatus(batchId: number) {
  const batch = batchesConfig[batchId];
  if (!batch) return;

  // Check of de batch nu sold out is
  if (batch.mintedWallets.length >= batch.maxWallets) {
    markBatchAsSoldOut(batchId);
  }
} 