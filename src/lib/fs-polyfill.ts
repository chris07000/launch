/**
 * File System Polyfill for Vercel
 * This provides safe alternatives to Node.js fs and path modules 
 * that work in both Node.js and Edge environments
 */

// Type definitions to match fs/promises
export interface FSInterface {
  readFile: (path: string, options?: any) => Promise<any>;
  writeFile: (path: string, data: any, options?: any) => Promise<void>;
  access: (path: string, mode?: number) => Promise<void>;
  mkdir: (path: string, options?: any) => Promise<void>;
}

// Type definitions to match path
export interface PathInterface {
  join: (...paths: string[]) => string;
  resolve: (...paths: string[]) => string;
}

// Detect Vercel environment
const isVercel = process.env.VERCEL === '1';
const isNode = typeof process !== 'undefined' && typeof process.versions?.node !== 'undefined';

// Create safe fs mock for Vercel
let fsModule: FSInterface = {
  // Provide no-op or safe default implementations
  readFile: async () => JSON.stringify([]),
  writeFile: async () => {},
  access: async () => {},
  mkdir: async () => {}
};

// Create safe path mock for Vercel
let pathModule: PathInterface = {
  join: (...paths) => paths.join('/'),
  resolve: (...paths) => paths.join('/')
};

// Only import real modules in Node.js environment
if (isNode && !isVercel) {
  try {
    // Use dynamic import for Node.js modules
    Promise.all([
      import('fs/promises'),
      import('path')
    ]).then(([fs, path]) => {
      fsModule = fs.default || fs;
      pathModule = path.default || path;
    }).catch(err => {
      console.error('Error importing Node.js modules:', err);
    });
  } catch (error) {
    console.warn('Could not import Node.js modules', error);
  }
}

// Export safe modules
export const fs = fsModule;
export const path = pathModule; 