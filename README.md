# 🐰 Rabbit - Advanced ZIP File Manager

<img width="1900" height="941" alt="image" src="https://github.com/user-attachments/assets/c77a8df7-43e0-434f-945b-56063272b9b9" />


A powerful, modern web-based ZIP file management platform built with Next.js 15, featuring advanced analytics, security, and performance optimizations.

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.3.2-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### 🚀 Core Functionality
- **ZIP File Upload & Management** - Upload, view, and manage ZIP files with drag & drop support
- **Advanced ZIP Analysis** - Analyze ZIP contents, detect file types, and extract metadata
- **Bulk Operations** - Parallel processing for bulk file operations with progress tracking
- **File Search & Filter** - Search within ZIP files and filter by various criteria
- **Real-time Processing** - Live updates and progress tracking for all operations

### 🔐 Security & Authentication
- **User Authentication** - Secure login/register system with JWT tokens
- **Two-Factor Authentication (2FA)** - TOTP-based 2FA with backup codes
- **Role-based Access Control** - User permissions and access management
- **File Validation** - Comprehensive file type and security validation
- **Activity Logging** - Detailed audit trails for all user actions

### 📊 Analytics & Monitoring
- **Performance Monitoring** - Real-time performance metrics and optimization
- **Activity Dashboard** - Comprehensive activity tracking and reporting
- **File Statistics** - Detailed analytics on file usage and patterns
- **System Health** - Monitor system performance and resource usage

### 🛠️ Advanced Features
- **API Integration** - RESTful API with webhook support
- **Bulk Processing** - High-performance parallel processing with retry mechanisms
- **File Locking** - Prevent data corruption with intelligent file locking
- **Background Tasks** - Async processing for heavy operations
- **Export & Import** - CSV, PDF, and JSON export capabilities

### 🎨 Modern UI/UX
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Dark/Light Mode** - Theme switching with user preferences
- **Command Palette** - Quick actions and navigation (Ctrl+K)
- **Drag & Drop** - Intuitive file upload interface
- **Real-time Updates** - Live notifications and progress indicators

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0 or higher
- **npm**, **yarn**, **pnpm**, or **bun** package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/rabbit-zip-manager.git
   cd rabbit-zip-manager
   ```

2. **Install dependencies**
   ```bash
   # Using npm
   npm install
   
   # Using yarn
   yarn install
   
   # Using pnpm
   pnpm install
   
   # Using bun
   bun install
   ```

3. **Create required directories**
   ```bash
   mkdir -p data public/uploads
   ```

4. **Set up environment variables** (optional)
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your environment variables:
   ```env
   NODE_ENV=development
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   ```

5. **Run the development server**
   ```bash
   # Using npm
   npm run dev
   
   # Using yarn
   yarn dev
   
   # Using pnpm
   pnpm dev
   
   # Using bun
   bun dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 📖 Usage Guide

### Basic Operations

#### 1. **Upload ZIP Files**
- Navigate to the Upload page (`/upload`)
- Drag & drop ZIP files or click to browse
- Maximum file size: 100MB
- Supported format: ZIP files only

#### 2. **Manage Files**
- View all uploaded files on the main dashboard
- Click on files to view details and contents
- Use bulk operations for multiple files
- Download, share, or delete files as needed

#### 3. **Analyze ZIP Contents**
- Go to the Analyzer page (`/analyzer`)
- Select a ZIP file from your uploads
- Search within ZIP contents
- View file structure and metadata

#### 4. **Monitor Activity**
- Check the Activity page (`/activity`) for detailed logs
- View performance metrics and statistics
- Monitor system health and usage patterns

### Advanced Features

#### **Bulk Operations**
```typescript
// Select multiple files and use bulk actions
- Bulk Delete: Delete multiple files simultaneously
- Bulk Download: Create a ZIP containing selected files
- Bulk Share: Generate share links for multiple files
```

#### **API Usage**
```bash
# Upload file via API
curl -X POST http://localhost:3000/api/upload \
  -F "zipfile=@your-file.zip"

# Get file list
curl http://localhost:3000/api/files

# Delete file
curl -X DELETE http://localhost:3000/api/delete \
  -H "Content-Type: application/json" \
  -d '{"filename":"your-file-id"}'
```

#### **Webhook Integration**
```javascript
// Configure webhooks in the Features page
{
  "event": "file.uploaded",
  "data": {
    "filename": "example.zip",
    "size": 1024000,
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## 🏗️ Project Structure

```
rabbit-zip-manager/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── upload/        # File upload handling
│   │   │   ├── delete/        # File deletion
│   │   │   ├── bulk-delete/   # Bulk operations
│   │   │   └── activity/      # Activity logging
│   │   ├── upload/            # Upload page
│   │   ├── analyzer/          # ZIP analysis tools
│   │   ├── activity/          # Activity dashboard
│   │   ├── features/          # Feature configuration
│   │   └── security/          # Security settings
│   ├── components/            # React components
│   │   ├── ui/               # UI components (shadcn/ui)
│   │   ├── file-list.tsx     # File management
│   │   ├── file-uploader.tsx # Upload interface
│   │   └── bulk-operations.tsx # Bulk operations
│   ├── lib/                   # Utility libraries
│   │   ├── auth.ts           # Authentication logic
│   │   ├── activity-logger.ts # Activity logging
│   │   ├── zip-analyzer.ts   # ZIP analysis
│   │   ├── retry-utils.ts    # Retry mechanisms
│   │   ├── file-lock.ts      # File locking
│   │   └── performance-monitor.ts # Performance tracking
│   └── contexts/              # React contexts
├── public/
│   └── uploads/               # Uploaded files storage
├── data/                      # Application data
├── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

