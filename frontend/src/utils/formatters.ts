export function formatBytes(bytes: number | null | undefined): string {
    if (bytes === null || bytes === undefined) return "-";
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    const base = 1024;
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
    const value = bytes / Math.pow(base, index);
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

export function formatPct(value: number | null | undefined): string {
    if (value === null || value === undefined) return "-";
    return `${value.toFixed(1)}%`;
}
