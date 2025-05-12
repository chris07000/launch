'use client';

import { useState } from 'react';
import Link from 'next/link';

interface RequestBody {
  action: string;
  batchId?: number;
}

export default function ClearDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [action, setAction] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState(1);
  
  // Get batches 1-16 for the dropdown
  const batches = Array.from({ length: 16 }, (_, i) => i + 1);
  
  const handleClearDashboard = async (actionType: string, batchId?: number) => {
    setAction(actionType);
    setShowConfirm(true);
  };
  
  const confirmClear = async () => {
    setLoading(true);
    setError('');
    setResult('');
    
    try {
      const requestBody: RequestBody = { action };
      
      // Add batchId if needed
      if (action === 'clearBatch') {
        requestBody.batchId = selectedBatch;
      }
      
      const response = await fetch('/api/inscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(`Operation successful! Remaining inscriptions: ${data.inscriptionsCount}`);
      } else {
        setError(data.error || 'An error occurred');
      }
    } catch (error: any) {
      setError(error.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };
  
  // Handle the reset everything action
  const handleResetEverything = () => {
    setAction('resetAll');
    setShowConfirm(true);
  };
  
  // Confirm and execute the reset everything action
  const confirmResetEverything = async () => {
    setLoading(true);
    setError('');
    setResult('');
    
    try {
      // Get the password from localStorage or sessionStorage
      const adminPassword = localStorage.getItem('admin_password') || sessionStorage.getItem('admin_password') || '';
      
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: adminPassword,
          action: 'resetAll'
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(data.message || 'Successfully reset all data!');
      } else {
        setError(data.error || 'An error occurred during reset');
      }
    } catch (error: any) {
      setError(error.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-yellow-400">Clear Dashboard</h1>
          <Link href="/admin" className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">
            Back to Admin
          </Link>
        </div>
        
        <div className="border-2 border-yellow-600 p-6 rounded-lg bg-gray-900 mb-8">
          <h2 className="text-lg font-bold text-yellow-400 mb-4">⚠️ Warning: Destructive Actions</h2>
          
          <div className="text-sm text-gray-300 mb-6">
            <p className="mb-2">These actions will permanently remove data from your dashboard. Please be careful.</p>
            <p className="text-red-400">These actions cannot be undone.</p>
          </div>
          
          <div className="grid gap-4 mb-6">
            {/* Clear by batch */}
            <div className="border border-gray-700 p-4 rounded bg-gray-800/50">
              <h3 className="text-md font-semibold text-white mb-2">Clear Inscriptions by Batch</h3>
              <p className="text-sm text-gray-400 mb-3">Remove all inscriptions from a specific batch.</p>
              
              <div className="flex items-end gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Select Batch:</label>
                  <select
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                  >
                    {batches.map(batch => (
                      <option key={batch} value={batch}>Batch {batch}</option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={() => handleClearDashboard('clearBatch')}
                  className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 transition-colors"
                  disabled={loading}
                >
                  Clear Batch {selectedBatch}
                </button>
              </div>
            </div>
            
            {/* Clear unassigned */}
            <div className="border border-gray-700 p-4 rounded bg-gray-800/50">
              <h3 className="text-md font-semibold text-white mb-2">Clear Unassigned Inscriptions</h3>
              <p className="text-sm text-gray-400 mb-3">Remove all inscriptions that haven't been assigned to an order.</p>
              
              <button
                onClick={() => handleClearDashboard('clearUnassigned')}
                className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 transition-colors"
                disabled={loading}
              >
                Clear Unassigned Inscriptions
              </button>
            </div>
            
            {/* Clear all */}
            <div className="border border-gray-700 p-4 rounded bg-gray-800/50">
              <h3 className="text-md font-semibold text-white mb-2">Clear All Inscriptions</h3>
              <p className="text-sm text-gray-400 mb-3">Remove all inscriptions from the dashboard. This is very destructive!</p>
              
              <button
                onClick={() => handleClearDashboard('clearAll')}
                className="px-4 py-2 bg-red-900 text-white rounded hover:bg-red-800 transition-colors"
                disabled={loading}
              >
                Clear All Inscriptions
              </button>
            </div>
            
            {/* Reset Everything - Most destructive option */}
            <div className="border-2 border-red-900 p-4 rounded bg-red-900/20 mt-8">
              <h3 className="text-lg font-bold text-red-500 mb-2">⚠️ RESET EVERYTHING</h3>
              <p className="text-sm text-gray-400 mb-3">
                This will reset ALL data including:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>All inscriptions</li>
                  <li>All orders and payments</li>
                  <li>All batches (reset to default)</li>
                  <li>All minted wallets</li>
                  <li>All whitelist entries</li>
                </ul>
              </p>
              <p className="text-red-500 text-sm font-bold mb-4">This action cannot be undone!</p>
              
              <button
                onClick={() => handleResetEverything()}
                className="px-4 py-2 bg-red-900 text-white rounded hover:bg-red-800 transition-colors"
                disabled={loading}
              >
                Reset Everything
              </button>
            </div>
          </div>
          
          {result && (
            <div className="mb-4 p-3 bg-green-900/50 border border-green-700 text-green-400 rounded">
              {result}
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-400 rounded">
              {error}
            </div>
          )}
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border-2 border-red-600 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-red-500 mb-4">⚠️ Confirm Action</h2>
            
            <p className="text-white mb-6">
              {action === 'clearAll' && "You are about to delete ALL inscriptions. This action cannot be undone."}
              {action === 'clearBatch' && `You are about to delete all inscriptions in Batch ${selectedBatch}. This action cannot be undone.`}
              {action === 'clearUnassigned' && "You are about to delete all unassigned inscriptions. This action cannot be undone."}
              {action === 'resetAll' && "You are about to RESET EVERYTHING including all batches, orders, wallets, whitelist, and inscriptions. This is extremely destructive and cannot be undone!"}
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              
              <button
                onClick={action === 'resetAll' ? confirmResetEverything : confirmClear}
                className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 transition-colors"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Yes, Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 