import { NextRequest, NextResponse } from 'next/server';
import { analyzeZipFile, extractScreenshot, searchInZipFiles } from '@/lib/zip-analyzer';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { filename, action, searchTerm, caseSensitive } = await request.json();
    
    if (!filename) {
      return NextResponse.json(
        { success: false, message: 'Filename is required' },
        { status: 400 }
      );
    }
    
    const zipPath = path.join(process.cwd(), 'public', 'uploads', filename);
    
    if (!fs.existsSync(zipPath)) {
      return NextResponse.json(
        { success: false, message: 'File not found' },
        { status: 404 }
      );
    }
    
    switch (action) {
      case 'analyze':
        const analysis = await analyzeZipFile(zipPath);
        return NextResponse.json({
          success: true,
          analysis
        });
        
      case 'extract-screenshot':
        const { screenshotPath } = await request.json();
        if (!screenshotPath) {
          return NextResponse.json(
            { success: false, message: 'Screenshot path is required' },
            { status: 400 }
          );
        }
        
        const screenshotBuffer = await extractScreenshot(zipPath, screenshotPath);
        if (screenshotBuffer) {
          // Convert to base64 for sending to client
          const base64 = screenshotBuffer.toString('base64');
          const mimeType = screenshotPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          
          return NextResponse.json({
            success: true,
            screenshot: `data:${mimeType};base64,${base64}`
          });
        } else {
          return NextResponse.json(
            { success: false, message: 'Screenshot not found' },
            { status: 404 }
          );
        }
        
      case 'search':
        if (!searchTerm) {
          return NextResponse.json(
            { success: false, message: 'Search term is required' },
            { status: 400 }
          );
        }
        
        const searchResults = await searchInZipFiles(zipPath, searchTerm, caseSensitive || false);
        return NextResponse.json({
          success: true,
          results: searchResults
        });
        
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('ZIP analysis error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to analyze ZIP file' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get('filename');
    
    if (!filename) {
      return NextResponse.json(
        { success: false, message: 'Filename is required' },
        { status: 400 }
      );
    }
    
    const zipPath = path.join(process.cwd(), 'public', 'uploads', filename);
    
    if (!fs.existsSync(zipPath)) {
      return NextResponse.json(
        { success: false, message: 'File not found' },
        { status: 404 }
      );
    }
    
    const analysis = await analyzeZipFile(zipPath);
    
    // If has screenshot, extract it
    let screenshotData = null;
    if (analysis.hasScreenshot && analysis.screenshotPath) {
      const screenshotBuffer = await extractScreenshot(zipPath, analysis.screenshotPath);
      if (screenshotBuffer) {
        const mimeType = analysis.screenshotPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        screenshotData = `data:${mimeType};base64,${screenshotBuffer.toString('base64')}`;
      }
    }
    
    return NextResponse.json({
      success: true,
      analysis,
      screenshot: screenshotData
    });
  } catch (error) {
    console.error('ZIP analysis error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to analyze ZIP file' },
      { status: 500 }
    );
  }
}