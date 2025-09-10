'use client';

import { FileUploader } from '@/components/file-uploader';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();

  const handleUploadComplete = () => {
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload ZIP Files</h1>
        <p className="mt-2 text-gray-600">
          Upload your ZIP files for processing and analysis
        </p>
      </div>

      <FileUploader onUploadComplete={handleUploadComplete} />

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Upload Information</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Maximum file size: 100MB</li>
          <li>• Supported format: ZIP files only</li>
          <li>• Files are automatically renamed with random identifiers</li>
          <li>• You can upload multiple files sequentially</li>
        </ul>
      </div>
    </div>
  );
}
