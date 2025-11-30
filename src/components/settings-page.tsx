'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import {
  useSyncthingInstallation,
  useDeviceId,
  useRestartSyncthing,
  useConfig,
  useUpdateOptions,
} from '@/hooks/useSyncthing';
import type { Options } from '@/hooks/useSyncthing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sun,
  Moon,
  Monitor,
  Copy,
  Check,
  Info,
  Palette,
  Server,
  Bell,
  RefreshCw,
  Bug,
  RotateCw,
  Brain,
  Globe,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LogViewer } from '@/components/log-viewer';
import { FileIndexer } from '@/components/file-indexer';

interface SettingCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

function SettingCard({ title, description, icon: Icon, children }: SettingCardProps) {
  return (
    <Card className="border-border bg-card/50 backdrop-blur-md">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-lg">
            <Icon className="text-primary h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-foreground text-lg">{title}</CardTitle>
            <CardDescription className="text-muted-foreground">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ThemeSelector() {
  const { theme, setTheme } = useAppStore();

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  return (
    <div className="flex gap-2">
      {themes.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant={theme === value ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTheme(value)}
          className={cn(
            'flex-1 gap-2',
            theme === value
              ? 'bg-primary hover:bg-primary/90'
              : 'border-border bg-secondary/50 text-muted-foreground hover:bg-accent'
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      ))}
    </div>
  );
}

function DeviceIdDisplay() {
  const { data: deviceId, isLoading, isError } = useDeviceId();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (deviceId) {
      await navigator.clipboard.writeText(deviceId);
      setCopied(true);
      toast.success('Device ID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (isError || !deviceId) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
        Unable to fetch device ID. Make sure Syncthing is running.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <code className="bg-secondary text-muted-foreground flex-1 truncate rounded-lg px-3 py-2 font-mono text-sm">
        {deviceId}
      </code>
      <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function SyncthingInfo() {
  const { data: installation, isLoading } = useSyncthingInstallation();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>
    );
  }

  if (!installation?.installed) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
        <p className="text-sm font-medium text-red-400">Syncthing not installed</p>
        <p className="mt-1 text-xs text-red-400/70">Install with: sudo apt install syncthing</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">Status</span>
        <Badge variant="success">Installed</Badge>
      </div>
      {installation.version && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Version</span>
          <span className="text-foreground font-mono text-sm">
            {installation.version.split(' ')[1] || installation.version}
          </span>
        </div>
      )}
      {installation.path && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Path</span>
          <code className="bg-secondary text-muted-foreground rounded px-2 py-0.5 font-mono text-xs">
            {installation.path}
          </code>
        </div>
      )}
    </div>
  );
}

function PollingSettings() {
  const { pollingInterval, setPollingInterval } = useAppStore();

  const intervals = [
    { value: 2000, label: '2 seconds' },
    { value: 5000, label: '5 seconds' },
    { value: 10000, label: '10 seconds' },
    { value: 30000, label: '30 seconds' },
  ];

  return (
    <div className="space-y-3">
      <label className="text-muted-foreground text-sm">Status polling interval</label>
      <div className="flex flex-wrap gap-2">
        {intervals.map(({ value, label }) => (
          <Button
            key={value}
            variant={pollingInterval === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setPollingInterval(value);
              toast.success(`Polling interval set to ${label}`);
            }}
            className={cn(
              pollingInterval === value
                ? 'bg-primary hover:bg-primary/90'
                : 'border-border bg-secondary/50 text-muted-foreground hover:bg-accent'
            )}
          >
            {label}
          </Button>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        How often to refresh connection and folder status
      </p>
    </div>
  );
}

function NotificationSettings() {
  const { nativeNotificationsEnabled, setNativeNotificationsEnabled } = useAppStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground text-sm">Native Notifications</p>
          <p className="text-muted-foreground text-xs">Show OS notifications for sync events</p>
        </div>
        <Button
          variant={nativeNotificationsEnabled ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setNativeNotificationsEnabled(!nativeNotificationsEnabled);
            toast.success(
              nativeNotificationsEnabled
                ? 'Native notifications disabled'
                : 'Native notifications enabled'
            );
          }}
          className={cn(
            nativeNotificationsEnabled
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'border-border bg-secondary/50 text-muted-foreground hover:bg-accent'
          )}
        >
          {nativeNotificationsEnabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Receive desktop notifications when devices connect/disconnect, folders sync, or errors
        occur. In-app toasts are always shown.
      </p>
    </div>
  );
}

function AISettings() {
  const { aiEnabled, setAiEnabled } = useAppStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground text-sm">Enable AI Search</p>
          <p className="text-muted-foreground text-xs">Semantic file search using local AI model</p>
        </div>
        <Button
          variant={aiEnabled ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setAiEnabled(!aiEnabled);
            toast.success(
              aiEnabled ? 'AI search disabled' : 'AI search enabled - model will load on next use'
            );
          }}
          className={cn(
            aiEnabled
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'border-border bg-secondary/50 text-muted-foreground hover:bg-accent'
          )}
        >
          {aiEnabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        AI search uses a local embedding model (all-MiniLM-L6-v2) to enable semantic file search.
        The model runs entirely on your device. Disabling saves memory and CPU resources.
      </p>
      {aiEnabled && (
        <div className="border-border border-t pt-2">
          <FileIndexer />
        </div>
      )}
    </div>
  );
}

