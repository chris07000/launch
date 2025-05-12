'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TestImagesPage() {
  const [batchId, setBatchId] = useState(1);
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  
  // Generate batches for dropdown (1-16)
  const batches = Array.from({ length: 16 }, (_, i) => i + 1);
  
  const generateTestImages = async () => {
    setLoading(true);
    setError('');
    setResult('');
    
    try {
      const response = await fetch('/api/inscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generateTestInscriptions',
          batchId: parseInt(batchId.toString()),
          count: parseInt(count.toString())
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(data.message || `Succesvol ${count} test afbeeldingen toegevoegd aan batch ${batchId}`);
      } else {
        setError(data.error || 'Er is een fout opgetreden');
      }
    } catch (error: any) {
      setError(error.message || 'Er is een onbekende fout opgetreden');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#000',
      color: '#fff',
      padding: '20px',
      fontFamily: 'monospace'
    }}>
      <h1 style={{ 
        color: '#ffd700', 
        fontWeight: 'bold', 
        fontSize: '24px',
        marginBottom: '20px',
        borderBottom: '1px solid #333',
        paddingBottom: '10px'
      }}>
        Test Images Generator
      </h1>
      
      <div style={{ marginBottom: '20px' }}>
        <Link href="/admin" style={{ 
          color: '#aaa', 
          textDecoration: 'none',
          fontSize: '14px'
        }}>
          ← Terug naar Admin
        </Link>
      </div>
      
      <div style={{
        backgroundColor: 'rgba(0,0,0,0.3)',
        border: '1px solid #333',
        padding: '20px',
        borderRadius: '5px',
        maxWidth: '500px'
      }}>
        <p style={{ marginBottom: '20px', fontSize: '14px' }}>
          Genereer test afbeeldingen met het logo voor de geselecteerde batch.
          Deze tool maakt snel dummy inscriptions aan voor test doeleinden.
        </p>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            Batch:
          </label>
          <select
            value={batchId}
            onChange={(e) => setBatchId(parseInt(e.target.value))}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#111',
              border: '1px solid #333',
              color: '#fff',
              borderRadius: '4px'
            }}
          >
            {batches.map(id => (
              <option key={id} value={id}>Batch {id}</option>
            ))}
          </select>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            Aantal:
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value))}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#111',
              border: '1px solid #333',
              color: '#fff',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <button
          onClick={generateTestImages}
          disabled={loading}
          style={{
            backgroundColor: '#ffd700',
            color: '#000',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            width: '100%',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Bezig met genereren...' : `Genereer ${count} Test Afbeeldingen`}
        </button>
      </div>
      
      {result && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: 'rgba(46, 213, 115, 0.1)',
          border: '1px solid #2ed573',
          borderRadius: '4px',
          color: '#2ed573',
          maxWidth: '500px'
        }}>
          {result}
        </div>
      )}
      
      {error && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: 'rgba(255, 71, 87, 0.1)',
          border: '1px solid #ff4757',
          borderRadius: '4px',
          color: '#ff4757',
          maxWidth: '500px'
        }}>
          {error}
        </div>
      )}
      
      <div style={{ marginTop: '30px', maxWidth: '500px' }}>
        <h2 style={{ color: '#ffd700', fontSize: '18px', marginBottom: '10px' }}>
          Hoe werkt het?
        </h2>
        <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>
            Deze tool maakt snel test inscriptions aan met het Bitcoin Tiger logo.
          </li>
          <li style={{ marginBottom: '8px' }}>
            De gegenereerde inscriptions worden toegevoegd aan de geselecteerde batch.
          </li>
          <li style={{ marginBottom: '8px' }}>
            Perfect voor testen zonder echte tiger-afbeeldingen te hoeven uploaden.
          </li>
          <li style={{ marginBottom: '8px' }}>
            Na het genereren kun je terug naar de Admin om de inscriptions te bekijken en beheren.
          </li>
        </ul>
      </div>
    </div>
  );
} 