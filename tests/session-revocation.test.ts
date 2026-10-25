import { describe, expect, it } from "vitest";
import {
  accessTokenIssuedAt,
  isSessionRevoked,
  revokedAtValue,
  sessionAccessRevoked,
} from "../src/lib/session-revocation";

function token(payload: Record<string, unknown>): string {
  const segment = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${segment}.sig`;
}

describe("session revocation", () => {
  it("treats a token issued before revoked_at as revoked", () => {
    expect(isSessionRevoked(1_700_000_000, "2026-10-25T12:00:00.000Z")).toBe(true);
  });

  it("keeps a token issued after revoked_at", () => {
    const issuedAt = Math.floor(Date.parse("2026-10-25T12:00:05.000Z") / 1000);
    expect(isSessionRevoked(issuedAt, "2026-10-25T12:00:00.000Z")).toBe(false);
  });

  it("does nothing when the user was never revoked", () => {
    expect(isSessionRevoked(1_700_000_000, null)).toBe(false);
    expect(revokedAtValue(null)).toBeNull();
    expect(revokedAtValue("")).toBeNull();
  });

  it("reads iat from the access token", () => {
    const accessToken = token({ iat: 1_730_000_000, sub: "user" });
    expect(accessTokenIssuedAt(accessToken)).toBe(1_730_000_000);
    expect(accessTokenIssuedAt("not-a-jwt")).toBeNull();
    expect(
      sessionAccessRevoked(accessToken, "2026-10-25T12:00:00.000Z")
    ).toBe(true);
  });
});
