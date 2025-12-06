import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, FileText, Clock, HardDrive, CheckCircle } from 'lucide-react';

interface ConflictFile {
  id: string;
  path: string;
  folder: string;
  modifiedLocal: Date;
  modifiedRemote: Date;
  sizeLocal: number;
  sizeRemote: number;
  deviceName: string;
}

interface ConflictsPanelProps {
  onClose: () => void;
}

export function ConflictsPanel({ onClose }: ConflictsPanelProps) {
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);

  // Mock conflicts data - in real app, fetch from Syncthing API
  const conflicts: ConflictFile[] = [
    {
      id: '1',
      path: 'Documents/Project/README.md',
      folder: 'work-docs',
      modifiedLocal: new Date('2024-01-15T14:30:00'),
      modifiedRemote: new Date('2024-01-15T14:32:00'),
      sizeLocal: 2048,
      sizeRemote: 2156,
      deviceName: 'laptop-ubuntu',
    },
    {
      id: '2',
      path: 'Photos/vacation-2024/IMG_001.jpg',
      folder: 'photos',
      modifiedLocal: new Date('2024-01-14T09:15:00'),
      modifiedRemote: new Date('2024-01-14T09:20:00'),
      sizeLocal: 4194304,
      sizeRemote: 4198400,
      deviceName: 'phone-pixel',
    },
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleKeepLocal = (conflictId: string) => {
    // TODO: Call Tauri command to keep local version
    void conflictId;
  };

  const handleKeepRemote = (conflictId: string) => {
    // TODO: Call Tauri command to keep remote version
    void conflictId;
  };

  const handleKeepBoth = (conflictId: string) => {
    // TODO: Call Tauri command to keep both versions (rename one)
    void conflictId;
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Panel */}
      <motion.div
        className="relative max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">File Conflicts</h2>
              <p className="text-sm text-white/60">
                {conflicts.length} {conflicts.length === 1 ? 'file' : 'files'} with conflicting
                versions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(85vh-5rem)] overflow-hidden">
          {/* Conflict List */}
          <div className="w-1/2 overflow-y-auto border-r border-white/10 p-4">
            {conflicts.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-white/40">
                <CheckCircle className="mb-3 h-12 w-12" />
                <p className="text-sm">No conflicts found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conflicts.map((conflict) => (
                  <motion.button
                    key={conflict.id}
                    onClick={() => setSelectedConflict(conflict.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-all ${
                      selectedConflict === conflict.id
                        ? 'border-white/20 bg-white/10'
                        : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{conflict.path}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-white/40">{conflict.folder}</span>
                          <span className="text-xs text-white/20">•</span>
                          <span className="text-xs text-white/40">{conflict.deviceName}</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Conflict Details */}
          <div className="w-1/2 overflow-y-auto p-4">
            {selectedConflict ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedConflict}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {(() => {
                    const conflict = conflicts.find((c) => c.id === selectedConflict);
                    if (!conflict) return null;

                    return (
                      <div className="space-y-4">
                        {/* File Info */}
                        <div>
                          <h3 className="mb-2 text-sm font-medium text-white/60">File Path</h3>
                          <p className="rounded border border-white/10 bg-white/5 p-2 font-mono text-sm text-white">
                            {conflict.path}
                          </p>
                        </div>

                        {/* Local Version */}
                        <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-blue-400" />
                            <h3 className="text-sm font-semibold text-blue-400">Local Version</h3>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-white/60">Modified:</span>
                              <span className="font-mono text-white">
                                {formatDate(conflict.modifiedLocal)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/60">Size:</span>
                              <span className="font-mono text-white">
                                {formatFileSize(conflict.sizeLocal)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Remote Version */}
                        <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-purple-400" />
                            <h3 className="text-sm font-semibold text-purple-400">
                              Remote Version
                            </h3>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-white/60">Modified:</span>
                              <span className="font-mono text-white">
                                {formatDate(conflict.modifiedRemote)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/60">Size:</span>
                              <span className="font-mono text-white">
                                {formatFileSize(conflict.sizeRemote)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/60">Device:</span>
                              <span className="font-mono text-white">{conflict.deviceName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-2">
                          <button
                            onClick={() => handleKeepLocal(conflict.id)}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/20 px-4 py-2.5 text-sm font-medium text-blue-400 transition-colors hover:border-blue-500/40 hover:bg-blue-500/30"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Keep Local Version
                          </button>
                          <button
                            onClick={() => handleKeepRemote(conflict.id)}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/20 px-4 py-2.5 text-sm font-medium text-purple-400 transition-colors hover:border-purple-500/40 hover:bg-purple-500/30"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Keep Remote Version
                          </button>
                          <button
                            onClick={() => handleKeepBoth(conflict.id)}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/30 hover:bg-white/20"
                          >
                            <FileText className="h-4 w-4" />
                            Keep Both (Rename)
                          </button>
                        </div>

                        {/* Info */}
                        <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
                          <div className="flex gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
                            <p className="text-xs leading-relaxed text-white/70">
                              Conflicts occur when the same file is modified on multiple devices
                              between syncs. Choose which version to keep, or keep both with a
                              renamed copy.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-white/40">
                <FileText className="mb-3 h-12 w-12" />
                <p className="text-sm">Select a conflict to view details</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
