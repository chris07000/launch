'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaCopy, FaCheckCircle, FaClock, FaUserCheck, FaClipboardList, FaRegClock } from 'react-icons/fa';

// Define interface for inscriptions
interface Inscription {
  id: string;
  imageUrl: string;
  batch: number;
  batchId?: number; // For backward compatibility
  createdAt?: string;
  updatedAt?: string;
  assignedToOrder?: string;
  inscriptionId?: string | null; // Explicitly allow null to help with TypeScript
  isLocalFile?: boolean;
  file?: File;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(1);
  const [activeTab, setActiveTab] = useState('batches');
  const [copiedAddress, setCopiedAddress] = useState('');
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [newInscriptionId, setNewInscriptionId] = useState('');
  const [newInscriptionImage, setNewInscriptionImage] = useState('');
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [previewInscriptions, setPreviewInscriptions] = useState<Inscription[]>([]);
  const [showLocalImport, setShowLocalImport] = useState(false);
  const [localImportFiles, setLocalImportFiles] = useState<Inscription[]>([]);
  const [mintStartTime, setMintStartTime] = useState<number | null>(null);
  const [mintStartDatetime, setMintStartDatetime] = useState<number | null>(null);
  const [cooldownSettings, setCooldownSettings] = useState<{[key: string]: {value: number, unit: 'minutes' | 'hours' | 'days'}}>({
    default: { value: 15, unit: 'minutes' }
  });
  const [selectedBatchForCooldown, setSelectedBatchForCooldown] = useState<string>('default');
  const [selectedBatchForLimit, setSelectedBatchForLimit] = useState(1);
  const [newWalletLimit, setNewWalletLimit] = useState(33);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [mintStartDateString, setMintStartDateString] = useState('');
  const [batchTimers, setBatchTimers] = useState<{
    [key: string]: {
      batchId: number;
      startTime: number | null;
      endTime: number | null;
      durationMinutes: number | null;
    }
  }>({});
  const [selectedBatchForTimer, setSelectedBatchForTimer] = useState(1);
  const [timerDurationMinutes, setTimerDurationMinutes] = useState(60); // Default to 1 hour

