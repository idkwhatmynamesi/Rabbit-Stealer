'use client';

import { useState } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export function FileUploader({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const zipFile = files.find(file => file.name.endsWith('.zip'));

    if (zipFile) {
      handleUpload(zipFile);
    } else {
      setUploadStatus('error');
      setStatusMessage('Please upload a ZIP file');
      setTimeout(() => {
        setUploadStatus('idle');
        setStatusMessage('');
      }, 3000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      setUploadStatus('error');
      setStatusMessage('Only ZIP files are allowed');
      return;
    }

    setUploading(true);
    setProgress(0);
    setUploadStatus('idle');

    const formData = new FormData();
    formData.append('zipfile', file);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (data.success) {
        setUploadStatus('success');
        setStatusMessage(`Successfully uploaded: ${data.data.filename}`);
        onUploadComplete?.();

        setTimeout(() => {
          setUploadStatus('idle');
          setStatusMessage('');
          setProgress(0);
        }, 3000);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      setUploadStatus('error');
      setStatusMessage('Upload failed. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />

        <p className="text-lg font-medium text-gray-900 mb-2">
          Drop your ZIP file here
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or click to browse from your computer
        </p>

        <input
          type="file"
          accept=".zip"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          disabled={uploading}
        />

        <label htmlFor="file-upload">
          <Button disabled={uploading} asChild>
            <span>Select ZIP File</span>
          </Button>
        </label>

        {uploading && (
          <div className="mt-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-500 mt-2">Uploading... {progress}%</p>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="mt-4 flex items-center justify-center text-green-600">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">{statusMessage}</span>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="mt-4 flex items-center justify-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
