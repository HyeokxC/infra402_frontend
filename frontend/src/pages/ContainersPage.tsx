import { Box, Play, Square, RefreshCw, Cpu, HardDrive } from 'lucide-react';

interface Container {
    id: string;
    sku: string;
    image: string;
    status: 'running' | 'provisioning' | 'stopped';
    uptime: string;
    specs: {
        cpu: number; // percentage
        ram: number; // percentage
    };
    created_at: string;
}

const mockContainers: Container[] = [
    {
        id: 'cnt-8x9d2a',
        sku: 'standard-m1',
        image: 'ubuntu:22.04',
        status: 'running',
        uptime: '2d 14h 32m',
        specs: { cpu: 24, ram: 45 },
        created_at: '2023-10-24 10:00:00'
    },
    {
        id: 'cnt-3k2j9s',
        sku: 'gpu-s1',
        image: 'pytorch/pytorch:latest',
        status: 'provisioning',
        uptime: '0m',
        specs: { cpu: 0, ram: 0 },
        created_at: '2023-10-26 15:30:00'
    },
    {
        id: 'cnt-9f8d1z',
        sku: 'light-s2',
        image: 'redis:alpine',
        status: 'stopped',
        uptime: '-',
        specs: { cpu: 0, ram: 0 },
        created_at: '2023-10-20 09:15:00'
    }
];

export default function ContainersPage() {
    return (
        <div className="h-full flex flex-col gap-6">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Box className="w-6 h-6 text-brand-500" />
                        My Containers
                    </h1>
                    <p className="text-zinc-400 text-sm mt-1">
                        Manage your active and stopped container leases.
                    </p>
                </div>
                <button className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </header>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-900 border-b border-zinc-800 text-xs uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Container ID</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Image / SKU</th>
                                <th className="px-6 py-4">Resources</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {mockContainers.map((container) => (
                                <tr key={container.id} className="hover:bg-zinc-800/30 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-zinc-200">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-brand-500 group-hover:underline cursor-pointer">{container.id}</span>
                                            <span className="text-xs text-zinc-600">{container.created_at}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {container.status === 'running' && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                Running
                                            </span>
                                        )}
                                        {container.status === 'provisioning' && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                <LoaderSpinner />
                                                Provisioning
                                            </span>
                                        )}
                                        {container.status === 'stopped' && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                                Stopped
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-zinc-200">{container.image}</span>
                                            <span className="text-xs text-zinc-500">{container.sku}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2 w-32">
                                            <div className="flex items-center gap-2">
                                                <Cpu className="w-3 h-3 text-zinc-500" />
                                                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-brand-500 rounded-full"
                                                        style={{ width: `${container.specs.cpu}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <HardDrive className="w-3 h-3 text-zinc-500" />
                                                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-violet-500 rounded-full"
                                                        style={{ width: `${container.specs.ram}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {container.status === 'running' && (
                                                <button className="p-2 rounded bg-zinc-800 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors" title="Stop">
                                                    <Square className="w-4 h-4 fill-current" />
                                                </button>
                                            )}
                                            {container.status === 'stopped' && (
                                                <button className="p-2 rounded bg-zinc-800 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors" title="Start">
                                                    <Play className="w-4 h-4 fill-current" />
                                                </button>
                                            )}
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

const LoaderSpinner = () => (
    <svg className="animate-spin h-3 w-3 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);
