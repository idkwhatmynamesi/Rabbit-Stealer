'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import Image from 'next/image';

export default function BuilderPage() {
  const handleDownloadBuilder = () => {
    window.open('/builder.exe', '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Download Builder</CardTitle>
          <CardDescription>
            Get the latest builder executable
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          <div className="relative w-48 h-48">
            <Image
              src="/linux.png"
              alt="Builder"
              fill
              className="object-contain"
              priority
            />
          </div>
          
          <Button
            onClick={handleDownloadBuilder}
            size="lg"
            className="w-full"
          >
            <Download className="h-5 w-5 mr-2" />
            Download Builder.exe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}