import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { createLoginRedirectPath, isProtectedPath } from "@/lib/protected-routes";

function createLoginRedirect(request: NextRequest) {
  const loginUrl = new URL(
    createLoginRedirectPath(request.nextUrl.pathname, request.nextUrl.search),
    request.url,
  );
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return createLoginRedirect(request);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // ponytail: getClaims ตรวจ JWT ในเครื่อง (ไม่ยิง network ทุก request แบบ getUser)
  // การยืนยันตัวตนจริงยังทำซ้ำราย page ผ่าน requireRouteAccess + RLS ฝั่ง Supabase
  const { data } = await supabase.auth.getClaims();

  return data?.claims ? response : createLoginRedirect(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
