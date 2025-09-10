'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, FileArchive, AlertTriangle, Download, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { exportToPDF, exportToCSV } from '@/lib/export-utils';

interface SearchResult {
  file: string;
  matches: string[];
  preview: string;
}

interface AnalysisResult {
  filename: string;
  results: SearchResult[];
  totalMatches: number;
}

export function Analyzer() {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);

  // Search settings
  const [searchWallets, setSearchWallets] = useState(true);
  const [searchPaypal, setSearchPaypal] = useState(true);
  const [customKeywords, setCustomKeywords] = useState('');

  // Wallet keywords
  const walletKeywords = ['wallet', 'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'seed', 'private key'];

  // PayPal keywords
  const paypalKeywords = ['paypal', 'paypal.com', 'payment', 'invoice', 'transaction'];

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      if (data.success) {
        setFiles(data.files);
        // Select all files by default
        setSelectedFiles(data.files.map((f: any) => f.filename));
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleFileToggle = (filename: string) => {
    setSelectedFiles(prev =>
      prev.includes(filename)
        ? prev.filter(f => f !== filename)
        : [...prev, filename]
    );
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file to analyze');
      return;
    }

    setAnalyzing(true);
    setResults([]);

    // Build keywords list
    const keywords: string[] = [];
    if (searchWallets) keywords.push(...walletKeywords);
    if (searchPaypal) keywords.push(...paypalKeywords);
    if (customKeywords) {
      keywords.push(...customKeywords.split(',').map(k => k.trim()).filter(k => k));
    }

    if (keywords.length === 0) {
      alert('Please enable at least one search category or add custom keywords');
      setAnalyzing(false);
      return;
    }

    const analysisResults: AnalysisResult[] = [];

    for (const filename of selectedFiles) {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, keywords }),
        });

        const data = await response.json();
        if (data.success && data.totalMatches > 0) {
          analysisResults.push(data);
        }
      } catch (error) {
        console.error(`Error analyzing ${filename}:`, error);
      }
    }

    setResults(analysisResults);
    setAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      {/* Search Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wallet Detection</CardTitle>
            <CardDescription>Search for cryptocurrency wallet information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                id="wallets"
                checked={searchWallets}
                onCheckedChange={setSearchWallets}
              />
              <Label htmlFor="wallets">Enable wallet search</Label>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {walletKeywords.slice(0, 4).map(keyword => (
                <Badge key={keyword} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
              <Badge variant="outline" className="text-xs">+{walletKeywords.length - 4} more</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">PayPal Detection</CardTitle>
            <CardDescription>Search for PayPal related information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                id="paypal"
                checked={searchPaypal}
                onCheckedChange={setSearchPaypal}
              />
              <Label htmlFor="paypal">Enable PayPal search</Label>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {paypalKeywords.slice(0, 3).map(keyword => (
                <Badge key={keyword} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom Keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom Keywords</CardTitle>
          <CardDescription>Add custom keywords to search (comma-separated)</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="password, login, email, secret..."
            value={customKeywords}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomKeywords(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Files to Analyze</CardTitle>
          <CardDescription>{selectedFiles.length} of {files.length} files selected</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {files.map((file) => (
              <div key={file.filename} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={file.filename}
                  checked={selectedFiles.includes(file.filename)}
                  onChange={() => handleFileToggle(file.filename)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor={file.filename} className="flex items-center cursor-pointer">
                  <FileArchive className="h-4 w-4 mr-2 text-gray-400" />
                  {file.filename}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analyze Button */}
      <Button
        onClick={handleAnalyze}
        disabled={analyzing || selectedFiles.length === 0}
        className="w-full"
        size="lg"
      >
        {analyzing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Analyzing...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            Analyze Selected Files
          </>
        )}
      </Button>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
              Analysis Results
            </h3>
            <div className="flex gap-2">
              <Button
                onClick={() => exportToPDF(results, {
                  wallets: searchWallets,
                  paypal: searchPaypal,
                  customKeywords
                })}
                variant="outline"
                size="sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button
                onClick={() => exportToCSV(results)}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {results.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-base">{result.filename}</CardTitle>
                <CardDescription>{result.totalMatches} suspicious items found</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.results.map((item, idx) => (
                    <div key={idx} className="border-l-4 border-yellow-400 pl-4 py-2">
                      <p className="font-medium text-sm">{item.file}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.matches.map((match, mIdx) => (
                          <Badge key={mIdx} variant="destructive" className="text-xs">
                            {match}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2 font-mono bg-gray-50 p-2 rounded">
                        {item.preview}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
