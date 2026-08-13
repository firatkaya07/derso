import { describe, expect, it, beforeEach } from "vitest";
import {
  readClientCache,
  writeClientCache,
  invalidateClientCache,
  invalidateOrgClientCache,
} from "@/lib/cache/client";

describe("client cache", () => {
  beforeEach(() => {
    invalidateClientCache();
  });

  it("yazılan değeri okur", () => {
    writeClientCache("client:org:1:teachers", { ok: true }, 60_000);
    expect(readClientCache<{ ok: boolean }>("client:org:1:teachers")).toEqual({
      ok: true,
    });
  });

  it("TTL dolunca undefined döner", () => {
    writeClientCache("k", 1, -1);
    expect(readClientCache("k")).toBeUndefined();
  });

  it("org invalidasyonu ilgili anahtarları siler", () => {
    writeClientCache("client:org:abc:teachers", [1], 60_000);
    writeClientCache("client:org:abc:subjects", [2], 60_000);
    writeClientCache("client:org:other:teachers", [3], 60_000);
    invalidateOrgClientCache("abc");
    expect(readClientCache("client:org:abc:teachers")).toBeUndefined();
    expect(readClientCache("client:org:abc:subjects")).toBeUndefined();
    expect(readClientCache("client:org:other:teachers")).toEqual([3]);
  });
});
