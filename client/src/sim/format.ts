export function fmtTime(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '--:--.---';
  const t = Math.max(0, ms);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(Math.floor(t % 1000)).padStart(3, '0')}`;
}

export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function fmtSpeed(kmh: number, units: 'kmh' | 'mph'): string {
  return units === 'kmh' ? `${Math.round(kmh)}` : `${Math.round(kmh * 0.621371)}`;
}

export function ordinal(n: number): string {
  const suf = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suf[(v - 20) % 10] || suf[v] || suf[0]);
}

export function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const d = Math.floor(hrs / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}
