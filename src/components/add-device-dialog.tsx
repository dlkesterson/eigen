'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDeviceId, useAddDeviceAdvanced } from '@/hooks/useSyncthing';
import {
  Copy,
  Check,
  Plus,
  X,
  QrCode,
  Loader2,
  ChevronDown,
  ChevronUp,
  Gauge,
  Network,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AddDeviceDialogProps {
  open: boolean;
  onClose: () => void;
}

type CompressionType = 'metadata' | 'always' | 'never';

const compressionOptions: {
  value: CompressionType;
  label: string;
  description: string;
}[] = [
  {
    value: 'metadata',
    label: 'Metadata Only',
    description: 'Compress only metadata (recommended)',
  },
  {
    value: 'always',
    label: 'Always',
    description: 'Compress all data (slower, saves bandwidth)',
  },
  {
    value: 'never',
    label: 'Never',
    description: 'No compression (fastest, uses more bandwidth)',
  },
];

export function AddDeviceDialog({ open, onClose }: AddDeviceDialogProps) {
  const [remoteDeviceId, setRemoteDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced options
  const [addresses, setAddresses] = useState('dynamic');
  const [compression, setCompression] = useState<CompressionType>('metadata');
  const [introducer, setIntroducer] = useState(false);
  const [autoAcceptFolders, setAutoAcceptFolders] = useState(false);
  const [maxSendKbps, setMaxSendKbps] = useState<number>(0);
  const [maxRecvKbps, setMaxRecvKbps] = useState<number>(0);

  const { data: localDeviceId, isLoading: deviceIdLoading } = useDeviceId();
  const addDevice = useAddDeviceAdvanced();

  const handleCopyId = async () => {
    if (localDeviceId) {
      await navigator.clipboard.writeText(localDeviceId);
      setCopied(true);
      toast.success('Device ID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddDevice = async () => {
    if (!remoteDeviceId.trim()) {
      toast.error('Please enter a Device ID');
      return;
    }

    try {
      await addDevice.mutateAsync({
        deviceId: remoteDeviceId.trim().toUpperCase(),
        name: deviceName.trim() || 'Unnamed Device',
        addresses: addresses
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        compression,
        introducer,
        autoAcceptFolders,
        maxSendKbps: maxSendKbps > 0 ? maxSendKbps : undefined,
        maxRecvKbps: maxRecvKbps > 0 ? maxRecvKbps : undefined,
      });
      toast.success('Device added successfully');
      resetForm();
      onClose();
    } catch (error) {
      toast.error('Failed to add device');
    }
  };

  const resetForm = () => {
    setRemoteDeviceId('');
    setDeviceName('');
    setShowAdvanced(false);
    setAddresses('dynamic');
    setCompression('metadata');
    setIntroducer(false);
    setAutoAcceptFolders(false);
    setMaxSendKbps(0);
    setMaxRecvKbps(0);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
      <Card className="w-full max-w-lg border-slate-700 bg-slate-900 shadow-2xl">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-xl text-white">Connect a Device</CardTitle>
          <CardDescription className="text-slate-400">
            Share your Device ID with another device, or enter their Device ID to connect.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Your Device ID Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300">Your Device ID</label>
            <p className="text-xs text-slate-500">
              Share this ID with other devices you want to connect to.
            </p>
            <div className="flex gap-2">
              <div
                className={cn(
                  'flex-1 rounded-lg border border-slate-700 bg-slate-800 p-3',
                  'font-mono text-xs break-all text-slate-300'
                )}
              >
                {deviceIdLoading ? (
                  <span className="text-slate-500">Loading...</span>
                ) : (
                  localDeviceId || 'Unable to get Device ID'
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyId}
                disabled={!localDeviceId}
                className="shrink-0 border-slate-700 bg-slate-800 hover:bg-slate-700"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-500">Add Remote Device</span>
            </div>
          </div>

          {/* Add Remote Device Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Remote Device ID</label>
              <input
                type="text"
                value={remoteDeviceId}
                onChange={(e) => setRemoteDeviceId(e.target.value)}
                placeholder="XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX"
                className={cn(
                  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2',
                  'font-mono text-sm text-white placeholder:text-slate-600',
                  'focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-hidden'
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Device Name <span className="text-slate-500">(optional)</span>
              </label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g., My Laptop, Phone, etc."
                className={cn(
                  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2',
                  'text-sm text-white placeholder:text-slate-600',
                  'focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-hidden'
                )}
              />
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-300"
          >
            <Settings2 className="h-4 w-4" />
            Advanced Settings
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              {/* Addresses */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Network className="h-4 w-4" />
                  Addresses
                </label>
                <input
                  type="text"
                  value={addresses}
                  onChange={(e) => setAddresses(e.target.value)}
                  placeholder="dynamic, tcp://hostname:port"
                  className={cn(
                    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2',
                    'text-sm text-white placeholder:text-slate-600',
                    'focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-hidden'
                  )}
                />
                <p className="text-xs text-slate-500">
                  Use "dynamic" for auto-discovery, or specify addresses like tcp://hostname:22000
                </p>
              </div>

              {/* Compression */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Compression</label>
                <div className="grid grid-cols-3 gap-2">
                  {compressionOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCompression(option.value)}
                      className={cn(
                        'rounded-lg border p-2 text-left transition-all',
                        compression === option.value
                          ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                          : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                      )}
                    >
                      <div className="text-sm font-medium">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rate Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <Gauge className="h-4 w-4" />
                    Upload Limit (KB/s)
                  </label>
                  <input
                    type="number"
                    value={maxSendKbps || ''}
                    onChange={(e) => setMaxSendKbps(parseInt(e.target.value) || 0)}
                    placeholder="0 = unlimited"
                    min={0}
                    className={cn(
                      'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2',
                      'text-sm text-white placeholder:text-slate-600',
                      'focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-hidden'
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <Gauge className="h-4 w-4" />
                    Download Limit (KB/s)
                  </label>
                  <input
                    type="number"
                    value={maxRecvKbps || ''}
                    onChange={(e) => setMaxRecvKbps(parseInt(e.target.value) || 0)}
                    placeholder="0 = unlimited"
                    min={0}
                    className={cn(
                      'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2',
                      'text-sm text-white placeholder:text-slate-600',
                      'focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-hidden'
                    )}
                  />
                </div>
              </div>

              {/* Introducer & Auto-accept */}
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={introducer}
                    onChange={(e) => setIntroducer(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-300">Introducer</div>
                    <div className="text-xs text-slate-500">
                      This device can introduce us to other devices
                    </div>
                  </div>
                </label>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={autoAcceptFolders}
                    onChange={(e) => setAutoAcceptFolders(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-300">Auto-accept Folders</div>
                    <div className="text-xs text-slate-500">
                      Automatically accept folder share invitations from this device
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-700 bg-transparent hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddDevice}
              disabled={!remoteDeviceId.trim() || addDevice.isPending}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {addDevice.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Device
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function MyDeviceId() {
  const { data: localDeviceId, isLoading } = useDeviceId();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (localDeviceId) {
      await navigator.clipboard.writeText(localDeviceId);
      setCopied(true);
      toast.success('Device ID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white">This Device</CardTitle>
            <CardDescription className="text-slate-500">
              Share this ID to connect other devices
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-slate-500" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg border border-slate-700 bg-slate-800 p-3 font-mono text-xs break-all text-slate-300">
            {isLoading ? (
              <span className="text-slate-500">Loading...</span>
            ) : (
              localDeviceId || 'Unable to get Device ID'
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            disabled={!localDeviceId}
            className="shrink-0 border-slate-700 bg-slate-800 hover:bg-slate-700"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
