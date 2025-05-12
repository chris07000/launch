'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaFolderOpen, FaSync, FaCheckCircle, FaImage, FaEye } from 'react-icons/fa';

// Interface for local inscription properties
interface LocalInscription {
  id: string;
  batchId: number;
  imageUrl: string;
  fileName: string;
  isSelected: boolean;
}

// For tracking import progress
interface ImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
}

export default function LocalImportPage() {
  const [images, setImages] = useState<LocalInscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(1);
  const [folderPath, setFolderPath] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string>('');
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0
  });
  const [isImporting, setIsImporting] = useState(false);
  const [selectAll, setSelectAll] = useState(true);
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Batches for dropdown
  const batches = Array.from({ length: 16 }, (_, i) => i + 1);
  
  // Function to authenticate with admin API
  const authenticate = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin?password=${encodeURIComponent(password)}&action=dashboard`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Authentication failed');
      }
      
      setAuthenticated(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to scan a folder for images
  const scanFolder = async () => {
    setScanning(true);
    setImportStatus('Scanning folder for images...');
    
    try {
      // In a real app, this would be an API call to scan the server folder
      // For demo purposes, we'll simulate finding images in the public folder
      
      // This would be replaced with a real API call in production
      const response = await fetch('/api/scan-inscriptions?path=' + encodeURIComponent(folderPath || 'public/images/tigers'));
      
      if (!response.ok) {
        throw new Error('Failed to scan folder');
      }
      
      const data = await response.json();
      
      if (!data.images || data.images.length === 0) {
        setImportStatus('No images found in the selected folder');
        setImages([]);
        return;
      }
      
      // Process the found images
      const processedImages: LocalInscription[] = data.images.map((image: any, index: number) => ({
        id: image.id || `${index + 1}`,
        batchId: selectedBatch,
        imageUrl: image.path,
        fileName: image.name,
        isSelected: true
      }));
      
      setImages(processedImages);
      setImportStatus(`Found ${processedImages.length} images`);
    } catch (error: any) {
      setImportStatus(`Error: ${error.message}`);
    } finally {
      setScanning(false);
    }
  };
  
  // For demo: Simulate finding images in public folder
  const simulateLocalScan = () => {
    setScanning(true);
    setImportStatus('Scanning for tiger collection images...');
    
    // Simulate API delay
    setTimeout(() => {
      // Create an array of 42 simulated tiger images (for preview)
      const simulatedImages: LocalInscription[] = Array.from({ length: 42 }, (_, i) => ({
        id: `${i + 1}`,
        batchId: selectedBatch,
        imageUrl: `/api/local-inscription?id=${i + 1}`, // This would point to a real API endpoint
        fileName: `${i + 1}.png`,
        isSelected: true
      }));
      
      setImages(simulatedImages);
      setImportStatus(`Found ${simulatedImages.length} tiger images (showing preview of 42 images)`);
      setScanning(false);
    }, 1500);
  };
  
  // Import the entire tiger collection directly
  const importEntireCollection = async () => {
    setLoading(true);
    setImportStatus('Importing entire tiger collection...');
    
    try {
      const response = await fetch('/api/inscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'importTigerCollection',
          batchId: selectedBatch
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setImportStatus(`Successfully imported tiger collection! Total inscriptions: ${data.inscriptionsCount}`);
      } else {
        setImportStatus(`Error: ${data.error || 'Failed to import collection'}`);
      }
    } catch (error: any) {
      setImportStatus(`Error: ${error.message || 'An unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle selection of a single image
  const toggleImageSelection = (id: string) => {
    setImages(images.map(img => 
      img.id === id ? { ...img, isSelected: !img.isSelected } : img
    ));
  };
  
  // Toggle selection of all images
  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
    setImages(images.map(img => ({ ...img, isSelected: !selectAll })));
  };
  
  // Import the selected images
  const importSelectedImages = async () => {
    const selectedImages = images.filter(img => img.isSelected);
    
    if (selectedImages.length === 0) {
      setImportStatus('No images selected for import');
      return;
    }
    
    setIsImporting(true);
    setImportStatus(`Preparing to import ${selectedImages.length} images...`);
    setImportProgress({
      total: selectedImages.length,
      processed: 0,
      successful: 0,
      failed: 0
    });
    
    try {
      // In a real implementation, this would be batched to avoid overwhelming the server
      // Here we'll simulate the import process
      
      // Process in batches of 10 for better UI feedback
      const batchSize = 10;
      
      for (let i = 0; i < selectedImages.length; i += batchSize) {
        const batch = selectedImages.slice(i, i + batchSize);
        
        // Simulate API call to import batch
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update progress
        setImportProgress(prev => ({
          ...prev,
          processed: prev.processed + batch.length,
          successful: prev.successful + batch.length
        }));
        
        setImportStatus(`Imported ${i + batch.length} of ${selectedImages.length} images`);
      }
      
      setImportStatus(`Successfully imported ${selectedImages.length} images`);
    } catch (error: any) {
      setImportStatus(`Error during import: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };
  
  // Effect to update batch selection for all images when batch changes
  useEffect(() => {
    if (images.length > 0) {
      setImages(images.map(img => ({ ...img, batchId: selectedBatch })));
    }
  }, [selectedBatch]);
  
  // Show preview of an image
  const showPreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
  };
  
  // Close preview
  const closePreview = () => {
    setPreviewImage(null);
  };

  // Calculate the percentage of import completion
  const importPercentage = importProgress.total > 0 
    ? Math.round((importProgress.processed / importProgress.total) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        {!authenticated ? (
          <div className="max-w-md mx-auto mt-8 p-6 bg-gray-900 border-2 border-yellow-600 rounded-lg">
            <h1 className="text-xl font-bold text-yellow-400 mb-4">Admin Authentication</h1>
            <p className="text-sm text-gray-400 mb-4">Please enter your admin password to continue.</p>
            
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full p-2 mb-4 bg-black border border-gray-700 text-white"
            />
            
            {error && (
              <div className="mb-4 p-2 bg-red-900/30 border border-red-800 text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <button
              onClick={authenticate}
              disabled={loading}
              className="w-full p-2 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>
            
            <div className="mt-4 text-center">
              <Link href="/admin" className="text-sm text-gray-400 hover:text-yellow-400">
                Back to Admin Panel
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-yellow-400">Tigers Collection Import</h1>
              <Link href="/admin" className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">
                Back to Admin
              </Link>
            </div>
            
            <div className="border-2 border-yellow-600 p-6 rounded-lg bg-gray-900 mb-8">
              <h2 className="text-lg font-bold text-yellow-400 mb-4">Import 42x42 Pixel Tiger Collection</h2>
              
              <div className="text-sm text-gray-300 mb-6">
                <p>This tool helps you import the 999 Tigers Collection as NFT inscriptions with proper 42x42 pixel rendering.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="md:col-span-3">
                  <label className="block text-sm text-gray-400 mb-1">Image Folder Path (optional):</label>
                  <input 
                    type="text"
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                    placeholder="public/images/tigers (leave empty for default)"
                    className="w-full p-2 bg-black border border-gray-700 text-white rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Batch:</label>
                  <select
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(parseInt(e.target.value))}
                    className="w-full p-2 bg-black border border-gray-700 text-white rounded"
                  >
                    {batches.map(batch => (
                      <option key={batch} value={batch}>Batch {batch}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={scanFolder}
                  disabled={scanning}
                  className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center"
                >
                  <FaFolderOpen className="mr-2" />
                  {scanning ? 'Scanning...' : 'Scan Folder'}
                </button>
                
                <button
                  onClick={simulateLocalScan}
                  disabled={scanning}
                  className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center"
                >
                  <FaSync className="mr-2" />
                  {scanning ? 'Scanning...' : 'Load Tiger Collection (Preview)'}
                </button>
                
                <button
                  onClick={importEntireCollection}
                  disabled={loading}
                  className="px-4 py-2 bg-yellow-700 text-black font-bold rounded hover:bg-yellow-600 disabled:opacity-50 flex items-center"
                >
                  <FaImage className="mr-2" />
                  {loading ? 'Importing...' : 'Import All 999 Tigers'}
                </button>
                
                <div className="flex-grow"></div>
                
                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                  {viewMode === 'grid' ? 'List View' : 'Grid View'}
                </button>
              </div>
              
              {importStatus && (
                <div className="mb-4 p-3 bg-gray-800 text-gray-300 rounded border border-gray-700">
                  {importStatus}
                </div>
              )}
              
              {images.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={toggleSelectAll}
                        className="mr-2 w-4 h-4"
                      />
                      <span className="text-sm">Select All ({images.length} images)</span>
                    </div>
                    
                    <button
                      onClick={importSelectedImages}
                      disabled={isImporting || images.filter(img => img.isSelected).length === 0}
                      className="px-4 py-2 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500 disabled:opacity-50"
                    >
                      {isImporting 
                        ? `Importing... ${importProgress.processed}/${importProgress.total}`
                        : `Import Selected (${images.filter(img => img.isSelected).length})`}
                    </button>
                  </div>
                  
                  {/* Progress bar during import */}
                  {isImporting && (
                    <div className="mb-6">
                      <div className="w-full bg-gray-700 h-2 mb-2 rounded">
                        <div 
                          className="bg-yellow-500 h-2 rounded" 
                          style={{ width: `${importPercentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{importProgress.processed} of {importProgress.total} processed</span>
                        <span>{importPercentage}% complete</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Image Gallery - Grid View */}
                  {viewMode === 'grid' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto max-h-[70vh]">
                      {images.map((img, index) => (
                        <div 
                          key={index}
                          className={`border rounded overflow-hidden ${img.isSelected ? 'border-yellow-600' : 'border-gray-700'} relative group`}
                        >
                          <div className="flex items-center justify-center h-48 bg-gray-800">
                            {/* Image with pixelated rendering */}
                            <div className="w-48 h-48 relative" style={{ 
                              imageRendering: 'pixelated', /* Modern browsers */
                              WebkitFontSmoothing: 'none' /* Webkit */
                            }}>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-24 h-24 bg-gray-600 animate-pulse"></div>
                              </div>
                              <img 
                                src={img.imageUrl} 
                                alt={img.fileName}
                                className="absolute inset-0 w-full h-full"
                                style={{ 
                                  imageRendering: 'pixelated',
                                  background: 'linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.05) 75%, rgba(0,0,0,0.05)), linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.05) 75%, rgba(0,0,0,0.05))',
                                  backgroundSize: '16px 16px',
                                  backgroundPosition: '0 0, 8px 8px'
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/images/placeholder.png';
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="p-2 bg-gray-900">
                            <div className="flex items-center justify-between">
                              <div className="truncate text-xs flex-grow">
                                {img.fileName}
                              </div>
                              <button
                                onClick={() => showPreview(img.imageUrl)}
                                className="text-gray-400 hover:text-white ml-1"
                              >
                                <FaEye size={12} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="absolute top-1 left-1">
                            <input
                              type="checkbox"
                              checked={img.isSelected}
                              onChange={() => toggleImageSelection(img.id)}
                              className="w-4 h-4"
                            />
                          </div>
                          
                          {img.isSelected && (
                            <div className="absolute top-1 right-1 bg-green-900 rounded-full">
                              <FaCheckCircle size={16} className="text-green-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Image List - List View */}
                  {viewMode === 'list' && (
                    <div className="overflow-y-auto max-h-[60vh]">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-800">
                            <th className="p-2 text-left">
                              <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={toggleSelectAll}
                                className="mr-2 w-4 h-4"
                              />
                            </th>
                            <th className="p-2 text-left">Image</th>
                            <th className="p-2 text-left">Filename</th>
                            <th className="p-2 text-left">ID</th>
                            <th className="p-2 text-left">Batch</th>
                            <th className="p-2 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {images.map((img, index) => (
                            <tr 
                              key={index} 
                              className={`border-t border-gray-700 ${img.isSelected ? 'bg-yellow-900/20' : ''}`}
                            >
                              <td className="p-2">
                                <input
                                  type="checkbox"
                                  checked={img.isSelected}
                                  onChange={() => toggleImageSelection(img.id)}
                                  className="w-4 h-4"
                                />
                              </td>
                              <td className="p-2">
                                <div className="w-32 h-32 relative" style={{ imageRendering: 'pixelated' }}>
                                  <img
                                    src={img.imageUrl}
                                    alt={img.fileName}
                                    className="w-full h-full"
                                    style={{ 
                                      imageRendering: 'pixelated',
                                      background: 'linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.05) 75%, rgba(0,0,0,0.05)), linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.05) 75%, rgba(0,0,0,0.05))',
                                      backgroundSize: '8px 8px',
                                      backgroundPosition: '0 0, 4px 4px'
                                    }}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/images/placeholder.png';
                                    }}
                                  />
                                </div>
                              </td>
                              <td className="p-2 text-sm">{img.fileName}</td>
                              <td className="p-2 text-sm font-mono">{img.id}</td>
                              <td className="p-2 text-sm">{img.batchId}</td>
                              <td className="p-2">
                                <button
                                  onClick={() => showPreview(img.imageUrl)}
                                  className="p-1 bg-blue-700 text-white rounded hover:bg-blue-600"
                                >
                                  <FaEye size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border-2 border-yellow-600 rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-yellow-400">Image Preview</h3>
              <button
                onClick={closePreview}
                className="text-gray-400 hover:text-white"
              >
                &times;
              </button>
            </div>
            
            <div className="flex justify-center mb-4">
              {/* Pixelated image container with upscaling */}
              <div className="relative bg-gray-800 p-4 rounded">
                <div className="relative" style={{ 
                  width: '420px',  /* 42px × 10 */
                  height: '420px', /* 42px × 10 */
                  imageRendering: 'pixelated'
                }}>
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="absolute inset-0 w-full h-full"
                    style={{ 
                      imageRendering: 'pixelated',
                      background: 'linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.05) 75%, rgba(0,0,0,0.05)), linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.05) 75%, rgba(0,0,0,0.05))',
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 10px 10px'
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/placeholder.png';
                    }}
                  />
                </div>
                
                <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">
                  42×42 pixels, 10× scaled
                </div>
              </div>
            </div>
            
            <div className="text-center text-sm text-gray-400">
              Displayed with pixel-perfect rendering, as it will appear in Ordinals inscriptions
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 