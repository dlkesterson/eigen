'use client';

import { useState } from 'react';
import { useConfig, useShareFolder } from '@/hooks/useSyncthing';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { X, Laptop, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShareFolderDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	folderId: string;
	folderLabel?: string;
}

export function ShareFolderDialog({
	open,
	onOpenChange,
	folderId,
	folderLabel,
}: ShareFolderDialogProps) {
	const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
	const { data: config } = useConfig();
	const shareFolder = useShareFolder();

	const handleShare = async () => {
		if (!selectedDevice) return;

		try {
			await shareFolder.mutateAsync({
				folderId,
				deviceId: selectedDevice,
			});
			toast.success(`Folder shared with device`);
			onOpenChange(false);
			setSelectedDevice(null);
		} catch (error) {
			console.error('Share folder error:', error);
			toast.error(
				`Failed to share folder: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}
	};

	if (!open) return null;

	// Filter out devices that already have this folder
	const availableDevices = config?.devices?.filter((device) => {
		// Find the current folder config
		const currentFolder = config.folders?.find((f) => f.id === folderId);
		// Check if this device is already in the folder's device list
		// Note: The backend returns 'devices' as an array of objects with 'deviceID'
		const isAlreadyShared = (currentFolder as any)?.devices?.some(
			(d: any) => d.deviceID === device.deviceID
		);
		return !isAlreadyShared;
	});

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs'>
			<Card className='w-full max-w-md border-slate-700 bg-slate-900 shadow-2xl'>
				<CardHeader className='relative'>
					<Button
						variant='ghost'
						size='icon'
						onClick={() => onOpenChange(false)}
						className='absolute right-4 top-4 text-slate-400 hover:text-white'
					>
						<X className='h-4 w-4' />
					</Button>
					<CardTitle className='text-xl text-white'>
						Share Folder
					</CardTitle>
					<CardDescription className='text-slate-400'>
						Select a device to sync "{folderLabel || folderId}"
						with.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='space-y-2'>
						{availableDevices?.length === 0 ? (
							<div className='py-8 text-center text-slate-500'>
								No new devices available to share with.
							</div>
						) : (
							availableDevices?.map((device) => (
								<div
									key={device.deviceID}
									onClick={() =>
										setSelectedDevice(device.deviceID)
									}
									className={cn(
										'flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all',
										selectedDevice === device.deviceID
											? 'border-indigo-500 bg-indigo-500/10'
											: 'border-slate-700 bg-slate-800 hover:border-slate-600'
									)}
								>
									<div className='flex items-center gap-3'>
										<div className='flex h-8 w-8 items-center justify-center rounded bg-slate-700'>
											<Laptop className='h-4 w-4 text-slate-300' />
										</div>
										<div className='flex flex-col'>
											<span className='text-sm font-medium text-white'>
												{device.name ||
													'Unnamed Device'}
											</span>
											<span className='font-mono text-[10px] text-slate-500'>
												{device.deviceID.slice(0, 12)}
												...
											</span>
										</div>
									</div>
									{selectedDevice === device.deviceID && (
										<Check className='h-4 w-4 text-indigo-400' />
									)}
								</div>
							))
						)}
					</div>

					<div className='flex justify-end gap-3 pt-2'>
						<Button
							variant='outline'
							onClick={() => onOpenChange(false)}
							className='border-slate-700 bg-transparent hover:bg-slate-800'
						>
							Cancel
						</Button>
						<Button
							onClick={handleShare}
							disabled={!selectedDevice || shareFolder.isPending}
							className='bg-indigo-600 hover:bg-indigo-700'
						>
							{shareFolder.isPending ? 'Sharing...' : 'Share'}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
