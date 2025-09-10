'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cookie, Download, Upload, Copy, CheckCircle, AlertCircle } from 'lucide-react';

interface ParsedCookie {
  domain: string;
  flag: string;
  path: string;
  secure: string;
  expiration: string;
  name: string;
  value: string;
}

export default function CookiesPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [cookies, setCookies] = useState<ParsedCookie[]>([]);
  const [netscapeFormat, setNetscapeFormat] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const textFile = files.find(file => file.name.endsWith('.txt') || file.type === 'text/plain');

    if (textFile) {
      processFile(textFile);
    } else {
      setStatus('error');
      setStatusMessage('Please upload a text file');
      setTimeout(() => {
        setStatus('idle');
        setStatusMessage('');
      }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsedCookies = parseCookies(text);

      if (parsedCookies.length === 0) {
        setStatus('error');
        setStatusMessage('No valid cookies found in the file');
        return;
      }

      setCookies(parsedCookies);
      const netscape = convertToNetscape(parsedCookies);
      setNetscapeFormat(netscape);

      setStatus('success');
      setStatusMessage(`Successfully converted ${parsedCookies.length} cookies`);
    } catch (error) {
      setStatus('error');
      setStatusMessage('Failed to process file');
      console.error('Error processing file:', error);
    }
  };

  const parseCookies = (text: string): ParsedCookie[] => {
    const cookies: ParsedCookie[] = [];
    
    // First check if it's a JSON array format
    if (text.trim().startsWith('[')) {
      try {
        const jsonArray = JSON.parse(text);
        if (Array.isArray(jsonArray)) {
          jsonArray.forEach(cookie => {
            // Convert expires timestamp (Windows format) to Unix timestamp
            let expiration = Math.floor(Date.now() / 1000 + 86400 * 365).toString();
            if (cookie.expires) {
              // Windows FILETIME to Unix conversion
              const windowsEpoch = 11644473600; // Seconds between 1601 and 1970
              const unixTime = Math.floor(cookie.expires / 10000000) - windowsEpoch;
              if (unixTime > 0) {
                expiration = unixTime.toString();
              }
            }
            
            cookies.push({
              domain: cookie.host || cookie.domain || '.example.com',
              flag: 'TRUE',
              path: cookie.path || '/',
              secure: cookie.secure ? 'TRUE' : 'FALSE',
              expiration: expiration,
              name: cookie.name || '',
              value: cookie.value || ''
            });
          });
          return cookies;
        }
      } catch (e) {
        console.error('Failed to parse JSON array:', e);
      }
    }
    
    // Fall back to line-by-line parsing
    const lines = text.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      // Try single JSON object format
      if (trimmed.startsWith('{')) {
        try {
          const jsonCookie = JSON.parse(trimmed);
          let expiration = Math.floor(Date.now() / 1000 + 86400 * 365).toString();
          if (jsonCookie.expires) {
            const windowsEpoch = 11644473600;
            const unixTime = Math.floor(jsonCookie.expires / 10000000) - windowsEpoch;
            if (unixTime > 0) {
              expiration = unixTime.toString();
            }
          }
          
          cookies.push({
            domain: jsonCookie.host || jsonCookie.domain || '.example.com',
            flag: 'TRUE',
            path: jsonCookie.path || '/',
            secure: jsonCookie.secure ? 'TRUE' : 'FALSE',
            expiration: expiration,
            name: jsonCookie.name || '',
            value: jsonCookie.value || ''
          });
        } catch {}
      }

      // Try tab-separated Netscape format
      const parts = trimmed.split('\t');
      if (parts.length >= 7) {
        cookies.push({
          domain: parts[0],
          flag: parts[1],
          path: parts[2],
          secure: parts[3],
          expiration: parts[4],
          name: parts[5],
          value: parts[6]
        });
      }
    });

    return cookies;
  };

  const convertToNetscape = (cookies: ParsedCookie[]): string => {
    const header = '# Netscape HTTP Cookie File\n# This file was generated by ZIP Manager Cookie Converter\n\n';
    const cookieLines = cookies.map(cookie =>
      `${cookie.domain}\t${cookie.flag}\t${cookie.path}\t${cookie.secure}\t${cookie.expiration}\t${cookie.name}\t${cookie.value}`
    ).join('\n');

    return header + cookieLines;
  };

  const downloadNetscapeFile = () => {
    const blob = new Blob([netscapeFormat], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cookies_netscape.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(netscapeFormat);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Cookies to Netscape Converter</h1>
        <p className="mt-2 text-gray-600">
          Convert various cookie formats to Netscape HTTP Cookie File format
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload Cookie File</CardTitle>
              <CardDescription>
                Drop a text file containing cookies in any format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center transition-all
                  ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                `}
              >
                <Cookie className="mx-auto h-12 w-12 text-gray-400 mb-4" />

                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop your cookie file here
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Supports JSON, tab-separated, and key=value formats
                </p>

                <input
                  type="file"
                  accept=".txt,text/plain"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="cookie-upload"
                />

                <label htmlFor="cookie-upload">
                  <Button asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Select File
                    </span>
                  </Button>
                </label>

                {status === 'success' && (
                  <div className="mt-4 flex items-center justify-center text-green-600">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span className="text-sm">{statusMessage}</span>
                  </div>
                )}

                {status === 'error' && (
                  <div className="mt-4 flex items-center justify-center text-red-600">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span className="text-sm">{statusMessage}</span>
                  </div>
                )}
              </div>

              {/* Supported Formats */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Supported Formats:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• JSON format from browser extensions</li>
                  <li>• Tab-separated Netscape format</li>
                  <li>• Semicolon-separated key=value pairs</li>
                  <li>• Mixed format files</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Output Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Netscape Format Output</CardTitle>
              <CardDescription>
                {cookies.length > 0 ? `${cookies.length} cookies converted` : 'Converted cookies will appear here'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {netscapeFormat ? (
                <>
                  <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto">
                    <pre>{netscapeFormat}</pre>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button onClick={downloadNetscapeFile} className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                      {copied ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Cookie Preview */}
                  <div className="mt-6">
                    <h4 className="font-medium text-sm mb-2">Cookie Details:</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {cookies.slice(0, 5).map((cookie, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{cookie.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {cookie.domain}
                            </Badge>
                          </div>
                          <div className="text-gray-500 truncate mt-1">
                            {cookie.value}
                          </div>
                        </div>
                      ))}
                      {cookies.length > 5 && (
                        <p className="text-xs text-gray-500 text-center">
                          ... and {cookies.length - 5} more cookies
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Cookie className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No cookies converted yet</p>
                  <p className="text-sm mt-2">Upload a file to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