  const authenticate = async () => {
    if (!password) {
      setError('Wachtwoord is verplicht');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin?password=${encodeURIComponent(password)}&action=dashboard`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Authenticatie mislukt');
      }
      
      const data = await response.json();
      setDashboardData(data);
      setAuthenticated(true);
      
      // Save password to localStorage for API calls
      localStorage.setItem('admin_password', password);
    } catch (err: any) {
      setError(err.message || 'Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/admin?password=' + encodeURIComponent(password) + '&action=dashboard');
      if (!response.ok) {
        throw new Error('Er is een fout opgetreden bij het ophalen van de dashboard data.');
      }
      
      const data = await response.json();
      console.log("Dashboard data loaded:", JSON.stringify(data).substring(0, 500) + "...");
      
      // Ensure orders is in the right format - convert to array if it's an object with keys
      if (data.orders && typeof data.orders === 'object' && !Array.isArray(data.orders)) {
        // Check if it's an empty object
        if (Object.keys(data.orders).length === 0) {
          data.orders = [];
        } else {
          console.log("Converting orders object to array");
          data.orders = Object.values(data.orders);
        }
      }
      
      // Ensure mintedWallets is an array
      if (!data.mintedWallets || !Array.isArray(data.mintedWallets)) {
        console.log("Initializing empty minted wallets array");
        data.mintedWallets = [];
      }
      
      console.log(`Found ${data.mintedWallets.length} minted wallets and ${Array.isArray(data.orders) ? data.orders.length : 'unknown'} orders`);
      
      setDashboardData(data);
    } catch (err: any) {
      console.error("Error loading dashboard data:", err);
      setError(err.message || 'Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  const addAddressToWhitelist = async () => {
    if (!authenticated || !newAddress) return;
    
    // Validate the address format
    if (!newAddress.startsWith('bc1p')) {
      setError('Please enter a valid Taproot address (bc1p...) for Ordinals');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          action: 'addToWhitelist',
          address: newAddress,
          batchId: selectedBatch
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Kon adres niet toevoegen');
      }
      
      // Refresh data
      await refreshData();
      setNewAddress('');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  const removeAddressFromWhitelist = async (address: string) => {
    if (!authenticated) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          action: 'removeFromWhitelist',
          address
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Kon adres niet verwijderen');
      }
      
      // Refresh data
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(''), 2000);
  };

  // Load inscriptions data
  useEffect(() => {
    if (authenticated) {
      fetchInscriptions();
    }
  }, [authenticated]);

  // Fetch inscriptions
  const fetchInscriptions = async () => {
    try {
      const response = await fetch(`/api/admin?password=${encodeURIComponent(password)}&action=inscriptions`);
      
      if (!response.ok) {
        console.error('Failed to fetch inscriptions');
        return;
      }
      
      const data = await response.json();
      setInscriptions(data.inscriptions || []);
    } catch (err) {
      console.error('Error fetching inscriptions:', err);
    }
  };

  // Add new inscription
  const addInscription = async () => {
    if (!authenticated || !newInscriptionId || !newInscriptionImage) {
      setError('Inscription ID and image URL are required');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          action: 'addInscription',
          inscriptionId: newInscriptionId,
          imageUrl: newInscriptionImage,
          batchId: selectedBatch
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add inscription');
      }
      
      // Refresh data
      await fetchInscriptions();
      setNewInscriptionId('');
      setNewInscriptionImage('');
      setError('');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Assign inscription to order
  const assignInscriptionToOrder = async (inscriptionId: string, orderId: string) => {
    if (!authenticated) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          action: 'assignInscription',
          inscriptionId,
          orderId
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to assign inscription');
      }
      
      // Refresh data
      await refreshData();
      await fetchInscriptions();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Add function to preview batch import
  const handlePreviewImport = () => {
    if (!importText.trim()) {
      setImportStatus('Please enter inscription data');
      return;
    }

    // Parse the input
    const lines = importText.trim().split('\n').filter(line => line.trim() !== '');
    const parsedInscriptions = [];
    
    for (const line of lines) {
      let inscription = parseInscriptionLine(line);
      if (inscription) {
        parsedInscriptions.push(inscription);
      }
    }

    if (parsedInscriptions.length === 0) {
      setImportStatus('No valid inscriptions found in the input');
      setPreviewInscriptions([]);
    } else {
      setImportStatus(`Found ${parsedInscriptions.length} inscriptions for preview`);
      // Limit preview to first 10 items to avoid performance issues
      setPreviewInscriptions(parsedInscriptions.slice(0, 10));
    }
  };

  // Add function to handle batch import
  const handleBatchImport = async () => {
    if (!importText.trim()) {
      setImportStatus('Please enter inscription data');
      return;
    }

    setIsImporting(true);
    setImportStatus('Processing...');

    try {
      // Parse the input - expecting format with inscription IDs, image URLs, and batch numbers
      const lines = importText.trim().split('\n').filter(line => line.trim() !== '');
      console.log(`Batch import: Processing ${lines.length} lines`);
      
      const newInscriptions = [];
      
      for (const line of lines) {
        const inscription = parseInscriptionLine(line);
        console.log(`Processed line: "${line.substring(0, 50)}..." => `, inscription ? 'Found valid inscription' : 'No valid inscription found');
        
        if (inscription) {
          newInscriptions.push(inscription);
        }
      }

      if (newInscriptions.length === 0) {
        setImportStatus('No valid inscriptions found in the input');
        setIsImporting(false);
        return;
      }

      console.log(`Sending ${newInscriptions.length} inscriptions to API`);
      
      // Add the new inscriptions
      const response = await fetch('/api/inscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'batchImport', inscriptions: newInscriptions }),
      });

      const data = await response.json();
      console.log('API response:', data);
      
      if (response.ok) {
        setImportStatus(`Successfully imported ${newInscriptions.length} inscriptions`);
        fetchInscriptions(); // Refresh inscriptions list
        setImportText(''); // Clear the input
        setPreviewInscriptions([]); // Clear preview
      } else {
        setImportStatus(`Error: ${data.error || 'Failed to import inscriptions'}`);
      }
    } catch (error: any) {
      console.error('Batch import error:', error);
      setImportStatus(`Error: ${error.message || 'Failed to process inscription data'}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Helper function to parse a single line into an inscription object
  const parseInscriptionLine = (line: string): Inscription | null => {
    // Skip empty lines
    if (!line.trim()) return null;
    
    // Support different input formats
    if (line.includes(',')) {
      // CSV format: id,imageUrl,batch
      const [id, imageUrl, batch] = line.split(',').map(item => item.trim());
      if (id && imageUrl) {
        return { 
          id, 
          imageUrl, 
          batch: batch ? parseInt(batch) : 1,
          inscriptionId: id // Ensure both fields are populated
        };
      }
    } else if (line.includes('|')) {
      // Pipe format: id|imageUrl|batch
      const [id, imageUrl, batch] = line.split('|').map(item => item.trim());
      if (id && imageUrl) {
        return { 
          id, 
          imageUrl, 
          batch: batch ? parseInt(batch) : 1,
          inscriptionId: id
        };
      }
    } else if (line.includes('magiceden.io/ordinals/item-details/')) {
      // Handle the main Magic Eden URL format: https://magiceden.io/ordinals/item-details/[inscriptionId]
      try {
        const urlParts = line.split('/');
        // Extract the ID - remove i0 suffix if present
        let inscriptionId = urlParts[urlParts.length - 1];
        if (inscriptionId.endsWith('i0')) {
          inscriptionId = inscriptionId.substring(0, inscriptionId.length - 2);
        }
        
        if (inscriptionId) {
          // Use our proxy API to avoid CORS issues
          const imageUrl = `/api/magic-eden-proxy?inscriptionId=${inscriptionId}`;
          
          return {
            id: inscriptionId,
            imageUrl,
            batch: 1, // Default to batch 1
            inscriptionId
          };
        }
      } catch (error) {
        console.error("Error parsing Magic Eden URL:", error, line);
      }
    } else if (line.includes('ord-mirror.magiceden.dev/preview/')) {
      // Magic Eden preview URL format: https://ord-mirror.magiceden.dev/preview/[inscriptionId]
      try {
        const urlParts = line.split('/');
        // Extract the ID - remove i0 suffix if present
        let inscriptionId = urlParts[urlParts.length - 1];
        if (inscriptionId.endsWith('i0')) {
          inscriptionId = inscriptionId.substring(0, inscriptionId.length - 2);
        }
        
        if (inscriptionId) {
          // Use our proxy API to avoid CORS issues
          const imageUrl = `/api/magic-eden-proxy?inscriptionId=${inscriptionId}`;
          return {
            id: inscriptionId,
            imageUrl,
            batch: 1, // Default to batch 1
            inscriptionId
          };
        }
      } catch (error) {
        console.error("Error parsing Magic Eden preview URL:", error, line);
      }
    } else if (line.includes('inscription') || line.includes('http')) {
      // Try to extract data from Magic Eden format or other formats
      try {
        // Extract inscription ID
        let id = '';
        const idPatterns = [
          /[0-9a-f]{64}i?[0-9]*/i, // Full inscription ID format (64 hex chars, optional i0 suffix)
          /inscription[a-zA-Z0-9]+/i,  // Basic pattern
          /\/inscription\/([a-zA-Z0-9]+)/i, // URL path format
          /\/preview\/([a-zA-Z0-9]+)/i, // Preview URL format
          /\/content\/([a-zA-Z0-9]+)/i, // Content URL format
          /\/item-details\/([a-zA-Z0-9]+)/i, // Item details URL format
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i // UUID format
        ];
        
        for (const pattern of idPatterns) {
          const match = line.match(pattern);
          if (match) {
            // If match contains a path, get the capture group, otherwise use the full match
            id = match[0].includes('/') && match[1] ? match[1] : match[0];
            
            // Remove i0 suffix if present
            if (id.endsWith('i0')) {
              id = id.substring(0, id.length - 2);
            }
            break;
          }
        }
        
        // Extract image URL
        const urlPattern = /(https?:\/\/[^\s"']+\.(png|jpg|jpeg|gif|webp))/i;
        const urlMatch = line.match(urlPattern);
        let imageUrl = urlMatch ? urlMatch[0] : '';
        
        // If we didn't find an image URL but there's a URL in the line, it might be the API endpoint
        if (!imageUrl) {
          const anyUrlMatch = line.match(/(https?:\/\/[^\s"']+)/i);
          if (anyUrlMatch) {
            imageUrl = anyUrlMatch[0];
          }
        }
        
        // If we have an ID but no image URL, try to use our proxy API
        if (id && !imageUrl) {
          imageUrl = `/api/magic-eden-proxy?inscriptionId=${id}`;
        }
        
        // Try to find batch number if specified
        const batchMatch = line.match(/batch[:\s]*(\d+)/i);
        const batch = batchMatch ? parseInt(batchMatch[1]) : 1; // Default to batch 1
        
        if (id && imageUrl) {
          return { 
            id, 
            imageUrl, 
            batch,
            inscriptionId: id
          };
        }
      } catch (error) {
        console.error("Error parsing URL:", error, line);
      }
    }
    
    return null;
  };

  // Function to handle direct file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsImporting(true);
    setImportStatus(`Processing ${files.length} files...`);
    
    try {
      const newInscriptions: Inscription[] = [];
      
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Skip non-image files
        if (!file.type.startsWith('image/')) continue;
        
        // Create a unique ID from filename
        const fileName = file.name.split('.')[0]; // Remove extension
        const id = `local_${fileName.replace(/[^a-z0-9]/gi, '')}_${Date.now()}`;
        
        // Create object URL for preview
        const imageUrl = URL.createObjectURL(file);
        
        newInscriptions.push({
          id,
          imageUrl,
          batch: selectedBatch,
          inscriptionId: id,
          isLocalFile: true,
          file
        });
      }
      
      // Preview the inscriptions
      setPreviewInscriptions(newInscriptions.slice(0, 10));
      setImportStatus(`Found ${newInscriptions.length} images. Review and click Import to add them.`);
      
      // Store the full list for actual import
      setLocalImportFiles(newInscriptions);
    } catch (error: any) {
      setImportStatus(`Error: ${error.message || 'Failed to process files'}`);
    } finally {
      setIsImporting(false);
    }
  };
  
  // Handle import of local files
  const importLocalFiles = async () => {
    if (localImportFiles.length === 0) {
      setImportStatus('No files to import');
      return;
    }
    
    setIsImporting(true);
    setImportStatus('Uploading files...');
    
    try {
      // Create FormData with files
      const formData = new FormData();
      formData.append('batchId', selectedBatch.toString());
      
      localImportFiles.forEach((insc, index) => {
        if (insc.file) {
          formData.append(`file_${index}`, insc.file);
          formData.append(`metadata_${index}`, JSON.stringify({
            id: insc.id,
            batch: insc.batch
          }));
        }
      });
      
      // Send to server - create this API endpoint later
      const response = await fetch('/api/upload-inscriptions', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setImportStatus(`Successfully imported ${localImportFiles.length} images`);
        fetchInscriptions(); // Refresh the list
        setPreviewInscriptions([]);
        setLocalImportFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setImportStatus(`Error: ${data.error || 'Failed to upload files'}`);
      }
    } catch (error: any) {
      setImportStatus(`Error: ${error.message || 'Failed to upload files'}`);
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    // Load current mint start time and batch cooldown when admin panel opens
    const loadSettings = async () => {
      try {
        // Load mint start time
        const mintResponse = await fetch('/api/mint-start');
        const mintData = await mintResponse.json();
        if (mintData.startTime) {
          setMintStartTime(mintData.startTime);
        }

        // Load batch cooldown settings
        const cooldownResponse = await fetch('/api/mint/set-cooldown');
        const cooldownData = await cooldownResponse.json();
        if (cooldownData) {
          setCooldownSettings(cooldownData);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSetMintTimer = async () => {
    try {
      const response = await fetch('/api/mint-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startTime: mintStartTime,
          password: password
        })
      });

      if (!response.ok) {
        throw new Error('Failed to set mint timer');
      }

      alert('Mint start tijd succesvol ingesteld!');
    } catch (error) {
      console.error('Error setting mint timer:', error);
      alert('Kon mint start tijd niet instellen');
    }
  };

  const loadDashboardData = async () => {
    try {
      const response = await fetch(`/api/admin?password=${encodeURIComponent(password)}`);
      if (!response.ok) {
        throw new Error('Failed to load dashboard data');
      }
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  // Laad de huidige mint-start timer bij initialisatie
  useEffect(() => {
    const loadMintStartTime = async () => {
      try {
        if (authenticated) {
          const mintResponse = await fetch('/api/mint-start');
          const mintData = await mintResponse.json();
          
          console.log("Loaded mint start time:", mintData);
          
          if (mintData.startTime) {
            setMintStartTime(mintData.startTime);
            
            const date = new Date(mintData.startTime);
            // Format in yyyy-MM-ddThh:mm format for datetime-local input
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            setMintStartDateString(`${year}-${month}-${day}T${hours}:${minutes}`);
          }
        }
      } catch (error) {
        console.error('Error loading mint start time:', error);
      }
    };
    
    loadMintStartTime();
  }, [authenticated]);

  // Load batch timers
  useEffect(() => {
    const loadBatchTimers = async () => {
      try {
        if (authenticated) {
          const response = await fetch('/api/admin/set-batch-timer');
          const data = await response.json();
          
          console.log("Loaded batch timers:", data);
          setBatchTimers(data);
        }
      } catch (error) {
        console.error('Error loading batch timers:', error);
      }
    };
    
    loadBatchTimers();
  }, [authenticated]);

  return (
    <div className="min-h-screen bg-black text-white pixel-grid-bg" style={{ fontFamily: "'Press Start 2P', monospace" }}>
      <div className="responsive-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <header style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h1 style={{ color: '#ffd700', fontSize: '24px', textShadow: '2px 2px 0 #000' }}>
            BITCOIN TIGER ADMIN
          </h1>
          <p style={{ color: '#aaa', fontSize: '12px' }}>Beheer wallets en monitor minting voortgang</p>
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
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>Wachtwoord:</label>
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
                onClick={authenticate}
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
                {loading ? 'BEZIG...' : 'INLOGGEN'}
              </button>
              
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <Link href="/" style={{ color: '#aaa', fontSize: '10px', textDecoration: 'none' }}>
                  TERUG NAAR HOME
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {/* Tabs */}
              <div style={{ 
                display: 'flex', 
                marginBottom: '20px', 
                borderBottom: '1px solid #333'
              }}>
                <div 
                  onClick={() => setActiveTab('batches')}
                  style={{ 
                    padding: '8px 16px', 
                    cursor: 'pointer', 
                    color: activeTab === 'batches' ? '#ffd700' : '#aaa',
                    borderBottom: activeTab === 'batches' ? '2px solid #ffd700' : 'none',
                    fontSize: '12px'
                  }}
                >
                  BATCHES
                </div>
                <div 
                  onClick={() => setActiveTab('whitelist')}
                  style={{ 
                    padding: '8px 16px', 
                    cursor: 'pointer', 
                    color: activeTab === 'whitelist' ? '#ffd700' : '#aaa',
                    borderBottom: activeTab === 'whitelist' ? '2px solid #ffd700' : 'none',
                    fontSize: '12px'
                  }}
                >
                  WHITELIST
                </div>
                <div 
                  onClick={() => setActiveTab('orders')}
                  style={{ 
                    padding: '8px 16px', 
                    cursor: 'pointer', 
                    color: activeTab === 'orders' ? '#ffd700' : '#aaa',
                    borderBottom: activeTab === 'orders' ? '2px solid #ffd700' : 'none',
                    fontSize: '12px'
                  }}
                >
                  ORDERS
                </div>
                <div 
                  onClick={() => setActiveTab('inscriptions')}
                  style={{ 
                    padding: '8px 16px', 
                    cursor: 'pointer', 
                    color: activeTab === 'inscriptions' ? '#ffd700' : '#aaa',
                    borderBottom: activeTab === 'inscriptions' ? '2px solid #ffd700' : 'none',
                    fontSize: '12px'
                  }}
                >
                  INSCRIPTIONS
                </div>
                <div 
                  onClick={() => setActiveTab('minted-wallets')}
                  style={{ 
                    padding: '8px 16px', 
                    cursor: 'pointer', 
                    color: activeTab === 'minted-wallets' ? '#ffd700' : '#aaa',
                    borderBottom: activeTab === 'minted-wallets' ? '2px solid #ffd700' : 'none',
                    fontSize: '12px'
                  }}
                >
                  MINTED WALLETS
                </div>
              </div>
              
              {/* Timer Settings Section */}
              {activeTab === 'batches' && (
                <div style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  border: '2px solid #ffd700',
                  padding: '20px',
                  marginBottom: '30px',
                  borderRadius: '4px'
                }}>
                  <h2 style={{ color: '#ffd700', fontSize: '18px', marginBottom: '15px' }}>MINT TIMER INSTELLEN</h2>
                  <div style={{ marginBottom: '15px', fontSize: '14px', color: '#999' }}>
                    Stel in wanneer mensen kunnen beginnen met minten:
                  </div>
                  <input
                    type="datetime-local"
                    onChange={(e) => {
                      const selectedDate = new Date(e.target.value);
                      setMintStartTime(selectedDate.getTime());
                    }}
                    style={{
                      backgroundColor: 'black',
                      border: '1px solid #ffd700',
                      color: 'white',
                      padding: '10px',
                      fontSize: '14px',
                      width: '100%',
                      marginBottom: '15px'
                    }}
                  />
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/mint-start', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            startTime: mintStartTime,
                            password: password
                          })
                        });

                        if (!response.ok) {
                          throw new Error('Failed to set mint timer');
                        }

                        alert('Mint start tijd succesvol ingesteld!');
                      } catch (error) {
                        console.error('Error setting mint timer:', error);
                        alert('Kon mint start tijd niet instellen');
                      }
                    }}
                    style={{
                      backgroundColor: '#ffd700',
                      color: 'black',
                      padding: '10px 20px',
                      border: 'none',
                      fontSize: '14px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    TIMER INSTELLEN
                  </button>
                </div>
              )}
              
              {/* Batch Cooldown Settings */}
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.5)',
                border: '2px solid #ffd700',
                padding: '20px',
                marginBottom: '30px',
                borderRadius: '4px'
              }}>
                <h2 style={{ color: '#ffd700', fontSize: '18px', marginBottom: '15px' }}>BATCH COOLDOWN INSTELLEN</h2>
                
