import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import { isPublicMarketingPath } from "@/lib/marketing-routes";
import { SESSION_IS_REVOKED_RPC, rpcFlag } from "@/lib/session-revocation";

function isSeoAsset(path: string): boolean {
  return (
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path === "/opengraph-image" ||
    path.startsWith("/opengraph-image") ||
    path === "/manifest.webmanifest" ||
    path.startsWith("/manifest")
  );
}

function redirectWithAuthCookies(
  request: NextRequest,
  pathname: string,
  supabaseResponse: NextResponse
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const redirectResponse = NextResponse.redirect(url);
  for (const cookie of supabaseResponse.headers.getSetCookie()) {
    redirectResponse.headers.append("set-cookie", cookie);
  }
  return redirectResponse;
}

/** Bu isteğin session_id'si iptal listesindeyse true. RPC yoksa kimseyi düşürmez. */
async function sessionIsRevoked(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc(SESSION_IS_REVOKED_RPC);
  if (error) return false;
  return rpcFlag(data);
}

/** Supabase SSR oturum çerezi var mı — ağ çağrısı yapmadan hızlı kontrol. */
function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.startsWith("sb-") &&
        (c.name.includes("auth-token") || c.name.endsWith("-auth-token.0"))
    );
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Crawler varlıkları Supabase oturumuna ihtiyaç duymaz.
  if (isSeoAsset(path)) {
    return NextResponse.next({ request });
  }

  const isPublic = isPublicMarketingPath(path);

  // Anonim marketing/login: createServerClient + getUser ağ gecikmesini atla.
  if (isPublic && !hasSupabaseAuthCookie(request)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let activeUser = user;
  if (user && (await sessionIsRevoked(supabase))) {
    await supabase.auth.signOut({ scope: "local" });
    activeUser = null;
  }

  if (!activeUser && !isPublic) {
    return redirectWithAuthCookies(request, "/login", supabaseResponse);
  }

  if (activeUser && (path === "/login" || path === "/")) {
    return redirectWithAuthCookies(request, "/home", supabaseResponse);
  }

  return supabaseResponse;
}
