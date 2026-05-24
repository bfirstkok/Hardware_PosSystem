import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReportsClient from "./reports-client";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  return <ReportsClient />;
}