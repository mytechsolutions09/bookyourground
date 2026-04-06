/**
 * Slug segment for pretty URLs: `/ground/[citySlug]/[nameSlug]`.
 * Must stay in sync with links built in WebLayout, GroundBrowse, etc.
 */
export function slugifyGroundSegment(value: string): string {
  return (value || 'ground')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function makeGroundPath(ground: any): string {
  if (!ground) return '/grounds';
  const c = slugifyGroundSegment(ground.city);
  const n = slugifyGroundSegment(ground.name);
  return `/ground/${c}/${n}`;
}
