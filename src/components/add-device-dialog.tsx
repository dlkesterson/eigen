'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDeviceId, useAddDeviceAdvanced } from '@/hooks/useSyncthing';
import { generateQRCodeDataUrl } from '@/hooks/useDeviceInvite';
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

  // Generate QR code when device ID is available
  const [qrCodeUrl, setQRCodeUrl] = useState<string | null>(null);

  // Derive loading state: we're loading if dialog is open but don't have URL yet
  const isGeneratingQR = open && localDeviceId && !qrCodeUrl;

  // Reset state when dialog closes (separate effect for cleanup)
  useEffect(() => {
    if (!open) {
      // Reset for next open - schedule state reset after current render
      const timeoutId = setTimeout(() => {
        setQRCodeUrl(null);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  // Generate QR code when dialog opens and device ID is available
  useEffect(() => {
    if (!open || !localDeviceId) return;

    let cancelled = false;
    generateQRCodeDataUrl(localDeviceId).then((url) => {
      if (!cancelled) setQRCodeUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [open, localDeviceId]);

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
    } catch {
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
    setQRCodeUrl(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs">
      <Card className="border-border bg-card w-full max-w-lg shadow-2xl">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground absolute top-4 right-4"
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-foreground text-xl">Connect a Device</CardTitle>
          <CardDescription>
            Share your Device ID with another device, or enter their Device ID to connect.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Your Device ID Section */}
          <div className="space-y-3">
            <label className="text-foreground text-sm font-medium">Your Device ID</label>
            <p className="text-muted-foreground text-xs">
              Share this ID with other devices you want to connect to.
            </p>

            {/* QR Code and Device ID side by side */}
            <div className="flex gap-4">
              {/* QR Code */}
              <div className="border-border bg-secondary flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border">
                {isGeneratingQR || deviceIdLoading ? (
                  <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                ) : qrCodeUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrCodeUrl}
                    alt="Device ID QR Code"
                    className="h-full w-full rounded-lg"
                  />
                ) : (
                  <QrCode className="text-muted-foreground h-8 w-8" />
                )}
              </div>

              {/* Device ID and Copy Button */}
              <div className="flex flex-1 flex-col gap-2">
                <div
                  className={cn(
                    'border-border bg-secondary flex-1 rounded-lg border p-3',
                    'text-muted-foreground font-mono text-xs break-all'
                  )}
                >
                  {deviceIdLoading ? (
                    <span className="text-muted-foreground">Loading...</span>
                  ) : (
                    localDeviceId || 'Unable to get Device ID'
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyId}
                  disabled={!localDeviceId}
                  className="w-full"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Device ID
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="border-border w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card text-muted-foreground px-2">Add Remote Device</span>
            </div>
          </div>

          {/* Add Remote Device Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">Remote Device ID</label>
              <input
                type="text"
                value={remoteDeviceId}
                onChange={(e) => setRemoteDeviceId(e.target.value)}
                placeholder="XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX"
                className={cn(
                  'border-border bg-secondary w-full rounded-lg border px-3 py-2',
                  'text-foreground placeholder:text-muted-foreground font-mono text-sm',
                  'focus:border-primary focus:ring-primary focus:ring-1 focus:outline-hidden'
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="text-foreground text-sm font-medium">
                Device Name <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g., My Laptop, Phone, etc."
                className={cn(
                  'border-border bg-secondary w-full rounded-lg border px-3 py-2',
                  'text-foreground placeholder:text-muted-foreground text-sm',
                  'focus:border-primary focus:ring-primary focus:ring-1 focus:outline-hidden'
                )}
              />
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
          >
            <Settings2 className="h-4 w-4" />
            Advanced Settings
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="border-border bg-secondary/50 space-y-4 rounded-lg border p-4">
              {/* Addresses */}
              <div className="space-y-2">
                <label className="text-foreground flex items-center gap-2 text-sm font-medium">
                  <Network className="h-4 w-4" />
                  Addresses
                </label>
                <input
                  type="text"
                  value={addresses}
                  onChange={(e) => setAddresses(e.target.value)}
                  placeholder="dynamic, tcp://hostname:port"
                  className={cn(
                    'border-border bg-secondary w-full rounded-lg border px-3 py-2',
                    'text-foreground placeholder:text-muted-foreground text-sm',
                    'focus:border-primary focus:ring-primary focus:ring-1 focus:outline-hidden'
                  )}
                />
                <p className="text-muted-foreground text-xs">
                  Use &quot;dynamic&quot; for auto-discovery, or specify addresses like
                  tcp://hostname:22000
                </p>
              </div>

              {/* Compression */}
              <div className="space-y-2">
                <label className="text-foreground text-sm font-medium">Compression</label>
                <div className="grid grid-cols-3 gap-2">
                  {compressionOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCompression(option.value)}
                      className={cn(
                        'rounded-lg border p-2 text-left transition-all',
                        compression === option.value
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-border bg-secondary text-muted-foreground hover:border-muted-foreground'
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
                  <label className="text-foreground flex items-center gap-2 text-sm font-medium">
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
                      'border-border bg-secondary w-full rounded-lg border px-3 py-2',
                      'text-foreground placeholder:text-muted-foreground text-sm',
                      'focus:border-primary focus:ring-primary focus:ring-1 focus:outline-hidden'
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-foreground flex items-center gap-2 text-sm font-medium">
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
                      'border-border bg-secondary w-full rounded-lg border px-3 py-2',
                      'text-foreground placeholder:text-muted-foreground text-sm',
                      'focus:border-primary focus:ring-primary focus:ring-1 focus:outline-hidden'
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
                    className="border-border bg-secondary text-primary focus:ring-primary rounded"
                  />
                  <div>
                    <div className="text-foreground text-sm font-medium">Introducer</div>
                    <div className="text-muted-foreground text-xs">
                      This device can introduce us to other devices
                    </div>
                  </div>
                </label>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={autoAcceptFolders}
                    onChange={(e) => setAutoAcceptFolders(e.target.checked)}
                    className="border-border bg-secondary text-primary focus:ring-primary rounded"
                  />
                  <div>
                    <div className="text-foreground text-sm font-medium">Auto-accept Folders</div>
                    <div className="text-muted-foreground text-xs">
                      Automatically accept folder share invitations from this device
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAddDevice}
              disabled={!remoteDeviceId.trim() || addDevice.isPending}
              className="bg-primary hover:bg-primary/90"
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
    <Card className="border-border bg-card/50 backdrop-blur-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground text-lg">This Device</CardTitle>
            <CardDescription>Share this ID to connect other devices</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <QrCode className="text-muted-foreground h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <div className="border-border bg-secondary text-muted-foreground flex-1 rounded-lg border p-3 font-mono text-xs break-all">
            {isLoading ? (
              <span className="text-muted-foreground">Loading...</span>
            ) : (
              localDeviceId || 'Unable to get Device ID'
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            disabled={!localDeviceId}
            className="shrink-0"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
