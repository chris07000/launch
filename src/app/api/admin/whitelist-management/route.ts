import { NextResponse } from 'next/server';
import * as storage from '@/lib/storage-wrapper-db-only';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, address, batchId, password } = body;
    
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }
    
    // Actie: whitelist ophalen
    if (action === 'get_whitelist') {
      const whitelist = await storage.getWhitelist();
      return NextResponse.json({
        success: true,
        whitelist
      });
    }
    
    // Actie: wallet aan whitelist toevoegen
    if (action === 'add_to_whitelist') {
      if (!address || !batchId) {
        return NextResponse.json({ 
          error: 'Address and batchId are required for add_to_whitelist action' 
        }, { status: 400 });
      }
      
      if (!address.startsWith('bc1p')) {
        return NextResponse.json({ 
          error: 'Invalid Ordinal address format, must start with bc1p' 
        }, { status: 400 });
      }
      
      // Huidige whitelist ophalen
      const whitelist = await storage.getWhitelist();
      
      // Controleren of adres al bestaat en alleen batchId updaten
      const existingIndex = whitelist.findIndex(entry => entry.address === address);
      
      const now = new Date().toISOString();
      
      if (existingIndex !== -1) {
        // Update bestaande entry
        whitelist[existingIndex].batchId = Number(batchId);
        whitelist[existingIndex].createdAt = now;
        
        console.log(`Updated existing whitelist entry for ${address} to batch ${batchId}`);
      } else {
        // Voeg nieuwe entry toe
        whitelist.push({
          address,
          batchId: Number(batchId),
          createdAt: now
        });
        
        console.log(`Added new whitelist entry for ${address} to batch ${batchId}`);
      }
      
      // Opslaan van whitelist
      const saveResult = await storage.saveWhitelist(whitelist);
      
      if (!saveResult) {
        return NextResponse.json({
          success: false,
          error: 'Failed to save whitelist'
        }, { status: 500 });
      }
      
      // Dubbele check of adres correct is toegevoegd
      const updatedWhitelist = await storage.getWhitelist();
      const addedEntry = updatedWhitelist.find(entry => entry.address === address);
      
      if (!addedEntry) {
        return NextResponse.json({
          success: false,
          error: 'Address not found in whitelist after saving'
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        action: existingIndex !== -1 ? 'updated' : 'added',
        entry: addedEntry,
        message: `Successfully ${existingIndex !== -1 ? 'updated' : 'added'} ${address} to batch ${batchId}`
      });
    }
    
    // Actie: wallet van whitelist verwijderen
    if (action === 'remove_from_whitelist') {
      if (!address) {
        return NextResponse.json({ 
          error: 'Address is required for remove_from_whitelist action' 
        }, { status: 400 });
      }
      
      // Huidige whitelist ophalen
      const whitelist = await storage.getWhitelist();
      
      // Controleren of adres bestaat
      const existingIndex = whitelist.findIndex(entry => entry.address === address);
      
      if (existingIndex === -1) {
        return NextResponse.json({
          success: false,
          error: `Address ${address} not found in whitelist`
        }, { status: 404 });
      }
      
      // Adres verwijderen
      whitelist.splice(existingIndex, 1);
      
      // Opslaan van whitelist
      const saveResult = await storage.saveWhitelist(whitelist);
      
      if (!saveResult) {
        return NextResponse.json({
          success: false,
          error: 'Failed to save whitelist after removal'
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        message: `Successfully removed ${address} from whitelist`
      });
    }
    
    // Onbekende actie
    return NextResponse.json({
      error: 'Unknown action',
      allowedActions: ['get_whitelist', 'add_to_whitelist', 'remove_from_whitelist']
    }, { status: 400 });
    
  } catch (error) {
    console.error('Error in whitelist management:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 