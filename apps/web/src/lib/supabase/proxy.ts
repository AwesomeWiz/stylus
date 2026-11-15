import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { publicEnv } from "@/lib/env/public";

const authEntryPaths = new Set(["/login", "/signup"]);
const publicPaths = new Set([
  "/auth/confirm",
  "/auth/error",
  ...authEntryPaths,
]);

// Unmatched top-level addresses reach the public Next.js 404 without a backend
// round trip. Every real page/handler root is covered by the inventory test.
const applicationRoots = new Set([
  "activity",
  "ai",
  "api",
  "apps",
  "auth",
  "company",
  "integrations",
  "invite",
  "jobs",
  "login",
  "memory",
  "notes",
  "onboarding",
  "organization",
  "signup",
  "settings",
  "tasks",
  "team",
  "whiteboards",
  "workers",
]);

export function isSessionApplicationPath(pathname: string) {
  return pathname === "/" || applicationRoots.has(pathname.split("/")[1] ?? "");
}

function isPublicPath(pathname: string) {
  return publicPaths.has(pathname) || pathname.startsWith("/invite/");
}

export function isWorkerBrokerPath(pathname: string) {
  return pathname.startsWith("/api/worker/");
}

export function isServerlessJobCronPath(pathname: string) {
  return pathname === "/api/cron/serverless-jobs";
}

export function getSessionRouteDecision(
  pathname: string,
  isAuthenticated: boolean,
): "/" | "/login" | null {
  if (
    !isAuthenticated &&
    isSessionApplicationPath(pathname) &&
    !isPublicPath(pathname)
  ) {
    return "/login";
  }

  if (isAuthenticated && authEntryPaths.has(pathname)) {
    return "/";
  }

  return null;
}

export async function updateSession(request: NextRequest) {
  if (
    !isSessionApplicationPath(request.nextUrl.pathname) ||
    isWorkerBrokerPath(request.nextUrl.pathname) ||
    isServerlessJobCronPath(request.nextUrl.pathname)
  ) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, options, value }) => {
            response.cookies.set(name, value, options);
          });

          Object.entries(headersToSet).forEach(([name, value]) => {
            response.headers.set(name, value);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;
  const routeDecision = getSessionRouteDecision(pathname, isAuthenticated);

  if (routeDecision) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = routeDecision;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
