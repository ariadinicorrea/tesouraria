import { supabaseAdmin } from "@/lib/supabase/admin";
import fs from "fs";
import path from "path";

export async function getLogo(): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin.from("configuracoes").select("logo_data_url").eq("id", "singleton").maybeSingle();
    if (data?.logo_data_url) return data.logo_data_url;
  } catch {}
  try {
    const dir = path.join(process.cwd(), "public");
    for (const n of ["logo.png","logo.jpg","logo.jpeg","logo.svg","logo.webp"]) if (fs.existsSync(path.join(dir, n))) return "/" + n;
  } catch {}
  return null;
}
