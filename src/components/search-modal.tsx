'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Search, FileText, FileArchive, Loader2 } from 'lucide-react';

interface SearchResult {
  filename: string;
  matches: any[];
  totalMatches: number;
}

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('openSearchModal', handleOpen);
    return () => window.removeEventListener('openSearchModal', handleOpen);
  }, []);

  const performSearch = async () => {
    if (!query.trim()) return;

    setSearching(true);
    setHasSearched(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          searchType,
          caseSensitive
        })
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.results);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !searching) {
      performSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Inside ZIP Files
          </DialogTitle>
          <DialogDescription>
            Search for filenames or content across all your ZIP files
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              autoFocus
            />
            <Button
              onClick={performSearch}
              disabled={searching || !query.trim()}
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Search Options */}
          <div className="flex items-center justify-between">
            <RadioGroup value={searchType} onValueChange={setSearchType}>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all">All</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="filename" id="filename" />
                  <Label htmlFor="filename">Filenames</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="content" id="content" />
                  <Label htmlFor="content">Content</Label>
                </div>
              </div>
            </RadioGroup>

            <div className="flex items-center space-x-2">
              <Switch
                id="case"
                checked={caseSensitive}
                onCheckedChange={setCaseSensitive}
              />
              <Label htmlFor="case">Case sensitive</Label>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-auto min-h-[300px] max-h-[400px]">
            {searching ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Searching...</p>
                </div>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileArchive className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{result.filename}</span>
                      </div>
                      <Badge>{result.totalMatches} matches</Badge>
                    </div>

                    <div className="space-y-2">
                      {result.matches.slice(0, 3).map((match, mIdx) => (
                        <div key={mIdx} className="bg-gray-50 rounded p-2">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-3 w-3 text-gray-400" />
                            <span className="text-xs font-medium text-gray-600">
                              {match.path}
                            </span>
                          </div>

                          {match.type === 'content' && match.matches && (
                            <div className="space-y-1">
                              {match.matches.slice(0, 2).map((line: any, lIdx: number) => (
                                <div key={lIdx} className="text-xs">
                                  <span className="text-gray-500">Line {line.lineNumber}:</span>
                                  <pre className="mt-1 p-1 bg-white rounded overflow-x-auto">
                                    <code>{line.content}</code>
                                  </pre>
                                </div>
                              ))}
                              {match.totalMatches > 2 && (
                                <p className="text-xs text-gray-500">
                                  ... and {match.totalMatches - 2} more matches
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {result.matches.length > 3 && (
                        <p className="text-sm text-gray-500 pl-2">
                          ... and {result.matches.length - 3} more files
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : hasSearched ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <Search className="h-8 w-8 mb-2 text-gray-300" />
                <p>No results found</p>
                <p className="text-sm">Try adjusting your search query</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <Search className="h-8 w-8 mb-2 text-gray-300" />
                <p>Enter a search query to begin</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
