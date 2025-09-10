'use client';

import { FileList } from '@/components/file-list';

export default function HomePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Rabbit</h1>
        <p className="mt-2 text-gray-600">
          Panel/Logs
        </p>
      </div>

      <FileList />
    </div>
  );
}
