/** Matches the owner add-ground type chip label. */
export function isCricketGroundType(pitchType: string | null | undefined): boolean {
  return String(pitchType ?? '').trim().toLowerCase() === 'cricket ground';
}

export function cricketPitchSurfaceForDb(
  pitchType: string | null | undefined,
  surface: string | null | undefined,
): string | null {
  if (!isCricketGroundType(pitchType)) return null;
  const s = String(surface ?? '').trim();
  return s === 'Turf' || s === 'Matting' ? s : null;
}

/** From booking notes (`Teams: 1 Team` / `Teams: Both Teams`). Box cricket returns null. */
export function cricketTeamsLabelFromBooking(
  pitchType: string | null | undefined,
  notes: string | null | undefined,
): string | null {
  if (String(pitchType ?? '').toLowerCase().includes('box')) return null;
  if (!isCricketGroundType(pitchType)) return null;
  const n = notes ?? '';
  if (/Teams:\s*1\s*Team/i.test(n)) return '1 team';
  if (/Teams:\s*Both\s*Teams/i.test(n)) return 'Both teams';
  const m = /Teams:\s*(\d+)/i.exec(n);
  if (m) {
    const d = Number(m[1]);
    if (d === 1) return '1 team';
    if (d >= 2) return 'Both teams';
  }
  return null;
}
