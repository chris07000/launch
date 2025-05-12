'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';

// Add dynamic configuration
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function TestInscriptionPage() {
  const searchParams = useSearchParams();
  const [inscriptionId, setInscriptionId] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  
  // Get the inscription ID from the URL
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setInscriptionId(id);
      fetchInscriptionData(id);
    }
  }, [searchParams]);
  
  const fetchInscriptionData = async (id: string) => {
    setLoading(true);
    setError('');
    setHtmlContent('');
    
    try {
      // Fetch the raw HTML
      const response = await axios.get(`/api/get-inscription-html?inscriptionId=${id}`);
      
      if (response.data.success) {
        setHtmlContent(response.data.html);
        
        // Try to extract image URL from HTML
        const imgMatch = response.data.html.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
        if (imgMatch && imgMatch[1]) {
          // Found the image URL
          const extractedUrl = imgMatch[1].startsWith('http') 
            ? imgMatch[1] 
            : `https://ord-mirror.magiceden.dev${imgMatch[1]}`;
          
          setImageUrl(extractedUrl);
        } else {
          // Try to find content in JSON
          const jsonMatch = response.data.html.match(/"content":\s*"([^"]+)"/);
          if (jsonMatch && jsonMatch[1]) {
            setImageUrl(`data:image/png;base64,${jsonMatch[1]}`);
          } else {
            setError('No image found in HTML');
          }
        }
      } else {
        setError(response.data.error || 'Failed to fetch inscription data');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while fetching the inscription data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inscriptionId) {
      fetchInscriptionData(inscriptionId);
    }
  };
  
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400 mb-4">Test Inscription Rendering</h1>
        
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={inscriptionId}
              onChange={(e) => setInscriptionId(e.target.value)}
              placeholder="Enter inscription ID"
              className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500"
              disabled={loading || !inscriptionId}
            >
              {loading ? 'Loading...' : 'Get Inscription'}
            </button>
          </div>
        </form>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900 text-white rounded">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Preview */}
          <div className="border border-yellow-600 rounded p-4 bg-gray-900">
            <h2 className="text-lg font-bold text-yellow-400 mb-2">Image Preview</h2>
            {imageUrl ? (
              <div className="aspect-square relative overflow-hidden bg-gray-800 flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt={`Inscription ${inscriptionId}`}
                  className="max-w-full max-h-full object-contain"
                  onError={() => setError('Failed to load image')}
                />
              </div>
            ) : (
              <div className="aspect-square bg-gray-800 flex items-center justify-center text-gray-400">
                {loading ? 'Loading...' : 'No image found'}
              </div>
            )}
            
            {imageUrl && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 break-all">
                  URL: {imageUrl}
                </p>
                
                <div className="mt-2 flex gap-2">
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-500"
                  >
                    Open Full Image
                  </a>
                  
                  <a
                    href={`/api/magic-eden-proxy?inscriptionId=${inscriptionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-500"
                  >
                    Test Proxy API
                  </a>
                </div>
              </div>
            )}
          </div>
          
          {/* HTML Content */}
          <div className="border border-yellow-600 rounded p-4 bg-gray-900">
            <h2 className="text-lg font-bold text-yellow-400 mb-2">HTML Content</h2>
            {htmlContent ? (
              <div className="bg-gray-800 p-2 rounded h-96 overflow-auto">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all">
                  {htmlContent}
                </pre>
              </div>
            ) : (
              <div className="bg-gray-800 p-4 rounded h-96 flex items-center justify-center text-gray-400">
                {loading ? 'Loading...' : 'No HTML content found'}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6">
          <h2 className="text-lg font-bold text-yellow-400 mb-2">Inscription Info</h2>
          <div className="bg-gray-900 p-4 rounded border border-yellow-600">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-400">Inscription ID:</dt>
                <dd className="font-mono text-white break-all">{inscriptionId}</dd>
              </div>
              
              <div>
                <dt className="text-sm text-gray-400">Preview URL:</dt>
                <dd className="font-mono text-white break-all">
                  <a 
                    href={`https://ord-mirror.magiceden.dev/preview/${inscriptionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Magic Eden Preview
                  </a>
                </dd>
              </div>
              
              <div>
                <dt className="text-sm text-gray-400">Content URL:</dt>
                <dd className="font-mono text-white break-all">
                  <a 
                    href={`https://ord-mirror.magiceden.dev/content/${inscriptionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Magic Eden Content
                  </a>
                </dd>
              </div>
              
              <div>
                <dt className="text-sm text-gray-400">Ordinals Explorer:</dt>
                <dd className="font-mono text-white break-all">
                  <a 
                    href={`https://ordinals.com/inscription/${inscriptionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Ordinals.com
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
} 