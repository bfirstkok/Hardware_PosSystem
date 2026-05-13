import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PosClient from "./pos-client";

export default async function PosPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  return <PosClient />;
}
