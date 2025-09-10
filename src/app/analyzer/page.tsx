'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Upload, X, FileArchive, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function AnalyzerPage() {
  const [textContent, setTextContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [zipFiles, setZipFiles] = useState<any[]>([]);
  const [selectedZip, setSelectedZip] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [searching, setSearching] = useState(false);

  // Load available ZIP files on mount
  useEffect(() => {
    fetchZipFiles();
  }, []);

  const fetchZipFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      if (data.success) {
        setZipFiles(data.files);
        if (data.files.length > 0) {
          setSelectedZip(data.files[0].filename);
        }
      }
    } catch (error) {
      console.error('Failed to fetch ZIP files:', error);
    }
  };

  const searchInZip = async () => {
    if (!searchQuery || !selectedZip) return;

    setSearching(true);
    setSearchResults([]);

    try {
      const response = await fetch('/api/analyze-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedZip,
          action: 'search',
          searchTerm: searchQuery,
          caseSensitive
        })
      });

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      alert('Please upload a .txt file only');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setTextContent(content);
      analyzeTextContent(content);
    };
    reader.readAsText(file);
  };

  const handlePaste = (content: string) => {
    setTextContent(content);
    analyzeTextContent(content);
  };

  const analyzeTextContent = (content: string) => {
    if (!content) return;

    const lines = content.split('\n');
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const characters = content.length;
    
    // Find common patterns
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const phonePattern = /[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/g;
    const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;

    const emails = content.match(emailPattern) || [];
    const urls = content.match(urlPattern) || [];
    const phones = content.match(phonePattern) || [];
    const ips = content.match(ipPattern) || [];

    // Word frequency analysis
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanWord.length > 2) {
        wordFreq.set(cleanWord, (wordFreq.get(cleanWord) || 0) + 1);
      }
    });

    const topWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    setResults({
      stats: {
        lines: lines.length,
        words: words.length,
        characters,
        avgWordsPerLine: (words.length / lines.length).toFixed(2)
      },
      patterns: {
        emails: [...new Set(emails)],
        urls: [...new Set(urls)],
        phones: [...new Set(phones)],
        ips: [...new Set(ips)]
      },
      topWords
    });
  };

  const handleSearch = () => {
    if (!searchQuery || !textContent) return;

    setAnalyzing(true);
    
    // Case-insensitive search
    const regex = new RegExp(searchQuery, 'gi');
    const matches = textContent.match(regex) || [];
    
    // Find line numbers where matches occur
    const lines = textContent.split('\n');
    const matchedLines: { lineNum: number; content: string; highlight: string }[] = [];
    
    lines.forEach((line, index) => {
      if (regex.test(line)) {
        matchedLines.push({
          lineNum: index + 1,
          content: line,
          highlight: searchQuery
        });
      }
    });

    setResults(prev => ({
      ...prev,
      searchResults: {
        query: searchQuery,
        totalMatches: matches.length,
        uniqueMatches: [...new Set(matches.map(m => m.toLowerCase()))].length,
        matchedLines: matchedLines.slice(0, 20) // Show first 20 matches
      }
    }));

    setAnalyzing(false);
  };

  const clearAll = () => {
    setTextContent('');
    setSearchQuery('');
    setResults(null);
    setSelectedFile(null);
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">File Content Analyzer</h1>
        <p className="mt-2 text-gray-600">
          Search and analyze content within ZIP files or text files
        </p>
      </div>

      {/* ZIP File Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Search in ZIP Files
          </CardTitle>
          <CardDescription>Search for text within files inside ZIP archives</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Select ZIP File</Label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={selectedZip}
                onChange={(e) => setSelectedZip(e.target.value)}
              >
                {zipFiles.map((file) => (
                  <option key={file.id} value={file.filename}>
                    {file.filename}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Search Term</Label>
              <Input
                placeholder="Enter text to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchInZip()}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={caseSensitive}
                onCheckedChange={setCaseSensitive}
              />
              <Label>Case Sensitive</Label>
            </div>
            <Button onClick={searchInZip} disabled={searching || !searchQuery}>
              <Search className="h-4 w-4 mr-2" />
              {searching ? 'Searching...' : 'Search in ZIP'}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-4">
              <h3 className="font-semibold">Search Results ({searchResults.length} files found):</h3>
              {searchResults.map((result, idx) => (
                <Card key={idx}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{result.filename}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.matches.map((match: string, midx: number) => (
                        <div key={midx} className="text-sm bg-gray-50 p-2 rounded">
                          <code>{match}</code>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {searchResults.length === 0 && searching === false && searchQuery && (
            <div className="text-center py-4 text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No matches found for "{searchQuery}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload or Paste Section */}
      <Card>
        <CardHeader>
          <CardTitle>Input Text Content</CardTitle>
          <CardDescription>Upload a .txt file or paste content directly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">Click to upload .txt file</p>
                  {selectedFile && (
                    <Badge className="mt-2">{selectedFile.name}</Badge>
                  )}
                </div>
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <div className="text-gray-400">OR</div>
            <div className="flex-1">
              <Textarea
                placeholder="Paste your text content here..."
                value={textContent}
                onChange={(e) => handlePaste(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>

          {textContent && (
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                <FileText className="h-3 w-3 mr-1" />
                {textContent.length} characters loaded
              </Badge>
              <Button onClick={clearAll} variant="destructive" size="sm">
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Section */}
      {textContent && (
        <Card>
          <CardHeader>
            <CardTitle>Search Content</CardTitle>
            <CardDescription>Find specific text or patterns in the content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter search term..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={!searchQuery || analyzing}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {results && (
        <div className="space-y-4">
          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>File Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Lines</p>
                  <p className="text-2xl font-bold">{results.stats?.lines}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Words</p>
                  <p className="text-2xl font-bold">{results.stats?.words}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Characters</p>
                  <p className="text-2xl font-bold">{results.stats?.characters}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Words/Line</p>
                  <p className="text-2xl font-bold">{results.stats?.avgWordsPerLine}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pattern Detection */}
          <Card>
            <CardHeader>
              <CardTitle>Detected Patterns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.patterns?.emails.length > 0 && (
                <div>
                  <Label>Emails Found ({results.patterns.emails.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {results.patterns.emails.map((email: string, i: number) => (
                      <Badge key={i} variant="secondary">{email}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {results.patterns?.urls.length > 0 && (
                <div>
                  <Label>URLs Found ({results.patterns.urls.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {results.patterns.urls.slice(0, 5).map((url: string, i: number) => (
                      <Badge key={i} variant="secondary">{url}</Badge>
                    ))}
                    {results.patterns.urls.length > 5 && (
                      <Badge variant="outline">+{results.patterns.urls.length - 5} more</Badge>
                    )}
                  </div>
                </div>
              )}

              {results.patterns?.phones.length > 0 && (
                <div>
                  <Label>Phone Numbers Found ({results.patterns.phones.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {results.patterns.phones.map((phone: string, i: number) => (
                      <Badge key={i} variant="secondary">{phone}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {results.patterns?.ips.length > 0 && (
                <div>
                  <Label>IP Addresses Found ({results.patterns.ips.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {results.patterns.ips.map((ip: string, i: number) => (
                      <Badge key={i} variant="secondary">{ip}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Words */}
          {results.topWords && (
            <Card>
              <CardHeader>
                <CardTitle>Most Frequent Words</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.topWords.map(([word, count]: [string, number]) => (
                    <div key={word} className="flex items-center justify-between">
                      <span className="font-medium">{word}</span>
                      <Badge variant="outline">{count} times</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search Results */}
          {results.searchResults && (
            <Card>
              <CardHeader>
                <CardTitle>Search Results for "{results.searchResults.query}"</CardTitle>
                <CardDescription>
                  Found {results.searchResults.totalMatches} matches in {results.searchResults.matchedLines.length} lines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.searchResults.matchedLines.map((match: any, i: number) => (
                    <div key={i} className="p-2 bg-gray-50 rounded text-sm">
                      <Badge className="mb-1">Line {match.lineNum}</Badge>
                      <p className="font-mono">{match.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}