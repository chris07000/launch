// Directe override voor de mint pagina
// Importeer deze in src/app/mint/page.tsx en voeg toe:
// import { patchVerifyEndpoint } from './direct-patch';
// patchVerifyEndpoint(); // Aan het begin van de component

export function patchVerifyEndpoint() {
  // Vervang de originele fetch functie
  const originalFetch = window.fetch;
  
  // Override fetch om verify calls naar onze directe endpoint te sturen
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    // Check of dit een call is naar /api/mint/verify
    if (typeof input === 'string' && input.includes('/api/mint/verify')) {
      // Extraheer parameters
      const url = new URL(input, window.location.origin);
      const batchId = url.searchParams.get('batchId');
      const address = url.searchParams.get('address');
      
      // Maak nieuwe URL die naar onze directe endpoint wijst
      const newUrl = `/api/mint/verify-direct?batchId=${batchId}&address=${address}`;
      console.log(`PATCHED: Redirecting verify call to ${newUrl}`);
      
      // Gebruik originele fetch met nieuwe URL
      return originalFetch(newUrl, init);
    }
    
    // Alle andere calls normaal afhandelen
    return originalFetch(input, init);
  };
  
  console.log('✅ MINT PAGE PATCHED: verify calls redirected to direct endpoint');
} 