/**
 * Read *every* row, not the first thousand.
 *
 * PostgREST answers a bare `select()` with at most 1,000 rows (the project's
 * `max-rows`). For three mood entries a day that cliff arrives inside a year,
 * and nothing tells anyone — the oldest history just leaves every average,
 * streak and correlation. Every reader that wants the whole record goes
 * through here: it asks in fixed-size pages until a page comes back short.
 */

export const PAGE_SIZE = 1000;

export interface PagedResult<T> {
  data: T[] | null;
  error: unknown;
}

/**
 * `fetchPage(from, to)` must apply `.range(from, to)` to an otherwise complete,
 * deterministically ORDERED query — paging without a stable order can skip or
 * repeat rows. Stops at the first short page or the first error.
 */
export async function pageAll<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PagedResult<T>>,
  pageSize: number = PAGE_SIZE,
): Promise<PagedResult<T>> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) return { data: null, error };
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return { data: out, error: null };
}
