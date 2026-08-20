import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import { isPublicMarketingPath } from "@/lib/marketing-routes";

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

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
