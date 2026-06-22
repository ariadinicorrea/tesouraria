import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente para Server Components / Route Handlers respeitando RLS
 * (usa a sessão do usuário via cookies). Use quando a operação deve
 * obedecer às políticas de acesso do usuário logado.
 */
export function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado de Server Component — ignore (middleware renova sessão)
          }
        },
      },
    }
  );
}
