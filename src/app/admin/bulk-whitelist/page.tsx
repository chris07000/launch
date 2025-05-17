'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function BulkWhitelistPage() {
  const [password, setPassword] = useState('');
  const [addresses, setAddresses] = useState('');
  const [batchId, setBatchId] = useState(1);
  const [authenticated, setAuthenticated] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Authentication
  const authenticate = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }
    
    try {
      const response = await fetch(`/api/admin?password=${encodeURIComponent(password)}&action=dashboard`);
      if (!response.ok) {
        throw new Error('Authentication failed');
      }
      setAuthenticated(true);
      
      // Save password to localStorage for API calls
      localStorage.setItem('admin_password', password);
    } catch (error: any) {
      setError(error.message);
    }
  };
  
  // Bulk whitelist
  const addBulkToWhitelist = async () => {
    if (!addresses.trim()) {
      setError('Addresses are required');
      return;
    }
    
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      // Split addresses by newline, comma, or space and trim
      const addressList = addresses
        .split(/[\n,\s]+/)
        .map(addr => addr.trim())
        .filter(addr => addr.length > 0);
      
      if (addressList.length === 0) {
        throw new Error('No valid addresses found');
      }
      
      // Send to API
      const response = await fetch('/api/admin/bulk-whitelist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          admin_password: password,
          addresses: addressList,
          batchId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add addresses to whitelist');
      }
      
      setResult({
        success: true,
        stats: data.stats,
        message: data.message
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
          <h2 className="text-xl text-yellow-400 mb-6 text-center">BULK WHITELIST ADMIN</h2>
          
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
            <Link href="/admin" className="text-yellow-400 text-xs hover:underline">
              Admin Home
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
          <h1 className="text-xl text-yellow-400">BULK WHITELIST TOOL</h1>
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
          <h2 className="text-yellow-400 mb-4 text-sm">BULK ADD TO WHITELIST</h2>
          
          <div className="mb-4">
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
          
          <div className="mb-4">
            <label className="block text-xs mb-2">BTC ADDRESSES (TAPROOT, ONE PER LINE)</label>
            <textarea
              value={addresses}
              onChange={(e) => setAddresses(e.target.value)}
              placeholder="bc1p... 
bc1p...
bc1p..."
              rows={10}
              className="w-full p-2 bg-black border border-yellow-400 text-white rounded text-sm font-mono"
            />
            <p className="text-gray-400 text-xs mt-1">
              Separate addresses by line break, comma, or space
            </p>
          </div>
          
          {error && (
            <div className="mb-4 p-2 bg-red-900 border border-red-600 text-white rounded text-xs">
              {error}
            </div>
          )}
          
          {result && (
            <div className={`mb-4 p-3 ${result.success ? 'bg-green-900 border-green-600' : 'bg-red-900 border-red-600'} border text-white rounded text-xs`}>
              <div>{result.message}</div>
              
              {result.stats && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>Total: {result.stats.total}</div>
                  <div>Added: {result.stats.added}</div>
                  <div>Updated: {result.stats.updated}</div>
                  <div>Invalid: {result.stats.invalid}</div>
                </div>
              )}
              
              {result.stats?.invalidAddresses?.length > 0 && (
                <div className="mt-2">
                  <div className="mb-1">Invalid addresses:</div>
                  <div className="text-xs max-h-20 overflow-y-auto bg-black p-2 rounded">
                    {result.stats.invalidAddresses.join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={addBulkToWhitelist}
            disabled={loading}
            className="w-full p-2 bg-yellow-500 text-black rounded hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'PROCESSING...' : 'ADD ALL TO WHITELIST'}
          </button>
        </div>
        
        <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
          <h2 className="text-yellow-400 mb-4 text-sm">INSTRUCTIONS</h2>
          <div className="text-xs space-y-2">
            <p>1. Select the batch number to whitelist all addresses for</p>
            <p>2. Paste BTC addresses (must start with bc1p)</p>
            <p>3. Addresses can be separated by line breaks, commas, or spaces</p>
            <p>4. Click "Add All To Whitelist"</p>
            <p>5. Previously whitelisted addresses will be updated to the new batch</p>
          </div>
        </div>
      </div>
    </div>
  );
} 