function NetworkSettings() {
  const { data: config, isLoading } = useConfig();
  const updateOptions = useUpdateOptions();

  const [localOptions, setLocalOptions] = useState<Partial<Options>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state from config
  useEffect(() => {
    if (config?.options) {
      setLocalOptions({
        globalAnnounceEnabled: config.options.globalAnnounceEnabled,
        localAnnounceEnabled: config.options.localAnnounceEnabled,
        relaysEnabled: config.options.relaysEnabled,
        maxSendKbps: config.options.maxSendKbps,
        maxRecvKbps: config.options.maxRecvKbps,
        listenAddresses: config.options.listenAddresses,
      });
      setHasChanges(false);
    }
  }, [config?.options]);

  const updateField = <K extends keyof Options>(key: K, value: Options[K]) => {
    setLocalOptions((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateOptions.mutateAsync(localOptions);
      toast.success('Network settings saved');
      setHasChanges(false);
    } catch {
      toast.error('Failed to save network settings');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Discovery Toggles */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground text-sm">Global Discovery</p>
          <p className="text-muted-foreground text-xs">Find devices over the internet</p>
        </div>
        <Button
          variant={localOptions.globalAnnounceEnabled ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateField('globalAnnounceEnabled', !localOptions.globalAnnounceEnabled)}
          className={cn(
            localOptions.globalAnnounceEnabled
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'border-border bg-secondary/50 text-muted-foreground hover:bg-accent'
          )}
        >
          {localOptions.globalAnnounceEnabled ? 'On' : 'Off'}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground text-sm">Local Discovery</p>
          <p className="text-muted-foreground text-xs">Find devices on local network</p>
        </div>
        <Button
          variant={localOptions.localAnnounceEnabled ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateField('localAnnounceEnabled', !localOptions.localAnnounceEnabled)}
          className={cn(
            localOptions.localAnnounceEnabled
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'border-border bg-secondary/50 text-muted-foreground hover:bg-accent'
          )}
        >
          {localOptions.localAnnounceEnabled ? 'On' : 'Off'}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground text-sm">Relaying</p>
          <p className="text-muted-foreground text-xs">Use relays when direct connection fails</p>
        </div>
        <Button
          variant={localOptions.relaysEnabled ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateField('relaysEnabled', !localOptions.relaysEnabled)}
          className={cn(
            localOptions.relaysEnabled
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'border-border bg-secondary/50 text-muted-foreground hover:bg-accent'
          )}
        >
          {localOptions.relaysEnabled ? 'On' : 'Off'}
        </Button>
      </div>

      {/* Bandwidth Limits */}
      <div className="border-border border-t pt-2">
        <p className="text-foreground mb-2 text-sm">Bandwidth Limits</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-muted-foreground text-xs">Upload (KB/s)</label>
            <input
              type="number"
              value={localOptions.maxSendKbps ?? 0}
              onChange={(e) => updateField('maxSendKbps', parseInt(e.target.value) || 0)}
              className="border-border bg-secondary text-foreground focus:border-primary mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-hidden"
              placeholder="0 = unlimited"
              min={0}
            />
          </div>
          <div>
            <label className="text-muted-foreground text-xs">Download (KB/s)</label>
            <input
              type="number"
              value={localOptions.maxRecvKbps ?? 0}
              onChange={(e) => updateField('maxRecvKbps', parseInt(e.target.value) || 0)}
              className="border-border bg-secondary text-foreground focus:border-primary mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-hidden"
              placeholder="0 = unlimited"
              min={0}
            />
          </div>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">0 = unlimited bandwidth</p>
      </div>

      {/* Listen Addresses */}
      <div className="border-border border-t pt-2">
        <label className="text-foreground text-sm">Listen Addresses</label>
        <input
          type="text"
          value={localOptions.listenAddresses?.join(', ') ?? ''}
          onChange={(e) => {
            const addresses = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            updateField('listenAddresses', addresses.length > 0 ? addresses : ['default']);
          }}
          className="border-border bg-secondary text-foreground focus:border-primary mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-hidden"
          placeholder="default, tcp://0.0.0.0:22000"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Comma-separated list of listen addresses
        </p>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={updateOptions.isPending}
          className="bg-primary hover:bg-primary/90 w-full"
        >
          {updateOptions.isPending ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      )}
    </div>
  );
}

export function SettingsPage() {
  const [logViewerOpen, setLogViewerOpen] = useState(false);
  const restartSyncthing = useRestartSyncthing();

  const handleRestart = async () => {
    try {
      await restartSyncthing.mutateAsync();
      toast.success('Syncthing is restarting...');
    } catch {
      toast.error('Failed to restart Syncthing');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-lg font-semibold">Settings</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Appearance */}
        <SettingCard title="Appearance" description="Customize the look and feel" icon={Palette}>
          <ThemeSelector />
        </SettingCard>

        {/* Syncthing Info */}
        <SettingCard title="Syncthing" description="Backend service information" icon={Server}>
          <SyncthingInfo />
        </SettingCard>

        {/* Device ID */}
        <SettingCard
          title="Device ID"
          description="Share this ID to connect with other devices"
          icon={Info}
        >
          <DeviceIdDisplay />
        </SettingCard>

        {/* Polling Settings */}
        <SettingCard
          title="Refresh Rate"
          description="Configure data polling frequency"
          icon={RefreshCw}
        >
          <PollingSettings />
        </SettingCard>

        {/* Notification Settings */}
        <SettingCard
          title="Notifications"
          description="Configure how you receive alerts"
          icon={Bell}
        >
          <NotificationSettings />
        </SettingCard>

        {/* AI File Index */}
        <SettingCard
          title="AI Search"
          description="Semantic file search powered by AI"
          icon={Brain}
        >
          <AISettings />
        </SettingCard>

        {/* Network Settings */}
        <SettingCard
          title="Network"
          description="Discovery, relays, and bandwidth limits"
          icon={Globe}
        >
          <NetworkSettings />
        </SettingCard>

        {/* System Logs */}
        <SettingCard title="System Logs" description="View Syncthing logs for debugging" icon={Bug}>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              View real-time logs from Syncthing for troubleshooting connection issues and errors.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogViewerOpen(true)}
              className="border-border bg-secondary/50 hover:bg-secondary w-full"
            >
              <Bug className="mr-2 h-4 w-4" />
              Open Log Viewer
            </Button>
          </div>
        </SettingCard>

        {/* System Actions */}
        <SettingCard title="System Actions" description="Control Syncthing service" icon={RotateCw}>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Restart Syncthing to apply configuration changes that require a restart.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestart}
              disabled={restartSyncthing.isPending}
              className="w-full border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
            >
              {restartSyncthing.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Restarting...
                </>
              ) : (
                <>
                  <RotateCw className="mr-2 h-4 w-4" />
                  Restart Syncthing
                </>
              )}
            </Button>
          </div>
        </SettingCard>
      </div>

      {/* About Section */}
      <Card className="border-border bg-card/50 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-foreground">About Eigen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground/80">A modern Syncthing manager built with Tauri</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Version 0.1.0 • Built with Next.js + Rust
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-border bg-secondary/50 hover:bg-secondary"
              onClick={() => window.open('https://github.com/syncthing/syncthing', '_blank')}
            >
              Syncthing Docs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Log Viewer Modal */}
      <LogViewer open={logViewerOpen} onOpenChange={setLogViewerOpen} />
    </div>
  );
}
