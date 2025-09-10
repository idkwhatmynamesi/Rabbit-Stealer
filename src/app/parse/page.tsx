'use client';

import { useState, useEffect } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileArchive, FileText, FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ParsePage() {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      if (data.success) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleParse = async (filename: string) => {
    setSelectedFile(filename);
    setParsing(true);

    try {
      const response = await fetch('/api/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });

      const data = await response.json();
      if (data.success) {
        setParseResult(data);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
    } finally {
      setParsing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Parse ZIP Files</h1>
        <p className="mt-2 text-gray-600">
          Parse and extract metadata from ZIP files
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File Selection */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Select a file to parse</h2>
          <div className="space-y-2">
            {files.map((file) => (
              <Card
                key={file.filename}
                className={`cursor-pointer transition-all ${
                  selectedFile === file.filename ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleParse(file.filename)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileArchive className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{file.filename}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    {selectedFile === file.filename && parsing && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Parse Results */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Parse Results</h2>
          {parseResult ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{parseResult.filename}</CardTitle>
                <CardDescription>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">
                      <FileText className="h-3 w-3 mr-1" />
                      {parseResult.totalFiles} files
                    </Badge>
                    <Badge variant="outline">
                      <FolderOpen className="h-3 w-3 mr-1" />
                      {parseResult.totalFolders} folders
                    </Badge>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">Directory Structure</h4>
                    <div className="bg-gray-50 rounded p-3 max-h-96 overflow-y-auto">
                      <div className="space-y-1 font-mono text-sm">
                        {parseResult.contents.map((item: any, index: number) => (
                          <div
                            key={index}
                            className={`flex items-center gap-2 ${
                              item.isDirectory ? 'text-blue-600' : 'text-gray-700'
                            }`}
                          >
                            {item.isDirectory ? (
                              <FolderOpen className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                            <span className="flex-1">{item.name}</span>
                            {!item.isDirectory && (
                              <span className="text-xs text-gray-500">
                                {formatFileSize(item.size)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Statistics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-gray-500">Total Files</p>
                        <p className="font-semibold">{parseResult.totalFiles}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-gray-500">Total Folders</p>
                        <p className="font-semibold">{parseResult.totalFolders}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                Select a file to view its parsed structure
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
