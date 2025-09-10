'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  GitCompare,
  FileText,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Download,
  FileArchive
} from 'lucide-react';

interface FileCompareProps {
  file1?: string;
  file2?: string;
  open: boolean;
  onClose: () => void;
}

interface ComparisonResult {
  added: FileEntry[];
  removed: FileEntry[];
  modified: FileEntry[];
  unchanged: FileEntry[];
  sizeChange: number;
  compressionChange: number;
}

interface FileEntry {
  name: string;
  size: number;
  hash?: string;
  date?: string;
}

export function FileCompare({ file1, file2, open, onClose }: FileCompareProps) {
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open && file1 && file2) {
      compareFiles();
    }
  }, [open, file1, file2]);

  const compareFiles = async () => {
    setComparing(true);
    setProgress(0);

    // Simulate comparison progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      // In production, this would call an API endpoint
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock comparison result
      const mockResult: ComparisonResult = {
        added: [
          { name: 'src/new-feature.js', size: 4096 },
          { name: 'docs/changelog.md', size: 2048 },
          { name: 'assets/logo-v2.png', size: 8192 }
        ],
        removed: [
          { name: 'src/deprecated.js', size: 3072 },
          { name: 'temp/cache.tmp', size: 1024 }
        ],
        modified: [
          { name: 'src/index.js', size: 5120 },
          { name: 'package.json', size: 1536 },
          { name: 'README.md', size: 3584 },
          { name: 'config/settings.json', size: 2560 }
        ],
        unchanged: Array.from({ length: 25 }, (_, i) => ({
          name: `file${i}.txt`,
          size: Math.floor(Math.random() * 10000)
        })),
        sizeChange: 12288, // +12KB
        compressionChange: 2.5 // +2.5%
      };

      setResult(mockResult);
      clearInterval(progressInterval);
      setProgress(100);
    } catch (error) {
      console.error('Comparison error:', error);
      clearInterval(progressInterval);
    } finally {
      setComparing(false);
    }
  };

  const formatSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getSummaryStats = () => {
    if (!result) return null;

    const totalChanges = result.added.length + result.removed.length + result.modified.length;
    const totalFiles = totalChanges + result.unchanged.length;

    return {
      totalFiles,
      totalChanges,
      changePercentage: (totalChanges / totalFiles) * 100
    };
  };

  const exportComparison = () => {
    if (!result) return;

    const report = {
      comparison: {
        file1,
        file2,
        timestamp: new Date().toISOString()
      },
      summary: getSummaryStats(),
      changes: {
        added: result.added,
        removed: result.removed,
        modified: result.modified
      },
      metrics: {
        sizeChange: result.sizeChange,
        compressionChange: result.compressionChange
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            File Comparison
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <FileArchive className="h-3 w-3" />
                {file1}
              </Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge variant="outline" className="flex items-center gap-1">
                <FileArchive className="h-3 w-3" />
                {file2}
              </Badge>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {comparing ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-full max-w-xs space-y-4">
                <div className="text-center">
                  <p className="text-sm font-medium mb-2">Comparing files...</p>
                  <Progress value={progress} className="h-2" />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Analyzing file structure and content...
                </p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Plus className="h-5 w-5 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">
                      {result.added.length}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Added</p>
                </div>

                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Minus className="h-5 w-5 text-red-600" />
                    <span className="text-2xl font-bold text-red-600">
                      {result.removed.length}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Removed</p>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-2xl font-bold text-yellow-600">
                      {result.modified.length}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Modified</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <CheckCircle className="h-5 w-5 text-gray-600" />
                    <span className="text-2xl font-bold text-gray-600">
                      {result.unchanged.length}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Unchanged</p>
                </div>
              </div>

              {/* Size Changes */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Size Change</p>
                    <p className="text-2xl font-bold mt-1">
                      {result.sizeChange > 0 ? '+' : ''}{formatSize(Math.abs(result.sizeChange))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Compression Change</p>
                    <p className="text-2xl font-bold mt-1">
                      {result.compressionChange > 0 ? '+' : ''}{result.compressionChange}%
                    </p>
                  </div>
                </div>
              </div>

              {/* File Changes Details */}
              <div className="space-y-4">
                {/* Added Files */}
                {result.added.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Plus className="h-4 w-4 text-green-600" />
                      Added Files
                    </h4>
                    <div className="space-y-1">
                      {result.added.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-mono">{file.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Removed Files */}
                {result.removed.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Minus className="h-4 w-4 text-red-600" />
                      Removed Files
                    </h4>
                    <div className="space-y-1">
                      {result.removed.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-mono line-through">{file.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modified Files */}
                {result.modified.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      Modified Files
                    </h4>
                    <div className="space-y-1">
                      {result.modified.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-mono">{file.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Export Button */}
              <div className="flex justify-end">
                <Button onClick={exportComparison}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Comparison Report
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Select two files to compare</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