                {/* Current Settings Display */}
                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#111', borderRadius: '4px' }}>
                  <h3 style={{ color: '#aaa', fontSize: '14px', marginBottom: '10px' }}>Huidige Cooldown Instellingen:</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                    <div style={{ padding: '8px', backgroundColor: '#222', borderRadius: '4px', position: 'relative' }}>
                      <div style={{ color: '#ffd700', fontSize: '12px' }}>Standaard:</div>
                      <div style={{ color: 'white', fontSize: '12px', marginBottom: '5px' }}>
                        {cooldownSettings.default?.value} {cooldownSettings.default?.unit}
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/mint/set-cooldown?batchId=default&password=${encodeURIComponent(password)}`, {
                              method: 'DELETE'
                            });

                            if (!response.ok) {
                              throw new Error('Failed to delete batch cooldown');
                            }

                            // Refresh cooldown settings
                            const cooldownResponse = await fetch('/api/mint/set-cooldown');
                            const cooldownData = await cooldownResponse.json();
                            if (cooldownData) {
                              setCooldownSettings(cooldownData);
                            }

                            alert('Cooldown instelling succesvol gereset!');
                          } catch (error) {
                            console.error('Error deleting batch cooldown:', error);
                            alert('Kon cooldown instelling niet resetten');
                          }
                        }}
                        style={{
                          backgroundColor: '#ff4444',
                          color: 'white',
                          padding: '4px 8px',
                          border: 'none',
                          borderRadius: '2px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          position: 'absolute',
                          right: '8px',
                          bottom: '8px'
                        }}
                      >
                        RESET
                      </button>
                    </div>
                    {Object.entries(cooldownSettings)
                      .filter(([key]) => key !== 'default')
                      .map(([batchId, settings]) => (
                        <div key={batchId} style={{ padding: '8px', backgroundColor: '#222', borderRadius: '4px', position: 'relative' }}>
                          <div style={{ color: '#ffd700', fontSize: '12px' }}>Batch #{batchId}:</div>
                          <div style={{ color: 'white', fontSize: '12px', marginBottom: '5px' }}>
                            {settings.value} {settings.unit}
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/mint/set-cooldown?batchId=${batchId}&password=${encodeURIComponent(password)}`, {
                                  method: 'DELETE'
                                });

                                if (!response.ok) {
                                  throw new Error('Failed to delete batch cooldown');
                                }

                                // Refresh cooldown settings
                                const cooldownResponse = await fetch('/api/mint/set-cooldown');
                                const cooldownData = await cooldownResponse.json();
                                if (cooldownData) {
                                  setCooldownSettings(cooldownData);
                                }

                                alert('Cooldown instelling succesvol verwijderd!');
                              } catch (error) {
                                console.error('Error deleting batch cooldown:', error);
                                alert('Kon cooldown instelling niet verwijderen');
                              }
                            }}
                            style={{
                              backgroundColor: '#ff4444',
                              color: 'white',
                              padding: '4px 8px',
                              border: 'none',
                              borderRadius: '2px',
                              fontSize: '10px',
                              cursor: 'pointer',
                              position: 'absolute',
                              right: '8px',
                              bottom: '8px'
                            }}
                          >
                            VERWIJDER
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                <div style={{ marginBottom: '15px', fontSize: '14px', color: '#999' }}>
                  Stel in hoelang er tussen batches moet zitten als een batch sold out is:
                </div>
                
                {/* Batch selector */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#aaa' }}>
                    Selecteer batch:
                  </label>
                  <select
                    value={selectedBatchForCooldown}
                    onChange={(e) => {
                      setSelectedBatchForCooldown(e.target.value);
                    }}
                    style={{
                      backgroundColor: 'black',
                      border: '1px solid #ffd700',
                      color: 'white',
                      padding: '10px',
                      fontSize: '14px',
                      width: '100%',
                      marginBottom: '15px'
                    }}
                  >
                    <option value="default">Standaard (voor alle batches)</option>
                    {Array.from({ length: 16 }, (_, i) => i + 1).map((batchId) => (
                      <option key={batchId} value={batchId.toString()}>
                        Batch #{batchId}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <input
                    type="number"
                    min="1"
                    value={cooldownSettings[selectedBatchForCooldown]?.value || cooldownSettings.default.value}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      const currentUnit = cooldownSettings[selectedBatchForCooldown]?.unit || cooldownSettings.default.unit;
                      const max = currentUnit === 'minutes' ? 60 : 
                                currentUnit === 'hours' ? 24 : 7;
                      const newValue = Math.min(max, Math.max(1, val));
                      
                      setCooldownSettings(prev => ({
                        ...prev,
                        [selectedBatchForCooldown]: {
                          ...prev[selectedBatchForCooldown] || prev.default,
                          value: newValue
                        }
                      }));
                    }}
                    style={{
                      backgroundColor: 'black',
                      border: '1px solid #ffd700',
                      color: 'white',
                      padding: '10px',
                      fontSize: '14px',
                      width: '70%'
                    }}
                  />
                  <select
                    value={cooldownSettings[selectedBatchForCooldown]?.unit || cooldownSettings.default.unit}
                    onChange={(e) => {
                      const newUnit = e.target.value as 'minutes' | 'hours' | 'days';
                      setCooldownSettings(prev => ({
                        ...prev,
                        [selectedBatchForCooldown]: {
                          ...prev[selectedBatchForCooldown] || prev.default,
                          unit: newUnit
                        }
                      }));
                    }}
                    style={{
                      backgroundColor: 'black',
                      border: '1px solid #ffd700',
                      color: 'white',
                      padding: '10px',
                      fontSize: '14px',
                      width: '30%'
                    }}
                  >
                    <option value="minutes">Minuten</option>
                    <option value="hours">Uren</option>
                    <option value="days">Dagen</option>
                  </select>
                </div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '15px' }}>
                  Maximum waarden: 60 minuten, 24 uren, of 7 dagen
                </div>
                <button
                  onClick={async () => {
                    try {
                      const settings = cooldownSettings[selectedBatchForCooldown] || cooldownSettings.default;
                      const response = await fetch('/api/mint/set-cooldown', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          value: settings.value,
                          unit: settings.unit,
                          batchId: selectedBatchForCooldown === 'default' ? null : selectedBatchForCooldown,
                          password: password
                        })
                      });

                      if (!response.ok) {
                        throw new Error('Failed to set batch cooldown');
                      }

                      alert('Batch cooldown tijd succesvol ingesteld!');
                    } catch (error) {
                      console.error('Error setting batch cooldown:', error);
                      alert('Kon batch cooldown tijd niet instellen');
                    }
                  }}
                  style={{
                    backgroundColor: '#ffd700',
                    color: 'black',
                    padding: '10px 20px',
                    border: 'none',
                    fontSize: '14px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  COOLDOWN INSTELLEN
                </button>
              </div>
              
              {/* BATCH WALLET LIMIT SETTINGS */}
              <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#111', borderRadius: '4px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#ffd700' }}>WALLET LIMIET INSTELLEN</h3>
                
                {/* Current Settings Display */}
                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#222', borderRadius: '4px' }}>
                  <h4 style={{ color: '#aaa', fontSize: '12px', marginBottom: '10px' }}>Huidige Wallet Limieten:</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                    {dashboardData?.batches?.map((batch: any) => (
                      <div key={batch.id} style={{ padding: '8px', backgroundColor: '#333', borderRadius: '4px' }}>
                        <div style={{ color: '#ffd700', fontSize: '11px' }}>Batch #{batch.id}:</div>
                        <div style={{ color: 'white', fontSize: '11px' }}>
                          {batch.maxWallets} wallets
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
                    Batch:
                  </label>
                  <select 
                    value={selectedBatchForLimit}
                    onChange={(e) => setSelectedBatchForLimit(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: '#222',
                      border: '1px solid #333',
                      color: 'white',
                      borderRadius: '4px'
                    }}
                  >
                    {Array.from({length: 16}, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>Batch #{num}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
                    Maximum aantal wallets:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={newWalletLimit}
                    onChange={(e) => setNewWalletLimit(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: '#222',
                      border: '1px solid #333',
                      color: 'white',
                      borderRadius: '4px'
                    }}
                  />
                </div>

                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/admin/set-wallet-limit', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          batchId: selectedBatchForLimit,
                          maxWallets: newWalletLimit,
                          adminPassword: password
                        })
                      });

                      if (!response.ok) {
                        throw new Error('Failed to update wallet limit');
                      }

                      // Refresh dashboard data
                      loadDashboardData();
                      
                      // Show success message
                      setStatusMessage('Wallet limiet succesvol bijgewerkt');
                      setTimeout(() => setStatusMessage(''), 3000);
                    } catch (error) {
                      console.error('Error updating wallet limit:', error);
                      setStatusMessage('Error: Kon wallet limiet niet bijwerken');
                      setTimeout(() => setStatusMessage(''), 3000);
                    }
                  }}
                  style={{
                    backgroundColor: '#ffd700',
                    color: 'black',
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  WALLET LIMIET OPSLAAN
                </button>
              </div>
              
              {/* Batch Timer Settings Section */}
              {activeTab === 'batches' && (
                <div style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  border: '2px solid #ffd700',
                  padding: '20px',
                  marginBottom: '30px',
                  borderRadius: '4px'
                }}>
                  <h2 style={{ color: '#ffd700', fontSize: '18px', marginBottom: '15px' }}>BATCH TIMER INSTELLEN</h2>
                  
                  {/* Current Batch Timers Display */}
                  <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#111', borderRadius: '4px' }}>
                    <h3 style={{ color: '#aaa', fontSize: '14px', marginBottom: '10px' }}>Actieve Batch Timers:</h3>
                    {Object.keys(batchTimers).length === 0 ? (
                      <div style={{ color: '#999', fontSize: '12px', padding: '10px' }}>
                        Geen actieve timers ingesteld
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                        {Object.entries(batchTimers).map(([batchId, timer]) => {
                          const now = Date.now();
                          const timeLeft = timer.endTime ? timer.endTime - now : 0;
                          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                          const isExpired = timeLeft <= 0;
                          
                          return (
                            <div key={batchId} style={{ 
                              padding: '12px', 
                              backgroundColor: isExpired ? '#331111' : '#222', 
                              borderRadius: '4px', 
                              position: 'relative',
                              border: `1px solid ${isExpired ? '#ff4444' : '#444'}`
                            }}>
                              <div style={{ color: '#ffd700', fontSize: '14px', marginBottom: '5px' }}>
                                Batch #{timer.batchId}
                              </div>
                              
                              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>
                                Duur: {timer.durationMinutes} minuten
                              </div>
                              
                              <div style={{ 
                                fontSize: '14px', 
                                color: isExpired ? '#ff6666' : '#66ff66',
                                fontWeight: 'bold',
                                marginBottom: '10px'
                              }}>
                                {isExpired ? (
                                  'VERLOPEN'
                                ) : (
                                  `${hours}u ${minutes}m resterend`
                                )}
                              </div>
                              
                              {!isExpired && (
                                <div style={{ fontSize: '10px', color: '#999' }}>
                                  Batch sluit automatisch op:
                                  <br />
                                  {new Date(timer.endTime || 0).toLocaleString()}
                                </div>
                              )}
                              
                              <button
                                onClick={async () => {
                                  if (confirm(`Weet je zeker dat je de timer voor Batch #${timer.batchId} wilt verwijderen?`)) {
                                    try {
                                      const response = await fetch(`/api/admin/set-batch-timer?batchId=${timer.batchId}&password=${encodeURIComponent(password)}`, {
                                        method: 'DELETE'
                                      });

                                      if (!response.ok) {
                                        throw new Error('Failed to remove batch timer');
                                      }

                                      // Refresh timers
                                      const timersResponse = await fetch('/api/admin/set-batch-timer');
                                      const timersData = await timersResponse.json();
                                      setBatchTimers(timersData);

                                      alert(`Timer voor Batch #${timer.batchId} succesvol verwijderd!`);
                                    } catch (error) {
                                      console.error('Error removing batch timer:', error);
                                      alert('Kon batch timer niet verwijderen');
                                    }
                                  }
                                }}
                                style={{
                                  backgroundColor: '#ff4444',
                                  color: 'white',
                                  padding: '4px 8px',
                                  border: 'none',
                                  borderRadius: '2px',
                                  fontSize: '10px',
                                  cursor: 'pointer',
                                  position: 'absolute',
                                  right: '8px',
                                  bottom: '8px'
                                }}
                              >
                                VERWIJDER
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ marginBottom: '15px', fontSize: '14px', color: '#999' }}>
                    Stel een timer in voor een batch. De batch wordt automatisch gesloten wanneer de timer afloopt:
                  </div>
                  
                  {/* Batch selector */}
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#aaa' }}>
                      Selecteer batch:
                    </label>
                    <select
                      value={selectedBatchForTimer}
                      onChange={(e) => setSelectedBatchForTimer(parseInt(e.target.value))}
                      style={{
                        backgroundColor: 'black',
                        border: '1px solid #ffd700',
                        color: 'white',
                        padding: '10px',
                        fontSize: '14px',
                        width: '100%',
                        marginBottom: '15px'
                      }}
                    >
                      {Array.from({ length: 16 }, (_, i) => i + 1).map((batchId) => (
                        <option key={batchId} value={batchId}>
                          Batch #{batchId} {batchTimers[batchId] ? ' (timer actief)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Duration input */}
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#aaa' }}>
                      Timer duur (in minuten):
                    </label>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <button
                        onClick={() => setTimerDurationMinutes(30)}
                        style={{
                          backgroundColor: timerDurationMinutes === 30 ? '#ffd700' : '#333',
                          color: timerDurationMinutes === 30 ? 'black' : 'white',
                          border: 'none',
                          padding: '10px',
                          fontSize: '12px',
                          flex: '1',
                          cursor: 'pointer'
                        }}
                      >
                        30 min
                      </button>
                      <button
                        onClick={() => setTimerDurationMinutes(60)}
                        style={{
                          backgroundColor: timerDurationMinutes === 60 ? '#ffd700' : '#333',
                          color: timerDurationMinutes === 60 ? 'black' : 'white',
                          border: 'none',
                          padding: '10px',
                          fontSize: '12px',
                          flex: '1',
                          cursor: 'pointer'
                        }}
                      >
                        1 uur
                      </button>
                      <button
                        onClick={() => setTimerDurationMinutes(120)}
                        style={{
                          backgroundColor: timerDurationMinutes === 120 ? '#ffd700' : '#333',
                          color: timerDurationMinutes === 120 ? 'black' : 'white',
                          border: 'none',
                          padding: '10px',
                          fontSize: '12px',
                          flex: '1',
                          cursor: 'pointer'
                        }}
                      >
                        2 uur
                      </button>
                      <button
                        onClick={() => setTimerDurationMinutes(360)}
                        style={{
                          backgroundColor: timerDurationMinutes === 360 ? '#ffd700' : '#333',
                          color: timerDurationMinutes === 360 ? 'black' : 'white',
                          border: 'none',
                          padding: '10px',
                          fontSize: '12px',
                          flex: '1',
                          cursor: 'pointer'
                        }}
                      >
                        6 uur
                      </button>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <input
                        type="number"
                        min="1"
                        max="10080" // 1 week in minutes
                        value={timerDurationMinutes}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 60;
                          setTimerDurationMinutes(Math.min(10080, Math.max(1, val)));
                        }}
                        style={{
                          backgroundColor: 'black',
                          border: '1px solid #ffd700',
                          color: 'white',
                          padding: '10px',
                          fontSize: '14px',
                          width: '100%'
                        }}
                      />
                      <div style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>
                        Aangepaste duur (1-10080 minuten, max 1 week)
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={async () => {
                      try {
                        // Check if a timer already exists for this batch
                        if (batchTimers[selectedBatchForTimer]) {
                          if (!confirm(`Er is al een timer actief voor Batch #${selectedBatchForTimer}. Wil je deze overschrijven?`)) {
                            return;
                          }
                        }
                        
                        const response = await fetch('/api/admin/set-batch-timer', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            batchId: selectedBatchForTimer,
                            durationMinutes: timerDurationMinutes,
                            password: password
                          })
                        });

                        if (!response.ok) {
                          throw new Error('Failed to set batch timer');
                        }

                        // Refresh timers
                        const timersResponse = await fetch('/api/admin/set-batch-timer');
                        const timersData = await timersResponse.json();
                        setBatchTimers(timersData);

                        alert(`Timer voor Batch #${selectedBatchForTimer} succesvol ingesteld voor ${timerDurationMinutes} minuten!`);
                      } catch (error) {
                        console.error('Error setting batch timer:', error);
                        alert('Kon batch timer niet instellen');
                      }
                    }}
                    style={{
                      backgroundColor: '#ffd700',
                      color: 'black',
                      padding: '12px',
                      border: 'none',
                      fontSize: '14px',
                      cursor: 'pointer',
                      width: '100%',
                      fontWeight: 'bold'
                    }}
                  >
                    TIMER INSTELLEN
                  </button>
                  
                  <div style={{ fontSize: '12px', color: '#aaa', marginTop: '15px', padding: '10px', backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: '4px' }}>
                    <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Hoe werkt de Batch Timer?</div>
                    <ul style={{ paddingLeft: '20px', fontSize: '10px' }}>
                      <li style={{ marginBottom: '5px' }}>De timer start zodra je deze instelt</li>
                      <li style={{ marginBottom: '5px' }}>Wanneer de timer afloopt, wordt de batch automatisch gemarkeerd als "sold out"</li>
                      <li style={{ marginBottom: '5px' }}>De timer wordt op de homepage getoond bij de batch info</li>
                      <li style={{ marginBottom: '5px' }}>De timer biedt gebruikers visuele feedback over hoe lang ze nog hebben om te minten</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Tab content */}
              <div>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      backgroundColor: '#ffd700', 
                      margin: '0 auto',
                      animation: 'pulse 1s infinite' 
                    }}></div>
                    <div style={{ marginTop: '16px', fontSize: '12px' }}>LOADING...</div>
                  </div>
                ) : (
                  <>
                    {/* Batches Tab */}
                    {activeTab === 'batches' && (
                      <div>
                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ color: '#ffd700', fontSize: '14px' }}>BATCH OVERZICHT</div>
                          <div style={{ color: '#ffd700', fontSize: '12px' }}>
                            Huidige Batch: #{dashboardData?.currentBatch || 1}
                          </div>
                        </div>
                        
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                          gap: '12px'
                        }}>
                          {/* Generate all 16 batches */}
                          {Array.from({ length: 16 }, (_, i) => i + 1).map(batchId => {
                            // Find batch info from dashboard data or use default values
                            const batchInfo = dashboardData?.batches?.find((b: any) => b.id === batchId);
                            
                            if (!batchInfo) return null;
                            
                            const batch = {
                              id: batchId,
                              price: batchInfo?.price || 0.025,
                              mintedWallets: batchInfo?.mintedWallets || 0,
                              maxWallets: batchInfo?.maxWallets || 33,
                              ordinals: batchInfo?.ordinals || 66,
                              isSoldOut: batchInfo?.isSoldOut || false
                            };
                            
                            return (
                              <div key={batch.id} style={{ 
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                border: '2px solid',
                                borderColor: batch.id === dashboardData?.currentBatch ? '#ffd700' : '#444',
                                padding: '12px'
                              }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>Batch #{batch.id}</div>
                                
                                <div style={{ fontSize: '10px', marginBottom: '4px' }}>
                                  <span style={{ color: '#aaa' }}>Prijs:</span> ${typeof batch.price === 'number' ? batch.price.toFixed(2) : batch.price}
                                </div>
                                
                                <div style={{ fontSize: '10px', marginBottom: '8px' }}>
                                  <span style={{ color: '#aaa' }}>Minted Wallets:</span> {batch.mintedWallets}/{batch.maxWallets}
                                </div>
                                
                                <div style={{ fontSize: '10px', marginBottom: '8px' }}>
                                  <span style={{ color: '#aaa' }}>Status:</span> {batch.isSoldOut ? (
                                    <span style={{ color: '#ef4444' }}>Sold Out</span>
                                  ) : (
                                    <span style={{ color: '#4ade80' }}>Available</span>
                                  )}
                                </div>
                                
                                {/* Progress bar */}
                                <div style={{ 
                                  width: '100%', 
                                  height: '5px', 
                                  backgroundColor: '#222',
                                  position: 'relative'
                                }}>
                                  <div style={{ 
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    height: '100%',
                                    width: `${(batch.mintedWallets / batch.maxWallets) * 100}%`,
                                    backgroundColor: batch.isSoldOut ? '#ef4444' : '#4ade80'
                                  }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Whitelist Tab */}
                    {activeTab === 'whitelist' && (
                      <div>
                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ color: '#ffd700', fontSize: '14px' }}>WHITELIST BEHEER</div>
                          <div style={{ color: '#aaa', fontSize: '12px' }}>
                            {dashboardData?.whitelistedAddresses?.length || 0} Adressen
                          </div>
                        </div>
                        
                        {/* Add address form */}
                        <div style={{ 
                          marginBottom: '24px',
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          border: '2px solid #ffd700',
                          padding: '16px'
                        }}>
                          <div style={{ marginBottom: '12px', fontSize: '12px' }}>Nieuw adres toevoegen:</div>
                          
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                value={newAddress}
                                onChange={(e) => setNewAddress(e.target.value)}
                                placeholder="bc1p..."
                                style={{ 
                                  width: '100%',
                                  padding: '8px',
                                  backgroundColor: '#111',
                                  border: '1px solid #333',
                                  color: 'white',
                                  fontSize: '12px'
                                }}
                              />
                            </div>
                            
                            <div>
                              <select
                                value={selectedBatch}
                                onChange={(e) => setSelectedBatch(parseInt(e.target.value))}
                                style={{ 
                                  padding: '8px',
                                  backgroundColor: '#111',
                                  border: '1px solid #333',
                                  color: 'white',
                                  fontSize: '12px'
                                }}
                              >
                                {Array.from({ length: 16 }, (_, i) => i + 1).map(batchId => (
                                  <option key={batchId} value={batchId}>
                                    Batch #{batchId}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <button
                              onClick={addAddressToWhitelist}
                              disabled={loading || !newAddress}
                              style={{ 
                                backgroundColor: '#ffd700', 
                                color: 'black', 
                                padding: '8px 16px',
                                fontSize: '10px',
                                border: '2px solid',
                                borderTopColor: '#ffd700',
                                borderLeftColor: '#ffd700',
                                borderRightColor: '#aa8e00',
                                borderBottomColor: '#aa8e00',
                                cursor: 'pointer',
                                opacity: (loading || !newAddress) ? 0.5 : 1
                              }}
                            >
                              TOEVOEGEN AAN BATCH #{selectedBatch}
                            </button>
                          </div>
                          
                          <div style={{ 
                            marginTop: '12px',
                            display: 'flex',
                            justifyContent: 'center'
                          }}>
                            <Link 
                              href="/admin/bulk-whitelist"
                              style={{
                                color: '#ffd700',
                                fontSize: '10px',
                                textDecoration: 'underline',
                                padding: '4px 8px'
                              }}
                            >
                              BULK WHITELIST TOOL →
                            </Link>
                          </div>
                          
                          {error && (
                            <div style={{ 
                              marginTop: '12px',
                              color: '#ef4444',
                              fontSize: '10px'
                            }}>
                              {error}
                            </div>
                          )}
                        </div>
                        
                        {/* Addresses list */}
                        <div style={{ 
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          border: '1px solid #333',
                          padding: '16px'
                        }}>
                          {!dashboardData?.whitelistedAddresses || dashboardData.whitelistedAddresses.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '12px' }}>
                              Geen adressen gevonden in de whitelist
                            </div>
                          ) : (
                            <div>
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'minmax(180px, 1fr) auto auto auto', 
                                gap: '8px',
                                borderBottom: '2px solid #ffd700',
                                padding: '8px 0',
                                fontSize: '10px',
                                color: '#ffd700',
                                fontWeight: 'bold'
                              }}>
                                <div>Adres</div>
                                <div>Batch</div>
                                <div>Kopieer</div>
                                <div>Actie</div>
                              </div>
                              
                              {dashboardData.whitelistedAddresses.map((entry: any, index: number) => (
                                <div key={index} style={{ 
                                  display: 'grid',
                                  gridTemplateColumns: 'minmax(180px, 1fr) auto auto auto',
                                  gap: '8px',
                                  alignItems: 'center',
                                  padding: '8px 0',
                                  borderBottom: '1px solid #333',
                                  fontSize: '10px'
                                }}>
                                  <div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                    {entry.address}
                                  </div>
                                  <div style={{
                                    backgroundColor: 'rgba(255, 215, 0, 0.15)',
                                    border: '1px solid #ffd700',
                                    padding: '2px 6px',
                                    textAlign: 'center',
                                    color: '#ffd700',
                                    fontSize: '9px'
                                  }}>
                                    #{entry.batchId}
                                  </div>
                                  <button
                                    onClick={() => copyToClipboard(entry.address)}
                                    style={{ 
                                      backgroundColor: '#333', 
                                      color: 'white', 
                                      padding: '4px 8px',
                                      fontSize: '8px',
                                      border: 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {copiedAddress === entry.address ? (
                                      <><FaCheckCircle size={10} color="#4ade80" /> COPIED</>
                                    ) : (
                                      <><FaCopy size={10} /> COPY</>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => removeAddressFromWhitelist(entry.address)}
                                    style={{ 
                                      backgroundColor: '#ef4444', 
                                      color: 'white', 
                                      padding: '4px 8px',
                                      fontSize: '8px',
                                      border: 'none',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    VERWIJDEREN
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Orders Tab */}
                    {activeTab === 'orders' && (
                      <div>
                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ color: '#ffd700', fontSize: '14px' }}>ORDERS</div>
                          <div style={{ color: '#aaa', fontSize: '12px' }}>
                            {Array.isArray(dashboardData?.orders) ? dashboardData.orders.length : 
                             dashboardData?.orders && typeof dashboardData.orders === 'object' ? Object.keys(dashboardData.orders).length : 0} Orders
                          </div>
                        </div>
                        
                        <div style={{ 
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          border: '1px solid #333',
                          padding: '16px',
                          overflowX: 'auto'
                        }}>
                          {/* Debug info */}
                          <div style={{ marginBottom: '10px', fontSize: '11px', color: '#888' }}>
                            Orders data type: {dashboardData?.orders ? typeof dashboardData.orders : 'undefined'}
                            {dashboardData?.orders && typeof dashboardData.orders === 'object' && 
                              ` | Keys: ${Object.keys(dashboardData.orders).length}`}
                          </div>
                          
                          {((Array.isArray(dashboardData?.orders) && dashboardData.orders.length > 0) || 
                           (dashboardData?.orders && typeof dashboardData.orders === 'object' && Object.keys(dashboardData.orders).length > 0)) ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ borderBottom: '2px solid #ffd700' }}>
                                  <th style={{ padding: '8px', textAlign: 'left', fontSize: '10px' }}>Order ID</th>
                                  <th style={{ padding: '8px', textAlign: 'left', fontSize: '10px' }}>BTC Address</th>
                                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '10px' }}>Batch</th>
                                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '10px' }}>Quantity</th>
                                  <th style={{ padding: '8px', textAlign: 'right', fontSize: '10px' }}>Total BTC</th>
                                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '10px' }}>Status</th>
                                  <th style={{ padding: '8px', textAlign: 'left', fontSize: '10px' }}>Created At</th>
                                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '10px' }}>Inscription</th>
                                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '10px' }}>Delete</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(Array.isArray(dashboardData.orders) ? dashboardData.orders : 
                                  dashboardData.orders ? Object.values(dashboardData.orders) : []).map((order: any) => (
                                  <tr key={order.id} style={{ borderBottom: '1px solid #333' }}>
                                    <td style={{ padding: '8px', fontSize: '9px', fontFamily: 'monospace' }}>
                                      <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ marginRight: '4px' }}>{order.id.substring(0, 8)}...</span>
                                        <button 
                                          onClick={() => copyToClipboard(order.id)}
                                          style={{ 
                                            background: 'none',
                                            border: 'none',
                                            padding: '2px',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          {copiedAddress === order.id ? (
                                            <FaCheckCircle size={10} color="#4ade80" />
                                          ) : (
                                            <FaCopy size={10} color="#aaa" />
                                          )}
                                        </button>
                                      </div>
                                    </td>
                                    <td style={{ padding: '8px', fontSize: '9px', fontFamily: 'monospace' }}>
                                      <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ marginRight: '4px' }}>{order.btcAddress.substring(0, 8)}...</span>
                                        <button 
                                          onClick={() => copyToClipboard(order.btcAddress)}
                                          style={{ 
                                            background: 'none',
                                            border: 'none',
                                            padding: '2px',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          {copiedAddress === order.btcAddress ? (
                                            <FaCheckCircle size={10} color="#4ade80" />
                                          ) : (
                                            <FaCopy size={10} color="#aaa" />
                                          )}
                                        </button>
                                      </div>
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '9px' }}>{order.batchId}</td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '9px' }}>{order.quantity} Tigers</td>
                                    <td style={{ padding: '8px', textAlign: 'right', fontSize: '9px' }}>
                                      {typeof order.totalPrice === 'number' ? order.totalPrice.toFixed(6) : order.totalPrice}
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '9px' }}>
                                      <span style={{ 
                                        padding: '2px 6px', 
                                        borderRadius: '2px',
                                        backgroundColor: 
                                          order.status === 'completed' ? '#4ade80' : 
                                          order.status === 'paid' ? '#3b82f6' : 
                                          order.status === 'failed' ? '#ef4444' : 
                                          '#f59e0b',
                                        color: 'white',
                                        fontSize: '8px'
                                      }}>
                                        {order.status.toUpperCase()}
                                      </span>
                                    </td>
                                    <td style={{ padding: '8px', fontSize: '9px' }}>
                                      {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '9px' }}>
                                      {order.inscriptionId ? (
                                        <div style={{ 
                                          padding: '2px 6px', 
                                          backgroundColor: 'rgba(74, 222, 128, 0.2)',
                                          color: '#4ade80',
                                          fontSize: '8px',
                                          borderRadius: '2px'
                                        }}>
                                          {order.inscriptionId.substring(0, 6)}...
                                        </div>
                                      ) : (
                                        <select
                                          disabled={order.status !== 'paid' && order.status !== 'completed'}
                                          onChange={(e) => {
                                            if (e.target.value) assignInscriptionToOrder(e.target.value, order.id);
                                          }}
                                          style={{
                                            backgroundColor: 'black',
                                            color: 'white',
                                            border: '1px solid #333',
                                            fontSize: '8px',
                                            padding: '2px 4px',
                                            borderRadius: '2px',
                                            cursor: order.status === 'paid' || order.status === 'completed' ? 'pointer' : 'not-allowed',
                                            opacity: order.status === 'paid' || order.status === 'completed' ? 1 : 0.5
                                          }}
                                        >
                                          <option value="">Assign...</option>
                                          {inscriptions
                                            .filter(insc => !insc.assignedToOrder && insc.batchId === order.batchId)
                                            .map(insc => {
                                              // Safe access for inscriptionId, using id as fallback
                                              const safeInscriptionId = insc.inscriptionId || insc.id;
                                              return (
                                                <option key={safeInscriptionId} value={safeInscriptionId}>
                                                  {safeInscriptionId.substring(0, 6)}...
                                                </option>
                                              );
                                            })}
                                        </select>
                                      )}
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '9px' }}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation(); // Voorkom bubbeling van de klik
                                          
                                          if (confirm(`Weet je zeker dat je order ${order.id} wilt verwijderen?`)) {
                                            fetch('/api/admin/delete-order', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                orderId: order.id,
                                                password
                                              })
                                            })
                                            .then(response => response.json())
                                            .then(data => {
                                              if (data.success) {
                                                alert(`Order ${order.id} is verwijderd`);
                                                refreshData();
                                              } else {
                                                alert(`Fout bij het verwijderen: ${data.error}`);
                                              }
                                            })
                                            .catch(err => {
                                              console.error('Error deleting order:', err);
                                              alert(`Fout bij het verwijderen: ${err.message}`);
                                            });
                                          }
                                        }}
                                        style={{
                                          backgroundColor: '#ef4444',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '2px',
                                          padding: '3px 6px',
                                          fontSize: '8px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div>
                              <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '12px' }}>
                                Geen orders gevonden
                              </div>
                              
                              {/* Debug button to create a test order */}
                              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <button 
                                  onClick={async () => {
                                    try {
                                      const response = await fetch('/api/admin', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                          password,
                                          action: 'addOrder',
                                          btcAddress: 'bc1p56aezm44a9yvnrkx0eduqrgf7rdjl6l7fnv0at3wm9stt36hfvaqjwqda8',
                                          quantity: 1,
                                          batchId: 1
                                        }),
                                      });
                                      
                                      if (!response.ok) {
                                        throw new Error('Failed to create test order');
                                      }
                                      
                                      await refreshData();
                                    } catch (error) {
                                      console.error('Error creating test order:', error);
                                    }
                                  }}
                                  style={{
                                    backgroundColor: '#333',
                                    color: '#ffd700',
                                    border: '1px solid #ffd700',
                                    padding: '8px 16px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Create Test Order
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Add Inscriptions Tab */}
                    {activeTab === 'inscriptions' && authenticated && (
                      <div>
                        {/* Inscriptions tab header with link to clear page */}
                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ color: '#ffd700', fontSize: '14px' }}>INSCRIPTIONS BEHEER</div>
                          <div style={{ color: '#aaa', fontSize: '12px' }}>
                            {inscriptions?.length || 0} Inscriptions
                          </div>
                        </div>
                        
                        {/* Batch Import Section */}
                        <div className="mb-8 border-2 border-yellow-600 p-4 rounded-lg bg-gray-900">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-yellow-400">Import Inscriptions</h3>
                            <div className="flex space-x-2">
                              <Link 
                                href="/admin/magic-eden-import" 
                                className="px-3 py-1 bg-green-700 text-white text-xs rounded hover:bg-green-600"
                              >
                                Magic Eden Import Tool
                              </Link>
                              <Link 
                                href="/admin/clear-dashboard" 
                                className="px-3 py-1 bg-red-700 text-white text-xs rounded hover:bg-red-600"
                              >
                                Clear Dashboard
                              </Link>
                            </div>
                          </div>
                          
                          {/* Tabs for different import methods */}
                          <div className="mb-4 flex border-b border-gray-700">
                            <button
                              className={`mr-4 px-3 py-1 ${!showLocalImport ? 'text-yellow-400 font-bold border-b-2 border-yellow-400' : 'text-gray-400'}`}
                              onClick={() => setShowLocalImport(false)}
                            >
                              Import from URLs
                            </button>
                            <button
                              className={`mr-4 px-3 py-1 ${showLocalImport ? 'text-yellow-400 font-bold border-b-2 border-yellow-400' : 'text-gray-400'}`}
                              onClick={() => setShowLocalImport(true)}
                            >
                              Import from Files
                            </button>
                          </div>
                          
                          {!showLocalImport ? (
                            // Magic Eden URL import section
                            <>
                              <div className="mb-4">
                                <p className="text-sm text-gray-400 mb-2">
                                  Paste your inscription data below. Support formats:
                                  <br />- Magic Eden format (URLs with inscription IDs)
                                  <br />- CSV format: id,imageUrl,batch
                                  <br />- Pipe format: id|imageUrl|batch
                                </p>
                                <textarea
                                  className="w-full h-32 p-2 bg-gray-800 text-white border border-yellow-600 rounded"
                                  placeholder="Paste inscription data here..."
                                  value={importText}
                                  onChange={(e) => setImportText(e.target.value)}
                                />
                              </div>
                              <div className="flex items-center mb-4">
                                <button
                                  className="px-4 py-2 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500 disabled:opacity-50 mr-2"
                                  onClick={handlePreviewImport}
                                  disabled={!importText.trim()}
                                >
                                  Preview
                                </button>
                                <button
                                  className="px-4 py-2 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500 disabled:opacity-50"
                                  onClick={handleBatchImport}
                                  disabled={isImporting || !importText.trim()}
                                >
                                  {isImporting ? 'Importing...' : 'Import Inscriptions'}
                                </button>
                              </div>
                            </>
                          ) : (
                            // Local file import section
                            <>
                              <div className="mb-4">
                                <p className="text-sm text-gray-400 mb-2">
                                  Select image files from your computer to import as inscriptions:
                                </p>
                                <div className="border-2 border-dashed border-yellow-600 p-4 text-center bg-gray-800 rounded">
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    ref={fileInputRef}
                                  />
                                  <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500 mb-3"
                                    disabled={isImporting}
                                  >
                                    Select Images
                                  </button>
                                  <p className="mt-2 text-xs text-gray-400 mb-3">Supports PNG, JPG, JPEG, GIF, WEBP</p>
                                  
                                  <div className="border-t border-gray-700 pt-3 mt-2">
                                    <p className="text-xs text-yellow-400 mb-2">Have 42x42 Tigers Collection Images?</p>
                                    <button
                                      onClick={() => router.push('/admin/local-import')}
                                      className="px-4 py-2 bg-yellow-700 text-white text-sm rounded hover:bg-yellow-600"
                                    >
                                      Import Tigers Collection (999 Images)
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center mb-4">
                                <button
                                  className="px-4 py-2 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500 disabled:opacity-50"
                                  onClick={importLocalFiles}
                                  disabled={isImporting || localImportFiles.length === 0}
                                >
                                  {isImporting ? 'Importing...' : `Import ${localImportFiles.length} Selected Images`}
                                </button>
                              </div>
                            </>
                          )}
                          
                          {importStatus && (
                            <span className={`ml-4 text-sm ${importStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
                              {importStatus}
                            </span>
                          )}
                          
                          {/* Preview section */}
                          {previewInscriptions.length > 0 && (
                            <div className="mt-4 border border-yellow-600 rounded p-2">
                              <h4 className="text-md font-bold text-yellow-400 mb-2">Preview (First 10)</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {previewInscriptions.map((insc, index) => {
                                  const displayId = typeof insc.id === 'string' ? insc.id : `Inscription ${index}`;
                                  const cleanId = insc.id.endsWith('i0') ? insc.id.substring(0, insc.id.length - 2) : insc.id;
                                  
                                  // Create multiple possible image sources
                                  const imageSources = [
                                    insc.imageUrl, // Our proxy API
                                    `/api/magic-eden-proxy?inscriptionId=${cleanId}`, // Explicit proxy API call
                                    `https://ord-mirror.magiceden.dev/content/${cleanId}`, // Direct Magic Eden content
                                    `https://ordin.s3.amazonaws.com/content/${cleanId}`, // Another content source
                                    `https://turbo.ordinalswallet.com/inscription/content/${cleanId}` // Turbo Ordinals
                                  ];
                                  
                                  return (
                                    <div key={index} className="border border-gray-700 rounded p-2 flex items-center">
                                      <div className="w-16 h-16 mr-2 relative overflow-hidden bg-gray-800 flex items-center justify-center">
                                        <img
                                          src={imageSources[0]} // Try first source
                                          alt={displayId}
                                          className="object-cover absolute inset-0 w-full h-full"
                                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                            const target = e.target as HTMLImageElement;
                                            console.error(`Failed to load image: ${imageSources[0]}`);
                                            
                                            // Find the next available source
                                            let currentSrc = target.src;
                                            let currentIndex = imageSources.findIndex(src => 
                                              currentSrc.includes(src) || src.includes(currentSrc)
                                            );
                                            
                                            if (currentIndex < imageSources.length - 1) {
                                              // Try next source
                                              const nextSource = imageSources[currentIndex + 1];
                                              console.log(`Trying next source: ${nextSource}`);
                                              target.src = nextSource;
                                            } else {
                                              // No more sources, show fallback
                                              target.onerror = null;
                                              target.style.display = 'none';
                                              const parent = target.parentElement;
                                              if (parent) {
                                                const fallback = document.createElement('div');
                                                fallback.className = 'text-xs text-center text-gray-400';
                                                fallback.textContent = 'No Image';
                                                parent.appendChild(fallback);
                                              }
                                            }
                                          }}
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-xs text-gray-400 truncate">{displayId}</div>
                                        <div className="text-xs text-yellow-400">Batch: {insc.batch}</div>
                                        <div className="flex flex-col mt-1 space-y-1">
                                          <a 
                                            href={`https://ordinals.com/inscription/${cleanId}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-xs text-blue-400 hover:underline"
                                          >
                                            View on Ordinals.com
                                          </a>
                                          <a 
                                            href={`https://ord-mirror.magiceden.dev/preview/${cleanId}i0`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-xs text-blue-400 hover:underline"
                                          >
                                            View on Magic Eden
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="text-xs text-gray-400 mt-2">
                                {previewInscriptions.length < 10 ? 
                                  `Showing all ${previewInscriptions.length} inscriptions` : 
                                  `Showing 10 of ${previewInscriptions.length} inscriptions`}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Add inscription form */}
                        <div style={{ 
                          marginBottom: '24px',
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          border: '2px solid #ffd700',
                          padding: '16px'
                        }}>
                          <div style={{ marginBottom: '12px', fontSize: '12px' }}>Nieuwe inscription toevoegen:</div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', color: '#aaa' }}>Inscription ID:</label>
                              <input 
                                type="text"
                                value={newInscriptionId}
                                onChange={(e) => setNewInscriptionId(e.target.value)}
                                placeholder="abcdef1234..."
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  backgroundColor: 'black',
                                  border: '1px solid #555',
                                  color: 'white',
                                  fontSize: '12px'
                                }}
                              />
                            </div>
                            
                            <div>
                              <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', color: '#aaa' }}>Afbeelding URL:</label>
                              <input 
                                type="text"
                                value={newInscriptionImage}
                                onChange={(e) => setNewInscriptionImage(e.target.value)}
                                placeholder="https://example.com/image.png of /images/tiger1.png"
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  backgroundColor: 'black',
                                  border: '1px solid #555',
                                  color: 'white',
                                  fontSize: '12px'
                                }}
                              />
                            </div>
                            
                            <div>
                              <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', color: '#aaa' }}>Batch:</label>
                              <select 
                                value={selectedBatch}
                                onChange={(e) => setSelectedBatch(Number(e.target.value))}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  backgroundColor: 'black',
                                  border: '1px solid #555',
                                  color: 'white',
                                  fontSize: '12px'
                                }}
                              >
                    {dashboardData?.batches?.map((batch: any) => (
                                  <option key={batch.id} value={batch.id}>
                                    Batch #{batch.id} - ${typeof batch.price === 'number' ? batch.price.toFixed(2) : batch.price}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <button
                              onClick={addInscription}
                              disabled={loading || !newInscriptionId || !newInscriptionImage}
                              style={{ 
                                backgroundColor: '#ffd700', 
                                color: 'black', 
                                padding: '8px 16px',
                                fontSize: '10px',
                                border: '2px solid',
                                borderTopColor: '#ffd700',
                                borderLeftColor: '#ffd700',
                                borderRightColor: '#aa8e00',
                                borderBottomColor: '#aa8e00',
                                cursor: 'pointer',
                                opacity: (loading || !newInscriptionId || !newInscriptionImage) ? 0.5 : 1
                              }}
                            >
                              INSCRIPTION TOEVOEGEN
                            </button>
                          </div>
                          
                          {error && (
                            <div style={{ 
                              marginTop: '12px',
                              color: '#ef4444',
                              fontSize: '10px'
                            }}>
                              {error}
                            </div>
                          )}
                        </div>
                        
                        {/* Inscriptions list */}
                        <div style={{ 
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          border: '1px solid #333',
                          padding: '16px'
                        }}>
                          {!inscriptions || inscriptions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '12px' }}>
                              Geen inscriptions gevonden
                            </div>
                          ) : (
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                              gap: '20px'
                            }}>
                              {inscriptions.map((inscription, index) => (
                                <div key={index} style={{ 
                                  backgroundColor: 'rgba(0,0,0,0.7)',
                                  border: '2px solid #444',
                                  overflow: 'hidden',
                                  borderRadius: '4px',
                                  transition: 'border-color 0.2s ease',
                                  cursor: 'pointer',
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column'
                                }}
                                onClick={() => window.open(`/admin/test-inscription?id=${inscription.id}`, '_blank')}
                                >
                                  <div style={{ 
                                    height: '250px', 
                                    backgroundColor: '#111',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    padding: '10px'
                                  }}>
                                    <img 
                                      src={inscription.imageUrl || `/api/local-inscription?id=${inscription.id}`} 
                                      alt={inscription.inscriptionId ?? inscription.id}
                                      style={{ 
                                        width: '210px', 
                                        height: '210px',
                                        objectFit: 'contain',
                                        imageRendering: 'pixelated',
                                        background: 'linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.05)), linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.05))',
                                        backgroundSize: '20px 20px',
                                        backgroundPosition: '0 0, 10px 10px'
                                      }}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (target.src.includes('/api/magic-eden-proxy')) {
                                          // If proxy fails, try direct URL
                                          target.src = `https://ord-mirror.magiceden.dev/content/${inscription.id}`;
                                        } else if (target.src.includes('/api/local-inscription')) {
                                          // Try direct path to public folder
                                          target.src = `/images/tigers/${inscription.id}.png`;
                                        } else {
                                          // All attempts failed, show error
                                          target.style.display = 'none';
                                          // Add a fallback text
                                          const parent = target.parentElement;
                                          if (parent) {
                                            const fallback = document.createElement('div');
                                            fallback.style.textAlign = 'center';
                                            fallback.style.padding = '10px';
                                            fallback.style.color = '#666';
                                            fallback.style.fontSize = '12px';
                                            fallback.textContent = 'Image not available';
                                            parent.appendChild(fallback);
                                          }
                                        }
                                      }}
                                    />
                                    
                                    <div style={{ 
                                      position: 'absolute',
                                      top: '6px',
                                      right: '6px',
                                      backgroundColor: 'rgba(0,0,0,0.7)',
                                      color: '#ffd700',
                                      fontSize: '12px',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontWeight: 'bold'
                                    }}>
                                      Batch #{inscription.batchId || inscription.batch}
                                    </div>
                                  </div>
                                  
                                  <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '6px' }}>ID:</div>
                                    <div style={{ 
                                      fontSize: '9px', 
                                      fontFamily: 'monospace', 
                                      wordBreak: 'break-all',
                                      backgroundColor: '#111',
                                      padding: '6px',
                                      marginBottom: '10px',
                                      borderRadius: '2px',
                                      flex: 1
                                    }}>
                                      {inscription.inscriptionId ?? inscription.id}
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ 
                                        fontSize: '9px',
                                        padding: '4px 8px',
                                        backgroundColor: inscription.assignedToOrder ? 'rgba(239, 68, 68, 0.2)' : 'rgba(74, 222, 128, 0.2)',
                                        borderRadius: '2px',
                                        color: inscription.assignedToOrder ? '#ef4444' : '#4ade80',
                                        textAlign: 'center'
                                      }}>
                                        {inscription.assignedToOrder ? 'ASSIGNED' : 'AVAILABLE'}
                                      </div>
                                      
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(inscription.id);
                                        }}
                                        style={{ 
                                          backgroundColor: '#333', 
                                          color: 'white', 
                                          padding: '4px 8px',
                                          fontSize: '8px',
                                          border: 'none',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '4px',
                                          cursor: 'pointer',
                                          borderRadius: '2px'
                                        }}
                                      >
                                        {copiedAddress === inscription.id ? (
                                          <><FaCheckCircle size={10} color="#4ade80" /> COPIED</>
                                        ) : (
                                          <><FaCopy size={10} /> COPY ID</>
                                        )}
                                      </button>
                                    </div>
                                    
                                    {inscription.assignedToOrder && (
                                      <div style={{ 
                                        fontSize: '8px', 
                                        marginTop: '6px', 
                                        color: '#aaa',
                                        textAlign: 'center'
                                      }}>
                                        Order: {inscription.assignedToOrder.substring(0, 8)}...
                                      </div>
                                    )}
                        </div>
                      </div>
                    ))}
                  </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
                </div>

              {/* Minted Wallets Tab */}
              {activeTab === 'minted-wallets' && (
                <div style={{ 
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  border: '1px solid #333',
                  padding: '16px'
                }}>
                  {!dashboardData?.mintedWallets || dashboardData.mintedWallets.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '12px' }}>
                      Geen geminte wallets gevonden. Start met het toevoegen van orders via de "Add Order" button.
                    </div>
                  ) : (
                    <div>
                      <div style={{ marginBottom: '10px', fontSize: '10px' }}>
                        <span style={{ color: '#ffd700' }}>{dashboardData.mintedWallets.length}</span> geminte wallets gevonden
                      </div>
                      
                      <div style={{ 
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        border: '1px solid #444',
                        padding: '10px'
                      }}>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'minmax(120px, 2fr) minmax(80px, 1fr) minmax(80px, 1fr) minmax(100px, 1fr) auto',
                          gap: '5px',
                          padding: '8px 0',
                          borderBottom: '1px solid #333',
                          fontSize: '9px',
                          color: '#aaa',
                          fontWeight: 'bold'
                        }}>
                          <div>WALLET</div>
                          <div>BATCH</div>
                          <div>QUANTITY</div>
                          <div>TIMESTAMP</div>
                          <div></div>
                        </div>
                        
                        {dashboardData.mintedWallets.map((wallet: any, index: number) => (
                          <div key={index} style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'minmax(120px, 2fr) minmax(80px, 1fr) minmax(80px, 1fr) minmax(100px, 1fr) auto',
                            gap: '5px',
                            padding: '8px 0',
                            borderBottom: '1px solid #222',
                            fontSize: '10px',
                            alignItems: 'center'
                          }}>
                            <div style={{ 
                              fontFamily: 'monospace',
                              wordBreak: 'break-all',
                              fontSize: '9px'
                            }}>
                              {wallet.address}
                            </div>
                            <div>
                              Batch #{wallet.batchId}
                            </div>
                            <div>
                              {wallet.quantity} {wallet.quantity === 1 ? 'Tiger' : 'Tigers'}
                            </div>
                            <div>
                              {new Date(wallet.timestamp).toLocaleString('nl-NL', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div>
                              <button
                                onClick={() => copyToClipboard(wallet.address)}
                                style={{ 
                                  backgroundColor: '#333', 
                                  color: 'white', 
                                  padding: '4px 8px',
                                  fontSize: '8px',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px',
                                  cursor: 'pointer',
                                  borderRadius: '2px'
                                }}
                              >
                                {copiedAddress === wallet.address ? (
                                  <><FaCheckCircle size={10} color="#4ade80" /> COPIED</>
                                ) : (
                                  <><FaCopy size={10} /> COPY</>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Add Order button */}
                  <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        // Open a modal or form to add an order
                        const btcAddress = prompt('Enter BTC address (must start with bc1p...)');
                        if (!btcAddress) return;
                        
                        const batchId = prompt('Enter batch ID (1-16)', '1');
                        if (!batchId || isNaN(Number(batchId))) return;
                        
                        const quantity = prompt('Enter quantity (1-2)', '1');
                        if (!quantity || isNaN(Number(quantity))) return;
                        
                        // Add order logic
                        fetch('/api/admin', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            password,
                            action: 'addOrder',
                            btcAddress,
                            batchId: Number(batchId),
                            quantity: Number(quantity)
                          })
                        })
                        .then(response => response.json())
                        .then(data => {
                          if (data.success) {
                            alert('Order added successfully: ' + data.message);
                            refreshData();
                          } else {
                            alert('Error: ' + data.error);
                          }
                        })
                        .catch(err => {
                          alert('Error: ' + err.message);
                        });
                      }}
                      style={{ 
                        backgroundColor: '#ffd700', 
                        color: 'black', 
                        padding: '8px 16px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      ADD TEST ORDER
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer controls */}
        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <Link href="/" style={{ color: '#aaa', fontSize: '10px', textDecoration: 'none' }}>
            TERUG NAAR HOME
          </Link>
          <span style={{ margin: '0 10px', color: '#555' }}>|</span>
          <Link href="/admin/test-images" style={{ color: '#3498db', fontSize: '10px', textDecoration: 'none' }}>
            TEST AFBEELDINGEN
          </Link>
          <span style={{ margin: '0 10px', color: '#555' }}>|</span>
          <Link href="/admin/reset-all" style={{ color: '#ef4444', fontSize: '10px', textDecoration: 'none' }}>
            RESET ALLES
          </Link>
          <span style={{ margin: '0 10px', color: '#555' }}>|</span>
          <button
            onClick={() => setAuthenticated(false)}
            style={{ 
              backgroundColor: 'transparent',
              border: 'none',
              color: '#aaa',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            UITLOGGEN
          </button>
        </div>
      </div>
    </div>
  );
} 