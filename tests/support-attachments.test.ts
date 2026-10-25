import { describe, expect, it } from "vitest";
import { isSupportAttachmentPath } from "@/lib/support-attachment-path";
import {
  formatBytes,
  MAX_DOC_BYTES,
  MAX_IMAGE_BYTES,
  validateSupportFile,
} from "@/lib/support-attachments";

const CONVERSATION = "11111111-1111-4111-8111-111111111111";
const FILE = "22222222-2222-4222-8222-222222222222";

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

describe("isSupportAttachmentPath", () => {
  const valid = `support/${CONVERSATION}/${FILE}_not.pdf`;

  it("accepts a server-shaped path for that conversation", () => {
    expect(isSupportAttachmentPath(CONVERSATION, valid)).toBe(true);
  });

  it("rejects another conversation, traversal, and loose prefixes", () => {
    expect(
      isSupportAttachmentPath(
        "33333333-3333-4333-8333-333333333333",
        valid
      )
    ).toBe(false);
    expect(
      isSupportAttachmentPath(CONVERSATION, `support/${CONVERSATION}/../secret`)
    ).toBe(false);
    expect(
      isSupportAttachmentPath(CONVERSATION, `support/${CONVERSATION}/not.pdf`)
    ).toBe(false);
    expect(isSupportAttachmentPath(CONVERSATION, `support/${CONVERSATION}/${FILE}_a\\b.txt`)).toBe(
      false
    );
    expect(isSupportAttachmentPath("not-a-uuid", valid)).toBe(false);
  });
});
