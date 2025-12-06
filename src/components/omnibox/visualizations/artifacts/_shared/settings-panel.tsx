/**
 * Settings Panel — Layer 3 Glass Panel for Settings
 *
 * Per UX guide: "Never put forms in 3D. Use glass panels for reading, editing, deciding."
 *
 * This component provides the settings interface as a glass panel overlay,
 * replacing the traditional settings page with an immersive experience.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store';
import {
  useConfig,
  useUpdateOptions,
  useSyncthingInstallation,
  useDeviceId,
  useRestartSyncthing,
} from '@/hooks/syncthing';
import type { Options } from '@/hooks/syncthing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LogViewer } from '@/components/log-viewer';
import { FileIndexer } from '@/components/file-indexer';
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
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

interface SettingsPanelProps {
  onClose: () => void;
}

type SettingsSection =
  | 'appearance'
  | 'syncthing'
  | 'network'
  | 'notifications'
  | 'ai'
  | 'polling'
  | 'logs'
  | 'about';

// =============================================================================
// Setting Section Components
// =============================================================================

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
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 transition-all',
            theme === value
              ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
              : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="text-sm font-medium">{label}</span>
        </button>
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
    return <Skeleton className="h-10 w-full bg-white/10" />;
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
      <code className="flex-1 truncate rounded-lg bg-black/30 px-3 py-2 font-mono text-sm text-gray-300">
        {deviceId}
      </code>
      <button
        onClick={handleCopy}
        className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SyncthingInfo() {
  const { data: installation, isLoading } = useSyncthingInstallation();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-48 bg-white/10" />
        <Skeleton className="h-5 w-64 bg-white/10" />
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
        <span className="text-sm text-gray-400">Status</span>
        <Badge variant="success" className="bg-emerald-500/20 text-emerald-400">
          Installed
        </Badge>
      </div>
      {installation.version && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Version</span>
          <span className="font-mono text-sm text-white">
            {installation.version.split(' ')[1] || installation.version}
          </span>
        </div>
      )}
      {installation.path && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Path</span>
          <code className="rounded bg-black/30 px-2 py-0.5 font-mono text-xs text-gray-300">
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
    { value: 2000, label: '2s' },
    { value: 5000, label: '5s' },
    { value: 10000, label: '10s' },
    { value: 30000, label: '30s' },
  ];

  return (
    <div className="space-y-3">
      <label className="text-sm text-gray-400">Status polling interval</label>
      <div className="flex gap-2">
        {intervals.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => {
              setPollingInterval(value);
              toast.success(`Polling interval set to ${label}`);
            }}
            className={cn(
              'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all',
              pollingInterval === value
                ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
                : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function NotificationSettings() {
  const { nativeNotificationsEnabled, setNativeNotificationsEnabled } = useAppStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white">Native Notifications</p>
          <p className="text-xs text-gray-400">Show OS notifications for sync events</p>
        </div>
        <button
          onClick={() => {
            setNativeNotificationsEnabled(!nativeNotificationsEnabled);
            toast.success(
              nativeNotificationsEnabled
                ? 'Native notifications disabled'
                : 'Native notifications enabled'
            );
          }}
          className={cn(
            'rounded-lg border px-4 py-2 text-sm font-medium transition-all',
            nativeNotificationsEnabled
              ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
              : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
          )}
        >
          {nativeNotificationsEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>
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
          <p className="text-xs text-gray-400">Semantic file search using local AI model</p>
        </div>
        <button
          onClick={() => {
            setAiEnabled(!aiEnabled);
            toast.success(
              aiEnabled ? 'AI search disabled' : 'AI search enabled - model will load on next use'
            );
          }}
          className={cn(
            'rounded-lg border px-4 py-2 text-sm font-medium transition-all',
            aiEnabled
              ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
              : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
          )}
        >
          {aiEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>
      {aiEnabled && (
        <div className="border-t border-white/10 pt-4">
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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config?.options) {
      setLocalOptions({
        globalAnnounceEnabled: config.options.globalAnnounceEnabled,
        localAnnounceEnabled: config.options.localAnnounceEnabled,
        relaysEnabled: config.options.relaysEnabled,
        maxSendKbps: config.options.maxSendKbps,
        maxRecvKbps: config.options.maxRecvKbps,
      });
    }
  }, [config?.options]);

  const autoSave = useCallback(
    async (options: Partial<Options>) => {
      try {
        setIsSaving(true);
        await updateOptions.mutateAsync(options);
        toast.success('Settings saved', { duration: 1500 });
      } catch {
        toast.error('Failed to save settings');
      } finally {
        setIsSaving(false);
      }
    },
    [updateOptions]
  );

  const updateField = <K extends keyof Options>(key: K, value: Options[K]) => {
    const newOptions = { ...localOptions, [key]: value };
    setLocalOptions(newOptions);
    if (typeof value === 'boolean') {
      autoSave(newOptions);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full bg-white/10" />
        <Skeleton className="h-8 w-full bg-white/10" />
      </div>
    );
  }

  const toggleItems = [
    { key: 'globalAnnounceEnabled', label: 'Global Discovery', desc: 'Find devices over internet' },
    {
      key: 'localAnnounceEnabled',
      label: 'Local Discovery',
      desc: 'Find devices on local network',
    },
    { key: 'relaysEnabled', label: 'Relaying', desc: 'Use relays when direct fails' },
  ] as const;

  return (
    <div className="space-y-4">
      {toggleItems.map(({ key, label, desc }) => (
        <div key={key} className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">{label}</p>
            <p className="text-xs text-gray-400">{desc}</p>
          </div>
          <button
            onClick={() => updateField(key, !localOptions[key])}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
              localOptions[key]
                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
            )}
          >
            {localOptions[key] ? 'On' : 'Off'}
          </button>
        </div>
      ))}

      {isSaving && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}

function SystemActions() {
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
    <div className="space-y-3">
      <p className="text-sm text-gray-400">
        Restart Syncthing to apply changes that require a restart.
      </p>
      <button
        onClick={handleRestart}
        disabled={restartSyncthing.isPending}
        className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-400 transition-all hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {restartSyncthing.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Restarting...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <RotateCw className="h-4 w-4" />
            Restart Syncthing
          </span>
        )}
      </button>
    </div>
  );
}

// =============================================================================
// Main Settings Panel
// =============================================================================

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [logViewerOpen, setLogViewerOpen] = useState(false);

  const sections: {
    id: SettingsSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'syncthing', label: 'Syncthing', icon: Server },
    { id: 'network', label: 'Network', icon: Globe },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'ai', label: 'AI Search', icon: Brain },
    { id: 'polling', label: 'Polling', icon: RefreshCw },
    { id: 'logs', label: 'Logs', icon: Bug },
    { id: 'about', label: 'About', icon: Info },
  ];

  return (
    <div className="flex h-full min-h-[500px] gap-6">
      {/* Sidebar Navigation */}
      <nav className="w-48 shrink-0 space-y-1 border-r border-white/10 pr-6">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
              activeSection === id
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
            {activeSection === id && <ChevronRight className="ml-auto h-4 w-4 text-cyan-400" />}
          </button>
        ))}
      </nav>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6">
          {activeSection === 'appearance' && (
            <>
              <div>
                <h3 className="mb-4 text-lg font-semibold text-white">Theme</h3>
                <ThemeSelector />
              </div>
            </>
          )}

          {activeSection === 'syncthing' && (
            <>
              <div>
                <h3 className="mb-4 text-lg font-semibold text-white">Syncthing Status</h3>
                <SyncthingInfo />
              </div>
              <div>
                <h3 className="mb-4 text-lg font-semibold text-white">Device ID</h3>
                <DeviceIdDisplay />
              </div>
              <div>
                <h3 className="mb-4 text-lg font-semibold text-white">System Actions</h3>
                <SystemActions />
              </div>
            </>
          )}

          {activeSection === 'network' && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">Network Settings</h3>
              <NetworkSettings />
            </div>
          )}

          {activeSection === 'notifications' && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">Notification Preferences</h3>
              <NotificationSettings />
            </div>
          )}

          {activeSection === 'ai' && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">AI-Powered Search</h3>
              <AISettings />
            </div>
          )}

          {activeSection === 'polling' && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">Refresh Rate</h3>
              <PollingSettings />
            </div>
          )}

          {activeSection === 'logs' && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">System Logs</h3>
              <p className="mb-4 text-sm text-gray-400">
                View real-time logs from Syncthing for troubleshooting.
              </p>
              <button
                onClick={() => setLogViewerOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 transition-all hover:bg-white/10 hover:text-white"
              >
                <Bug className="h-4 w-4" />
                Open Log Viewer
              </button>
            </div>
          )}

          {activeSection === 'about' && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">About Eigen</h3>
              <div className="space-y-3">
                <p className="text-sm text-gray-300">
                  A modern Syncthing manager built with Tauri, Next.js, and React Three Fiber.
                </p>
                <p className="text-xs text-gray-500">Version 0.1.0 • Built with 💜</p>
                <button
                  onClick={() => window.open('https://github.com/syncthing/syncthing', '_blank')}
                  className="flex items-center gap-2 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
                >
                  Syncthing Documentation
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Log Viewer Modal */}
      <LogViewer open={logViewerOpen} onOpenChange={setLogViewerOpen} />
    </div>
  );
}

export default SettingsPanel;
