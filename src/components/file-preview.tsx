'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Code,
  FileJson,
  FileSpreadsheet,
  Download,
  Copy,
  Maximize2,
  Minimize2,
  CheckCircle
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface FilePreviewProps {
  filename: string;
  content?: string;
  open: boolean;
  onClose: () => void;
}

export function FilePreview({ filename, content, open, onClose }: FilePreviewProps) {
  const [fileContent, setFileContent] = useState<string>('');
  const [fileType, setFileType] = useState<string>('text');
  const [language, setLanguage] = useState<string>('plaintext');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    if (open && filename) {
      detectFileType(filename);
      if (content) {
        setFileContent(content);
      } else {
        loadFileContent();
      }
    }
  }, [open, filename, content]);

  const detectFileType = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';

    const typeMap: Record<string, { type: string; language: string }> = {
      // Code files
      'js': { type: 'code', language: 'javascript' },
      'jsx': { type: 'code', language: 'jsx' },
      'ts': { type: 'code', language: 'typescript' },
      'tsx': { type: 'code', language: 'tsx' },
      'py': { type: 'code', language: 'python' },
      'java': { type: 'code', language: 'java' },
      'cpp': { type: 'code', language: 'cpp' },
      'c': { type: 'code', language: 'c' },
      'cs': { type: 'code', language: 'csharp' },
      'php': { type: 'code', language: 'php' },
      'rb': { type: 'code', language: 'ruby' },
      'go': { type: 'code', language: 'go' },
      'rs': { type: 'code', language: 'rust' },
      'swift': { type: 'code', language: 'swift' },
      'kt': { type: 'code', language: 'kotlin' },
      'scala': { type: 'code', language: 'scala' },
      'r': { type: 'code', language: 'r' },
      'sql': { type: 'code', language: 'sql' },
      'sh': { type: 'code', language: 'bash' },
      'ps1': { type: 'code', language: 'powershell' },

      // Web files
      'html': { type: 'code', language: 'html' },
      'css': { type: 'code', language: 'css' },
      'scss': { type: 'code', language: 'scss' },
      'sass': { type: 'code', language: 'sass' },
      'less': { type: 'code', language: 'less' },

      // Data files
      'json': { type: 'code', language: 'json' },
      'xml': { type: 'code', language: 'xml' },
      'yml': { type: 'code', language: 'yaml' },
      'yaml': { type: 'code', language: 'yaml' },
      'toml': { type: 'code', language: 'toml' },
      'ini': { type: 'code', language: 'ini' },

      // Documents
      'md': { type: 'markdown', language: 'markdown' },
      'txt': { type: 'text', language: 'plaintext' },
      'log': { type: 'text', language: 'plaintext' },

      // Images
      'jpg': { type: 'image', language: '' },
      'jpeg': { type: 'image', language: '' },
      'png': { type: 'image', language: '' },
      'gif': { type: 'image', language: '' },
      'svg': { type: 'image', language: '' },
      'webp': { type: 'image', language: '' },

      // Media
      'mp3': { type: 'audio', language: '' },
      'wav': { type: 'audio', language: '' },
      'mp4': { type: 'video', language: '' },
      'avi': { type: 'video', language: '' },

      // Spreadsheets
      'csv': { type: 'csv', language: '' },
    };

    const fileInfo = typeMap[ext] || { type: 'text', language: 'plaintext' };
    setFileType(fileInfo.type);
    setLanguage(fileInfo.language);
  };

  const loadFileContent = async () => {
    setLoading(true);
    try {
      if (fileType === 'image') {
        // Fetch the actual image data from the API
        const response = await fetch('/api/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            filename: filename.split('/')[0], // Get the ZIP filename
            path: filename // Full path including the image file
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.imageData) {
            // Create a data URL from the base64 image data
            setImageUrl(`data:image/${filename.split('.').pop()};base64,${data.imageData}`);
          } else {
            // Fallback to a placeholder if image data is not available
            setImageUrl(`data:image/svg+xml;base64,${btoa(`
              <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#f3f4f6"/>
                <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#6b7280" text-anchor="middle" dy=".3em">
                  📷 ${filename.split('/').pop()}
                </text>
                <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af" text-anchor="middle" dy=".3em">
                  Image preview not available
                </text>
              </svg>
            `)}`);
          }
        } else {
          throw new Error('Failed to load image');
        }
      } else {
        // Demo content for non-image files
        setFileContent(generateDemoContent(fileType, language));
      }
    } catch (error) {
      console.error('Error loading file:', error);
      if (fileType === 'image') {
        // Show error placeholder for images
        setImageUrl(`data:image/svg+xml;base64,${btoa(`
          <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#fef2f2"/>
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#ef4444" text-anchor="middle" dy=".3em">
              ❌ Error loading image
            </text>
            <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="12" fill="#f87171" text-anchor="middle" dy=".3em">
              ${filename.split('/').pop()}
            </text>
          </svg>
        `)}`);
      } else {
        setFileContent('Error loading file content');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateDemoContent = (type: string, lang: string): string => {
    const contents: Record<string, string> = {
      javascript: `// JavaScript Example
function calculateCompression(original, compressed) {
  const ratio = ((original - compressed) / original) * 100;
  return Math.round(ratio * 10) / 10;
}

const files = [
  { name: 'document.pdf', size: 1024000 },
  { name: 'image.jpg', size: 2048000 },
  { name: 'archive.zip', size: 512000 }
];

files.forEach(file => {
  console.log(\`Processing \${file.name}...\`);
});`,

      python: `# Python Example
import zipfile
import os

def analyze_zip(file_path):
    """Analyze ZIP file contents"""
    with zipfile.ZipFile(file_path, 'r') as zip_ref:
        file_list = zip_ref.namelist()
        total_size = sum(zip_ref.getinfo(f).file_size for f in file_list)

        return {
            'files': len(file_list),
            'total_size': total_size,
            'compression_ratio': calculate_ratio(total_size)
        }

if __name__ == "__main__":
    result = analyze_zip("example.zip")
    print(f"Analysis complete: {result}")`,

      json: `{
  "name": "ZIP Manager",
  "version": "2.0.0",
  "features": {
    "upload": true,
    "analyze": true,
    "compress": true,
    "share": true
  },
  "statistics": {
    "totalFiles": 156,
    "totalSize": "2.3GB",
    "compressionRatio": 65.4
  }
}`,

      csv: `filename,size,compressed_size,ratio,date
document.pdf,1024000,768000,25.0,2024-01-15
image.jpg,2048000,1536000,25.0,2024-01-16
archive.zip,512000,256000,50.0,2024-01-17
video.mp4,10240000,9216000,10.0,2024-01-18`,

      markdown: `# ZIP File Analysis Report

## Overview
This ZIP file contains **42 files** with a total size of **15.3 MB**.

### Compression Statistics
- **Original Size**: 23.5 MB
- **Compressed Size**: 15.3 MB
- **Compression Ratio**: 34.9%

### File Types
| Type | Count | Size |
|------|-------|------|
| Documents | 12 | 5.2 MB |
| Images | 18 | 8.1 MB |
| Code | 12 | 2.0 MB |

### Recommendations
1. Consider converting BMP images to PNG for better compression
2. Remove duplicate files to save space
3. Use higher compression level for text files`,

      plaintext: fileContent || 'File content preview...'
    };

    return contents[lang] || contents.plaintext;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFileIcon = () => {
    switch (fileType) {
      case 'code': return <Code className="h-5 w-5" />;
      case 'image': return <ImageIcon className="h-5 w-5" />;
      case 'audio': return <Music className="h-5 w-5" />;
      case 'video': return <Video className="h-5 w-5" />;
      case 'json': return <FileJson className="h-5 w-5" />;
      case 'csv': return <FileSpreadsheet className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    switch (fileType) {
      case 'image':
        return (
          <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={imageUrl}
              alt={filename}
              className="w-full h-full object-contain"
            />
          </div>
        );

      case 'code':
      case 'json':
        return (
          <SyntaxHighlighter
            language={language}
            style={oneLight}
            showLineNumbers
            customStyle={{
              margin: 0,
              borderRadius: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            {fileContent}
          </SyntaxHighlighter>
        );

      case 'csv':
        return (
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="bg-white divide-y divide-gray-200">
                {fileContent.split('\n').map((row, idx) => (
                  <tr key={idx}>
                    {row.split(',').map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        className={`px-3 py-2 text-sm ${
                          idx === 0 ? 'font-semibold bg-gray-50' : ''
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'markdown':
        return (
          <div className="prose max-w-none p-4">
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(fileContent) }} />
          </div>
        );

      default:
        return (
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-auto font-mono text-sm">
            {fileContent}
          </pre>
        );
    }
  };

  const renderMarkdown = (md: string): string => {
    // Simple markdown to HTML conversion
    return md
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`${isFullscreen ? 'max-w-[95vw] h-[95vh]' : 'max-w-4xl max-h-[80vh]'} flex flex-col`}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getFileIcon()}
              <span>{filename}</span>
              <Badge variant="outline">{fileType}</Badge>
              {language && language !== 'plaintext' && (
                <Badge variant="secondary">{language}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                disabled={fileType === 'image'}
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                disabled={fileType === 'image'}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
