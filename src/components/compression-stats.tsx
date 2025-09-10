'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  FileArchive,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Info,
  Zap,
  HardDrive
} from 'lucide-react';
import {
  analyzeCompression,
  formatBytes,
  FileStats,
  CompressionAnalysis,
  suggestOptimalSettings
} from '@/lib/compression-utils';

interface CompressionStatsProps {
  filename: string;
  contents: any[];
}

export function CompressionStats({ contents }: Omit<CompressionStatsProps, 'filename'>) {
  const [analysis, setAnalysis] = useState<CompressionAnalysis | null>(null);
  const [optimalSettings, setOptimalSettings] = useState<any>(null);

  useEffect(() => {
    if (contents && contents.length > 0) {
      // Convert contents to FileStats
      const fileStats: FileStats[] = contents
        .filter(item => !item.isDirectory)
        .map(item => ({
          name: item.name,
          originalSize: item.size || 0,
          compressedSize: item.compressedSize || 0,
          compressionRatio: ((item.size - item.compressedSize) / item.size) * 100,
          compressionMethod: 'DEFLATE', // Default for ZIP
          fileType: getFileTypeFromName(item.name),
          isCompressible: isFileCompressible(item.name)
        }));

      const analysisResult = analyzeCompression(fileStats);
      setAnalysis(analysisResult);
      setOptimalSettings(suggestOptimalSettings(analysisResult));
    }
  }, [contents]);

  const getFileTypeFromName = (name: string): string => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const typeMap: Record<string, string> = {
      'txt': 'Text', 'doc': 'Document', 'pdf': 'PDF',
      'jpg': 'Image', 'png': 'Image', 'gif': 'Image',
      'mp4': 'Video', 'avi': 'Video', 'mov': 'Video',
      'mp3': 'Audio', 'wav': 'Audio', 'flac': 'Audio',
      'js': 'Code', 'ts': 'Code', 'html': 'Code', 'css': 'Code',
      'zip': 'Archive', 'rar': 'Archive', '7z': 'Archive'
    };
    return typeMap[ext] || 'Other';
  };

  const isFileCompressible = (name: string): boolean => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const preCompressed = ['jpg', 'jpeg', 'png', 'mp3', 'mp4', 'zip', 'rar', 'pdf'];
    return !preCompressed.includes(ext);
  };

  if (!analysis) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          No compression statistics available
        </CardContent>
      </Card>
    );
  }

  const savingsPercentage = analysis.overallCompressionRatio;
  const spaceSaved = analysis.totalOriginalSize - analysis.totalCompressedSize;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Original Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{formatBytes(analysis.totalOriginalSize)}</span>
              <HardDrive className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Compressed Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{formatBytes(analysis.totalCompressedSize)}</span>
              <FileArchive className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Space Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">
                {formatBytes(spaceSaved)}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-green-600">
                  {savingsPercentage.toFixed(1)}%
                </span>
                <TrendingDown className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compression Ratio Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overall Compression Ratio</CardTitle>
          <CardDescription>
            Files compressed to {(100 - savingsPercentage).toFixed(1)}% of original size
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={savingsPercentage} className="h-3" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>0% (No compression)</span>
              <span>100% (Maximum compression)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best and Worst Compressed Files */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analysis.bestCompressedFile && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Best Compression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium text-sm truncate">{analysis.bestCompressedFile.name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">
                    {analysis.bestCompressedFile.compressionRatio.toFixed(1)}% saved
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {formatBytes(analysis.bestCompressedFile.originalSize)} → {formatBytes(analysis.bestCompressedFile.compressedSize)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {analysis.worstCompressedFile && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Worst Compression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium text-sm truncate">{analysis.worstCompressedFile.name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-red-600">
                    {analysis.worstCompressedFile.compressionRatio.toFixed(1)}% saved
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {formatBytes(analysis.worstCompressedFile.originalSize)} → {formatBytes(analysis.worstCompressedFile.compressedSize)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* File Type Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compression by File Type</CardTitle>
          <CardDescription>
            Analysis of {analysis.fileCount} files grouped by type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from(analysis.filesByType.entries()).map(([type, files]) => {
              const typeSize = files.reduce((sum, f) => sum + f.originalSize, 0);
              const typeCompressed = files.reduce((sum, f) => sum + f.compressedSize, 0);
              const typeRatio = ((typeSize - typeCompressed) / typeSize) * 100;

              return (
                <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{type}</Badge>
                    <span className="text-sm text-gray-600">{files.length} files</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{formatBytes(typeSize)}</span>
                    <Badge
                      variant={typeRatio > 50 ? "default" : typeRatio > 20 ? "secondary" : "outline"}
                      className="min-w-[60px] text-center"
                    >
                      {typeRatio.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Optimization Recommendations
          </CardTitle>
          <CardDescription>
            Suggestions to improve compression efficiency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.recommendations.map((rec, index) => (
              <div key={index} className="flex gap-3 p-3 bg-blue-50 rounded-lg">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{rec}</p>
              </div>
            ))}

            {optimalSettings && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Recommended Settings for Re-compression
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Format:</span>
                    <Badge className="ml-2">{optimalSettings.format}</Badge>
                  </div>
                  <div>
                    <span className="text-gray-600">Method:</span>
                    <Badge className="ml-2">{optimalSettings.method}</Badge>
                  </div>
                  <div>
                    <span className="text-gray-600">Level:</span>
                    <Badge className="ml-2">{optimalSettings.level}</Badge>
                  </div>
                  {optimalSettings.splitSize && (
                    <div>
                      <span className="text-gray-600">Split:</span>
                      <Badge className="ml-2">{optimalSettings.splitSize}</Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compression Command */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Command Line Optimization</CardTitle>
          <CardDescription>
            Use these commands for optimal compression
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-gray-900 text-gray-100 rounded-lg font-mono text-sm">
              <p className="text-green-400"># For maximum compression (slow)</p>
              <p>7z a -mx=9 -mfb=273 -ms=on output.7z input_files/</p>
            </div>
            <div className="p-3 bg-gray-900 text-gray-100 rounded-lg font-mono text-sm">
              <p className="text-green-400"># For balanced compression (recommended)</p>
              <p>zip -r -9 output.zip input_files/</p>
            </div>
            <div className="p-3 bg-gray-900 text-gray-100 rounded-lg font-mono text-sm">
              <p className="text-green-400"># For fast compression</p>
              <p>tar -czf output.tar.gz input_files/</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
