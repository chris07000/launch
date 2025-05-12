import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Validate a Bitcoin Ordinal address (bc1p...)
function isValidOrdinalAddress(address) {
  // Ordinal addresses start with bc1p for Taproot addresses
  return typeof address === 'string' && address.startsWith('bc1p');
}

// Handle GET requests
export async function GET(request) {
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
      const whitelistFile = path.join(process.cwd(), 'data/whitelist.json');
      let whitelistedAddresses = [];
      
      if (fs.existsSync(whitelistFile)) {
        const whitelistData = fs.readFileSync(whitelistFile, 'utf8');
        whitelistedAddresses = JSON.parse(whitelistData || '[]');
      }
      
      // Get batches info
      const batchesFile = path.join(process.cwd(), 'data/batches.json');
      let batches = [];
      
      if (fs.existsSync(batchesFile)) {
        const batchesData = fs.readFileSync(batchesFile, 'utf8');
        batches = JSON.parse(batchesData || '[]');
        
        // Calculate available slots for each batch based on whitelist
        batches = batches.map(batch => {
          const whitelistedForBatch = whitelistedAddresses.filter(entry => entry.batchId === batch.id);
          return {
            ...batch,
            available: whitelistedForBatch.length
          };
        });
      } else {
        // Default batches if file doesn't exist
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
        
        // Create the file with default data
        fs.writeFileSync(batchesFile, JSON.stringify(batches));
      }
      
      // Get current batch
      const currentBatch = batches.find(batch => !batch.isSoldOut) || batches[0];
      
      // Get orders
      const ordersFile = path.join(process.cwd(), 'data/orders.json');
      let orders = {};
      
      if (fs.existsSync(ordersFile)) {
        const ordersData = fs.readFileSync(ordersFile, 'utf8');
        try {
          orders = JSON.parse(ordersData || '{}');
          console.log("API: Orders loaded from file:", Object.keys(orders).length);
        } catch (e) {
          console.error('Error parsing orders file:', e);
          orders = {};
        }
      } else {
        console.log("API: Orders file does not exist");
      }
      
      // Get minted wallets
      const mintedWalletsFile = path.join(process.cwd(), 'data/minted-wallets.json');
      let mintedWallets = [];
      
      if (fs.existsSync(mintedWalletsFile)) {
        const mintedWalletsData = fs.readFileSync(mintedWalletsFile, 'utf8');
        mintedWallets = JSON.parse(mintedWalletsData || '[]');
      }
      
      // For debugging
      console.log("API: Sending dashboard data with orders type:", typeof orders);
      console.log("API: Orders is empty:", Object.keys(orders).length === 0);
      
      // Return dashboard data
      return NextResponse.json({
        whitelistedAddresses,
        batches,
        currentBatch: currentBatch.id,
        orders,
        mintedWallets
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      return NextResponse.json({ error: 'Er is een fout opgetreden bij het ophalen van de dashboard data.' }, { status: 500 });
    }
  }
  
  // Inscriptions action
  if (action === 'inscriptions') {
    try {
      // Get inscriptions
      const inscriptionsFile = path.join(process.cwd(), 'data/inscriptions.json');
      let inscriptions = [];
      
      if (fs.existsSync(inscriptionsFile)) {
        const inscriptionsData = fs.readFileSync(inscriptionsFile, 'utf8');
        inscriptions = JSON.parse(inscriptionsData || '[]');
      }
      
      return NextResponse.json({ inscriptions });
    } catch (error) {
      console.error('Inscriptions error:', error);
      return NextResponse.json({ error: 'Er is een fout opgetreden bij het ophalen van de inscriptions.' }, { status: 500 });
    }
  }
  
  return NextResponse.json({ error: 'Ongeldige actie' }, { status: 400 });
}

