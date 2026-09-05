export function formatTime(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '--:--.---';
  const total = Math.max(0, ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const frac = Math.floor(total % 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(frac).padStart(3, '0')}`;
}

export function formatShortTime(ms: number | null | undefined): string {
  if (ms == null) return '--.--';
  return (ms / 1000).toFixed(2) + 's';
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function formatSpeed(kmh: number, units: 'kmh' | 'mph'): string {
  return units === 'kmh' ? `${Math.round(kmh)}` : `${Math.round(kmh * 0.621371)}`;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
