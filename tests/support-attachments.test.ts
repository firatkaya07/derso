import { describe, expect, it } from "vitest";
import {
  formatBytes,
  MAX_DOC_BYTES,
  MAX_IMAGE_BYTES,
  validateSupportFile,
} from "@/lib/support-attachments";

function fakeFile(name: string, type: string, size: number): File {
  const buffer = new Uint8Array(Math.min(size, 16));
  const file = new File([buffer], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateSupportFile", () => {
  it("accepts images within 5MB", () => {
    const result = validateSupportFile(
      fakeFile("a.png", "image/png", MAX_IMAGE_BYTES)
    );
    expect("error" in result).toBe(false);
  });

  it("rejects oversized images", () => {
    const result = validateSupportFile(
      fakeFile("a.png", "image/png", MAX_IMAGE_BYTES + 1)
    );
    expect("error" in result).toBe(true);
  });

  it("accepts documents within 8MB", () => {
    const result = validateSupportFile(
      fakeFile("a.pdf", "application/pdf", MAX_DOC_BYTES)
    );
    expect("error" in result).toBe(false);
  });

  it("rejects unsupported mime", () => {
    const result = validateSupportFile(
      fakeFile("a.zip", "application/zip", 100)
    );
    expect("error" in result).toBe(true);
  });

  it("formats bytes", () => {
    expect(formatBytes(2048)).toContain("KB");
  });
});
