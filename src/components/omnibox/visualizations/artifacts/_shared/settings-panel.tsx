/**
 * Settings Panel — Layer 3 Glass Panel for Settings
 *
 * Per UX guide: "Never put forms in 3D. Use glass panels for reading, editing, deciding."
 *
 * This component provides the settings interface as a glass panel overlay,
 * replacing the traditional settings page with an immersive experience.
 */

'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useAppStore } from '@/store';
import {
  useConfig,
  useUpdateOptions,
  useSyncthingInstallation,
  useDeviceId,
  useRestartSyncthing,
} from '@/hooks/syncthing';
import type { Options } from '@/hooks/syncthing';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LogViewer } from '@/components/log-viewer';
import { FileIndexer } from '@/components/file-indexer';
import { useResolvedTheme } from '@/components/theme-provider';

// Theme context for settings panel components
const SettingsThemeContext = createContext<boolean>(true);
const useSettingsTheme = () => useContext(SettingsThemeContext);
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
  const isDark = useSettingsTheme();

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
              ? isDark
                ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
                : 'border-cyan-500/60 bg-cyan-500/20 text-cyan-700'
              : isDark
                ? 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
                : 'border-gray-300/50 bg-gray-100/50 text-gray-600 hover:border-gray-400/50 hover:bg-gray-200/50'
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
  const isDark = useSettingsTheme();

  const handleCopy = async () => {
    if (deviceId) {
      await navigator.clipboard.writeText(deviceId);
      setCopied(true);
      toast.success('Device ID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return <Skeleton className={cn('h-10 w-full', isDark ? 'bg-white/10' : 'bg-gray-200')} />;
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
      <code
        className={cn(
          'flex-1 truncate rounded-lg px-3 py-2 font-mono text-sm',
          isDark ? 'bg-black/30 text-gray-300' : 'bg-gray-100 text-gray-700'
        )}
      >
        {deviceId}
      </code>
      <button
        onClick={handleCopy}
        className={cn(
          'shrink-0 rounded-lg border p-2 transition-colors',
          isDark
            ? 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            : 'border-gray-300/50 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
        )}
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SyncthingInfo() {
  const { data: installation, isLoading } = useSyncthingInstallation();
  const isDark = useSettingsTheme();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className={cn('h-5 w-48', isDark ? 'bg-white/10' : 'bg-gray-200')} />
        <Skeleton className={cn('h-5 w-64', isDark ? 'bg-white/10' : 'bg-gray-200')} />
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
        <span className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>Status</span>
        <Badge variant="success" className="bg-emerald-500/20 text-emerald-400">
          Installed
        </Badge>
      </div>
      {installation.version && (
        <div className="flex items-center justify-between">
          <span className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>Version</span>
          <span className={cn('font-mono text-sm', isDark ? 'text-white' : 'text-gray-900')}>
            {installation.version.split(' ')[1] || installation.version}
          </span>
        </div>
      )}
      {installation.path && (
        <div className="flex items-center justify-between">
          <span className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>Path</span>
          <code
            className={cn(
              'rounded px-2 py-0.5 font-mono text-xs',
              isDark ? 'bg-black/30 text-gray-300' : 'bg-gray-100 text-gray-700'
            )}
          >
            {installation.path}
          </code>
        </div>
      )}
    </div>
  );
}

function PollingSettings() {
  const { pollingInterval, setPollingInterval } = useAppStore();
  const isDark = useSettingsTheme();

  const intervals = [
    { value: 2000, label: '2s' },
    { value: 5000, label: '5s' },
    { value: 10000, label: '10s' },
    { value: 30000, label: '30s' },
  ];

  return (
    <div className="space-y-3">
      <label className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>
        Status polling interval
      </label>
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
                ? isDark
                  ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
                  : 'border-cyan-500/60 bg-cyan-500/20 text-cyan-700'
                : isDark
                  ? 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
                  : 'border-gray-300/50 bg-gray-100/50 text-gray-600 hover:border-gray-400/50 hover:bg-gray-200/50'
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
  const isDark = useSettingsTheme();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className={cn('text-sm', isDark ? 'text-white' : 'text-gray-900')}>
            Native Notifications
          </p>
          <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-600')}>
            Show OS notifications for sync events
          </p>
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
              : isDark
                ? 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
                : 'border-gray-300/50 bg-gray-100/50 text-gray-600 hover:border-gray-400/50 hover:bg-gray-200/50'
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
  const isDark = useSettingsTheme();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className={cn('text-sm', isDark ? 'text-white' : 'text-gray-900')}>Enable AI Search</p>
          <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-600')}>
            Semantic file search using local AI model
          </p>
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
              : isDark
                ? 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
                : 'border-gray-300/50 bg-gray-100/50 text-gray-600 hover:border-gray-400/50 hover:bg-gray-200/50'
          )}
        >
          {aiEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>
      {aiEnabled && (
        <div className={cn('border-t pt-4', isDark ? 'border-white/10' : 'border-gray-200')}>
          <FileIndexer />
        </div>
      )}
    </div>
  );
}

function NetworkSettings() {
  const { data: config, isLoading } = useConfig();
  const updateOptions = useUpdateOptions();
  const isDark = useSettingsTheme();

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
        <Skeleton className={cn('h-8 w-full', isDark ? 'bg-white/10' : 'bg-gray-200')} />
        <Skeleton className={cn('h-8 w-full', isDark ? 'bg-white/10' : 'bg-gray-200')} />
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
            <p className={cn('text-sm', isDark ? 'text-white' : 'text-gray-900')}>{label}</p>
            <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-600')}>{desc}</p>
          </div>
          <button
            onClick={() => updateField(key, !localOptions[key])}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
              localOptions[key]
                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                : isDark
                  ? 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
                  : 'border-gray-300/50 bg-gray-100/50 text-gray-600 hover:border-gray-400/50 hover:bg-gray-200/50'
            )}
          >
            {localOptions[key] ? 'On' : 'Off'}
          </button>
        </div>
      ))}

      {isSaving && (
        <div
          className={cn(
            'flex items-center gap-2 text-xs',
            isDark ? 'text-gray-400' : 'text-gray-600'
          )}
        >
          <RefreshCw className="h-3 w-3 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}

function SystemActions() {
  const restartSyncthing = useRestartSyncthing();
  const isDark = useSettingsTheme();

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
      <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>
        Restart Syncthing to apply changes that require a restart.
      </p>
      <button
        onClick={handleRestart}
        disabled={restartSyncthing.isPending}
        className={cn(
          'w-full rounded-lg border px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50',
          isDark
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
            : 'border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
        )}
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

export function SettingsPanel({ onClose: _onClose }: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [logViewerOpen, setLogViewerOpen] = useState(false);
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';

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
    <SettingsThemeContext.Provider value={isDark}>
      <div className="flex h-full min-h-[500px] gap-6">
        {/* Sidebar Navigation */}
        <nav
          className={cn(
            'w-48 shrink-0 space-y-1 border-r pr-6',
            isDark ? 'border-white/10' : 'border-gray-200'
          )}
        >
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                activeSection === id
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-cyan-500/15 text-cyan-700'
                  : isDark
                    ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
              {activeSection === id && (
                <ChevronRight
                  className={cn('ml-auto h-4 w-4', isDark ? 'text-cyan-400' : 'text-cyan-600')}
                />
              )}
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            {activeSection === 'appearance' && (
              <>
                <div>
                  <h3
                    className={cn(
                      'mb-4 text-lg font-semibold',
                      isDark ? 'text-white' : 'text-gray-900'
                    )}
                  >
                    Theme
                  </h3>
                  <ThemeSelector />
                </div>
              </>
            )}

            {activeSection === 'syncthing' && (
              <>
                <div>
                  <h3
                    className={cn(
                      'mb-4 text-lg font-semibold',
                      isDark ? 'text-white' : 'text-gray-900'
                    )}
                  >
                    Syncthing Status
                  </h3>
                  <SyncthingInfo />
                </div>
                <div>
                  <h3
                    className={cn(
                      'mb-4 text-lg font-semibold',
                      isDark ? 'text-white' : 'text-gray-900'
                    )}
                  >
                    Device ID
                  </h3>
                  <DeviceIdDisplay />
                </div>
                <div>
                  <h3
                    className={cn(
                      'mb-4 text-lg font-semibold',
                      isDark ? 'text-white' : 'text-gray-900'
                    )}
                  >
                    System Actions
                  </h3>
                  <SystemActions />
                </div>
              </>
            )}

            {activeSection === 'network' && (
              <div>
                <h3
                  className={cn(
                    'mb-4 text-lg font-semibold',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}
                >
                  Network Settings
                </h3>
                <NetworkSettings />
              </div>
            )}

            {activeSection === 'notifications' && (
              <div>
                <h3
                  className={cn(
                    'mb-4 text-lg font-semibold',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}
                >
                  Notification Preferences
                </h3>
                <NotificationSettings />
              </div>
            )}

            {activeSection === 'ai' && (
              <div>
                <h3
                  className={cn(
                    'mb-4 text-lg font-semibold',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}
                >
                  AI-Powered Search
                </h3>
                <AISettings />
              </div>
            )}

            {activeSection === 'polling' && (
              <div>
                <h3
                  className={cn(
                    'mb-4 text-lg font-semibold',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}
                >
                  Refresh Rate
                </h3>
                <PollingSettings />
              </div>
            )}

            {activeSection === 'logs' && (
              <div>
                <h3
                  className={cn(
                    'mb-4 text-lg font-semibold',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}
                >
                  System Logs
                </h3>
                <p className={cn('mb-4 text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>
                  View real-time logs from Syncthing for troubleshooting.
                </p>
                <button
                  onClick={() => setLogViewerOpen(true)}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all',
                    isDark
                      ? 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                      : 'border-gray-300/50 bg-gray-100/50 text-gray-700 hover:bg-gray-200/50 hover:text-gray-900'
                  )}
                >
                  <Bug className="h-4 w-4" />
                  Open Log Viewer
                </button>
              </div>
            )}

            {activeSection === 'about' && (
              <div>
                <h3
                  className={cn(
                    'mb-4 text-lg font-semibold',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}
                >
                  About Eigen
                </h3>
                <div className="space-y-3">
                  <p className={cn('text-sm', isDark ? 'text-gray-300' : 'text-gray-700')}>
                    A modern Syncthing manager built with Tauri, Next.js, and React Three Fiber.
                  </p>
                  <p className={cn('text-xs', isDark ? 'text-gray-500' : 'text-gray-500')}>
                    Version 0.1.0 • Built with 💜
                  </p>
                  <button
                    onClick={() => window.open('https://github.com/syncthing/syncthing', '_blank')}
                    className={cn(
                      'flex items-center gap-2 text-sm transition-colors',
                      isDark
                        ? 'text-cyan-400 hover:text-cyan-300'
                        : 'text-cyan-600 hover:text-cyan-700'
                    )}
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
    </SettingsThemeContext.Provider>
  );
}

export default SettingsPanel;
