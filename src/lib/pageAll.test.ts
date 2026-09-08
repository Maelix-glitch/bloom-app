import { describe, expect, it } from "vitest";

import { pageAll } from "@/lib/pageAll";

describe("pageAll — the whole record, not the first thousand", () => {
  const table = Array.from({ length: 2345 }, (_, i) => ({ id: i }));
  const fetchPage = (from: number, to: number) =>
    Promise.resolve({ data: table.slice(from, to + 1), error: null });

  it("keeps asking until a page comes back short", async () => {
    const calls: [number, number][] = [];
    const { data, error } = await pageAll<{ id: number }>((from, to) => {
      calls.push([from, to]);
      return fetchPage(from, to);
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(2345);
    expect(data![2344]!.id).toBe(2344);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("stops after one page when the table is smaller than a page", async () => {
    const small = [{ id: 1 }, { id: 2 }];
    let n = 0;
    const { data } = await pageAll<{ id: number }>(() => {
      n += 1;
      return Promise.resolve({ data: small, error: null });
    });
    expect(n).toBe(1);
    expect(data).toEqual(small);
  });

  it("asks once more when the record is an exact multiple of the page size", async () => {
    const exact = Array.from({ length: 2000 }, (_, i) => ({ id: i }));
    let n = 0;
    const { data } = await pageAll<{ id: number }>((from, to) => {
      n += 1;
      return Promise.resolve({ data: exact.slice(from, to + 1), error: null });
    });
    expect(n).toBe(3);
    expect(data).toHaveLength(2000);
  });

  it("returns the first error and nothing else", async () => {
    const { data, error } = await pageAll<{ id: number }>((from) =>
      from === 0 ? fetchPage(0, 999) : Promise.resolve({ data: null, error: { message: "boom" } }),
    );
    expect(data).toBeNull();
    expect(error).toEqual({ message: "boom" });
  });

  it("treats a null page as empty", async () => {
    const { data } = await pageAll<{ id: number }>(() =>
      Promise.resolve({ data: null, error: null }),
    );
    expect(data).toEqual([]);
  });
});