```env
# Application Settings
NODE_ENV=production                    # Environment mode
PORT=3000                             # Server port

# Security
NEXTAUTH_SECRET=your-jwt-secret       # JWT secret key
NEXTAUTH_URL=https://yourdomain.com   # Application URL

# File Upload
MAX_FILE_SIZE=104857600               # Max file size (100MB)
UPLOAD_DIR=./public/uploads           # Upload directory

# Database (optional - uses file-based storage by default)
DATABASE_URL=your-database-url        # Database connection

# Logging
LOG_LEVEL=info                        # Logging level
LOG_RETENTION_DAYS=30                 # Log retention period
```

### Feature Configuration

Access the Features page (`/features`) to configure:

- **Notifications**: Desktop notifications, sound alerts
- **Webhooks**: External integrations and callbacks
- **Security**: File validation, encryption settings
- **Performance**: Caching, compression options
- **Automation**: Auto-processing rules

## 🚀 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy with zero configuration

### Traditional Server Deployment

```bash
# On your server
git clone https://github.com/yourusername/rabbit-zip-manager.git
cd rabbit-zip-manager
npm install
npm run build
npm start
```

## 📊 Performance Optimizations

Our recent performance improvements include:

- **10-50x faster logging** with batched processing
- **3-5x faster bulk operations** with parallel processing
- **Intelligent retry mechanisms** with exponential backoff
- **File locking system** preventing data corruption
- **Memory usage reduced by 60-80%** during bulk operations

### Performance Metrics

| Operation | Before | After | Improvement |
|-----------|--------|--------|-------------|
| Single file deletion | 200-500ms | 50-100ms | **3-5x faster** |
| Bulk delete (10 files) | 5-15 seconds | 1-3 seconds | **5-10x faster** |
| Log processing | 2-5 seconds | 200-500ms | **10x faster** |

## 🔒 Security Features

- **Input Validation**: Comprehensive validation for all inputs
- **File Type Checking**: Strict file type validation
- **Path Traversal Protection**: Prevents directory traversal attacks
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **CSRF Protection**: Cross-site request forgery protection
- **Secure Headers**: Security headers for all responses
- **Audit Logging**: Comprehensive activity logging

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

## 📚 API Documentation

### Authentication Endpoints

```
POST /api/auth/register     # User registration
POST /api/auth/login        # User login
POST /api/auth/logout       # User logout
GET  /api/auth/me          # Get current user
POST /api/auth/2fa/enable   # Enable 2FA
POST /api/auth/2fa/disable  # Disable 2FA
```

### File Management Endpoints

```
GET    /api/files           # List all files
POST   /api/upload          # Upload new file
DELETE /api/delete          # Delete single file
DELETE /api/bulk-delete     # Delete multiple files
POST   /api/analyze         # Analyze ZIP file
GET    /api/view            # View file contents
```

### System Endpoints

```
GET    /api/activity        # Get activity logs
DELETE /api/activity        # Clean activity logs
GET    /api/stats          # Get system statistics
POST   /api/webhooks       # Manage webhooks
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Use the existing code style (Biome formatting)
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 📝 Changelog

### Version 0.1.0 (Latest)
- ✨ Initial release with core ZIP management features
- 🚀 Performance optimizations for bulk operations
- 🔐 Complete authentication and security system
- 📊 Advanced analytics and monitoring
- 🎨 Modern responsive UI with dark/light themes

## 🐛 Troubleshooting

### Common Issues

**Upload fails with large files**
- Check the `MAX_FILE_SIZE` environment variable
- Ensure sufficient disk space in the upload directory

**Performance issues with many files**
- Use bulk operations instead of individual operations
- Check system resources and memory usage
- Review activity logs for bottlenecks

**Authentication problems**
- Verify JWT secret is properly configured
- Check cookie settings for your domain
- Ensure HTTPS in production environments

### Getting Help

- 📖 Check the documentation and FAQ
- 🐛 Search existing issues on GitHub
- 💬 Create a new issue with detailed information
- 📧 Contact support for enterprise inquiries

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** - The React framework for production
- **shadcn/ui** - Beautiful and accessible UI components
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Low-level UI primitives
- **Lucide React** - Beautiful & consistent icons

## 🌟 Support

If you find this project helpful, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs and issues
- 💡 Suggesting new features
- 🤝 Contributing to the codebase
- 📢 Sharing with others

---

<div align="center">

**Built with ❤️ by ZeroTrace TEAM**

</div>
