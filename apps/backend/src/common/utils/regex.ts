/** Escapes regex metacharacters so a user-supplied search term can be used safely in a $regex filter. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
