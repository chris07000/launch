'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';

interface Inscription {
  id: string;
  imageUrl: string;
  batch: number;
  inscriptionId: string;
}

export default function MagicEdenImportPage() {
  const [inscriptionIds, setInscriptionIds] = useState<string>('');
  const [previewInscriptions, setPreviewInscriptions] = useState<Inscription[]>([]);
  const [importStatus, setImportStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [batch, setBatch] = useState<number>(1);
  
  // Parse input and fetch preview data
  const handlePreview = async () => {
    if (!inscriptionIds.trim()) {
      setImportStatus('Please enter at least one inscription ID');
      return;
    }
    
    setLoading(true);
    setImportStatus('Processing input...');
    
    try {
      // Check if we have a single 64-character hex string which is a common format for inscriptions
      const singleId = inscriptionIds.trim();
      if (/^[0-9a-f]{64}(i\d+)?$/i.test(singleId)) {
        // This is a single full inscription ID
        let cleanId = singleId;
        if (/i\d+$/.test(cleanId)) {
          cleanId = cleanId.replace(/i\d+$/, '');
        }
        
        setImportStatus('Processing direct inscription ID...');
        
        // Use our proxy API for the image URL
        const imageUrl = `/api/magic-eden-proxy?inscriptionId=${cleanId}`;
        
        // Create inscription object
        const processedInscriptions = [{
          id: cleanId,
          imageUrl,
          batch,
          inscriptionId: cleanId
        }];
        
        setPreviewInscriptions(processedInscriptions);
        setImportStatus(`Found direct inscription ID: ${cleanId}`);
        setLoading(false);
        return;
      }
      
      // Parse the IDs, one per line or comma separated
      const ids = inscriptionIds
        .split(/[\n,]/)
        .map(id => id.trim())
        .filter(id => id);
      
      if (ids.length === 0) {
        setImportStatus('No valid inscription IDs found');
        setLoading(false);
        return;
      }
      
      setImportStatus(`Processing ${ids.length} IDs...`);
      
      // Process each ID
      const processedInscriptions: Inscription[] = [];
      const errors: string[] = [];
      
      for (const id of ids) {
        try {
          // Clean the ID - handle various formats
          let cleanId = id;
          
          // If it's a Magic Eden URL, extract the ID
          if (id.includes('magiceden.io') || id.includes('ord-mirror.magiceden.dev')) {
            const parts = id.split('/');
            cleanId = parts[parts.length - 1];
          }
          
          // Remove i0, i1, etc. suffix if present
          if (/i\d+$/.test(cleanId)) {
            cleanId = cleanId.replace(/i\d+$/, '');
          }
          
          // Use our proxy API for the image URL
          const imageUrl = `/api/magic-eden-proxy?inscriptionId=${cleanId}`;
          
          processedInscriptions.push({
            id: cleanId,
            imageUrl,
            batch,
            inscriptionId: cleanId
          });
        } catch (error) {
          console.error(`Error processing ID ${id}:`, error);
          errors.push(id);
        }
      }
      
      setPreviewInscriptions(processedInscriptions);
      
      if (errors.length > 0) {
        setImportStatus(`Found ${processedInscriptions.length} inscriptions. Could not process ${errors.length} IDs.`);
      } else {
        setImportStatus(`Found ${processedInscriptions.length} inscriptions for preview`);
      }
    } catch (error: any) {
      setImportStatus(`Error: ${error.message || 'An unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Import the inscriptions
  const handleImport = async () => {
    if (previewInscriptions.length === 0) {
      setImportStatus('No inscriptions to import');
      return;
    }
    
    setLoading(true);
    setImportStatus(`Importing ${previewInscriptions.length} inscriptions...`);
    
    try {
      const response = await fetch('/api/inscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'batchImport', 
          inscriptions: previewInscriptions 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setImportStatus(`Successfully imported ${previewInscriptions.length} inscriptions`);
        setPreviewInscriptions([]);
        setInscriptionIds('');
      } else {
        setImportStatus(`Error: ${data.error || 'Failed to import inscriptions'}`);
      }
    } catch (error: any) {
      setImportStatus(`Error: ${error.message || 'An unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Add a function to handle paste events  
  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData?.getData('text') || '';
    
    if (pasteData) {
      // Append the pasted data to the existing content
      setInscriptionIds(prev => {
        if (prev && !prev.endsWith('\n') && prev.length > 0) {
          return prev + '\n' + pasteData;
        }
        return prev + pasteData;
      });
    }
  };
  
  // Add effect to handle the paste event
  useEffect(() => {
    // Add paste event listener to the whole document
    document.addEventListener('paste', handlePaste);
    
    // Clean up
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-yellow-400">Magic Eden Import</h1>
          <Link href="/admin" className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">
            Back to Admin
          </Link>
        </div>
        
        <div className="border-2 border-yellow-600 p-4 rounded-lg bg-gray-900 mb-8">
          <h2 className="text-lg font-bold text-yellow-400 mb-4">Import Instructions</h2>
          
          <div className="mb-4 text-sm text-gray-300">
            <p className="mb-2">Paste one or more Magic Eden inscription IDs or URLs below, one per line or comma-separated:</p>
            <ul className="list-disc list-inside mb-2 pl-4">
              <li>Full Magic Eden URLs like <code className="bg-gray-800 px-1 rounded">https://magiceden.io/ordinals/item-details/df507f90784f3cbeb695598199cf7a24d293b4bdd46d342809cc83781427adeei0</code></li>
              <li>Preview URLs like <code className="bg-gray-800 px-1 rounded">https://ord-mirror.magiceden.dev/preview/df507f90784f3cbeb695598199cf7a24d293b4bdd46d342809cc83781427adeei0</code></li>
              <li>Raw inscription IDs like <code className="bg-gray-800 px-1 rounded">df507f90784f3cbeb695598199cf7a24d293b4bdd46d342809cc83781427adee</code></li>
            </ul>
            <p className="text-xs text-gray-400">Note: The i0 suffix will be automatically removed if present.</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Batch:</label>
            <input
              type="number"
              value={batch}
              onChange={(e) => setBatch(parseInt(e.target.value) || 1)}
              min="1"
              className="w-full md:w-32 p-2 bg-gray-800 border border-gray-700 rounded text-white mb-4"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Inscription IDs or URLs:</label>
            <div className="relative">
              <textarea
                className="w-full h-40 p-3 bg-gray-800 text-white border-2 border-gray-700 rounded focus:border-yellow-600 transition-colors"
                placeholder="Paste inscription IDs or URLs here, one per line or comma-separated..."
                value={inscriptionIds}
                onChange={(e) => setInscriptionIds(e.target.value)}
              />
              <div className="absolute top-0 right-0 p-2 rounded-bl bg-gray-900/80 text-xs text-gray-400">
                {inscriptionIds.split(/[\n,]/).filter(id => id.trim()).length} items
              </div>
              
              {/* Quick actions */}
              <div className="mt-2 flex space-x-2">
                <button
                  onClick={() => setInscriptionIds('')}
                  className="text-xs text-gray-400 hover:text-red-400"
                  type="button"
                >
                  Clear All
                </button>
                <button
                  onClick={() => {
                    const text = navigator.clipboard.readText().then(text => {
                      if (text) {
                        setInscriptionIds(prev => {
                          if (prev && !prev.endsWith('\n') && prev.length > 0) {
                            return prev + '\n' + text;
                          }
                          return prev + text;
                        });
                      }
                    });
                  }}
                  className="text-xs text-gray-400 hover:text-yellow-400"
                  type="button"
                >
                  Paste from Clipboard
                </button>
              </div>
            </div>
            
            <div className="mt-4 border border-gray-700 rounded p-3 bg-gray-800/50">
              <p className="text-xs text-gray-400 mb-2">
                <span className="text-yellow-400">TIP:</span> You can paste content anywhere on this page!
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const examples = [
                      'https://magiceden.io/ordinals/item-details/df507f90784f3cbeb695598199cf7a24d293b4bdd46d342809cc83781427adeei0',
                      'https://ord-mirror.magiceden.dev/preview/123456abcdef',
                      'abcdef123456'
                    ].join('\n');
                    
                    setInscriptionIds(examples);
                  }}
                  className="text-xs bg-gray-700 py-2 px-3 rounded hover:bg-gray-600 transition-colors"
                >
                  Load Example URLs
                </button>
                <button
                  onClick={() => {
                    // Check if there's text selected somewhere on the page
                    const selection = window.getSelection()?.toString();
                    if (selection) {
                      setInscriptionIds(selection);
                    }
                  }}
                  className="text-xs bg-gray-700 py-2 px-3 rounded hover:bg-gray-600 transition-colors"
                >
                  Use Selected Text
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center mb-2">
            <button
              className="px-4 py-2 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500 disabled:opacity-50 mr-2"
              onClick={handlePreview}
              disabled={loading || !inscriptionIds.trim()}
            >
              Preview
            </button>
            
            <button
              className="px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-500 disabled:opacity-50"
              onClick={handleImport}
              disabled={loading || previewInscriptions.length === 0}
            >
              {loading ? 'Processing...' : `Import ${previewInscriptions.length} Inscriptions`}
            </button>
            
            {importStatus && (
              <span className={`ml-4 text-sm ${importStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
                {importStatus}
              </span>
            )}
          </div>
        </div>
        
        {/* Preview section */}
        {previewInscriptions.length > 0 && (
          <div className="border border-yellow-600 rounded p-4 bg-gray-900">
            <h2 className="text-lg font-bold text-yellow-400 mb-4">
              Preview ({previewInscriptions.length > 10 ? '10 of ' + previewInscriptions.length : previewInscriptions.length})
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {previewInscriptions.slice(0, 10).map((insc, index) => (
                <div key={index} className="border-2 border-gray-700 rounded p-3 bg-gray-800 hover:border-yellow-600 transition-colors">
                  <div className="aspect-square w-full relative mb-3 overflow-hidden bg-gray-900 flex items-center justify-center rounded">
                    <a href={`/admin/test-inscription?id=${insc.id}`} target="_blank" className="block w-full h-full">
                      <img
                        src={insc.imageUrl}
                        alt={`Inscription ${insc.id}`}
                        className="object-contain absolute inset-0 w-full h-full"
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          // Add placeholder text
                          const parent = target.parentElement;
                          if (parent) {
                            const placeholder = document.createElement('div');
                            placeholder.className = 'absolute inset-0 flex items-center justify-center';
                            placeholder.innerHTML = `<span class="text-xs text-center text-gray-400">No preview available</span>`;
                            parent.appendChild(placeholder);
                          }
                        }}
                      />
                    </a>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm text-white font-medium mb-1 truncate" title={insc.id}>
                        {insc.id.substring(0, 10)}...
                      </div>
                      <div className="text-xs text-yellow-400">Batch: {insc.batch}</div>
                    </div>
                    <a 
                      href={`https://ord-mirror.magiceden.dev/preview/${insc.id}i0`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-blue-700 text-xs text-white rounded hover:bg-blue-600"
                    >
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
            
            {previewInscriptions.length > 10 && (
              <div className="mt-4 text-sm text-gray-400">
                Showing 10 of {previewInscriptions.length} inscriptions
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 