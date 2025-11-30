'use client';

import { useState, useEffect } from 'react';
import { useFolderIgnores, useSetFolderIgnores } from '@/hooks/useSyncthing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileX, X, Save, RefreshCw, Plus, Trash2, HelpCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface IgnorePatternsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderLabel?: string;
}

const commonPatterns = [
  { pattern: '.DS_Store', description: 'macOS folder metadata' },
  { pattern: 'Thumbs.db', description: 'Windows thumbnail cache' },
  { pattern: 'desktop.ini', description: 'Windows folder settings' },
  { pattern: 'node_modules', description: 'Node.js dependencies' },
  { pattern: '.git', description: 'Git repository folder' },
  { pattern: '*.tmp', description: 'Temporary files' },
  { pattern: '*.log', description: 'Log files' },
  { pattern: '.env*', description: 'Environment files' },
  { pattern: '__pycache__', description: 'Python bytecode cache' },
  { pattern: '*.pyc', description: 'Python compiled files' },
  { pattern: 'target/', description: 'Rust/Java build output' },
  { pattern: 'dist/', description: 'Build distribution folder' },
  { pattern: 'build/', description: 'Build output folder' },
  { pattern: '.next/', description: 'Next.js build folder' },
  { pattern: '*.bak', description: 'Backup files' },
  { pattern: '~*', description: 'Temporary editor files' },
  { pattern: '#*#', description: 'Emacs auto-save files' },
  { pattern: '.*.swp', description: 'Vim swap files' },
];

export function IgnorePatternsDialog({
  open,
  onOpenChange,
  folderId,
  folderLabel,
}: IgnorePatternsDialogProps) {
  const [patterns, setPatterns] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: ignoreData, isLoading, refetch } = useFolderIgnores(folderId);
  const setIgnoresMutation = useSetFolderIgnores();

  // Initialize patterns from server data
  useEffect(() => {
    if (ignoreData?.ignore) {
      setPatterns(ignoreData.ignore.filter((p: string) => p.trim() !== ''));
      setHasChanges(false);
    }
  }, [ignoreData]);

  if (!open) return null;

  const handleAddPattern = () => {
    const trimmed = newPattern.trim();
    if (!trimmed) return;
    if (patterns.includes(trimmed)) {
      toast.error('Pattern already exists');
      return;
    }
    setPatterns([...patterns, trimmed]);
    setNewPattern('');
    setHasChanges(true);
  };

  const handleRemovePattern = (index: number) => {
    setPatterns(patterns.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleAddCommonPattern = (pattern: string) => {
    if (patterns.includes(pattern)) {
      toast.info('Pattern already added');
      return;
    }
    setPatterns([...patterns, pattern]);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await setIgnoresMutation.mutateAsync({
        folderId,
        ignorePatterns: patterns,
      });
      toast.success('Ignore patterns saved');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save ignore patterns');
    }
  };

  const handleReset = () => {
    if (ignoreData?.ignore) {
      setPatterns(ignoreData.ignore.filter((p: string) => p.trim() !== ''));
      setHasChanges(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <Card className="bg-background/95 border-border/50 flex max-h-[85vh] w-full max-w-2xl flex-col backdrop-blur-md">
        <CardHeader className="border-border/50 flex flex-row items-center justify-between space-y-0 border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <FileX className="text-muted-foreground h-5 w-5" />
            Ignore Patterns
            {folderLabel && (
              <span className="text-muted-foreground text-sm font-normal">— {folderLabel}</span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowHelp(!showHelp)} title="Help">
              <HelpCircle className={cn('h-4 w-4', showHelp && 'text-primary')} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {showHelp && (
          <div className="bg-muted/30 border-border/50 border-b p-4 text-sm">
            <h4 className="mb-2 font-medium">Pattern Syntax</h4>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>
                • <code className="bg-muted rounded px-1">*</code> — matches any characters except
                path separator
              </li>
              <li>
                • <code className="bg-muted rounded px-1">**</code> — matches any characters
                including path separator
              </li>
              <li>
                • <code className="bg-muted rounded px-1">?</code> — matches a single character
              </li>
              <li>
                • <code className="bg-muted rounded px-1">[abc]</code> — matches any character in
                the brackets
              </li>
              <li>
                • <code className="bg-muted rounded px-1">!</code> prefix — negates the pattern
                (include instead of ignore)
              </li>
              <li>
                • <code className="bg-muted rounded px-1">/</code> prefix — anchors to folder root
              </li>
              <li>
                • <code className="bg-muted rounded px-1">//</code> prefix — comment line
              </li>
            </ul>
          </div>
        )}

        <CardContent className="flex-1 space-y-4 overflow-hidden p-4">
          {/* Add new pattern */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPattern()}
              placeholder="Enter pattern (e.g., *.log or node_modules)"
              className="border-border/50 bg-background/50 placeholder:text-muted-foreground focus:ring-primary/50 h-9 flex-1 rounded-md border px-3 text-sm focus:ring-2 focus:outline-hidden"
            />
            <Button onClick={handleAddPattern} disabled={!newPattern.trim()} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Current patterns */}
          <div className="space-y-2">
            <h4 className="text-muted-foreground text-sm font-medium">
              Current Patterns ({patterns.length})
            </h4>
            <div className="border-border/30 bg-muted/20 max-h-[200px] space-y-1 overflow-y-auto rounded-md border p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="text-muted-foreground h-5 w-5 animate-spin" />
                </div>
              ) : patterns.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center py-4 text-sm">
                  <FileText className="mb-1 h-6 w-6" />
                  <span>No ignore patterns defined</span>
                </div>
              ) : (
                patterns.map((pattern, index) => (
                  <div
                    key={index}
                    className="hover:bg-muted/50 group flex items-center justify-between rounded px-2 py-1"
                  >
                    <code className="font-mono text-sm">{pattern}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => handleRemovePattern(index)}
                    >
                      <Trash2 className="text-destructive h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Common patterns */}
          <div className="space-y-2">
            <h4 className="text-muted-foreground text-sm font-medium">Quick Add Common Patterns</h4>
            <div className="flex max-h-[120px] flex-wrap gap-1 overflow-y-auto">
              {commonPatterns.map(({ pattern, description }) => (
                <button
                  key={pattern}
                  onClick={() => handleAddCommonPattern(pattern)}
                  className={cn(
                    'border-border/50 bg-background/50 rounded border px-2 py-1 text-xs',
                    'hover:bg-primary/10 hover:border-primary/50 transition-colors',
                    patterns.includes(pattern) && 'cursor-not-allowed opacity-50'
                  )}
                  disabled={patterns.includes(pattern)}
                  title={description}
                >
                  {pattern}
                </button>
              ))}
            </div>
          </div>
        </CardContent>

        <div className="border-border/50 flex items-center justify-between border-t p-4">
          <div className="text-muted-foreground text-xs">
            {hasChanges && <span className="text-yellow-500">• Unsaved changes</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
              Reset
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || setIgnoresMutation.isPending}>
              {setIgnoresMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Patterns
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
