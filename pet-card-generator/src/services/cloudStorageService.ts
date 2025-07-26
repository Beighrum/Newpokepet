import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject, 
  getMetadata, 
  updateMetadata,
  UploadTask,
  UploadTaskSnapshot
} from 'firebase/storage';
import { storage } from '@/lib/firebase';

export interface UploadOptions {
  contentType?: string;
  customMetadata?: Record<string, string>;
  cacheControl?: string;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  onComplete?: (downloadURL: string) => void;
}

export interface FileMetadata {
  name: string;
  fullPath: string;
  size: number;
  contentType: string;
  timeCreated: string;
  updated: string;
  downloadURL: string;
  customMetadata?: Record<string, string>;
}

export interface UploadResult {
  downloadURL: string;
  fullPath: string;
  size: number;
  contentType: string;
  metadata: FileMetadata;
}

/**
 * Cloud Storage Service for handling file uploads and management
 */
export class CloudStorageService {
  private readonly IMAGES_PATH = 'images';
  private readonly ANIMATIONS_PATH = 'animations';
  private readonly THUMBNAILS_PATH = 'thumbnails';
  private readonly TEMP_PATH = 'temp';

  /**
   * Upload original pet image
   */
  async uploadOriginalImage(
    userId: string, 
    file: File, 
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const fileName = this.generateFileName(file.name, 'original');
    const filePath = `${this.IMAGES_PATH}/${userId}/original/${fileName}`;
    
    return this.uploadFile(filePath, file, {
      contentType: file.type,
      customMetadata: {
        userId,
        type: 'original',
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      },
      ...options
    });
  }

  /**
   * Upload processed/generated card image
   */
  async uploadProcessedImage(
    userId: string, 
    blob: Blob, 
    originalFileName: string,
    metadata: {
      cardId?: string;
      style?: string;
      aiModel?: string;
      processingTime?: number;
    } = {},
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const fileName = this.generateFileName(originalFileName, 'processed');
    const filePath = `${this.IMAGES_PATH}/${userId}/processed/${fileName}`;
    
    return this.uploadFile(filePath, blob, {
      contentType: 'image/jpeg',
      customMetadata: {
        userId,
        type: 'processed',
        originalName: originalFileName,
        cardId: metadata.cardId || '',
        style: metadata.style || '',
        aiModel: metadata.aiModel || '',
        processingTime: metadata.processingTime?.toString() || '',
        generatedAt: new Date().toISOString()
      },
      ...options
    });
  }

  /**
   * Upload thumbnail image
   */
  async uploadThumbnail(
    userId: string, 
    blob: Blob, 
    originalFileName: string,
    size: { width: number; height: number },
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const fileName = this.generateFileName(originalFileName, 'thumb');
    const filePath = `${this.THUMBNAILS_PATH}/${userId}/${fileName}`;
    
    return this.uploadFile(filePath, blob, {
      contentType: 'image/jpeg',
      customMetadata: {
        userId,
        type: 'thumbnail',
        originalName: originalFileName,
        width: size.width.toString(),
        height: size.height.toString(),
        createdAt: new Date().toISOString()
      },
      ...options
    });
  }

  /**
   * Upload animation file (GIF)
   */
  async uploadAnimation(
    userId: string, 
    blob: Blob, 
    originalFileName: string,
    animationMetadata: {
      cardId?: string;
      type: 'standard' | 'boomerang' | 'fallback';
      frameCount: number;
      duration: number;
      fileSize: number;
    },
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const fileName = this.generateFileName(originalFileName, 'anim', 'gif');
    const filePath = `${this.ANIMATIONS_PATH}/${userId}/${fileName}`;
    
    return this.uploadFile(filePath, blob, {
      contentType: 'image/gif',
      customMetadata: {
        userId,
        type: 'animation',
        originalName: originalFileName,
        cardId: animationMetadata.cardId || '',
        animationType: animationMetadata.type,
        frameCount: animationMetadata.frameCount.toString(),
        duration: animationMetadata.duration.toString(),
        fileSize: animationMetadata.fileSize.toString(),
        createdAt: new Date().toISOString()
      },
      ...options
    });
  }

  /**
   * Upload temporary file (for processing)
   */
  async uploadTempFile(
    userId: string, 
    file: File | Blob, 
    fileName: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const tempFileName = this.generateFileName(fileName, 'temp');
    const filePath = `${this.TEMP_PATH}/${userId}/${tempFileName}`;
    
    return this.uploadFile(filePath, file, {
      contentType: file instanceof File ? file.type : 'application/octet-stream',
      customMetadata: {
        userId,
        type: 'temporary',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      },
      cacheControl: 'public, max-age=3600', // 1 hour cache
      ...options
    });
  }

  /**
   * Generic file upload with progress tracking
   */
  private async uploadFile(
    filePath: string, 
    file: File | Blob, 
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const storageRef = ref(storage, filePath);
    
    try {
      let uploadTask: UploadTask;
      
      if (options.onProgress) {
        // Use resumable upload for progress tracking
        uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: options.contentType,
          customMetadata: options.customMetadata,
          cacheControl: options.cacheControl || 'public, max-age=31536000' // 1 year default
        });

        // Track progress
        uploadTask.on('state_changed', 
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            options.onProgress?.(progress);
          },
          (error) => {
            options.onError?.(error);
            throw error;
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            options.onComplete?.(downloadURL);
          }
        );

