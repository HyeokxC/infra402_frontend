import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Server, MapPin, Cpu, HardDrive, Globe, Gauge, RefreshCw } from 'lucide-react';
import { getNodeStats, type NodeStatsResponse } from '../api/stats';
import { formatBytes, formatPct } from '../utils/formatters';

const POLL_MS = 10000;

export default function ServersPage() {
    const [nodeStats, setNodeStats] = useState<NodeStatsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const isActive = useRef(true);

    const loadStats = useCallback(
        async (mode: 'initial' | 'refresh', signal?: AbortSignal) => {
            if (mode === 'initial') {
                setIsLoading(true);
            } else {
                setIsRefreshing(true);
            }
            try {
                const data = await getNodeStats(signal);
                if (!isActive.current) return;
                setNodeStats(data);
                setError(null);
                setLastUpdated(new Date());
            } catch (err) {
                if (!isActive.current) return;
                if (err instanceof DOMException && err.name === 'AbortError') return;
                setError(err instanceof Error ? err.message : 'Failed to load node stats.');
            } finally {
                if (!isActive.current) return;
                if (mode === 'initial') {
                    setIsLoading(false);
                } else {
                    setIsRefreshing(false);
                }
            }
        },
        []
    );

    useEffect(() => {
        isActive.current = true;
        const controller = new AbortController();
        void loadStats('initial', controller.signal);
        const interval = window.setInterval(() => {
            void loadStats('refresh');
        }, POLL_MS);
        return () => {
            isActive.current = false;
            controller.abort();
            window.clearInterval(interval);
        };
    }, [loadStats]);

    const statusLabel = nodeStats ? 'online' : error ? 'offline' : 'loading';

    const specItems = useMemo(() => {
        if (!nodeStats) return [];
        return [
            {
                label: 'CPU',
                icon: Cpu,
                value: formatPct(nodeStats.cpu.pct),
                subLabel: nodeStats.cpu.cores ? `${nodeStats.cpu.cores} cores` : 'cores unknown',
                pct: nodeStats.cpu.pct ?? 0,
            },
            {
                label: 'Memory',
                icon: Gauge,
                value: formatPct(nodeStats.memory.pct),
                subLabel: `${formatBytes(nodeStats.memory.used)} / ${formatBytes(nodeStats.memory.total)}`,
                pct: nodeStats.memory.pct ?? 0,
            },
            {
                label: 'Disk',
                icon: HardDrive,
                value: formatPct(nodeStats.disk.pct),
                subLabel: `${formatBytes(nodeStats.disk.used)} / ${formatBytes(nodeStats.disk.total)}`,
                pct: nodeStats.disk.pct ?? 0,
            },
        ];
    }, [nodeStats]);

    return (
        <div className="h-full flex flex-col gap-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Server className="w-6 h-6 text-brand-500" />
                        Server Selection
                    </h1>
                    <p className="text-zinc-400 text-sm mt-1">
                        Live stats from the Proxmox node powering Infra402.
                    </p>
                </div>
                <button
                    className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    onClick={() => void loadStats('refresh')}
                    disabled={isRefreshing}
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </header>

            {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            )}

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col gap-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                            <Globe className="w-6 h-6 text-brand-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">
                                {nodeStats?.node ?? 'Node unavailable'}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-zinc-500">
                                <MapPin className="w-3 h-3" />
                                Infra402 Proxmox Cluster
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusLabel === 'online'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : statusLabel === 'offline'
                                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}
                        >
                            {statusLabel.toUpperCase()}
                        </span>
                        {lastUpdated && (
                            <span className="text-xs text-zinc-500">
                                Updated {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-sm text-zinc-500">Loading node stats...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {specItems.map((item) => (
                            <div
                                key={item.label}
                                className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 flex flex-col gap-3"
                            >
                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </div>
                                <div className="text-2xl font-semibold text-white">{item.value}</div>
                                <div className="text-xs text-zinc-500">{item.subLabel}</div>
                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-brand-500 rounded-full"
                                        style={{ width: `${Math.min(item.pct, 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
