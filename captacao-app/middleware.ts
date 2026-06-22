import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware-session";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!login|setup|api/setup|_next/static|_next/image|favicon.ico|logo|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