        await uploadTask;
      } else {
        // Simple upload without progress tracking
        await uploadBytes(storageRef, file, {
          contentType: options.contentType,
          customMetadata: options.customMetadata,
          cacheControl: options.cacheControl || 'public, max-age=31536000'
        });
      }

      // Get download URL and metadata
      const [downloadURL, metadata] = await Promise.all([
        getDownloadURL(storageRef),
        getMetadata(storageRef)
      ]);

      return {
        downloadURL,
        fullPath: metadata.fullPath,
        size: metadata.size,
        contentType: metadata.contentType || 'application/octet-stream',
        metadata: {
          name: metadata.name,
          fullPath: metadata.fullPath,
          size: metadata.size,
          contentType: metadata.contentType || 'application/octet-stream',
          timeCreated: metadata.timeCreated,
          updated: metadata.updated,
          downloadURL,
          customMetadata: metadata.customMetadata
        }
      };

    } catch (error) {
      console.error('Upload failed:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(filePath: string): Promise<void> {
    const storageRef = ref(storage, filePath);
    
    try {
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Delete failed:', error);
      throw new Error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(filePaths: string[]): Promise<void> {
    const deletePromises = filePaths.map(path => this.deleteFile(path));
    await Promise.all(deletePromises);
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string): Promise<FileMetadata> {
    const storageRef = ref(storage, filePath);
    
    try {
      const [metadata, downloadURL] = await Promise.all([
        getMetadata(storageRef),
        getDownloadURL(storageRef)
      ]);

      return {
        name: metadata.name,
        fullPath: metadata.fullPath,
        size: metadata.size,
        contentType: metadata.contentType || 'application/octet-stream',
        timeCreated: metadata.timeCreated,
        updated: metadata.updated,
        downloadURL,
        customMetadata: metadata.customMetadata
      };
    } catch (error) {
      console.error('Get metadata failed:', error);
      throw new Error(`Get metadata failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(
    filePath: string, 
    metadata: {
      contentType?: string;
      customMetadata?: Record<string, string>;
      cacheControl?: string;
    }
  ): Promise<void> {
    const storageRef = ref(storage, filePath);
    
    try {
      await updateMetadata(storageRef, metadata);
    } catch (error) {
      console.error('Update metadata failed:', error);
      throw new Error(`Update metadata failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate optimized file name
   */
  private generateFileName(originalName: string, suffix: string, extension?: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const baseName = originalName.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const ext = extension || originalName.split('.').pop() || 'jpg';
    
    return `${baseName}_${suffix}_${timestamp}_${randomId}.${ext}`;
  }

  /**
   * Create thumbnail from image
   */
  async createThumbnail(
    imageFile: File, 
    maxWidth: number = 300, 
    maxHeight: number = 300,
    quality: number = 0.8
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(imageFile);
    });
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File, options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    maxDimensions?: { width: number; height: number };
  } = {}): Promise<{ valid: boolean; errors: string[] }> {
    return new Promise((resolve) => {
      const errors: string[] = [];
      const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
      const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/gif'];

      // Check file size
      if (file.size > maxSize) {
        errors.push(`File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(maxSize)})`);
      }

      // Check file type
      if (!allowedTypes.includes(file.type)) {
        errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      }

      // Check dimensions for images
      if (file.type.startsWith('image/') && options.maxDimensions) {
        const img = new Image();
        img.onload = () => {
          if (img.width > options.maxDimensions!.width || img.height > options.maxDimensions!.height) {
            errors.push(`Image dimensions (${img.width}x${img.height}) exceed maximum allowed (${options.maxDimensions!.width}x${options.maxDimensions!.height})`);
          }
          resolve({ valid: errors.length === 0, errors });
        };
        img.onerror = () => {
          errors.push('Invalid image file');
          resolve({ valid: false, errors });
        };
        img.src = URL.createObjectURL(file);
      } else {
        resolve({ valid: errors.length === 0, errors });
      }
    });
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clean up temporary files older than specified age
   */
  async cleanupTempFiles(userId: string, maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    // Note: This would require Cloud Functions in a real implementation
    // as client-side code cannot list all files in a directory
    console.log(`Cleanup temp files for user ${userId} older than ${maxAge}ms`);
  }

  /**
   * Get storage usage for user
   */
  async getUserStorageUsage(userId: string): Promise<{
    totalSize: number;
    fileCount: number;
    breakdown: {
      images: { size: number; count: number };
      animations: { size: number; count: number };
      thumbnails: { size: number; count: number };
      temp: { size: number; count: number };
    };
  }> {
    // Note: This would require Cloud Functions in a real implementation
    // as client-side code cannot list all files in a directory
    return {
      totalSize: 0,
      fileCount: 0,
      breakdown: {
        images: { size: 0, count: 0 },
        animations: { size: 0, count: 0 },
        thumbnails: { size: 0, count: 0 },
        temp: { size: 0, count: 0 }
      }
    };
  }
}

// Export singleton instance
export const cloudStorageService = new CloudStorageService();

// Export types
export type { UploadOptions, FileMetadata, UploadResult };