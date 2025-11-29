'use client';

import { useSystemStatus, useConnections } from '@/hooks/useSyncthing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUptime, formatBytes } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Activity,
  HardDrive,
  Network,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
    },
  }),
};

function StatCard({
  title,
  value,
  icon: Icon,
  isLoading,
  badge,
  index = 0,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  isLoading: boolean;
  badge?: { label: string; variant: 'success' | 'warning' | 'destructive' };
  index?: number;
}) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      whileHover={{
        y: -4,
        transition: { type: 'spring', stiffness: 400, damping: 25 },
      }}
    >
      <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
          <Icon className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="flex items-center gap-2">
              <motion.div
                className="text-2xl font-bold text-white"
                key={value}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30,
                }}
              >
                {value}
              </motion.div>
              {badge && (
                <Badge variant={badge.variant} className="text-xs">
                  {badge.label}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function StatsOverview() {
  const { data: status, isLoading: statusLoading, isError: statusError } = useSystemStatus();
  const { data: connections, isLoading: connectionsLoading } = useConnections();

  const isLoading = statusLoading || connectionsLoading;

  // Calculate connected devices
  const connectedDevices = Object.values(connections?.connections || {}).filter(
    (c) => c?.connected
  ).length;
  const totalDevices = Object.keys(connections?.connections || {}).length;

  // Calculate transfer stats
  const inBytes = connections?.total?.inBytesTotal || 0;
  const outBytes = connections?.total?.outBytesTotal || 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Status"
        value={statusError ? 'Offline' : 'Online'}
        icon={Activity}
        isLoading={isLoading}
        index={0}
        badge={
          statusError
            ? { label: 'Disconnected', variant: 'destructive' }
            : { label: 'Connected', variant: 'success' }
        }
      />
      <StatCard
        title="Uptime"
        value={status?.uptime ? formatUptime(status.uptime) : '—'}
        icon={Clock}
        isLoading={isLoading}
        index={1}
      />
      <StatCard
        title="Devices"
        value={`${connectedDevices}/${totalDevices}`}
        icon={Network}
        isLoading={isLoading}
        index={2}
        badge={
          connectedDevices === totalDevices && totalDevices > 0
            ? { label: 'All Connected', variant: 'success' }
            : undefined
        }
      />
      <StatCard
        title="Goroutines"
        value={status?.goroutines?.toString() || '—'}
        icon={HardDrive}
        isLoading={isLoading}
        index={3}
      />
      <StatCard
        title="Downloaded"
        value={formatBytes(inBytes)}
        icon={ArrowDownToLine}
        isLoading={isLoading}
        index={4}
      />
      <StatCard
        title="Uploaded"
        value={formatBytes(outBytes)}
        icon={ArrowUpFromLine}
        isLoading={isLoading}
        index={5}
      />
    </div>
  );
}
