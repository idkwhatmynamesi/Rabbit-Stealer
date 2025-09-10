<?php
// CORS headers for API access
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Configuration
$upload_dir = "uploads/";
$max_file_size = 100 * 1024 * 1024; // 100MB
$allowed_extensions = ['zip'];

// Create upload directory if it doesn't exist
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Function to generate random filename
function generateRandomFilename($extension) {
    return bin2hex(random_bytes(16)) . '_' . time() . '.' . $extension;
}

// Function to get file info
function getFileInfo($filepath) {
    $filesize = filesize($filepath);
    return [
        'size' => $filesize,
        'size_formatted' => formatBytes($filesize),
        'upload_time' => date('Y-m-d H:i:s', filectime($filepath)),
        'mime_type' => mime_content_type($filepath)
    ];
}

// Function to format bytes
function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];

    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);

    $bytes /= pow(1024, $pow);

    return round($bytes, $precision) . ' ' . $units[$pow];
}

// Main upload handler
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Check if file was uploaded
        if (!isset($_FILES['zipfile']) || $_FILES['zipfile']['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('No file uploaded or upload error occurred');
        }

        $uploaded_file = $_FILES['zipfile'];

        // Validate file size
        if ($uploaded_file['size'] > $max_file_size) {
            throw new Exception('File size exceeds maximum allowed size of ' . formatBytes($max_file_size));
        }

        // Get file extension
        $file_extension = strtolower(pathinfo($uploaded_file['name'], PATHINFO_EXTENSION));

        // Validate extension
        if (!in_array($file_extension, $allowed_extensions)) {
            throw new Exception('Invalid file type. Only ZIP files are allowed');
        }

        // Verify it's actually a ZIP file
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime_type = finfo_file($finfo, $uploaded_file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mime_type, ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip'])) {
            throw new Exception('File is not a valid ZIP archive');
        }

        // Generate random filename
        $new_filename = generateRandomFilename($file_extension);
        $destination = $upload_dir . $new_filename;

        // Move uploaded file
        if (!move_uploaded_file($uploaded_file['tmp_name'], $destination)) {
            throw new Exception('Failed to save uploaded file');
        }

        // Get file information
        $file_info = getFileInfo($destination);

        // Return success response
        echo json_encode([
            'success' => true,
            'message' => 'File uploaded successfully',
            'data' => [
                'filename' => $new_filename,
                'original_name' => $uploaded_file['name'],
                'path' => $destination,
                'url' => 'http://' . $_SERVER['HTTP_HOST'] . '/' . $destination,
                'size' => $file_info['size'],
                'size_formatted' => $file_info['size_formatted'],
                'upload_time' => $file_info['upload_time'],
                'mime_type' => $file_info['mime_type']
            ]
        ]);

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed. Use POST to upload files.'
    ]);
}
?>
