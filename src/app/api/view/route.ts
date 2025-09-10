import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
  try {
    const { filename, path: filePath } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { success: false, message: 'No filename provided' },
        { status: 400 }
      );
    }

    const zipPath = path.join(process.cwd(), 'public', 'uploads', filename);
    const fileBuffer = await readFile(zipPath);

    const zip = new JSZip();
    await zip.loadAsync(fileBuffer);

    // If filePath is provided, extract and return that specific file
    if (filePath) {
      const zipEntry = zip.file(filePath);
      if (!zipEntry) {
        return NextResponse.json(
          { success: false, message: 'File not found in ZIP' },
          { status: 404 }
        );
      }

      try {
        const fileData = await zipEntry.async('nodebuffer');
        const base64Data = fileData.toString('base64');
        
        return NextResponse.json({
          success: true,
          filename,
          filePath,
          imageData: base64Data
        });
      } catch (error) {
        return NextResponse.json(
          { success: false, message: 'Failed to extract file from ZIP' },
          { status: 500 }
        );
      }
    }

    // If no filePath provided, return ZIP contents list
    const contents: any[] = [];

    // Get information about each file in the ZIP
    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      let size = 0;
      let compressedSize = 0;

      // Get size for files (not directories)
      if (!zipEntry.dir) {
        try {
          const data = await zipEntry.async('nodebuffer');
          size = data.length;
          compressedSize = data.length; // Approximation
        } catch {
          // Keep default 0 size if we can't read the file
        }
      }

      const stats = {
        name: relativePath,
        isDirectory: zipEntry.dir,
        size,
        compressedSize,
        date: zipEntry.date,
        comment: zipEntry.comment
      };

      contents.push(stats);
    }

    // Sort: directories first, then files
    contents.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      success: true,
      filename,
      contents,
      totalFiles: contents.filter(c => !c.isDirectory).length,
      totalFolders: contents.filter(c => c.isDirectory).length
    });
  } catch (error) {
    console.error('View error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to view file contents' },
      { status: 500 }
    );
  }
}
