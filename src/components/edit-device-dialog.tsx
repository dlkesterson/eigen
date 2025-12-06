import { useState, ChangeEvent } from 'react';
import { useUpdateDeviceConfig } from '@/hooks/useSyncthing';
import { BaseDialog, DialogFooter, DialogInput } from '@/components/ui/base-dialog';
import { Gauge, Network, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { DeviceConfig } from '@/hooks/syncthing/types';

interface EditDeviceDialogProps {
  open: boolean;
  onClose: () => void;
  device: DeviceConfig;
  isLocalDevice?: boolean;
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

// Simple toggle switch component
function ToggleSwitch({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <label htmlFor={id} className="text-foreground text-sm font-medium">
          {label}
        </label>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          checked ? 'bg-violet-600' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

// Wrapper component that uses key to reset inner form when device changes
export function EditDeviceDialog({ open, onClose, device, isLocalDevice }: EditDeviceDialogProps) {
  // Use device ID as key to remount form when device changes
  // This eliminates the need for useEffect to reset state
  return (
    <EditDeviceFormContent
      key={device.deviceID}
      open={open}
      onClose={onClose}
      device={device}
      isLocalDevice={isLocalDevice}
    />
  );
}

// Inner form component - remounts when key changes, so initial state comes from props
function EditDeviceFormContent({ open, device, isLocalDevice, onClose }: EditDeviceDialogProps) {
  // Form state initialized from device props
  const [name, setName] = useState(device.name || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [addresses, setAddresses] = useState(device.addresses?.join(', ') || 'dynamic');
  const [compression, setCompression] = useState<CompressionType>(
    (device.compression as CompressionType) || 'metadata'
  );
  const [introducer, setIntroducer] = useState(device.introducer || false);
  const [autoAcceptFolders, setAutoAcceptFolders] = useState(device.autoAcceptFolders || false);
  const [maxSendKbps, setMaxSendKbps] = useState<number>(device.maxSendKbps || 0);
  const [maxRecvKbps, setMaxRecvKbps] = useState<number>(device.maxRecvKbps || 0);

  const updateDevice = useUpdateDeviceConfig();

  const handleSave = async () => {
    try {
      const updates: Partial<DeviceConfig> = {
        name: name.trim() || undefined,
      };

      // Only include non-local device options for remote devices
      if (!isLocalDevice) {
        // Parse addresses
        const addressList = addresses
          .split(',')
          .map((a) => a.trim())
          .filter((a) => a.length > 0);
        updates.addresses = addressList.length > 0 ? addressList : ['dynamic'];
        updates.compression = compression;
        updates.introducer = introducer;
        updates.autoAcceptFolders = autoAcceptFolders;
        updates.maxSendKbps = maxSendKbps;
        updates.maxRecvKbps = maxRecvKbps;
      }

      await updateDevice.mutateAsync({
        deviceId: device.deviceID,
        updates,
      });

      toast.success('Device settings updated');
      onClose();
    } catch (error) {
      toast.error('Failed to update device settings');
      console.error('Error updating device:', error);
    }
  };

  const hasChanges = () => {
    if (name !== (device.name || '')) return true;
    if (!isLocalDevice) {
      const currentAddresses = device.addresses?.join(', ') || 'dynamic';
      if (addresses !== currentAddresses) return true;
      if (compression !== (device.compression || 'metadata')) return true;
      if (introducer !== (device.introducer || false)) return true;
      if (autoAcceptFolders !== (device.autoAcceptFolders || false)) return true;
      if (maxSendKbps !== (device.maxSendKbps || 0)) return true;
      if (maxRecvKbps !== (device.maxRecvKbps || 0)) return true;
    }
    return false;
  };

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title={isLocalDevice ? 'Edit This Device' : 'Edit Device'}
      description={`Device ID: ${device.deviceID.slice(0, 20)}...`}
      maxWidth="lg"
      loading={updateDevice.isPending}
      loadingText="Saving changes..."
      footer={
        <DialogFooter
          onCancel={onClose}
          onConfirm={handleSave}
          confirmText="Save Changes"
          loading={updateDevice.isPending}
          disabled={!hasChanges()}
        />
      }
    >
      <div className="space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <DialogInput
            id="device-name"
            label="Device Name"
            placeholder="My Device"
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            helperText="A friendly name to identify this device"
          />
        </div>

        {/* Advanced Options (only for remote devices) */}
        {!isLocalDevice && (
          <>
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between py-2"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Advanced Options
              </span>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {showAdvanced && (
              <div className="border-border/50 space-y-6 rounded-lg border p-4">
                {/* Network Settings */}
                <div className="space-y-4">
                  <h4 className="text-foreground flex items-center gap-2 text-sm font-medium">
                    <Network className="h-4 w-4" />
                    Network
                  </h4>

                  <DialogInput
                    id="addresses"
                    label="Addresses"
                    placeholder="dynamic"
                    value={addresses}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setAddresses(e.target.value)}
                    helperText="Comma-separated list of addresses, or 'dynamic' for automatic discovery"
                  />

                  <div className="space-y-1.5">
                    <label htmlFor="compression" className="text-foreground text-sm font-medium">
                      Compression
                    </label>
                    <select
                      id="compression"
                      value={compression}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setCompression(e.target.value as CompressionType)
                      }
                      className="border-border bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                    >
                      {compressionOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-muted-foreground text-xs">
                      {compressionOptions.find((o) => o.value === compression)?.description}
                    </p>
                  </div>
                </div>

                {/* Bandwidth Limits */}
                <div className="space-y-4">
                  <h4 className="text-foreground flex items-center gap-2 text-sm font-medium">
                    <Gauge className="h-4 w-4" />
                    Bandwidth Limits
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <DialogInput
                      id="max-send"
                      label="Max Send (KB/s)"
                      type="number"
                      placeholder="0"
                      value={maxSendKbps.toString()}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setMaxSendKbps(parseInt(e.target.value) || 0)
                      }
                      helperText="0 = unlimited"
                    />
                    <DialogInput
                      id="max-recv"
                      label="Max Receive (KB/s)"
                      type="number"
                      placeholder="0"
                      value={maxRecvKbps.toString()}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setMaxRecvKbps(parseInt(e.target.value) || 0)
                      }
                      helperText="0 = unlimited"
                    />
                  </div>
                </div>

                {/* Device Behavior */}
                <div className="space-y-4">
                  <h4 className="text-foreground flex items-center gap-2 text-sm font-medium">
                    <Settings2 className="h-4 w-4" />
                    Behavior
                  </h4>

                  <ToggleSwitch
                    id="introducer"
                    label="Introducer"
                    description="This device will introduce other devices to me"
                    checked={introducer}
                    onChange={setIntroducer}
                  />

                  <ToggleSwitch
                    id="auto-accept"
                    label="Auto Accept Folders"
                    description="Automatically accept folders shared by this device"
                    checked={autoAcceptFolders}
                    onChange={setAutoAcceptFolders}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </BaseDialog>
  );
}
