import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, RefreshCw, Cpu, HardDrive, AlertCircle } from 'lucide-react';
import { getLxcStats, type LxcStats } from '../api/stats';
import { formatBytes, formatPct } from '../utils/formatters';

const POLL_MS = 10000;

export default function ContainersPage() {
    const [containers, setContainers] = useState<LxcStats[]>([]);
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
                const data = await getLxcStats(signal);
                if (!isActive.current) return;
                setContainers(data);
                setError(null);
                setLastUpdated(new Date());
            } catch (err) {
                if (!isActive.current) return;
                if (err instanceof DOMException && err.name === 'AbortError') return;
                setError(err instanceof Error ? err.message : 'Failed to load container stats.');
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

    const rows = useMemo(() => {
        return containers.map((container) => {
            const status = (container.status || 'unknown').toLowerCase();
            const statusColor =
                status === 'running'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : status === 'stopped'
                        ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

            return {
                ...container,
                status,
                statusColor,
            };
        });
    }, [containers]);

    return (
        <div className="h-full flex flex-col gap-6">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Box className="w-6 h-6 text-brand-500" />
                        My Containers
                    </h1>
                    <p className="text-zinc-400 text-sm mt-1">
                        Active leases and live resource usage.
                    </p>
                    {lastUpdated && (
                        <p className="text-xs text-zinc-500 mt-1">
                            Updated {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}
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

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-900 border-b border-zinc-800 text-xs uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Container</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">SKU</th>
                                <th className="px-6 py-4">Resources</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {isLoading && (
                                <tr>
                                    <td className="px-6 py-6 text-zinc-500" colSpan={4}>
                                        Loading containers...
                                    </td>
                                </tr>
                            )}
                            {!isLoading && rows.length === 0 && (
                                <tr>
                                    <td className="px-6 py-6 text-zinc-500" colSpan={4}>
                                        No containers found.
                                    </td>
                                </tr>
                            )}
                            {rows.map((container) => (
                                <tr key={`${container.leaseId}-${container.ctid}`} className="hover:bg-zinc-800/30 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-zinc-200">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-brand-500">CT {container.ctid}</span>
                                            <span className="text-xs text-zinc-600">Lease {container.leaseId || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${container.statusColor}`}
                                            >
                                                {container.status}
                                            </span>
                                            {container.error && (
                                                <span className="flex items-center gap-1 text-xs text-red-400">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {container.error}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-zinc-200">{container.sku ?? '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-3 w-48">
                                            <div className="flex items-center gap-2">
                                                <Cpu className="w-3 h-3 text-zinc-500" />
                                                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-brand-500 rounded-full"
                                                        style={{ width: `${Math.min(container.cpu?.pct ?? 0, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-zinc-500 w-12 text-right">
                                                    {formatPct(container.cpu?.pct)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <HardDrive className="w-3 h-3 text-zinc-500" />
                                                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-violet-500 rounded-full"
                                                        style={{ width: `${Math.min(container.memory?.pct ?? 0, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-zinc-500 w-12 text-right">
                                                    {formatPct(container.memory?.pct)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <HardDrive className="w-3 h-3 text-zinc-500" />
                                                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-500 rounded-full"
                                                        style={{ width: `${Math.min(container.disk?.pct ?? 0, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-zinc-500 w-12 text-right">
                                                    {formatPct(container.disk?.pct)}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-zinc-600">
                                                Mem {formatBytes(container.memory?.used)} / {formatBytes(container.memory?.total)}
                                                {' '}
                                                • Disk {formatBytes(container.disk?.used)} / {formatBytes(container.disk?.total)}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
