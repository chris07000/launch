import { NextResponse } from 'next/server';
import { 
  getWhitelist, 
  getBatches, 
  getOrders, 
  getMintedWallets,
  saveWhitelist,
  saveBatches,
  saveOrders,
  saveMintedWallets,
  type WhitelistEntry,
  type Batch,
  type Order
} from '@/lib/storage';

// Validate a Bitcoin Ordinal address (bc1p...)
function isValidOrdinalAddress(address: string): boolean {
  return typeof address === 'string' && address.startsWith('bc1p');
}

// Handle GET requests
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get('password');
  const action = searchParams.get('action');
  
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Ongeldige wachtwoord' }, { status: 401 });
  }
  
  // Dashboard action
  if (action === 'dashboard') {
    try {
      // Get whitelisted addresses
      const whitelistedAddresses = getWhitelist();
      
      // Get batches info
      let batches = getBatches();
      
      if (batches.length === 0) {
        // Default batches if no data exists
        batches = [
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
        
        // Save the default batches
        saveBatches(batches);
      }
      
      // Calculate available slots for each batch based on whitelist
      batches = batches.map(batch => ({
        ...batch,
        available: whitelistedAddresses.filter(entry => entry.batchId === batch.id).length
      }));
      
      // Get current batch
      const currentBatch = batches.find(batch => !batch.isSoldOut) || batches[0];
      
      // Get orders and minted wallets
      const orders = getOrders();
      const mintedWallets = getMintedWallets();
      
      // Convert orders object to array
      const ordersArray = Object.values(orders);
      
      // Return dashboard data
      return NextResponse.json({
        whitelistedAddresses,
        batches,
        currentBatch: currentBatch.id,
        orders: ordersArray,
        mintedWallets
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      return NextResponse.json({ error: 'Er is een fout opgetreden bij het ophalen van de dashboard data.' }, { status: 500 });
    }
  }
  
  return NextResponse.json({ error: 'Ongeldige actie' }, { status: 400 });
}

// Handle POST requests
export async function POST(request: Request) {
  try {
    const { action, password, address, batchId } = await request.json();
    
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    // Handle different actions
    if (action === 'addToWhitelist') {
      console.log('Adding to whitelist:', { address, batchId });
      
      // Validate the address
      if (!address) {
        console.log('Address is missing');
        return NextResponse.json({ error: 'Adres is verplicht' }, { status: 400 });
      }
      
      if (!isValidOrdinalAddress(address)) {
        console.log('Invalid ordinal address:', address);
        return NextResponse.json({ error: 'Ongeldig Ordinal adres (moet bc1p... zijn)' }, { status: 400 });
      }
      
      // Check if batch is valid
      if (!batchId) {
        console.log('Batch ID is missing');
        return NextResponse.json({ error: 'Batch ID is verplicht' }, { status: 400 });
      }
      
      // Get whitelisted addresses
      let whitelistedAddresses = getWhitelist();
      
      // Check if address is already whitelisted
      const existingIndex = whitelistedAddresses.findIndex(entry => entry.address === address);
      console.log('Existing index:', existingIndex);
      
      if (existingIndex !== -1) {
        // Update the batch if the address already exists
        console.log('Updating existing address batch');
        whitelistedAddresses[existingIndex].batchId = batchId;
        whitelistedAddresses[existingIndex].updatedAt = new Date().toISOString();
      } else {
        // Add address to whitelist
        console.log('Adding new address to whitelist');
        whitelistedAddresses.push({
          address,
          batchId,
          createdAt: new Date().toISOString()
        });
      }
      
      // Save whitelist
      if (!saveWhitelist(whitelistedAddresses)) {
        return NextResponse.json({ error: 'Failed to save whitelist' }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: existingIndex !== -1 ? 'Adres bestaand in whitelist, batch bijgewerkt' : 'Adres toegevoegd aan whitelist' 
      });
    }
    else if (action === 'removeFromWhitelist') {
      // Validate the address
      if (!address) {
        return NextResponse.json({ error: 'Adres is verplicht' }, { status: 400 });
      }
      
      // Get and update whitelisted addresses
      const whitelistedAddresses = getWhitelist().filter(entry => entry.address !== address);
      
      // Save whitelist
      if (!saveWhitelist(whitelistedAddresses)) {
        return NextResponse.json({ error: 'Failed to remove from whitelist' }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Ongeldige actie' }, { status: 400 });
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
  }
} 