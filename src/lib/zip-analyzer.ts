import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

export interface ZipAnalysis {
  hasScreenshot: boolean;
  screenshotPath?: string;
  hasCryptoWallet: boolean;
  walletTypes: string[];
  textFiles: { name: string; content: string }[];
  totalFiles: number;
  fileList: string[];
}

const WALLET_INDICATORS = {
  Exodus: ['exodus.wallet', 'exodus.conf', 'exodus-', 'Exodus', 'exodus21', 'app-'],
  Atomic: ['atomic.wallet', 'atomicwallet', 'Atomic Wallet', 'atomic-', 'atomicDEX'],
  MetaMask: ['metamask', 'MetaMask', '0x', 'nkbihfbeogaeaoehlefnkodbefgpgknn', 'Local Extension Settings'],
  Bitcoin: ['wallet.dat', 'bitcoin.conf', 'Bitcoin-Qt', 'bitcoin', 'Bitcoin Core', 'bitcoind'],
  Ethereum: ['keystore', 'ethereum', 'geth', 'parity', 'Ethereum'],
  Electrum: ['electrum.dat', 'electrum', 'Electrum', 'electrum_data'],
  Coinbase: ['coinbase', 'Coinbase', 'com.coinbase'],
  Binance: ['binance', 'Binance', 'BNB', 'app_binance'],
  Trust: ['trust wallet', 'TrustWallet', 'trust-', 'com.wallet.crypto'],
  Ledger: ['ledger', 'Ledger Live', 'ledger-live'],
  Brave: ['brave', 'Brave-Browser', 'BraveSoftware'],
  Chrome: ['Chrome', 'Google\\Chrome', 'google-chrome'],
  Edge: ['Edge', 'Microsoft\\Edge'],
  Opera: ['Opera', 'Opera Software'],
  Wallets: ['wallets', 'Wallets', 'wallet_', 'seed.txt', 'recovery', 'mnemonic'],
};

export async function analyzeZipFile(zipPath: string): Promise<ZipAnalysis> {
  try {
    const data = fs.readFileSync(zipPath);
    const zip = await JSZip.loadAsync(data);
    
    const analysis: ZipAnalysis = {
      hasScreenshot: false,
      hasCryptoWallet: false,
      walletTypes: [],
      textFiles: [],
      totalFiles: 0,
      fileList: []
    };

    const walletTypesSet = new Set<string>();
    
    // Iterate through all files in the ZIP
    for (const [filename, file] of Object.entries(zip.files)) {
      if (file.dir) continue;
      
      analysis.totalFiles++;
      analysis.fileList.push(filename);
      
      // Check for screenshot - enhanced detection
      const lowercaseFilename = filename.toLowerCase();
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
      const screenshotPatterns = ['screen', 'screenshot', 'capture', 'snap', 'image', 'pic', 'photo', 'desktop'];
      
      const isImage = imageExtensions.some(ext => lowercaseFilename.endsWith(ext));
      const isScreenshot = screenshotPatterns.some(pattern => lowercaseFilename.includes(pattern));
      
      // Prioritize files with "screen" in the name, but accept any image if no screenshot found yet
      if (isImage && (isScreenshot || !analysis.hasScreenshot)) {
        if (isScreenshot || !analysis.screenshotPath) {
          analysis.hasScreenshot = true;
          analysis.screenshotPath = filename;
        }
      }
      
      // Check for crypto wallets
      for (const [walletType, indicators] of Object.entries(WALLET_INDICATORS)) {
        for (const indicator of indicators) {
          if (lowercaseFilename.includes(indicator.toLowerCase()) || 
              filename.includes(indicator)) {
            walletTypesSet.add(walletType);
            analysis.hasCryptoWallet = true;
          }
        }
      }
      
      // Extract text file contents
      if (filename.endsWith('.txt') || filename.endsWith('.log') || 
          filename.endsWith('.conf') || filename.endsWith('.json')) {
        try {
          const content = await file.async('string');
          analysis.textFiles.push({
            name: filename,
            content: content.substring(0, 10000) // Limit to 10KB per file
          });
          
          // Also check text content for wallet indicators
          for (const [walletType, indicators] of Object.entries(WALLET_INDICATORS)) {
            for (const indicator of indicators) {
              if (content.toLowerCase().includes(indicator.toLowerCase())) {
                walletTypesSet.add(walletType);
                analysis.hasCryptoWallet = true;
              }
            }
          }
        } catch (error) {
          console.error(`Failed to read text file ${filename}:`, error);
        }
      }
    }
    
    analysis.walletTypes = Array.from(walletTypesSet);
    return analysis;
    
  } catch (error) {
    console.error('Failed to analyze ZIP file:', error);
    return {
      hasScreenshot: false,
      hasCryptoWallet: false,
      walletTypes: [],
      textFiles: [],
      totalFiles: 0,
      fileList: []
    };
  }
}

export async function extractScreenshot(zipPath: string, screenshotPath: string): Promise<Buffer | null> {
  try {
    const data = fs.readFileSync(zipPath);
    const zip = await JSZip.loadAsync(data);
    const file = zip.file(screenshotPath);
    
    if (file) {
      return await file.async('nodebuffer');
    }
    
    return null;
  } catch (error) {
    console.error('Failed to extract screenshot:', error);
    return null;
  }
}

export async function searchInZipFiles(
  zipPath: string, 
  searchTerm: string, 
  caseSensitive: boolean = false
): Promise<{ filename: string; matches: string[] }[]> {
  try {
    const data = fs.readFileSync(zipPath);
    const zip = await JSZip.loadAsync(data);
    const results: { filename: string; matches: string[] }[] = [];
    
    const searchPattern = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    
    for (const [filename, file] of Object.entries(zip.files)) {
      if (file.dir) continue;
      
      // Only search in text files
      if (filename.endsWith('.txt') || filename.endsWith('.log') || 
          filename.endsWith('.conf') || filename.endsWith('.json') ||
          filename.endsWith('.xml') || filename.endsWith('.ini')) {
        try {
          const content = await file.async('string');
          const searchContent = caseSensitive ? content : content.toLowerCase();
          
          if (searchContent.includes(searchPattern)) {
            // Find matching lines
            const lines = content.split('\n');
            const matches: string[] = [];
            
            lines.forEach((line, index) => {
              const searchLine = caseSensitive ? line : line.toLowerCase();
              if (searchLine.includes(searchPattern)) {
                matches.push(`Line ${index + 1}: ${line.trim().substring(0, 200)}`);
              }
            });
            
            if (matches.length > 0) {
              results.push({
                filename,
                matches: matches.slice(0, 10) // Limit to 10 matches per file
              });
            }
          }
        } catch (error) {
          console.error(`Failed to search in ${filename}:`, error);
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Failed to search in ZIP file:', error);
    return [];
  }
}

// Cache for analyzed files to improve performance
const analysisCache = new Map<string, { analysis: ZipAnalysis; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedAnalysis(zipPath: string): Promise<ZipAnalysis> {
  const cached = analysisCache.get(zipPath);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.analysis;
  }
  
  const analysis = await analyzeZipFile(zipPath);
  analysisCache.set(zipPath, { analysis, timestamp: Date.now() });
  
  // Clean old cache entries
  for (const [key, value] of analysisCache.entries()) {
    if (Date.now() - value.timestamp > CACHE_DURATION) {
      analysisCache.delete(key);
    }
  }
  
  return analysis;
}