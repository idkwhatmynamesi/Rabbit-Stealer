export interface FileStats {
  name: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionMethod: string;
  fileType: string;
  isCompressible: boolean;
}

export interface CompressionAnalysis {
  totalOriginalSize: number;
  totalCompressedSize: number;
  overallCompressionRatio: number;
  fileCount: number;
  averageCompressionRatio: number;
  bestCompressedFile: FileStats | null;
  worstCompressedFile: FileStats | null;
  filesByType: Map<string, FileStats[]>;
  recommendations: string[];
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function getFileType(filename: string): string {
  const ext = getFileExtension(filename);

  const typeMap: Record<string, string> = {
    // Documents
    'txt': 'Text',
    'doc': 'Document',
    'docx': 'Document',
    'pdf': 'PDF',
    'rtf': 'Document',
    'odt': 'Document',

    // Images
    'jpg': 'Image',
    'jpeg': 'Image',
    'png': 'Image',
    'gif': 'Image',
    'bmp': 'Image',
    'svg': 'Image',
    'webp': 'Image',

    // Videos
    'mp4': 'Video',
    'avi': 'Video',
    'mov': 'Video',
    'wmv': 'Video',
    'flv': 'Video',
    'mkv': 'Video',

    // Audio
    'mp3': 'Audio',
    'wav': 'Audio',
    'flac': 'Audio',
    'aac': 'Audio',
    'ogg': 'Audio',
    'wma': 'Audio',

    // Archives
    'zip': 'Archive',
    'rar': 'Archive',
    '7z': 'Archive',
    'tar': 'Archive',
    'gz': 'Archive',

    // Code
    'js': 'Code',
    'ts': 'Code',
    'jsx': 'Code',
    'tsx': 'Code',
    'html': 'Code',
    'css': 'Code',
    'py': 'Code',
    'java': 'Code',
    'cpp': 'Code',
    'c': 'Code',
    'h': 'Code',
    'hpp': 'Code',
    'cs': 'Code',
    'php': 'Code',
    'rb': 'Code',
    'go': 'Code',
    'rs': 'Code',
    'swift': 'Code',
    'kt': 'Code',
    'xml': 'Code',
    'json': 'Code',
    'yml': 'Code',
    'yaml': 'Code',

    // Data
    'csv': 'Data',
    'xls': 'Data',
    'xlsx': 'Data',
    'sql': 'Data',
    'db': 'Data',

    // Executables
    'exe': 'Executable',
    'dll': 'Executable',
    'so': 'Executable',
    'app': 'Executable',
  };

  return typeMap[ext] || 'Other';
}

export function isCompressibleFile(filename: string): boolean {
  const ext = getFileExtension(filename);

  // Already compressed formats
  const preCompressed = [
    'jpg', 'jpeg', 'png', 'gif', 'webp',
    'mp3', 'mp4', 'avi', 'mov', 'mkv',
    'zip', 'rar', '7z', 'gz',
    'pdf'
  ];

  return !preCompressed.includes(ext);
}

export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  if (originalSize === 0) return 0;
  return ((originalSize - compressedSize) / originalSize) * 100;
}

export function analyzeCompression(files: FileStats[]): CompressionAnalysis {
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  let bestCompressedFile: FileStats | null = null;
  let worstCompressedFile: FileStats | null = null;
  const filesByType = new Map<string, FileStats[]>();

  files.forEach(file => {
    totalOriginalSize += file.originalSize;
    totalCompressedSize += file.compressedSize;

    // Track best and worst compression
    if (!bestCompressedFile || file.compressionRatio > bestCompressedFile.compressionRatio) {
      bestCompressedFile = file;
    }
    if (!worstCompressedFile || file.compressionRatio < worstCompressedFile.compressionRatio) {
      worstCompressedFile = file;
    }

    // Group by type
    const type = file.fileType;
    if (!filesByType.has(type)) {
      filesByType.set(type, []);
    }
    filesByType.get(type)!.push(file);
  });

  const overallCompressionRatio = calculateCompressionRatio(totalOriginalSize, totalCompressedSize);
  const averageCompressionRatio = files.length > 0
    ? files.reduce((sum, file) => sum + file.compressionRatio, 0) / files.length
    : 0;

  const recommendations = generateRecommendations(files, filesByType, overallCompressionRatio);

  return {
    totalOriginalSize,
    totalCompressedSize,
    overallCompressionRatio,
    fileCount: files.length,
    averageCompressionRatio,
    bestCompressedFile,
    worstCompressedFile,
    filesByType,
    recommendations
  };
}

