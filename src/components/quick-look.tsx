'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, File, Image, FileCode, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/utils';

interface QuickLookProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
  filePath: string;
  fileSize?: number;
}

// Determine file type based on extension
function getFileType(fileName: string): 'image' | 'text' | 'code' | 'unknown' {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const textExts = ['txt', 'md', 'markdown', 'log', 'csv', 'json', 'xml', 'yaml', 'yml', 'toml'];
  const codeExts = [
    'js',
    'ts',
    'jsx',
    'tsx',
    'py',
    'rb',
    'go',
    'rs',
    'java',
    'c',
    'cpp',
    'h',
    'css',
    'scss',
    'html',
    'sh',
    'bash',
    'zsh',
    'sql',
  ];

  if (imageExts.includes(ext)) return 'image';
  if (textExts.includes(ext)) return 'text';
  if (codeExts.includes(ext)) return 'code';
  return 'unknown';
}

export function QuickLook({ open, onClose, fileName, filePath, fileSize }: QuickLookProps) {
  const fileType = getFileType(fileName);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, onClose]);

  // Render the appropriate icon based on file type
  const renderFileIcon = (className: string) => {
    switch (fileType) {
      case 'image':
        return <Image className={className} />;
      case 'code':
        return <FileCode className={className} />;
      case 'text':
        return <FileText className={className} />;
      default:
        return <File className={className} />;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="border-border bg-card/95 relative m-4 flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-lg">
                  {renderFileIcon('text-primary h-5 w-5')}
                </div>
                <div>
                  <h3 className="text-foreground font-medium">{fileName}</h3>
                  {fileSize !== undefined && (
                    <p className="text-muted-foreground text-xs">{formatBytes(fileSize)}</p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Preview Content */}
            <div className="flex min-h-[300px] flex-1 items-center justify-center p-8">
              {fileType === 'image' ? (
                <div className="text-muted-foreground flex flex-col items-center gap-4">
                  <Image className="h-16 w-16" />
                  <p className="text-sm">Image preview</p>
                  <p className="text-center text-xs">
                    Image preview requires file system access.
                    <br />
                    Use the file explorer to view images.
                  </p>
                </div>
              ) : fileType === 'code' || fileType === 'text' ? (
                <div className="text-muted-foreground flex flex-col items-center gap-4">
                  {renderFileIcon('h-16 w-16')}
                  <p className="text-sm">{fileType === 'code' ? 'Source Code' : 'Text File'}</p>
                  <p className="text-center text-xs">
                    Text preview requires file system access.
                    <br />
                    Open in your default editor to view contents.
                  </p>
                </div>
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-4">
                  <File className="h-16 w-16" />
                  <p className="text-sm">No preview available</p>
                  <p className="text-center text-xs">
                    This file type cannot be previewed.
                    <br />
                    Open it with an appropriate application.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-border border-t px-4 py-3">
              <p className="text-muted-foreground truncate text-xs" title={filePath}>
                {filePath}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to manage Quick Look state
export function useQuickLook() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    path: string;
    size?: number;
  } | null>(null);

  const openQuickLook = useCallback((file: { name: string; path: string; size?: number }) => {
    setSelectedFile(file);
    setIsOpen(true);
  }, []);

  const closeQuickLook = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle spacebar
  const handleKeyDown = useCallback(
    (e: KeyboardEvent, currentFile: { name: string; path: string; size?: number } | null) => {
      if (e.code === 'Space' && currentFile && !isOpen) {
        e.preventDefault();
        openQuickLook(currentFile);
      }
    },
    [isOpen, openQuickLook]
  );

  return {
    isOpen,
    selectedFile,
    openQuickLook,
    closeQuickLook,
    handleKeyDown,
  };
}
