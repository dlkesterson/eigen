'use client';

import { useState, useEffect } from 'react';
import { useFolderIgnores, useSetFolderIgnores } from '@/hooks/useSyncthing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	FileX,
	X,
	Save,
	RefreshCw,
	Plus,
	Trash2,
	HelpCircle,
	FileText,
} from 'lucide-react';
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
			setPatterns(
				ignoreData.ignore.filter((p: string) => p.trim() !== '')
			);
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
			setPatterns(
				ignoreData.ignore.filter((p: string) => p.trim() !== '')
			);
			setHasChanges(false);
		}
	};

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
			<Card className='w-full max-w-2xl max-h-[85vh] flex flex-col bg-background/95 backdrop-blur-md border-border/50'>
				<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/50'>
					<CardTitle className='text-xl font-semibold flex items-center gap-2'>
						<FileX className='h-5 w-5 text-muted-foreground' />
						Ignore Patterns
						{folderLabel && (
							<span className='text-sm font-normal text-muted-foreground'>
								— {folderLabel}
							</span>
						)}
					</CardTitle>
					<div className='flex items-center gap-2'>
						<Button
							variant='ghost'
							size='icon'
							onClick={() => setShowHelp(!showHelp)}
							title='Help'
						>
							<HelpCircle
								className={cn(
									'h-4 w-4',
									showHelp && 'text-primary'
								)}
							/>
						</Button>
						<Button
							variant='ghost'
							size='icon'
							onClick={() => refetch()}
							disabled={isLoading}
						>
							<RefreshCw
								className={cn(
									'h-4 w-4',
									isLoading && 'animate-spin'
								)}
							/>
						</Button>
						<Button
							variant='ghost'
							size='icon'
							onClick={() => onOpenChange(false)}
						>
							<X className='h-4 w-4' />
						</Button>
					</div>
				</CardHeader>

				{showHelp && (
					<div className='p-4 bg-muted/30 border-b border-border/50 text-sm'>
						<h4 className='font-medium mb-2'>Pattern Syntax</h4>
						<ul className='space-y-1 text-muted-foreground text-xs'>
							<li>
								•{' '}
								<code className='bg-muted px-1 rounded'>*</code>{' '}
								— matches any characters except path separator
							</li>
							<li>
								•{' '}
								<code className='bg-muted px-1 rounded'>
									**
								</code>{' '}
								— matches any characters including path
								separator
							</li>
							<li>
								•{' '}
								<code className='bg-muted px-1 rounded'>?</code>{' '}
								— matches a single character
							</li>
							<li>
								•{' '}
								<code className='bg-muted px-1 rounded'>
									[abc]
								</code>{' '}
								— matches any character in the brackets
							</li>
							<li>
								•{' '}
								<code className='bg-muted px-1 rounded'>!</code>{' '}
								prefix — negates the pattern (include instead of
								ignore)
							</li>
							<li>
								•{' '}
								<code className='bg-muted px-1 rounded'>/</code>{' '}
								prefix — anchors to folder root
							</li>
							<li>
								•{' '}
								<code className='bg-muted px-1 rounded'>
									//
								</code>{' '}
								prefix — comment line
							</li>
						</ul>
					</div>
				)}

				<CardContent className='flex-1 overflow-hidden p-4 space-y-4'>
					{/* Add new pattern */}
					<div className='flex gap-2'>
						<input
							type='text'
							value={newPattern}
							onChange={(e) => setNewPattern(e.target.value)}
							onKeyDown={(e) =>
								e.key === 'Enter' && handleAddPattern()
							}
							placeholder='Enter pattern (e.g., *.log or node_modules)'
							className='flex-1 h-9 px-3 rounded-md border border-border/50 bg-background/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50'
						/>
						<Button
							onClick={handleAddPattern}
							disabled={!newPattern.trim()}
							size='sm'
						>
							<Plus className='h-4 w-4 mr-1' />
							Add
						</Button>
					</div>

					{/* Current patterns */}
					<div className='space-y-2'>
						<h4 className='text-sm font-medium text-muted-foreground'>
							Current Patterns ({patterns.length})
						</h4>
						<div className='max-h-[200px] overflow-y-auto space-y-1 border border-border/30 rounded-md p-2 bg-muted/20'>
							{isLoading ? (
								<div className='flex items-center justify-center py-4'>
									<RefreshCw className='h-5 w-5 animate-spin text-muted-foreground' />
								</div>
							) : patterns.length === 0 ? (
								<div className='flex flex-col items-center py-4 text-muted-foreground text-sm'>
									<FileText className='h-6 w-6 mb-1' />
									<span>No ignore patterns defined</span>
								</div>
							) : (
								patterns.map((pattern, index) => (
									<div
										key={index}
										className='flex items-center justify-between px-2 py-1 rounded hover:bg-muted/50 group'
									>
										<code className='text-sm font-mono'>
											{pattern}
										</code>
										<Button
											variant='ghost'
											size='icon'
											className='h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity'
											onClick={() =>
												handleRemovePattern(index)
											}
										>
											<Trash2 className='h-3 w-3 text-destructive' />
										</Button>
									</div>
								))
							)}
						</div>
					</div>

					{/* Common patterns */}
					<div className='space-y-2'>
						<h4 className='text-sm font-medium text-muted-foreground'>
							Quick Add Common Patterns
						</h4>
						<div className='flex flex-wrap gap-1 max-h-[120px] overflow-y-auto'>
							{commonPatterns.map(({ pattern, description }) => (
								<button
									key={pattern}
									onClick={() =>
										handleAddCommonPattern(pattern)
									}
									className={cn(
										'px-2 py-1 text-xs rounded border border-border/50 bg-background/50',
										'hover:bg-primary/10 hover:border-primary/50 transition-colors',
										patterns.includes(pattern) &&
											'opacity-50 cursor-not-allowed'
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

				<div className='p-4 border-t border-border/50 flex items-center justify-between'>
					<div className='text-xs text-muted-foreground'>
						{hasChanges && (
							<span className='text-yellow-500'>
								• Unsaved changes
							</span>
						)}
					</div>
					<div className='flex gap-2'>
						<Button
							variant='outline'
							onClick={handleReset}
							disabled={!hasChanges}
						>
							Reset
						</Button>
						<Button
							onClick={handleSave}
							disabled={
								!hasChanges || setIgnoresMutation.isPending
							}
						>
							{setIgnoresMutation.isPending ? (
								<RefreshCw className='h-4 w-4 mr-2 animate-spin' />
							) : (
								<Save className='h-4 w-4 mr-2' />
							)}
							Save Patterns
						</Button>
					</div>
				</div>
			</Card>
		</div>
	);
}
