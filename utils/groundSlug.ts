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
