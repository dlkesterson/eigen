'use client';

/**
 * AISearchBar - Semantic file search component powered by transformers.js
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Search,
	Sparkles,
	Loader2,
	Brain,
	X,
	FileText,
	Folder,
	AlertCircle,
} from 'lucide-react';
import { useAISearch, type AIStatus } from '@/hooks/useAISearch';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

interface SearchResult {
	path: string;
	score: number;
}

interface AISearchBarProps {
	onResultSelect?: (path: string) => void;
	className?: string;
}

export function AISearchBar({ onResultSelect, className }: AISearchBarProps) {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [showResults, setShowResults] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const resultsRef = useRef<HTMLDivElement>(null);

	const aiEnabled = useAppStore((state) => state.aiEnabled);
	const { status, statusMessage, isReady, initialize, search, progress } =
		useAISearch({ enabled: aiEnabled });

	// Initialize AI model when component mounts (only if enabled)
	useEffect(() => {
		if (aiEnabled && status === 'idle') {
			initialize();
		}
	}, [aiEnabled, status, initialize]);

	// Search with debounce
	useEffect(() => {
		if (!aiEnabled || !query.trim() || !isReady) {
			setResults([]);
			return;
		}

		const timer = setTimeout(async () => {
			setIsSearching(true);
			try {
				const searchResults = await search(query);
				setResults(searchResults);
				setSelectedIndex(0);
			} catch (error) {
				console.error('Search error:', error);
			} finally {
				setIsSearching(false);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [query, isReady, search]);

	// Keyboard navigation
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (!showResults || results.length === 0) return;

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					setSelectedIndex((i) =>
						Math.min(i + 1, results.length - 1)
					);
					break;
				case 'ArrowUp':
					e.preventDefault();
					setSelectedIndex((i) => Math.max(i - 1, 0));
					break;
				case 'Enter':
					e.preventDefault();
					if (results[selectedIndex]) {
						onResultSelect?.(results[selectedIndex].path);
						setShowResults(false);
						setQuery('');
					}
					break;
				case 'Escape':
					e.preventDefault();
					setShowResults(false);
					break;
			}
		},
		[showResults, results, selectedIndex, onResultSelect]
	);

	// Close results when clicking outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				resultsRef.current &&
				!resultsRef.current.contains(e.target as Node) &&
				inputRef.current &&
				!inputRef.current.contains(e.target as Node)
			) {
				setShowResults(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () =>
			document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const getStatusIcon = () => {
		switch (status) {
			case 'loading':
				return (
					<Loader2 className='h-4 w-4 animate-spin text-primary' />
				);
			case 'ready':
				return <Sparkles className='h-4 w-4 text-primary' />;
			case 'error':
				return <AlertCircle className='h-4 w-4 text-destructive' />;
			case 'disabled':
				return <Brain className='h-4 w-4 text-muted-foreground/50' />;
			default:
				return <Brain className='h-4 w-4 text-muted-foreground' />;
		}
	};

	const getFileName = (path: string) => {
		const parts = path.split('/');
		return parts[parts.length - 1];
	};

	const getParentPath = (path: string) => {
		const parts = path.split('/');
		return parts.slice(0, -1).join('/');
	};

	return (
		<div className={cn('relative', className)}>
			{/* Search Input */}
			<div className='relative'>
				<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
				<input
					ref={inputRef}
					type='text'
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setShowResults(true);
					}}
					onFocus={() => setShowResults(true)}
					onKeyDown={handleKeyDown}
					placeholder={
						!aiEnabled
							? 'AI search disabled'
							: isReady
							? 'Search files semantically...'
							: 'Loading AI model...'
					}
					disabled={status === 'loading' || status === 'disabled'}
					className={cn(
						'w-full pl-10 pr-20 py-2 rounded-lg',
						'bg-muted/50 border border-border',
						'text-sm placeholder:text-muted-foreground',
						'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
						'disabled:opacity-50 disabled:cursor-not-allowed',
						'transition-all duration-200'
					)}
				/>

				{/* Status indicator */}
				<div className='absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2'>
					{isSearching && (
						<Loader2 className='h-4 w-4 animate-spin' />
					)}
					{query && (
						<button
							onClick={() => {
								setQuery('');
								setResults([]);
							}}
							className='p-1 hover:bg-muted rounded'
						>
							<X className='h-3 w-3' />
						</button>
					)}
					{getStatusIcon()}
				</div>
			</div>

			{/* Status message during loading */}
			{status === 'loading' && (
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					className='absolute top-full left-0 right-0 mt-2 p-3 bg-card border border-border rounded-lg shadow-lg'
				>
					<div className='flex items-center gap-3'>
						<Loader2 className='h-5 w-5 animate-spin text-primary' />
						<div>
							<p className='text-sm font-medium'>
								Loading AI Model
							</p>
							<p className='text-xs text-muted-foreground'>
								{statusMessage}
							</p>
						</div>
					</div>
					{progress && (
						<div className='mt-2'>
							<div className='h-1 bg-muted rounded-full overflow-hidden'>
								<motion.div
									className='h-full bg-primary'
									initial={{ width: 0 }}
									animate={{
										width: `${
											(progress.current /
												progress.total) *
											100
										}%`,
									}}
								/>
							</div>
						</div>
					)}
				</motion.div>
			)}

			{/* Search Results */}
			<AnimatePresence>
				{showResults && results.length > 0 && (
					<motion.div
						ref={resultsRef}
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className='absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg max-h-[400px] overflow-y-auto z-50'
					>
						<div className='p-2'>
							<p className='text-xs text-muted-foreground px-2 py-1'>
								{results.length} results • Powered by AI
							</p>
						</div>
						<div className='border-t border-border'>
							{results.map((result, index) => (
								<motion.button
									key={result.path}
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: index * 0.05 }}
									onClick={() => {
										onResultSelect?.(result.path);
										setShowResults(false);
										setQuery('');
									}}
									className={cn(
										'w-full px-4 py-3 flex items-start gap-3 text-left',
										'hover:bg-muted/50 transition-colors',
										index === selectedIndex && 'bg-muted'
									)}
								>
									<FileText className='h-5 w-5 text-muted-foreground shrink-0 mt-0.5' />
									<div className='flex-1 min-w-0'>
										<p className='text-sm font-medium truncate'>
											{getFileName(result.path)}
										</p>
										<p className='text-xs text-muted-foreground truncate'>
											{getParentPath(result.path)}
										</p>
									</div>
									<div className='shrink-0'>
										<span className='text-xs px-2 py-1 rounded bg-primary/10 text-primary'>
											{Math.round(result.score * 100)}%
										</span>
									</div>
								</motion.button>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* No results */}
			<AnimatePresence>
				{showResults &&
					query &&
					!isSearching &&
					results.length === 0 &&
					isReady && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className='absolute top-full left-0 right-0 mt-2 p-6 bg-card border border-border rounded-lg shadow-lg text-center'
						>
							<Search className='h-8 w-8 text-muted-foreground mx-auto mb-2' />
							<p className='text-sm text-muted-foreground'>
								No files found
							</p>
							<p className='text-xs text-muted-foreground mt-1'>
								Try indexing your files first
							</p>
						</motion.div>
					)}
			</AnimatePresence>
		</div>
	);
}
