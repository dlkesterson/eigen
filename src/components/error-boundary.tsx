'use client';

import React, { Component, ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Download } from 'lucide-react';

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error: Error | null;
	errorInfo: React.ErrorInfo | null;
	errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
	private autoRecoveryTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor(props: Props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
			errorCount: 0,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// Log to our logger
		logger.error('React Error Boundary caught an error', {
			component: 'ErrorBoundary',
			error: {
				message: error.message,
				stack: error.stack,
				name: error.name,
			},
			componentStack: errorInfo.componentStack,
		});

		this.setState((prev) => ({
			errorInfo,
			errorCount: prev.errorCount + 1,
		}));

		// Call optional error handler
		this.props.onError?.(error, errorInfo);

		// Auto-recover if error count is low
		if (this.state.errorCount < 3) {
			this.autoRecoveryTimeout = setTimeout(() => {
				this.handleReset();
			}, 3000);
		}
	}

	componentWillUnmount() {
		if (this.autoRecoveryTimeout) {
			clearTimeout(this.autoRecoveryTimeout);
		}
	}

	handleReset = () => {
		if (this.autoRecoveryTimeout) {
			clearTimeout(this.autoRecoveryTimeout);
			this.autoRecoveryTimeout = null;
		}
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	handleDownloadLogs = () => {
		logger.downloadLogs();
	};

	handleReload = () => {
		window.location.reload();
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className='flex items-center justify-center min-h-screen bg-slate-950 p-4'>
					<Card className='w-full max-w-2xl border-red-500/30 bg-slate-900'>
						<CardHeader>
							<div className='flex items-center gap-3'>
								<div className='flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/20'>
									<AlertTriangle className='h-6 w-6 text-red-400' />
								</div>
								<div>
									<CardTitle className='text-white'>
										Something went wrong
									</CardTitle>
									<p className='text-sm text-slate-400 mt-1'>
										The application encountered an
										unexpected error
									</p>
								</div>
							</div>
						</CardHeader>
						<CardContent className='space-y-4'>
							{/* Error Details */}
							<div className='rounded-lg bg-slate-800 p-4'>
								<p className='text-sm font-medium text-red-400 mb-2'>
									{this.state.error?.name}:{' '}
									{this.state.error?.message}
								</p>
								<pre className='text-xs text-slate-400 overflow-x-auto max-h-32 overflow-y-auto'>
									{this.state.error?.stack}
								</pre>
							</div>

							{/* Component Stack */}
							{this.state.errorInfo && (
								<details className='rounded-lg bg-slate-800 p-4'>
									<summary className='text-sm font-medium text-slate-300 cursor-pointer hover:text-slate-200'>
										Component Stack
									</summary>
									<pre className='text-xs text-slate-400 mt-2 overflow-x-auto max-h-48 overflow-y-auto'>
										{this.state.errorInfo.componentStack}
									</pre>
								</details>
							)}

							{/* Recovery count */}
							{this.state.errorCount > 0 && (
								<p className='text-xs text-slate-500'>
									Recovery attempt {this.state.errorCount} of
									3
									{this.state.errorCount < 3 &&
										' - Auto-recovering in 3s...'}
								</p>
							)}

							{/* Actions */}
							<div className='flex gap-2 flex-wrap'>
								<Button
									onClick={this.handleReset}
									className='flex-1 bg-indigo-600 hover:bg-indigo-700'
								>
									<RefreshCw className='mr-2 h-4 w-4' />
									Try Again
								</Button>
								<Button
									onClick={this.handleDownloadLogs}
									variant='outline'
									className='border-slate-700 bg-slate-800 hover:bg-slate-700'
								>
									<Download className='mr-2 h-4 w-4' />
									Download Logs
								</Button>
								<Button
									onClick={this.handleReload}
									variant='outline'
									className='border-slate-700 bg-slate-800 hover:bg-slate-700'
								>
									Reload App
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			);
		}

		return this.props.children;
	}
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
	WrappedComponent: React.ComponentType<P>,
	fallback?: ReactNode
) {
	return function WithErrorBoundary(props: P) {
		return (
			<ErrorBoundary fallback={fallback}>
				<WrappedComponent {...props} />
			</ErrorBoundary>
		);
	};
}
