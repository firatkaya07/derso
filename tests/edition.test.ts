import { describe, expect, it } from "vitest";
import { pathForEdition, parseEdition, tanimlarHref } from "@/lib/edition";

describe("pathForEdition", () => {
  it("V1 rotasını V2 eşine çevirir", () => {
    expect(pathForEdition("/program", "v2")).toBe("/v2/program");
    expect(pathForEdition("/dagitim/izleme", "v2")).toBe("/v2/dagitim/izleme");
    expect(pathForEdition("/tanimlar", "v2")).toBe("/v2/tanimlar");
  });

  it("V2 rotasını V1 eşine çevirir", () => {
    expect(pathForEdition("/v2/program", "v1")).toBe("/program");
    expect(pathForEdition("/v2/dagitim/izleme", "v1")).toBe("/dagitim/izleme");
  });

  it("ana sayfayı sürüme göre çevirir", () => {
    expect(pathForEdition("/home", "v2")).toBe("/v2");
    expect(pathForEdition("/v2", "v1")).toBe("/home");
    expect(pathForEdition("/home", "v1")).toBe("/home");
    expect(pathForEdition("/v2", "v2")).toBe("/v2");
  });

  it("paylaşılan rotalara dokunmaz", () => {
    expect(pathForEdition("/dersler", "v2")).toBe("/dersler");
    expect(pathForEdition("/siniflar", "v1")).toBe("/siniflar");
  });
});

describe("parseEdition / tanimlarHref", () => {
  it("yalnızca v2’yi tanır", () => {
    expect(parseEdition("v2")).toBe("v2");
    expect(parseEdition("v1")).toBe("v1");
    expect(parseEdition("nope")).toBe("v1");
  });

  it("tanımlar linkini sürer", () => {
    expect(tanimlarHref("v1")).toBe("/tanimlar");
    expect(tanimlarHref("v2")).toBe("/v2/tanimlar");
  });
});
