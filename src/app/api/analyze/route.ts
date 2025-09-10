import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
  try {
    const { filename, keywords } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { success: false, message: 'No filename provided' },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
    const fileBuffer = await readFile(filePath);

    const zip = new JSZip();
    await zip.loadAsync(fileBuffer);

    const results: any[] = [];
    const searchKeywords = keywords || ['paypal', 'wallet', 'bitcoin', 'crypto', 'password'];

    // Analyze each file in the ZIP
    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (!zipEntry.dir) {
        const content = await zipEntry.async('string');
        const matches: string[] = [];

        // Search for keywords
        searchKeywords.forEach((keyword: string) => {
          const regex = new RegExp(keyword, 'gi');
          const found = content.match(regex);
          if (found && found.length > 0) {
            matches.push(`${keyword} (${found.length} occurrences)`);
          }
        });

        if (matches.length > 0) {
          results.push({
            file: relativePath,
            matches,
            preview: content.substring(0, 200) + '...'
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      filename,
      results,
      totalMatches: results.length
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to analyze file' },
      { status: 500 }
    );
  }
}
