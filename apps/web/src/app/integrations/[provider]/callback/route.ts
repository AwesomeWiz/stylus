import { NextResponse, type NextRequest } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { providerSchema } from "@/core/integrations/public";
import { completeOAuth } from "@/modules/integrations/server/oauth";
import { publicEnv } from "@/lib/env/public";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const provider = providerSchema.parse((await params).provider);
    const destination = await completeOAuth(
      provider,
      request.nextUrl.searchParams,
    );
    const response = NextResponse.redirect(
      new URL(destination, publicEnv.NEXT_PUBLIC_SITE_URL),
    );
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    unstable_rethrow(error);
    const response = NextResponse.redirect(
      new URL(
        "/settings/integrations?authorization=failed",
        publicEnv.NEXT_PUBLIC_SITE_URL,
      ),
    );
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
}
