'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BatchMigrationPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [sourceBatchId, setSourceBatchId] = useState(2); // Default to source batch 2
  const [targetBatchId, setTargetBatchId] = useState(3); // Default to target batch 3
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [batchCounts, setBatchCounts] = useState<{ [key: number]: number }>({});
  const router = useRouter();

  // Try to retrieve password from localStorage on component mount
  useEffect(() => {
    const storedPassword = localStorage.getItem('admin_password');
    if (storedPassword) {
      setPassword(storedPassword);
      handleAuthentication(storedPassword);
    }
  }, []);

  // Authentication function
  const handleAuthentication = async (pwd: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin?password=${encodeURIComponent(pwd)}&action=dashboard`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Authentication failed');
      }
      
      const data = await response.json();
      setAuthenticated(true);
      
      // Save password to localStorage for API calls
      localStorage.setItem('admin_password', pwd);
      
      // Fetch batch statistics
      fetchBatchStatistics(pwd);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics about how many addresses are in each batch
  const fetchBatchStatistics = async (pwd: string) => {
    try {
      const response = await fetch(`/api/admin/whitelist-statistics?password=${encodeURIComponent(pwd)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch batch statistics');
      }
      
      const data = await response.json();
      
      // Format the batch counts
      const counts: { [key: number]: number } = {};
      data.batchCounts.forEach((item: any) => {
        counts[item.batch_id] = parseInt(item.count);
      });
      
      setBatchCounts(counts);
    } catch (error) {
      console.error('Error fetching batch statistics:', error);
    }
  };

  // Handle the migration
  const handleMigration = async () => {
    if (sourceBatchId === targetBatchId) {
      setError('Source and target batches must be different');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/admin/bulk-batch-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          sourceBatchId,
          targetBatchId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to migrate addresses');
      }

      setResult(data);
      
      // Refresh statistics after migration
      fetchBatchStatistics(password);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pixel-grid-bg" style={{ fontFamily: "'Press Start 2P', monospace" }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <header style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h1 style={{ color: '#ffd700', fontSize: '24px', marginBottom: '10px', textShadow: '2px 2px 0 #000' }}>
            BATCH MIGRATION TOOL
          </h1>
          <p style={{ color: '#aaa', fontSize: '12px' }}>
            Move whitelisted addresses from one batch to another
          </p>
        </header>

        {/* Main Content */}
        <main>
          {!authenticated ? (
            <div style={{ 
              maxWidth: '400px', 
              margin: '0 auto', 
              backgroundColor: 'rgba(0,0,0,0.7)',
              border: '3px solid #ffd700',
              padding: '24px'
            }}>
              <div style={{ marginBottom: '16px', color: '#ffd700', textShadow: '1px 1px 0 #000', fontSize: '14px' }}>
                ADMIN LOGIN
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>Password:</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'black',
                    border: '2px solid #ffd700',
                    color: 'white',
                    fontSize: '12px'
                  }}
                />
              </div>
              
              {error && (
                <div style={{ 
                  marginBottom: '16px', 
                  color: '#ef4444',
                  padding: '8px',
                  border: '1px solid #7f1d1d',
                  backgroundColor: 'black',
                  fontSize: '10px'
                }}>
                  {error}
                </div>
              )}
              
              <button
                onClick={() => handleAuthentication(password)}
                disabled={loading}
                style={{ 
                  backgroundColor: '#ffd700', 
                  color: 'black', 
                  padding: '10px',
                  width: '100%',
                  fontSize: '12px',
                  border: '2px solid',
                  borderTopColor: '#ffd700',
                  borderLeftColor: '#ffd700',
                  borderRightColor: '#aa8e00',
                  borderBottomColor: '#aa8e00',
                  cursor: 'pointer',
                  opacity: loading ? 0.5 : 1
                }}
              >
                {loading ? 'AUTHENTICATING...' : 'LOGIN'}
              </button>
              
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <Link href="/admin" style={{ color: '#aaa', fontSize: '10px', textDecoration: 'none' }}>
                  BACK TO ADMIN
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {/* Migration Tool */}
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                border: '2px solid #ffd700',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h2 style={{ color: '#ffd700', fontSize: '16px', marginBottom: '16px' }}>
                  BULK MIGRATION TOOL
                </h2>
                
                {/* Current batch statistics */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ color: '#aaa', fontSize: '14px', marginBottom: '12px' }}>CURRENT BATCH STATISTICS</h3>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                    gap: '10px'
                  }}>
                    {[...Array(16)].map((_, i) => {
                      const batchId = i + 1;
                      const count = batchCounts[batchId] || 0;
                      
                      return (
                        <div key={batchId} style={{ 
                          padding: '10px', 
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          border: '1px solid #333',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '10px', color: '#ffd700', marginBottom: '5px' }}>
                            Batch #{batchId}
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                            {count}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#aaa' }}>
                        Source Batch:
                      </label>
                      <select
                        value={sourceBatchId}
                        onChange={(e) => setSourceBatchId(Number(e.target.value))}
                        style={{
                          padding: '10px',
                          backgroundColor: 'black',
                          border: '1px solid #ffd700',
                          color: 'white',
                          fontSize: '12px',
                          width: '100%'
                        }}
                      >
                        {[...Array(16)].map((_, i) => {
                          const batchId = i + 1;
                          const count = batchCounts[batchId] || 0;
                          
                          return (
                            <option key={batchId} value={batchId}>
                              Batch #{batchId} ({count} addresses)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      padding: '0 20px'
                    }}>
                      <div style={{ fontSize: '24px', color: '#ffd700' }}>→</div>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#aaa' }}>
                        Target Batch:
                      </label>
                      <select
                        value={targetBatchId}
                        onChange={(e) => setTargetBatchId(Number(e.target.value))}
                        style={{
                          padding: '10px',
                          backgroundColor: 'black',
                          border: '1px solid #ffd700',
                          color: 'white',
                          fontSize: '12px',
                          width: '100%'
                        }}
                      >
                        {[...Array(16)].map((_, i) => {
                          const batchId = i + 1;
                          const count = batchCounts[batchId] || 0;
                          
                          return (
                            <option key={batchId} value={batchId}>
                              Batch #{batchId} ({count} addresses)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Warning message */}
                <div style={{
                  backgroundColor: 'rgba(255, 0, 0, 0.1)',
                  border: '1px solid #ff6666',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '10px',
                  color: '#ff6666'
                }}>
                  <strong>WARNING:</strong> This operation will move ALL addresses from Batch #{sourceBatchId} to Batch #{targetBatchId}. This action cannot be undone.
                </div>
                
                {error && (
                  <div style={{ 
                    marginBottom: '16px', 
                    color: '#ef4444',
                    padding: '8px',
                    border: '1px solid #7f1d1d',
                    backgroundColor: 'black',
                    fontSize: '10px'
                  }}>
                    {error}
                  </div>
                )}
                
                {result && (
                  <div style={{
                    backgroundColor: 'rgba(0, 255, 0, 0.1)',
                    border: '1px solid #66ff66',
                    padding: '12px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    color: '#66ff66'
                  }}>
                    <strong>SUCCESS:</strong> {result.message}
                  </div>
                )}
                
                <button
                  onClick={handleMigration}
                  disabled={loading || sourceBatchId === targetBatchId}
                  style={{ 
                    backgroundColor: '#ffd700', 
                    color: 'black', 
                    padding: '12px',
                    width: '100%',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    border: '2px solid',
                    borderTopColor: '#ffd700',
                    borderLeftColor: '#ffd700',
                    borderRightColor: '#aa8e00',
                    borderBottomColor: '#aa8e00',
                    cursor: 'pointer',
                    opacity: (loading || sourceBatchId === targetBatchId) ? 0.5 : 1
                  }}
                >
                  {loading ? 'PROCESSING...' : `MOVE ALL ADDRESSES FROM BATCH #${sourceBatchId} TO BATCH #${targetBatchId}`}
                </button>
              </div>
              
              {/* Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                <Link 
                  href="/admin" 
                  style={{
                    color: '#aaa',
                    fontSize: '12px',
                    textDecoration: 'none',
                    padding: '8px 16px',
                    border: '1px solid #333',
                    backgroundColor: 'rgba(0,0,0,0.5)'
                  }}
                >
                  ← BACK TO ADMIN
                </Link>
                
                <button
                  onClick={() => {
                    localStorage.removeItem('admin_password');
                    setAuthenticated(false);
                  }}
                  style={{
                    color: '#aaa',
                    fontSize: '12px',
                    textDecoration: 'none',
                    padding: '8px 16px',
                    border: '1px solid #333',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    cursor: 'pointer'
                  }}
                >
                  LOGOUT
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
} 