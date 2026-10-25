import { describe, expect, it } from "vitest";
import {
  accessTokenSessionId,
  rpcFlag,
  sessionIdMatches,
} from "../src/lib/session-revocation";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";

function token(payload: Record<string, unknown>): string {
  const segment = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${segment}.sig`;
}

describe("session revocation", () => {
  it("reads session_id from the access token", () => {
    expect(accessTokenSessionId(token({ session_id: SESSION_ID }))).toBe(SESSION_ID);
    expect(accessTokenSessionId(token({ sub: "user" }))).toBeNull();
    expect(accessTokenSessionId("not-a-jwt")).toBeNull();
    expect(accessTokenSessionId(null)).toBeNull();
  });

  it("matches only the session named by the realtime event", () => {
    const accessToken = token({ session_id: SESSION_ID });
    expect(sessionIdMatches(accessToken, SESSION_ID)).toBe(true);
    expect(sessionIdMatches(accessToken, "22222222-2222-4222-8222-222222222222")).toBe(
      false
    );
    expect(sessionIdMatches(accessToken, null)).toBe(false);
  });

  it("accepts only a boolean true from the rpc", () => {
    expect(rpcFlag(true)).toBe(true);
    expect(rpcFlag(false)).toBe(false);
    expect(rpcFlag(null)).toBe(false);
    expect(rpcFlag("true")).toBe(false);
  });
});
