'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Download,
  Trash2,
  Archive,
  Share2,
  CheckSquare,
  XSquare,
  FileArchive,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BulkOperationsProps {
  files: any[];
  onRefresh: () => void;
}

export function BulkOperations({ files, onRefresh }: BulkOperationsProps) {
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const handleBulkSelect = () => setBulkMode(true);
    window.addEventListener('enableBulkSelect', handleBulkSelect);
    return () => window.removeEventListener('enableBulkSelect', handleBulkSelect);
  }, []);

  const toggleFileSelection = (filename: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(filename)) {
      newSelection.delete(filename);
    } else {
      newSelection.add(filename);
    }
    setSelectedFiles(newSelection);
  };

  const selectAll = () => {
    setSelectedFiles(new Set(files.map(f => f.filename)));
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  const handleBulkDownload = async () => {
    setProcessing(true);

    // Create a ZIP containing all selected files
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (const filename of selectedFiles) {
      try {
        const response = await fetch(`/uploads/${filename}`);
        const blob = await response.blob();
        zip.file(filename, blob);
      } catch (error) {
        console.error(`Error downloading ${filename}:`, error);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-download-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    setProcessing(false);
    setBulkMode(false);
    setSelectedFiles(new Set());
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedFiles.size} files?`)) return;

    setProcessing(true);
    const startTime = Date.now();

    try {
      const filenames = Array.from(selectedFiles);
      
      // Use the new bulk delete endpoint for better performance
      const response = await fetch('/api/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames })
      });

      const data = await response.json();
      const duration = Date.now() - startTime;
      
      if (data.success) {
        const { successful, failed, details } = data.results;
        
        if (failed > 0) {
          const failedFiles = details
            .filter((r: any) => !r.success)
            .map((r: any) => `${r.filename} (${r.error})`)
            .join(', ');
          alert(
            `Bulk delete completed in ${data.duration}!\n` +
            `✅ Successfully deleted: ${successful} files\n` +
            `❌ Failed to delete: ${failed} files\n\n` +
            `Failed files: ${failedFiles}`
          );
        } else {
          alert(
            `🎉 Successfully deleted all ${successful} files in ${data.duration}!`
          );
        }
      } else {
        throw new Error(data.message || 'Bulk delete failed');
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Bulk delete error:', error);
      alert(
        `❌ Bulk delete failed after ${duration}ms!\n` +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
        `Please try again or delete files individually.`
      );
    } finally {
      setProcessing(false);
      setBulkMode(false);
      setSelectedFiles(new Set());
      onRefresh();
    }
  };

  const handleBulkShare = async () => {
    setProcessing(true);

    const shareLinks: string[] = [];

    for (const filename of selectedFiles) {
      try {
        const response = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename,
            isPublic: true,
            expiresIn: 24 // 24 hours
          })
        });

        const data = await response.json();
        if (data.success) {
          shareLinks.push(data.share.url);
        }
      } catch (error) {
        console.error(`Error sharing ${filename}:`, error);
      }
    }

    // Copy all links to clipboard
    if (shareLinks.length > 0) {
      await navigator.clipboard.writeText(shareLinks.join('\n'));
      alert(`${shareLinks.length} share links copied to clipboard!`);
    }

    setProcessing(false);
    setBulkMode(false);
    setSelectedFiles(new Set());
  };

  const handleBulkCompress = async () => {
    setProcessing(true);

    // Merge all selected ZIPs into one
    const JSZip = (await import('jszip')).default;
    const mergedZip = new JSZip();

    for (const filename of selectedFiles) {
      try {
        const response = await fetch(`/uploads/${filename}`);
        const blob = await response.blob();
        const zip = new JSZip();
        await zip.loadAsync(blob);

        // Add all files from this ZIP to the merged ZIP
        for (const [path, file] of Object.entries(zip.files)) {
          if (!file.dir) {
            const content = await file.async('blob');
            mergedZip.file(`${filename.replace('.zip', '')}/${path}`, content);
          }
        }
      } catch (error) {
        console.error(`Error processing ${filename}:`, error);
      }
    }

    const content = await mergedZip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merged-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    setProcessing(false);
    setBulkMode(false);
    setSelectedFiles(new Set());
  };

  if (!bulkMode) {
    return (
      <Button
        onClick={() => setBulkMode(true)}
        variant="outline"
        size="sm"
      >
        <CheckSquare className="h-4 w-4 mr-2" />
        Bulk Select
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
      <div className="flex items-center gap-2">
        <Button
          onClick={selectAll}
          variant="ghost"
          size="sm"
        >
          <CheckSquare className="h-4 w-4 mr-1" />
          All
        </Button>
        <Button
          onClick={deselectAll}
          variant="ghost"
          size="sm"
        >
          <XSquare className="h-4 w-4 mr-1" />
          None
        </Button>
      </div>

      <span className="text-sm font-medium">
        {selectedFiles.size} selected
      </span>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={selectedFiles.size === 0 || processing}
            size="sm"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileArchive className="h-4 w-4 mr-2" />
            )}
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleBulkDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download All
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleBulkShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share All
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleBulkCompress}>
            <Archive className="h-4 w-4 mr-2" />
            Merge & Compress
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleBulkDelete}
            className="text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        onClick={() => {
          setBulkMode(false);
          setSelectedFiles(new Set());
        }}
        variant="ghost"
        size="sm"
      >
        Cancel
      </Button>

      {/* Hidden checkboxes for each file */}
      <div className="hidden">
        {files.map(file => (
          <Checkbox
            key={file.filename}
            id={`bulk-${file.filename}`}
            checked={selectedFiles.has(file.filename)}
            onCheckedChange={() => toggleFileSelection(file.filename)}
          />
        ))}
      </div>
    </div>
  );
}

export function BulkCheckbox({
  filename,
  checked,
  onCheckedChange
}: {
  filename: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      onClick={(e) => e.stopPropagation()}
      className="mr-2"
    />
  );
}