export function generateRecommendations(
  files: FileStats[],
  filesByType: Map<string, FileStats[]>,
  overallCompressionRatio: number
): string[] {
  const recommendations: string[] = [];

  // Overall compression analysis
  if (overallCompressionRatio < 20) {
    recommendations.push('Low compression ratio detected. Consider using higher compression levels or different algorithms.');
  } else if (overallCompressionRatio > 70) {
    recommendations.push('Excellent compression ratio achieved! Your files are well optimized.');
  }

  // Check for already compressed files
  const preCompressedFiles = files.filter(f => !f.isCompressible);
  if (preCompressedFiles.length > files.length * 0.5) {
    recommendations.push(`${preCompressedFiles.length} files are already in compressed formats (JPEG, MP3, etc.). These won't benefit from additional compression.`);
  }

  // Check for text/code files
  const textFiles = filesByType.get('Text') || [];
  const codeFiles = filesByType.get('Code') || [];
  const compressibleCount = textFiles.length + codeFiles.length;

  if (compressibleCount > 0) {
    const avgTextCompression = [...textFiles, ...codeFiles].reduce((sum, f) => sum + f.compressionRatio, 0) / compressibleCount;
    if (avgTextCompression < 50) {
      recommendations.push('Text and code files show low compression. Consider using DEFLATE with maximum compression level.');
    }
  }

  // Check for images
  const imageFiles = filesByType.get('Image') || [];
  if (imageFiles.length > 0) {
    const uncompressedImages = imageFiles.filter(f => f.isCompressible);
    if (uncompressedImages.length > 0) {
      recommendations.push(`Found ${uncompressedImages.length} uncompressed images (BMP, uncompressed TIFF). Convert to PNG or JPEG for better storage.`);
    }
  }

  // Large file recommendations
  const largeFiles = files.filter(f => f.originalSize > 10 * 1024 * 1024); // > 10MB
  if (largeFiles.length > 0) {
    recommendations.push(`${largeFiles.length} large files detected (>10MB). Consider splitting the archive or using solid compression.`);
  }

  // Compression method recommendations
  const hasVideoAudio = (filesByType.get('Video')?.length || 0) + (filesByType.get('Audio')?.length || 0) > 0;
  if (hasVideoAudio) {
    recommendations.push('Media files detected. Consider storing them separately as they don\'t compress well in ZIP format.');
  }

  // Archive format recommendations
  if (files.length > 100) {
    recommendations.push('Large number of files detected. Consider using 7z format for better compression ratio.');
  }

  // Duplicate detection hint
  const fileNames = files.map(f => f.name.split('/').pop() || '');
  const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    recommendations.push(`Potential duplicate files detected. Removing duplicates could save space.`);
  }

  return recommendations;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function getCompressionMethodName(method: string): string {
  const methodMap: Record<string, string> = {
    '0': 'Stored (no compression)',
    '8': 'Deflated',
    '9': 'Deflate64',
    '12': 'BZIP2',
    '14': 'LZMA',
    '95': 'XZ',
    '96': 'JPEG',
    '97': 'WavPack',
    '98': 'PPMd',
    '99': 'AES Encrypted'
  };

  return methodMap[method] || `Method ${method}`;
}

export function suggestOptimalSettings(analysis: CompressionAnalysis): {
  format: string;
  level: string;
  method: string;
  splitSize?: string;
} {
  const { filesByType, fileCount, totalOriginalSize } = analysis;

  // Determine primary content type
  let primaryType = 'Mixed';
  let maxCount = 0;
  filesByType.forEach((files, type) => {
    if (files.length > maxCount) {
      maxCount = files.length;
      primaryType = type;
    }
  });

  // Base recommendations
  let format = 'ZIP';
  let level = '9'; // Maximum compression
  let method = 'DEFLATE';
  let splitSize: string | undefined;

  // Adjust based on content
  if (primaryType === 'Text' || primaryType === 'Code') {
    format = '7Z';
    method = 'LZMA2';
    level = '9';
  } else if (primaryType === 'Image' || primaryType === 'Video' || primaryType === 'Audio') {
    format = 'ZIP';
    method = 'STORE'; // No compression for already compressed
    level = '0';
  } else if (fileCount > 1000) {
    format = '7Z';
    method = 'LZMA2';
    level = '5'; // Balance speed and compression
  }

  // Check if splitting is needed
  if (totalOriginalSize > 2 * 1024 * 1024 * 1024) { // > 2GB
    splitSize = '700M'; // CD size for compatibility
  }

  return { format, level, method, splitSize };
}
