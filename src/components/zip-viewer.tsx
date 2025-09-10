'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileIcon, FolderIcon, BarChart3, Image as ImageIcon, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { calculateCompressionRatio } from '@/lib/compression-utils';

interface ZipViewerProps {
  filename: string;
  open: boolean;
  onClose: () => void;
}

interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  compressedSize: number;
  date: string;
}

export function ZipViewer({ filename, open, onClose }: ZipViewerProps) {
  const [contents, setContents] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalFiles: 0, totalFolders: 0 });
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (open && filename) {
      loadContents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filename]);

  const loadContents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const data = await response.json();
      if (data.success) {
        setContents(data.contents);
        setStats({
          totalFiles: data.totalFiles,
          totalFolders: data.totalFolders,
        });
      }
    } catch (error) {
      console.error('Error loading contents:', error);
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

  const isImageFile = (fileName: string): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext || '');
  };

  const handleImageClick = async (entry: FileEntry) => {
    if (!isImageFile(entry.name)) return;

    try {
      // Fetch the actual image data from the ZIP
      const response = await fetch('/api/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filename,
          path: entry.name
        })
      });
      
      const data = await response.json();
      if (data.success && data.imageData) {
        // Get the file extension to set proper MIME type
        const ext = entry.name.split('.').pop()?.toLowerCase() || '';
        const mimeType = ext === 'png' ? 'image/png' : 
                        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                        ext === 'gif' ? 'image/gif' :
                        ext === 'svg' ? 'image/svg+xml' :
                        ext === 'bmp' ? 'image/bmp' :
                        ext === 'webp' ? 'image/webp' :
                        'image/png'; // default
        
        const imageUrl = `data:${mimeType};base64,${data.imageData}`;
        setImagePreview({ url: imageUrl, name: entry.name });
      } else {
        // Fallback to placeholder if extraction fails
        const placeholderUrl = `data:image/svg+xml;base64,${btoa(`
          <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f3f4f6"/>
            <text x="50%" y="40%" font-family="Arial, sans-serif" font-size="24" fill="#6b7280" text-anchor="middle" dy=".3em">
              📷 ${entry.name}
            </text>
            <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle" dy=".3em">
              Image could not be loaded
            </text>
          </svg>
        `)}`;
        setImagePreview({ url: placeholderUrl, name: entry.name });
      }
    } catch (error) {
      console.error('Error loading image:', error);
      // Error placeholder
      const errorUrl = `data:image/svg+xml;base64,${btoa(`
        <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#fef2f2"/>
          <text x="50%" y="40%" font-family="Arial, sans-serif" font-size="24" fill="#ef4444" text-anchor="middle" dy=".3em">
            ❌ Error loading image
          </text>
          <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="16" fill="#f87171" text-anchor="middle" dy=".3em">
            ${entry.name}
          </text>
        </svg>
      `)}`;
      setImagePreview({ url: errorUrl, name: entry.name });
    }
  };

  const getFileIcon = (entry: FileEntry) => {
    if (entry.isDirectory) return <FolderIcon className="h-5 w-5 text-blue-500" />;
    if (isImageFile(entry.name)) return <ImageIcon className="h-5 w-5 text-green-500" />;
    return <FileIcon className="h-5 w-5 text-gray-400" />;
  };

  // Calculate overall compression stats
  const totalOriginalSize = contents.reduce((sum, item) => sum + (item.size || 0), 0);
  const totalCompressedSize = contents.reduce((sum, item) => sum + (item.compressedSize || 0), 0);
  const compressionRatio = totalOriginalSize > 0 ? calculateCompressionRatio(totalOriginalSize, totalCompressedSize) : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>ZIP Contents: {filename}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mb-4">
          <div className="flex gap-4">
            <Badge variant="outline">Files: {stats.totalFiles}</Badge>
            <Badge variant="outline">Folders: {stats.totalFolders}</Badge>
          </div>

          {/* Compression Stats Summary */}
          {!loading && totalOriginalSize > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Compression Summary</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Original:</span>
                  <div className="font-medium">{formatFileSize(totalOriginalSize)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Compressed:</span>
                  <div className="font-medium">{formatFileSize(totalCompressedSize)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Ratio:</span>
                  <div className="font-medium text-green-600">{compressionRatio.toFixed(1)}%</div>
                </div>
              </div>
              <Progress value={compressionRatio} className="h-2" />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="space-y-1">
              {contents.map((entry, index) => {
                const isImage = isImageFile(entry.name);
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isImage ? 'hover:bg-blue-50 cursor-pointer' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => isImage && handleImageClick(entry)}
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon(entry)}
                      <span className={entry.isDirectory ? 'font-medium' : ''}>
                        {entry.name}
                      </span>
                      {isImage && (
                        <Badge variant="outline" className="text-xs">
                          Click to preview
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {!entry.isDirectory && (
                        <>
                          <span>{formatFileSize(entry.size)}</span>
                          <span className="text-xs">
                            ({formatFileSize(entry.compressedSize)} compressed)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Image Preview Modal */}
    {imagePreview && (
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                {imagePreview.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImagePreview(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[500px] bg-gray-100 rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview.url}
              alt={imagePreview.name}
              className="w-full h-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}
