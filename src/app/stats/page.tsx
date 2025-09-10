'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileArchive, BarChart3, RefreshCw } from 'lucide-react';
import { CompressionStats } from '@/components/compression-stats';

function StatsContent() {
  const searchParams = useSearchParams();
  const fileParam = searchParams.get('file');

  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    // If file parameter is provided, auto-select it
    if (fileParam && files.length > 0) {
      const fileExists = files.find(f => f.filename === fileParam);
      if (fileExists) {
        analyzeFile(fileParam);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileParam, files]);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      if (data.success) {
        setFiles(data.files);
        if (data.files.length > 0 && !selectedFile) {
          // Auto-select first file
          analyzeFile(data.files[0].filename);
        }
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const analyzeFile = async (filename: string) => {
    setSelectedFile(filename);
    setLoading(true);

    try {
      const response = await fetch('/api/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });

      const data = await response.json();
      if (data.success) {
        setFileContents(data.contents);
      }
    } catch (error) {
      console.error('Error analyzing file:', error);
    } finally {
      setLoading(false);
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
        <h1 className="text-3xl font-bold text-gray-900">Compression Statistics</h1>
        <p className="mt-2 text-gray-600">
          Analyze compression efficiency and get optimization recommendations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* File Selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileArchive className="h-4 w-4" />
                Select ZIP File
              </CardTitle>
              <CardDescription>
                Choose a file to analyze
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {files.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No ZIP files uploaded yet
                  </p>
                ) : (
                  files.map((file) => (
                    <button
                      key={file.filename}
                      onClick={() => analyzeFile(file.filename)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedFile === file.filename
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{file.filename}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                        {selectedFile === file.filename && (
                          <Badge variant="default" className="ml-2">
                            <BarChart3 className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <Button
                onClick={fetchFiles}
                variant="outline"
                size="sm"
                className="w-full mt-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Display */}
        <div className="lg:col-span-3">
          {loading ? (
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                  <p className="mt-4 text-gray-600">Analyzing compression statistics...</p>
                </div>
              </CardContent>
            </Card>
          ) : selectedFile && fileContents.length > 0 ? (
            <CompressionStats
              contents={fileContents}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a ZIP file to view compression statistics</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StatsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    }>
      <StatsContent />
    </Suspense>
  );
}
