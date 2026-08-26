import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeAuthReturnPath } from "@/modules/auth/schemas";

const emailOtpTypes = new Set<EmailOtpType>([
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
]);

function isEmailOtpType(value: string): value is EmailOtpType {
  return emailOtpTypes.has(value as EmailOtpType);
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const returnPath = safeAuthReturnPath(
    request.nextUrl.searchParams.get("next"),
  );

  if (tokenHash && type && isEmailOtpType(type)) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      return NextResponse.redirect(
        new URL(returnPath ?? "/organization/new", request.url),
      );
    }
  }

  return NextResponse.redirect(new URL("/auth/error", request.url));
}
