const statsApiBase =
    (import.meta.env.VITE_CHAT_API_BASE as string | undefined)?.replace(/\/$/, "") ||
    "http://localhost:8000";

export type UsageStats = {
    used: number | null;
    total: number | null;
    free: number | null;
    pct: number | null;
};

export type CpuStats = {
    usage: number | null;
    cores: number | null;
    pct: number | null;
};

export type NodeStatsResponse = {
    node: string;
    cpu: CpuStats;
    memory: UsageStats;
    disk: UsageStats;
};

export type LxcStats = {
    leaseId: string;
    ctid: string;
    sku: string | null;
    status: string | null;
    cpu: CpuStats | null;
    memory: UsageStats | null;
    disk: UsageStats | null;
    error: string | null;
};

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
    const resp = await fetch(`${statsApiBase}${path}`, { signal });
    if (!resp.ok) {
        let message = "";
        try {
            message = await resp.text();
        } catch {
            // ignore
        }
        throw new Error(message || `Request failed with ${resp.status}`);
    }
    return (await resp.json()) as T;
}

export function getNodeStats(signal?: AbortSignal): Promise<NodeStatsResponse> {
    return fetchJson("/stats/node", signal);
}

export function getLxcStats(signal?: AbortSignal): Promise<LxcStats[]> {
    return fetchJson("/stats/lxc", signal);
}
