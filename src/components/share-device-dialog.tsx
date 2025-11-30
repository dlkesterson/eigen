'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  X,
  Copy,
  Check,
  QrCode,
  Link2,
  RefreshCw,
  Share2,
  Smartphone,
  Clock,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDeviceInvite } from '@/hooks/useDeviceInvite';

interface ShareDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDeviceDialog({ open, onOpenChange }: ShareDeviceDialogProps) {
  const {
    deviceId,
    isLoading,
    inviteUrl,
    qrCodeUrl,
    isGeneratingQR,
    generateInvite,
    generateQRCode,
    copyInviteUrl,
  } = useDeviceInvite();

  const [copied, setCopied] = useState(false);
  const [includeIntroducer, setIncludeIntroducer] = useState(false);
  const [expiryHours, setExpiryHours] = useState(24);

  // Generate invite when dialog opens
  useEffect(() => {
    if (open && deviceId) {
      generateInvite({ introducer: includeIntroducer, expiryHours });
    }
  }, [open, deviceId, includeIntroducer, expiryHours, generateInvite]);

  // Generate QR code when invite URL is ready
  useEffect(() => {
    if (inviteUrl && !qrCodeUrl && !isGeneratingQR) {
      generateQRCode();
    }
  }, [inviteUrl, qrCodeUrl, isGeneratingQR, generateQRCode]);

  const handleCopy = async () => {
    const success = await copyInviteUrl();
    if (success) {
      setCopied(true);
      toast.success('Invite link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy link');
    }
  };

  const handleCopyDeviceId = async () => {
    if (!deviceId) return;
    try {
      await navigator.clipboard.writeText(deviceId);
      toast.success('Device ID copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleShare = async () => {
    if (!inviteUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Eigen Device Invite',
          text: 'Connect your device to my Eigen sync network',
          url: inviteUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      handleCopy();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <Card className="bg-background/95 border-border/50 w-full max-w-md backdrop-blur-md">
        <CardHeader className="border-border/50 flex flex-row items-center justify-between space-y-0 border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <Share2 className="h-5 w-5 text-indigo-400" />
            Share Device
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
              <p className="text-muted-foreground mt-4 text-sm">Loading device info...</p>
            </div>
          ) : (
            <>
              {/* QR Code Section */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="Device invite QR code"
                      className="border-border h-48 w-48 rounded-xl border"
                    />
                  ) : (
                    <div className="border-border bg-secondary flex h-48 w-48 items-center justify-center rounded-xl border">
                      {isGeneratingQR ? (
                        <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
                      ) : (
                        <QrCode className="text-muted-foreground h-12 w-12" />
                      )}
                    </div>
                  )}
                  <div className="bg-primary absolute -right-2 -bottom-2 flex h-10 w-10 items-center justify-center rounded-full shadow-lg">
                    <Smartphone className="text-primary-foreground h-5 w-5" />
                  </div>
                </div>
                <p className="text-muted-foreground mt-4 text-center text-sm">
                  Scan this QR code with another Eigen device to connect
                </p>
              </div>

              {/* Device ID */}
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-muted-foreground mb-2 text-xs">Device ID</p>
                <div className="flex items-center gap-2">
                  <code className="text-foreground/80 flex-1 font-mono text-xs break-all">
                    {deviceId || 'Loading...'}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleCopyDeviceId}
                    disabled={!deviceId}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={includeIntroducer}
                    onChange={(e) => setIncludeIntroducer(e.target.checked)}
                    className="border-border bg-secondary text-primary focus:ring-primary h-4 w-4 rounded"
                  />
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-amber-400" />
                    <span className="text-sm">Set as Introducer</span>
                  </div>
                </label>

                <div className="flex items-center gap-3">
                  <Clock className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground text-sm">Link expires in:</span>
                  <select
                    value={expiryHours}
                    onChange={(e) => setExpiryHours(parseInt(e.target.value))}
                    className="border-border bg-secondary rounded px-2 py-1 text-sm"
                  >
                    <option value={1}>1 hour</option>
                    <option value={6}>6 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={72}>3 days</option>
                    <option value={168}>1 week</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCopy}
                  disabled={!inviteUrl}
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>

                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <Button
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600"
                    onClick={handleShare}
                    disabled={!inviteUrl}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                )}
              </div>

              {/* Magic Link Info */}
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-300">
                <p className="mb-1 font-medium">Magic Link</p>
                <p className="text-indigo-200/70">
                  When opened on another device with Eigen installed, the link will automatically
                  open the Add Device dialog with your device info pre-filled.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
