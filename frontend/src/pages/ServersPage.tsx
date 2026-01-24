import { Server, MapPin, Cpu, Mic, HardDrive, Zap, Globe, Gauge } from 'lucide-react';

interface ServerNode {
    id: string;
    name: string;
    location: string;
    region: string;
    specs: {
        cpu: string;
        ram: string;
        disk: string;
    };
    price: number;
    latency: number;
    status: 'online' | 'busy' | 'offline';
}

const mockServers: ServerNode[] = [
    {
        id: 'sv-01',
        name: 'Alpha Node-1',
        location: 'Seoul, Korea',
        region: 'ap-northeast-2',
        specs: { cpu: '8 vCPU', ram: '32GB', disk: '512GB NVMe' },
        price: 0.0402,
        latency: 12,
        status: 'online'
    },
    {
        id: 'sv-02',
        name: 'Beta Cluster-A',
        location: 'Virginia, USA',
        region: 'us-east-1',
        specs: { cpu: '16 vCPU', ram: '64GB', disk: '1TB NVMe' },
        price: 0.0804,
        latency: 145,
        status: 'online'
    },
    {
        id: 'sv-03',
        name: 'Gamma GPU-X',
        location: 'Frankfurt, DE',
        region: 'eu-central-1',
        specs: { cpu: '32 vCPU', ram: '128GB', disk: '2TB NVMe' },
        price: 0.1608,
        latency: 210,
        status: 'busy'
    },
    {
        id: 'sv-04',
        name: 'Delta Edge-2',
        location: 'Tokyo, Japan',
        region: 'ap-northeast-1',
        specs: { cpu: '4 vCPU', ram: '16GB', disk: '256GB SSD' },
        price: 0.0201,
        latency: 35,
        status: 'online'
    },
];

export default function ServersPage() {
    return (
        <div className="h-full flex flex-col gap-6">
            <header>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Server className="w-6 h-6 text-brand-500" />
                    Server Selection
                </h1>
                <p className="text-zinc-400 text-sm mt-1">
                    Choose a high-performance node for your container deployment.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockServers.map((server) => (
                    <div
                        key={server.id}
                        className="group bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800 hover:border-brand-500/50 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/10 flex flex-col gap-4 relative overflow-hidden"
                    >
                        {/* Abstract background decoration */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />

                        <div className="flex justify-between items-start z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:border-brand-500/30 transition-colors">
                                    <Globe className="w-5 h-5 text-zinc-400 group-hover:text-brand-500 transition-colors" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-zinc-100 group-hover:text-brand-400 transition-colors">
                                        {server.name}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                                        <MapPin className="w-3 h-3" />
                                        {server.location}
                                    </div>
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-medium border ${server.status === 'online'
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                }`}>
                                {server.status.toUpperCase()}
                            </div>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-3 gap-2 py-4 border-y border-zinc-800/50">
                            <div className="flex flex-col items-center gap-1 p-2 rounded bg-zinc-950/30">
                                <Cpu className="w-4 h-4 text-zinc-400" />
                                <span className="text-xs font-mono text-zinc-300">{server.specs.cpu}</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 p-2 rounded bg-zinc-950/30">
                                <Gauge className="w-4 h-4 text-zinc-400" />
                                <span className="text-xs font-mono text-zinc-300">{server.specs.ram}</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 p-2 rounded bg-zinc-950/30">
                                <HardDrive className="w-4 h-4 text-zinc-400" />
                                <span className="text-xs font-mono text-zinc-300">{server.specs.disk}</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-auto z-10">
                            <div className="flex flex-col">
                                <span className="text-xs text-zinc-500">Rate</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-bold text-white">{server.price}</span>
                                    <span className="text-xs text-brand-500">x402/hr</span>
                                </div>
                            </div>

                            <button className="px-4 py-2 bg-zinc-100 text-zinc-900 hover:bg-brand-500 hover:text-white rounded-lg font-bold text-sm transition-all shadow hover:shadow-lg hover:shadow-brand-500/20">
                                Select
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
