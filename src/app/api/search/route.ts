import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
  try {
    const { query, fileNames, searchType = 'all', caseSensitive = false } = await request.json();

    if (!query) {
      return NextResponse.json(
        { success: false, message: 'Search query is required' },
        { status: 400 }
      );
    }

    const searchResults: any[] = [];
    const searchPattern = caseSensitive ? query : query.toLowerCase();

    // Search in each specified file or all files
    const filesToSearch = fileNames || await getAllZipFiles();

    for (const filename of filesToSearch) {
      try {
        const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
        const fileBuffer = await readFile(filePath);

        const zip = new JSZip();
        await zip.loadAsync(fileBuffer);

        const matches: any[] = [];

        // Search through each file in the ZIP
        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
          if (!zipEntry.dir) {
            let shouldSearch = false;

            // Determine if we should search this file
            if (searchType === 'all') {
              shouldSearch = true;
            } else if (searchType === 'filename') {
              const fileName = caseSensitive ? relativePath : relativePath.toLowerCase();
              if (fileName.includes(searchPattern)) {
                matches.push({
                  type: 'filename',
                  path: relativePath,
                  match: relativePath
                });
              }
              continue;
            } else if (searchType === 'content') {
              // Only search text files for content
              const ext = relativePath.split('.').pop()?.toLowerCase();
              const textExtensions = ['txt', 'md', 'json', 'xml', 'csv', 'log', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'rb', 'go', 'rs', 'html', 'css', 'scss', 'yml', 'yaml', 'toml', 'ini', 'conf', 'sh', 'bat'];
              shouldSearch = textExtensions.includes(ext || '');
            }

            if (shouldSearch && searchType !== 'filename') {
              try {
                const content = await zipEntry.async('string');
                const searchContent = caseSensitive ? content : content.toLowerCase();

                if (searchContent.includes(searchPattern)) {
                  // Find line numbers and context
                  const lines = content.split('\n');
                  const matchingLines: any[] = [];

                  lines.forEach((line, index) => {
                    const searchLine = caseSensitive ? line : line.toLowerCase();
                    if (searchLine.includes(searchPattern)) {
                      matchingLines.push({
                        lineNumber: index + 1,
                        content: line.trim(),
                        preview: getContextPreview(lines, index)
                      });
                    }
                  });

                  if (matchingLines.length > 0) {
                    matches.push({
                      type: 'content',
                      path: relativePath,
                      matches: matchingLines.slice(0, 5), // Limit to first 5 matches
                      totalMatches: matchingLines.length
                    });
                  }
                }
              } catch {
                // Skip binary files or files that can't be read as text
              }
            }
          }
        }

        if (matches.length > 0) {
          searchResults.push({
            filename,
            matches,
            totalMatches: matches.length
          });
        }
      } catch (error) {
        console.error(`Error searching ${filename}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      query,
      results: searchResults,
      totalFiles: searchResults.length,
      totalMatches: searchResults.reduce((sum, r) => sum + r.totalMatches, 0)
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, message: 'Search failed' },
      { status: 500 }
    );
  }
}

function getContextPreview(lines: string[], matchIndex: number): string {
  const start = Math.max(0, matchIndex - 1);
  const end = Math.min(lines.length - 1, matchIndex + 1);

  const context: string[] = [];
  for (let i = start; i <= end; i++) {
    if (i === matchIndex) {
      context.push(`>>> ${lines[i].trim()}`);
    } else {
      context.push(`    ${lines[i].trim()}`);
    }
  }

  return context.join('\n');
}

async function getAllZipFiles(): Promise<string[]> {
  try {
    const { readdir } = await import('fs/promises');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const files = await readdir(uploadsDir);
    return files.filter(f => f.endsWith('.zip'));
  } catch {
    return [];
  }
}
