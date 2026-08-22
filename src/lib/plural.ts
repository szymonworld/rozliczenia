/**
 * Polish plural form for a count. Polish picks between three forms: 1 takes
 * the singular, counts ending 2-4 take the "few" form, everything else takes
 * the "many" form — except the teens (12-14), which take "many" despite
 * ending in 2-4.
 *
 *   plural(1, "udział", "udziały", "udziałów")  -> "udział"
 *   plural(4, ...)                              -> "udziały"
 *   plural(14, ...)                             -> "udziałów"
 */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 >= 2 && rem10 <= 4 && !(rem100 >= 12 && rem100 <= 14)) return few;
  return many;
}
