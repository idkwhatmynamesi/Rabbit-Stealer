import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const METADATA_FILE = path.join(process.cwd(), 'data', 'metadata.json');

interface FileMetadata {
  filename: string;
  tags: string[];
  customFields: Record<string, any>;
  description?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  project?: string;
  department?: string;
  confidentiality?: 'public' | 'internal' | 'confidential' | 'secret';
  retention?: {
    policy: string;
    expiresAt?: string;
  };
  relations?: {
    parentFile?: string;
    childFiles?: string[];
    relatedFiles?: string[];
  };
  annotations?: Array<{
    id: string;
    text: string;
    author: string;
    timestamp: string;
  }>;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadMetadata(): Map<string, FileMetadata> {
  ensureDataDir();
  if (fs.existsSync(METADATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
      const metadataMap = new Map<string, FileMetadata>();
      Object.entries(data).forEach(([filename, metadata]) => {
        metadataMap.set(filename, metadata as FileMetadata);
      });
      return metadataMap;
    } catch {
      return new Map();
    }
  }
  return new Map();
}

function saveMetadata(metadata: Map<string, FileMetadata>) {
  ensureDataDir();
  const metadataObj: Record<string, FileMetadata> = {};
  metadata.forEach((value, key) => {
    metadataObj[key] = value;
  });
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadataObj, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
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

    const {
      filename,
      tags,
      customFields,
      description,
      category,
      priority,
      project,
      department,
      confidentiality,
      retention,
      relations
    } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { success: false, message: 'Filename is required' },
        { status: 400 }
      );
    }

    const metadata = loadMetadata();
    const existingMetadata: FileMetadata = metadata.get(filename) || {
      filename,
      tags: [],
      customFields: {},
      annotations: []
    };

    // Update metadata
    const updatedMetadata: FileMetadata = {
      ...existingMetadata,
      filename,
      tags: tags || existingMetadata.tags,
      customFields: { ...existingMetadata.customFields, ...customFields },
      description: description !== undefined ? description : existingMetadata.description,
      category: category !== undefined ? category : existingMetadata.category,
      priority: priority !== undefined ? priority : existingMetadata.priority,
      project: project !== undefined ? project : existingMetadata.project,
      department: department !== undefined ? department : existingMetadata.department,
      confidentiality: confidentiality !== undefined ? confidentiality : existingMetadata.confidentiality,
      retention: retention !== undefined ? retention : existingMetadata.retention,
      relations: relations !== undefined ? relations : existingMetadata.relations,
      lastModifiedBy: payload.userId,
      lastModifiedAt: new Date().toISOString()
    };

    metadata.set(filename, updatedMetadata);
    saveMetadata(metadata);

    return NextResponse.json({
      success: true,
      metadata: updatedMetadata
    });
  } catch (error) {
    console.error('Metadata update error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update metadata' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const tag = searchParams.get('tag');
    const category = searchParams.get('category');
    const project = searchParams.get('project');

    const metadata = loadMetadata();

    if (filename) {
      // Get specific file metadata
      const fileMetadata = metadata.get(filename);
      if (!fileMetadata) {
        return NextResponse.json({
          success: true,
          metadata: {
            filename,
            tags: [],
            customFields: {},
            annotations: []
          }
        });
      }
      return NextResponse.json({
        success: true,
        metadata: fileMetadata
      });
    }

    // Filter metadata based on query parameters
    let results = Array.from(metadata.values());

    if (tag) {
      results = results.filter(m => m.tags.includes(tag));
    }

    if (category) {
      results = results.filter(m => m.category === category);
    }

    if (project) {
      results = results.filter(m => m.project === project);
    }

    // Get tag cloud
    const tagCloud = new Map<string, number>();
    results.forEach(m => {
      m.tags.forEach(tag => {
        tagCloud.set(tag, (tagCloud.get(tag) || 0) + 1);
      });
    });

    // Get category distribution
    const categoryDistribution = new Map<string, number>();
    results.forEach(m => {
      if (m.category) {
        categoryDistribution.set(m.category, (categoryDistribution.get(m.category) || 0) + 1);
      }
    });

    return NextResponse.json({
      success: true,
      metadata: results,
      stats: {
        total: results.length,
        tagCloud: Array.from(tagCloud.entries()).map(([tag, count]) => ({ tag, count })),
        categories: Array.from(categoryDistribution.entries()).map(([category, count]) => ({ category, count }))
      }
    });
  } catch (error) {
    console.error('Metadata retrieval error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve metadata' },
      { status: 500 }
    );
  }
}

// Add annotation to a file
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
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

    const { filename, annotation } = await request.json();

    if (!filename || !annotation) {
      return NextResponse.json(
        { success: false, message: 'Filename and annotation are required' },
        { status: 400 }
      );
    }

    const metadata = loadMetadata();
    const fileMetadata: FileMetadata = metadata.get(filename) || {
      filename,
      tags: [],
      customFields: {},
      annotations: []
    };

    // Add new annotation
    const newAnnotation = {
      id: Math.random().toString(36).substr(2, 9),
      text: annotation,
      author: payload.userId,
      timestamp: new Date().toISOString()
    };

    fileMetadata.annotations = fileMetadata.annotations || [];
    fileMetadata.annotations.push(newAnnotation);

    metadata.set(filename, fileMetadata);
    saveMetadata(metadata);

    return NextResponse.json({
      success: true,
      annotation: newAnnotation,
      totalAnnotations: fileMetadata.annotations.length
    });
  } catch (error) {
    console.error('Annotation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to add annotation' },
      { status: 500 }
    );
  }
}

// Bulk tag operations
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token || !verifyToken(token)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { filenames, operation, tags } = await request.json();

    if (!filenames || !operation || !tags) {
      return NextResponse.json(
        { success: false, message: 'Filenames, operation, and tags are required' },
        { status: 400 }
      );
    }

    const metadata = loadMetadata();
    let updatedCount = 0;

    filenames.forEach((filename: string) => {
      const fileMetadata: FileMetadata = metadata.get(filename) || {
        filename,
        tags: [],
        customFields: {}
      };

      switch (operation) {
        case 'add':
          fileMetadata.tags = Array.from(new Set([...fileMetadata.tags, ...tags]));
          break;
        case 'remove':
          fileMetadata.tags = fileMetadata.tags.filter(t => !tags.includes(t));
          break;
        case 'replace':
          fileMetadata.tags = tags;
          break;
      }

      metadata.set(filename, fileMetadata);
      updatedCount++;
    });

    saveMetadata(metadata);

    return NextResponse.json({
      success: true,
      message: `Updated tags for ${updatedCount} files`,
      updatedCount
    });
  } catch (error) {
    console.error('Bulk tag operation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update tags' },
      { status: 500 }
    );
  }
}
