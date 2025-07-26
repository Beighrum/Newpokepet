import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PhotoUpload from '../PhotoUpload';
import * as imageValidation from '@/services/imageValidation';

// Mock the image validation service
vi.mock('@/services/imageValidation', () => ({
  validateImage: vi.fn()
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div data-testid="card" className={className} {...props}>{children}</div>
  ),
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  )
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>{children}</div>
  ),
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => <div data-testid="progress" data-value={value} />
}));

// Mock child components
vi.mock('../ImagePreview', () => ({
  default: ({ src, alt }: any) => <img data-testid="image-preview" src={src} alt={alt} />
}));

vi.mock('../ImageCropper', () => ({
  default: ({ src, onCropComplete, onCancel }: any) => (
    <div data-testid="image-cropper">
      <button onClick={() => onCropComplete(new Blob(['cropped']))}>Crop Complete</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}));

// Mock URL.createObjectURL
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn()
  },
  writable: true
});

describe('PhotoUpload', () => {
  const mockOnImageSelect = vi.fn();
  const mockOnUploadProgress = vi.fn();
  const mockOnUploadComplete = vi.fn();
  const mockOnUploadError = vi.fn();

  const defaultProps = {
    onImageSelect: mockOnImageSelect,
    onUploadProgress: mockOnUploadProgress,
    onUploadComplete: mockOnUploadComplete,
    onUploadError: mockOnUploadError
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (imageValidation.validateImage as any).mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: [],
      fileSize: 1024 * 1024,
      format: 'image/jpeg',
      dimensions: { width: 800, height: 600 },
      isSquare: false
    });
  });

  it('renders upload area initially', () => {
    render(<PhotoUpload {...defaultProps} />);

    expect(screen.getByText('Upload your pet\'s photo')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop your image here, or click to browse')).toBeInTheDocument();
    expect(screen.getByText('Choose File')).toBeInTheDocument();
  });

  it('shows accepted formats and file size limits', () => {
    render(
      <PhotoUpload 
        {...defaultProps} 
        maxFileSize={5}
        acceptedFormats={['image/jpeg', 'image/png']}
      />
    );

    expect(screen.getByText('Supported formats: JPEG, PNG')).toBeInTheDocument();
    expect(screen.getByText('Maximum file size: 5MB')).toBeInTheDocument();
  });

  it('shows square crop message when requireSquare is true', () => {
    render(<PhotoUpload {...defaultProps} requireSquare={true} />);

    expect(screen.getByText('Image will be cropped to square format')).toBeInTheDocument();
  });

  it('handles file selection via input', async () => {
    render(<PhotoUpload {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /choose file/i }).parentElement?.querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(imageValidation.validateImage).toHaveBeenCalledWith(file, {
        maxSizeInMB: 10,
        acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
        requireSquare: false
      });
    });

    await waitFor(() => {
      expect(mockOnImageSelect).toHaveBeenCalledWith(file);
    });
  });

  it('handles drag and drop', async () => {
    render(<PhotoUpload {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const dropZone = screen.getByTestId('card');

    // Simulate drag enter
    fireEvent.dragEnter(dropZone, {
      dataTransfer: { files: [file] }
    });

    expect(screen.getByText('Drop your photo here')).toBeInTheDocument();

    // Simulate drop
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] }
    });

    await waitFor(() => {
      expect(imageValidation.validateImage).toHaveBeenCalledWith(file, expect.any(Object));
    });
  });

  it('shows validation errors for invalid files', async () => {
    (imageValidation.validateImage as any).mockResolvedValue({
      isValid: false,
      errors: ['File size too large', 'Invalid format'],
      warnings: [],
      fileSize: 15 * 1024 * 1024,
      format: 'image/gif'
    });

    render(<PhotoUpload {...defaultProps} />);

    const file = new File(['test'], 'test.gif', { type: 'image/gif' });
    const input = screen.getByRole('button', { name: /choose file/i }).parentElement?.querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toHaveAttribute('data-variant', 'destructive');
      expect(screen.getByText('File size too large')).toBeInTheDocument();
      expect(screen.getByText('Invalid format')).toBeInTheDocument();
    });
  });

  it('shows image preview for valid files', async () => {
    render(<PhotoUpload {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /choose file/i }).parentElement?.querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByTestId('image-preview')).toBeInTheDocument();
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
      expect(screen.getByText('Valid image')).toBeInTheDocument();
    });
  });

  it('shows cropper for non-square images when requireSquare is true', async () => {
    (imageValidation.validateImage as any).mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: ['Image will be cropped to square format'],
      fileSize: 1024 * 1024,
      format: 'image/jpeg',
      dimensions: { width: 800, height: 600 },
      isSquare: false
    });

    render(<PhotoUpload {...defaultProps} requireSquare={true} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /choose file/i }).parentElement?.querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByTestId('image-cropper')).toBeInTheDocument();
    });
  });

  it('handles crop completion', async () => {
    (imageValidation.validateImage as any).mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: ['Image will be cropped to square format'],
      fileSize: 1024 * 1024,
      format: 'image/jpeg',
      dimensions: { width: 800, height: 600 },
      isSquare: false
    });

    render(<PhotoUpload {...defaultProps} requireSquare={true} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /choose file/i }).parentElement?.querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByTestId('image-cropper')).toBeInTheDocument();
    });

    const cropButton = screen.getByText('Crop Complete');
    fireEvent.click(cropButton);

    await waitFor(() => {
      expect(mockOnImageSelect).toHaveBeenCalledWith(file, expect.any(Blob));
    });
  });

  it('handles image removal', async () => {
    render(<PhotoUpload {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /choose file/i }).parentElement?.querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByTestId('image-preview')).toBeInTheDocument();
    });

    const removeButton = screen.getByRole('button', { name: '' }); // X button
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('image-preview')).not.toBeInTheDocument();
      expect(screen.getByText('Upload your pet\'s photo')).toBeInTheDocument();
    });
  });

  it('simulates upload progress', async () => {
    render(<PhotoUpload {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /choose file/i }).parentElement?.querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByText('Upload Image')).toBeInTheDocument();
    });

    const uploadButton = screen.getByText('Upload Image');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
      expect(screen.getByTestId('progress')).toBeInTheDocument();
    });

    // Wait for upload to complete
    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('handles upload cancellation', async () => {
    render(<PhotoUpload {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /choose file/i }).parentElement?.querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByText('Upload Image')).toBeInTheDocument();
    });

    const uploadButton = screen.getByText('Upload Image');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Cancel Upload')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel Upload');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
    });
  });

  it('formats file size correctly', async () => {
    render(<PhotoUpload {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1536 * 1024 }); // 1.5MB

    const input = screen.getByRole('button', { name: /choose file/i }).parentElement?.querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByText('Size: 1.5 MB')).toBeInTheDocument();
    });
  });
});