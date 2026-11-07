'use client';

import * as React from 'react';
import { Upload, X, File, Image, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileUploadProps {
  label?: string;
  error?: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  onFilesChange: (files: File[]) => void;
  value?: File[];
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
}

interface FileWithPreview extends File {
  preview?: string;
  status?: 'pending' | 'uploading' | 'complete' | 'error';
  progress?: number;
}

export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      className,
      label,
      error,
      hint,
      accept,
      multiple = false,
      maxSize = 10 * 1024 * 1024, // 10MB default
      maxFiles = 10,
      onFilesChange,
      value = [],
      disabled = false,
      required = false,
      id,
    },
    ref
  ) => {
    const [files, setFiles] = React.useState<FileWithPreview[]>([]);
    const [dragActive, setDragActive] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const fieldId = id || `file-upload-${React.useId()}`;
    const errorId = `${fieldId}-error`;
    const hintId = `${fieldId}-hint`;

    // Sync with controlled value
    React.useEffect(() => {
      if (value) {
        setFiles(value.map((f) => ({ ...f, preview: URL.createObjectURL(f), status: 'complete' } as FileWithPreview)));
      }
    }, [value]);

    const formatFileSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const validateFile = (file: File): string | null => {
      if (file.size > maxSize) {
        return `File "${file.name}" exceeds maximum size of ${formatFileSize(maxSize)}`;
      }
      if (accept) {
        const acceptedTypes = accept.split(',').map((t) => t.trim());
        const isValidType = acceptedTypes.some((type) => {
          if (type.startsWith('.')) return file.name.endsWith(type);
          if (type.endsWith('/*')) return file.type.startsWith(type.slice(0, -1));
          return file.type === type;
        });
        if (!isValidType) {
          return `File "${file.name}" is not an accepted file type`;
        }
      }
      return null;
    };

    const handleFiles = (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const validFiles: FileWithPreview[] = [];
      const errors: string[] = [];

      for (const file of fileArray) {
        if (files.length + validFiles.length >= maxFiles) {
          errors.push(`Maximum ${maxFiles} files allowed`);
          break;
        }

        const validationError = validateFile(file);
        if (validationError) {
          errors.push(validationError);
          continue;
        }

        const fileWithPreview: FileWithPreview = {
          ...file,
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          status: 'pending',
        };
        validFiles.push(fileWithPreview);
      }

      setFiles((prev) => [...prev, ...validFiles]);
      onFilesChange([...files, ...validFiles]);

      if (errors.length > 0) {
        // Set error on the component
      }
    };

    const removeFile = (index: number) => {
      setFiles((prev) => {
        const newFiles = prev.filter((_, i) => i !== index);
        onFilesChange(newFiles);
        return newFiles;
      });
    };

    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'dragenter' || e.type === 'dragover') {
        setDragActive(true);
      } else if (e.type === 'dragleave') {
        setDragActive(false);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    };

    const handleClick = () => {
      if (!disabled) fileInputRef.current?.click();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    };

    const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

    const getFileIcon = (file: File) => {
      if (file.type.startsWith('image/')) return <Image className="h-5 w-5 text-semantic-brand-primary" />;
      return <File className="h-5 w-5 text-semantic-text-tertiary" />;
    };

    return (
      <div ref={ref} className={cn('w-full', className)}>
        {label && (
          <label htmlFor={fieldId} className="block text-body-sm font-medium text-semantic-text-primary mb-2">
            {label}
            {required && <span className="text-semantic-status-error ml-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div
          className={cn(
            'relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-fast',
            'focus:outline-none focus:ring-2 focus:ring-semantic-brand-primary focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            dragActive
              ? 'border-semantic-brand-primary bg-semantic-brand-primary/5'
              : 'border-semantic-border-primary hover:border-semantic-brand-primary hover:bg-semantic-bg-secondary',
            error && 'border-semantic-input-error bg-semantic-status-error-bg'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={label || 'File upload'}
          aria-describedby={describedBy}
          aria-invalid={!!error}
        >
          <input
            ref={fileInputRef}
            type="file"
            id={fieldId}
            accept={accept}
            multiple={multiple}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            onClick={(e) => e.stopPropagation()}
            disabled={disabled}
            aria-hidden="true"
          />

          {files.length === 0 && (
            <div className="flex flex-col items-center gap-3">
              <div className={cn('p-3 rounded-full', dragActive || error ? 'bg-semantic-brand-primary/10' : 'bg-semantic-bg-tertiary')}>
                <Upload className={cn('h-6 w-6', dragActive ? 'text-semantic-brand-primary' : 'text-semantic-text-tertiary')} />
              </div>
              <div className="text-body-sm text-semantic-text-secondary">
                <p className="font-medium text-semantic-text-primary">
                  {dragActive ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
                </p>
                {accept && <p className="text-caption text-semantic-text-tertiary mt-1">Accepted: {accept}</p>}
                <p className="text-caption text-semantic-text-tertiary mt-1">Max size: {formatFileSize(maxSize)}</p>
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-2 text-left max-h-60 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    file.status === 'error' ? 'border-semantic-status-error bg-semantic-status-error-bg' : 'border-semantic-border-primary bg-semantic-bg-secondary'
                  )}
                >
                  <div className="flex-shrink-0">{getFileIcon(file)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-semantic-text-primary truncate">{file.name}</p>
                    <p className="text-caption text-semantic-text-tertiary">{formatFileSize(file.size)}</p>
                    {file.status === 'uploading' && (
                      <div className="mt-1 h-1.5 bg-semantic-bg-tertiary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-semantic-brand-primary transition-all duration-fast"
                          style={{ width: `${file.progress || 0}%` }}
                        />
                      </div>
                    )}
                    {file.status === 'error' && (
                      <p className="text-caption text-semantic-status-error mt-1">Upload failed</p>
                    )}
                    {file.status === 'complete' && (
                      <p className="text-caption text-semantic-status-success mt-1 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Uploaded
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="p-1 rounded-md text-semantic-text-tertiary hover:text-semantic-status-error hover:bg-semantic-status-error-bg transition-colors"
                    aria-label={`Remove ${file.name}`}
                    disabled={file.status === 'uploading'}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="mt-1.5 text-caption text-semantic-status-error" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-caption text-semantic-text-tertiary">
            {hint}
          </p>
        )}

        {files.length > 0 && (
          <p className="mt-2 text-caption text-semantic-text-tertiary">
            {files.length} of {maxFiles} file{files.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>
    );
  }
);

FileUpload.displayName = 'FileUpload';