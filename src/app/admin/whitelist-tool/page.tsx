'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function WhitelistToolPage() {
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [batchId, setBatchId] = useState(1);
  const [authenticated, setAuthenticated] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Authenticatie
  const authenticate = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }
    
    try {
      const response = await fetch('/api/admin?password=' + encodeURIComponent(password));
      if (!response.ok) {
        throw new Error('Authentication failed');
      }
      setAuthenticated(true);
    } catch (error: any) {
      setError(error.message);
    }
  };
  
  // Whitelist toevoegen
  const addToWhitelist = async () => {
    if (!address) {
      setError('Address is required');
      return;
    }
    
    if (!address.startsWith('bc1p')) {
      setError('Address must start with bc1p (Taproot address)');
      return;
    }
    
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      // Voeg direct toe aan whitelist
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password,
          action: 'addToWhitelist',
          address,
          batchId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add address');
      }
      
      setResult({
        success: true,
        message: `Added ${address} to whitelist for batch ${batchId}`
      });
      
    } catch (error: any) {
      setError(error.message);
      setResult({
        success: false,
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center" style={{ fontFamily: "'Press Start 2P', monospace" }}>
        <div className="w-full max-w-md p-6 bg-gray-900 rounded-lg shadow-lg">
          <h2 className="text-xl text-yellow-400 mb-6 text-center">WHITELIST ADMIN</h2>
          
          <div className="mb-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin Password"
              className="w-full p-2 bg-black border border-yellow-400 text-white rounded"
            />
          </div>
          
          {error && (
            <div className="mb-4 p-2 bg-red-900 border border-red-600 text-white rounded text-xs">
              {error}
            </div>
          )}
          
          <button
            onClick={authenticate}
            className="w-full p-2 bg-yellow-500 text-black rounded hover:bg-yellow-400 transition-colors"
          >
            LOGIN
          </button>
          
          <div className="mt-4 text-center">
            <Link href="/" className="text-yellow-400 text-xs hover:underline">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-6" style={{ fontFamily: "'Press Start 2P', monospace" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl text-yellow-400">QUICK WHITELIST TOOL</h1>
          <div>
            <Link href="/admin" className="text-yellow-400 text-xs hover:underline mr-4">
              Admin Home
            </Link>
            <Link href="/" className="text-yellow-400 text-xs hover:underline">
              Back to Site
            </Link>
          </div>
        </div>
        
        <div className="bg-gray-900 p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-yellow-400 mb-4 text-sm">ADD TO WHITELIST</h2>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-xs mb-2">BTC ADDRESS (TAPROOT)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="bc1p... address"
                className="w-full p-2 bg-black border border-yellow-400 text-white rounded text-sm"
              />
            </div>
            
            <div className="w-32">
              <label className="block text-xs mb-2">BATCH</label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(Number(e.target.value))}
                className="w-full p-2 bg-black border border-yellow-400 text-white rounded text-sm"
              >
                {[...Array(15)].map((_, i) => (
                  <option key={i+1} value={i+1}>
                    Batch {i+1}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 p-2 bg-red-900 border border-red-600 text-white rounded text-xs">
              {error}
            </div>
          )}
          
          {result && (
            <div className={`mb-4 p-2 ${result.success ? 'bg-green-900 border-green-600' : 'bg-red-900 border-red-600'} border text-white rounded text-xs`}>
              {result.message}
            </div>
          )}
          
          <button
            onClick={addToWhitelist}
            disabled={loading}
            className="w-full p-2 bg-yellow-500 text-black rounded hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'PROCESSING...' : 'ADD TO WHITELIST'}
          </button>
        </div>
        
        <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
          <h2 className="text-yellow-400 mb-4 text-sm">INSTRUCTIONS</h2>
          <div className="text-xs space-y-2">
            <p>1. Enter the BTC address (must start with bc1p)</p>
            <p>2. Select the batch number to whitelist this address for</p>
            <p>3. Click "Add to Whitelist"</p>
            <p>4. Addresses can only be assigned to one batch at a time</p>
          </div>
        </div>
      </div>
    </div>
  );
} 