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
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
            <Icon className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <CardTitle className="text-lg text-white">{title}</CardTitle>
            <CardDescription className="text-slate-400">{description}</CardDescription>
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
          variant={theme === value ? 'default' : 'outline-solid'}
          size="sm"
          onClick={() => setTheme(value)}
          className={cn(
            'flex-1 gap-2',
            theme === value
              ? 'bg-indigo-600 hover:bg-indigo-700'
              : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700'
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
      <code className="flex-1 truncate rounded-lg bg-slate-800 px-3 py-2 font-mono text-sm text-slate-300">
        {deviceId}
      </code>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="shrink-0 border-slate-700 bg-slate-800/50 hover:bg-slate-700"
      >
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
        <span className="text-sm text-slate-400">Status</span>
        <Badge variant="success">Installed</Badge>
      </div>
      {installation.version && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Version</span>
          <span className="font-mono text-sm text-white">
            {installation.version.split(' ')[1] || installation.version}
          </span>
        </div>
      )}
      {installation.path && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Path</span>
          <code className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">
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
      <label className="text-sm text-slate-400">Status polling interval</label>
      <div className="flex flex-wrap gap-2">
        {intervals.map(({ value, label }) => (
          <Button
            key={value}
            variant={pollingInterval === value ? 'default' : 'outline-solid'}
            size="sm"
            onClick={() => {
              setPollingInterval(value);
              toast.success(`Polling interval set to ${label}`);
            }}
            className={cn(
              pollingInterval === value
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700'
            )}
          >
            {label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-slate-500">How often to refresh connection and folder status</p>
    </div>
  );
}

function NotificationSettings() {
  const { nativeNotificationsEnabled, setNativeNotificationsEnabled } = useAppStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white">Native Notifications</p>
          <p className="text-xs text-slate-500">Show OS notifications for sync events</p>
        </div>
        <Button
          variant={nativeNotificationsEnabled ? 'default' : 'outline-solid'}
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
              : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700'
          )}
        >
          {nativeNotificationsEnabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>
      <p className="text-xs text-slate-500">
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
          <p className="text-sm text-white">Enable AI Search</p>
          <p className="text-xs text-slate-500">Semantic file search using local AI model</p>
        </div>
        <Button
          variant={aiEnabled ? 'default' : 'outline-solid'}
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
              : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700'
          )}
        >
          {aiEnabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        AI search uses a local embedding model (all-MiniLM-L6-v2) to enable semantic file search.
        The model runs entirely on your device. Disabling saves memory and CPU resources.
      </p>
      {aiEnabled && (
        <div className="border-t border-slate-800 pt-2">
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
    } catch (error) {
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
          <p className="text-sm text-white">Global Discovery</p>
          <p className="text-xs text-slate-500">Find devices over the internet</p>
        </div>
        <Button
          variant={localOptions.globalAnnounceEnabled ? 'default' : 'outline-solid'}
          size="sm"
          onClick={() => updateField('globalAnnounceEnabled', !localOptions.globalAnnounceEnabled)}
          className={cn(
            localOptions.globalAnnounceEnabled
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700'
          )}
        >
          {localOptions.globalAnnounceEnabled ? 'On' : 'Off'}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white">Local Discovery</p>
          <p className="text-xs text-slate-500">Find devices on local network</p>
        </div>
        <Button
          variant={localOptions.localAnnounceEnabled ? 'default' : 'outline-solid'}
          size="sm"
          onClick={() => updateField('localAnnounceEnabled', !localOptions.localAnnounceEnabled)}
          className={cn(
            localOptions.localAnnounceEnabled
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700'
          )}
        >
          {localOptions.localAnnounceEnabled ? 'On' : 'Off'}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white">Relaying</p>
          <p className="text-xs text-slate-500">Use relays when direct connection fails</p>
        </div>
        <Button
          variant={localOptions.relaysEnabled ? 'default' : 'outline-solid'}
          size="sm"
          onClick={() => updateField('relaysEnabled', !localOptions.relaysEnabled)}
          className={cn(
            localOptions.relaysEnabled
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700'
          )}
        >
          {localOptions.relaysEnabled ? 'On' : 'Off'}
        </Button>
      </div>

      {/* Bandwidth Limits */}
      <div className="border-t border-slate-800 pt-2">
        <p className="mb-2 text-sm text-white">Bandwidth Limits</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">Upload (KB/s)</label>
            <input
              type="number"
              value={localOptions.maxSendKbps ?? 0}
              onChange={(e) => updateField('maxSendKbps', parseInt(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-hidden"
              placeholder="0 = unlimited"
              min={0}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Download (KB/s)</label>
            <input
              type="number"
              value={localOptions.maxRecvKbps ?? 0}
              onChange={(e) => updateField('maxRecvKbps', parseInt(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-hidden"
              placeholder="0 = unlimited"
              min={0}
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500">0 = unlimited bandwidth</p>
      </div>

      {/* Listen Addresses */}
      <div className="border-t border-slate-800 pt-2">
        <label className="text-sm text-white">Listen Addresses</label>
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
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-hidden"
          placeholder="default, tcp://0.0.0.0:22000"
        />
        <p className="mt-1 text-xs text-slate-500">Comma-separated list of listen addresses</p>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={updateOptions.isPending}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
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
    } catch (error) {
      toast.error('Failed to restart Syncthing');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Settings</h2>
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
            <p className="text-sm text-slate-400">
              View real-time logs from Syncthing for troubleshooting connection issues and errors.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogViewerOpen(true)}
              className="w-full border-slate-700 bg-slate-800/50 hover:bg-slate-700"
            >
              <Bug className="mr-2 h-4 w-4" />
              Open Log Viewer
            </Button>
          </div>
        </SettingCard>

        {/* System Actions */}
        <SettingCard title="System Actions" description="Control Syncthing service" icon={RotateCw}>
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
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
      <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-white">About Eigen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300">A modern Syncthing manager built with Tauri</p>
              <p className="mt-1 text-sm text-slate-500">
                Version 0.1.0 • Built with Next.js + Rust
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800/50 hover:bg-slate-700"
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