// Handle the POST requests
export async function POST(request) {
  try {
    const body = await request.json();
    const { password, action, address, batchId, inscriptionId, orderId, btcAddress, quantity } = body;
    
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Ongeldige wachtwoord' }, { status: 401 });
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
      const whitelistFile = path.join(process.cwd(), 'data/whitelist.json');
      console.log('Whitelist file path:', whitelistFile);
      
      let whitelistedAddresses = [];
      
      if (fs.existsSync(whitelistFile)) {
        console.log('Whitelist file exists, reading content');
        const whitelistData = fs.readFileSync(whitelistFile, 'utf8');
        console.log('Current whitelist data:', whitelistData);
        whitelistedAddresses = JSON.parse(whitelistData || '[]');
      } else {
        console.log('Whitelist file does not exist, creating new one');
        // Create the data directory if it doesn't exist
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
          console.log('Creating data directory');
          fs.mkdirSync(dataDir, { recursive: true });
        }
      }
      
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
      console.log('Saving whitelist:', JSON.stringify(whitelistedAddresses, null, 2));
      fs.writeFileSync(whitelistFile, JSON.stringify(whitelistedAddresses, null, 2));
      console.log('Whitelist saved successfully');
      
      return NextResponse.json({ success: true, message: existingIndex !== -1 ? 'Adres bestaand in whitelist, batch bijgewerkt' : 'Adres toegevoegd aan whitelist' });
    }
    else if (action === 'removeFromWhitelist') {
      // Validate the address
      if (!address) {
        return NextResponse.json({ error: 'Adres is verplicht' }, { status: 400 });
      }
      
      // Get whitelisted addresses
      const whitelistFile = path.join(process.cwd(), 'data/whitelist.json');
      let whitelistedAddresses = [];
      
      if (fs.existsSync(whitelistFile)) {
        const whitelistData = fs.readFileSync(whitelistFile, 'utf8');
        whitelistedAddresses = JSON.parse(whitelistData || '[]');
      }
      
      // Remove address from whitelist
      whitelistedAddresses = whitelistedAddresses.filter(entry => entry.address !== address);
      
      // Save whitelist
      fs.writeFileSync(whitelistFile, JSON.stringify(whitelistedAddresses));
      
      return NextResponse.json({ success: true });
    }
    else if (action === 'assignInscription') {
      // Validate inputs
      if (!inscriptionId) {
        return NextResponse.json({ error: 'Inscription ID is verplicht' }, { status: 400 });
      }
      
      if (!orderId) {
        return NextResponse.json({ error: 'Order ID is verplicht' }, { status: 400 });
      }
      
      // Get inscriptions
      const inscriptionsFile = path.join(process.cwd(), 'data/inscriptions.json');
      let inscriptions = [];
      
      if (fs.existsSync(inscriptionsFile)) {
        const inscriptionsData = fs.readFileSync(inscriptionsFile, 'utf8');
        inscriptions = JSON.parse(inscriptionsData || '[]');
      }
      
      // Find the inscription
      const inscriptionIndex = inscriptions.findIndex(insc => 
        insc.id === inscriptionId || insc.inscriptionId === inscriptionId
      );
      
      if (inscriptionIndex === -1) {
        return NextResponse.json({ error: 'Inscription niet gevonden' }, { status: 404 });
      }
      
      // Get orders
      const ordersFile = path.join(process.cwd(), 'data/orders.json');
      let orders = {};
      
      if (fs.existsSync(ordersFile)) {
        const ordersData = fs.readFileSync(ordersFile, 'utf8');
        try {
          orders = JSON.parse(ordersData || '{}');
        } catch (e) {
          console.error('Error parsing orders file:', e);
          orders = {};
        }
      }
      
      // Find the order
      if (!orders[orderId]) {
        return NextResponse.json({ error: 'Order niet gevonden' }, { status: 404 });
      }
      
      // Assign inscription to order
      inscriptions[inscriptionIndex].assignedToOrder = orderId;
      orders[orderId].inscriptionId = inscriptionId;
      
      // Save inscriptions and orders
      fs.writeFileSync(inscriptionsFile, JSON.stringify(inscriptions));
      fs.writeFileSync(ordersFile, JSON.stringify(orders));
      
      return NextResponse.json({ success: true });
    }
    else if (action === 'addOrder') {
      // Validate inputs
      if (!btcAddress) {
        return NextResponse.json({ error: 'Bitcoin adres is verplicht' }, { status: 400 });
      }
      
      if (!isValidOrdinalAddress(btcAddress)) {
        return NextResponse.json({ error: 'Ongeldig Ordinal adres (moet bc1p... zijn)' }, { status: 400 });
      }
      
      if (!quantity || quantity <= 0 || quantity > 2) {
        return NextResponse.json({ error: 'Hoeveelheid moet tussen 1 en 2 zijn' }, { status: 400 });
      }
      
      const actualBatchId = batchId || 1;
      
      // Get batches info
      const batchesFile = path.join(process.cwd(), 'data/batches.json');
      let batches = [];
      
      if (fs.existsSync(batchesFile)) {
        const batchesData = fs.readFileSync(batchesFile, 'utf8');
        batches = JSON.parse(batchesData || '[]');
      } else {
        // Create default batches if file doesn't exist
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
        fs.writeFileSync(batchesFile, JSON.stringify(batches));
      }
      
      // Find the batch
      const batchIndex = batches.findIndex(b => b.id === actualBatchId);
      if (batchIndex === -1) {
        return NextResponse.json({ error: `Batch ${actualBatchId} bestaat niet` }, { status: 400 });
      }
      
      // Get the batch price
      const batchPrice = batches[batchIndex].price || 1.00;
      
      // Get orders
      const ordersFile = path.join(process.cwd(), 'data/orders.json');
      let orders = {};
      
      if (fs.existsSync(ordersFile)) {
        const ordersData = fs.readFileSync(ordersFile, 'utf8');
        try {
          orders = JSON.parse(ordersData || '{}');
        } catch (e) {
          console.error('Error parsing orders file:', e);
          orders = {};
        }
      }
      
      // Create data directory if it doesn't exist
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Create a new order
      const newOrder = {
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        btcAddress,
        quantity,
        totalPrice: batchPrice * quantity,
        batchId: actualBatchId,
        paymentAddress: process.env.PAYMENT_BTC_WALLET || 'bc1qwfdxl0pq8d4tefd80enw3yae2k2dsszemrv6j0',
        status: 'paid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to orders array
      orders[newOrder.id] = newOrder;
      
      // Save to file
      fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
      console.log(`Saved order ${newOrder.id} to ${ordersFile}`);
      
      // Update minted wallets file
      const mintedWalletsFile = path.join(process.cwd(), 'data/minted-wallets.json');
      let mintedWallets = [];
      
      if (fs.existsSync(mintedWalletsFile)) {
        const mintedWalletsData = fs.readFileSync(mintedWalletsFile, 'utf8');
        mintedWallets = JSON.parse(mintedWalletsData || '[]');
      }
      
      // Add to minted wallets
      mintedWallets.push({
        address: btcAddress,
        batchId: actualBatchId,
        quantity: 1, // Always 1 wallet, which gets 2 Tigers
        timestamp: new Date().toISOString()
      });
      
      // Save to file
      fs.writeFileSync(mintedWalletsFile, JSON.stringify(mintedWallets, null, 2));
      console.log(`Saved minted wallet to ${mintedWalletsFile}`);
      
      // Update batches - increment mintedWallets by 1 since each wallet gets 2 Tigers
      batches[batchIndex].mintedWallets += 1;
      fs.writeFileSync(batchesFile, JSON.stringify(batches, null, 2));
      console.log(`Updated batch ${actualBatchId} in ${batchesFile} with 1 more wallet`);
      
      return NextResponse.json({ 
        success: true, 
        message: `Order toegevoegd en minted wallet geregistreerd voor batch ${actualBatchId}`,
        orderId: newOrder.id
      });
    }
    else if (action === 'reset') {
      try {
        const dataDir = path.join(process.cwd(), 'data');
        
        // Ensure data directory exists
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Reset whitelist
        fs.writeFileSync(
          path.join(dataDir, 'whitelist.json'),
          JSON.stringify([])
        );
        
        // Reset orders
        fs.writeFileSync(
          path.join(dataDir, 'orders.json'),
          JSON.stringify({})
        );
        
        // Reset inscriptions
        fs.writeFileSync(
          path.join(dataDir, 'inscriptions.json'),
          JSON.stringify([])
        );
        
        // Reset minted wallets
        fs.writeFileSync(
          path.join(dataDir, 'minted-wallets.json'),
          JSON.stringify([])
        );
        
        // Reset batches to default state
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
          { id: 16, price: 450.00, mintedWallets: 0, maxWallets: 33, ordinals: 66, isSoldOut: false, isFCFS: true }
        ];
        
        fs.writeFileSync(
          path.join(dataDir, 'batches.json'),
          JSON.stringify(defaultBatches)
        );
        
        return NextResponse.json({ 
          success: true, 
          message: 'Alle data is succesvol gereset' 
        });
      } catch (error) {
        console.error('Reset error:', error);
        return NextResponse.json({ 
          error: 'Er is een fout opgetreden bij het resetten van de data' 
        }, { status: 500 });
      }
    }
    else if (action === 'syncOrdersToBatches') {
      try {
        // Dynamisch importeren van de mint API om circular dependencies te voorkomen
        const { syncOrdersToBatches } = await import('@/api/mint');
        
        // Synchroniseer orders met batches
        const success = syncOrdersToBatches(password);
        
        if (success) {
          return NextResponse.json({ 
            success: true, 
            message: 'Orders en batches zijn gesynchroniseerd. Dashboard zou nu alle geminte wallets moeten tonen.'
          });
        } else {
          return NextResponse.json({ 
            error: 'Er is een fout opgetreden bij het synchroniseren van orders en batches.' 
          }, { status: 500 });
        }
      } catch (error) {
        console.error('Error in syncOrdersToBatches action:', error);
        return NextResponse.json({ 
          error: 'Er is een fout opgetreden bij het synchroniseren van orders en batches.' 
        }, { status: 500 });
      }
    }
    else {
      return NextResponse.json({ error: 'Ongeldige actie' }, { status: 400 });
    }
    
    // If we made it here, the action was successful
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 });
  }
} 