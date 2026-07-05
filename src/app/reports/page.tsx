import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRouteAccess } from "@/lib/staff-session";
import ReportsClient from "./reports-client";

export default async function ReportsPage() {
  const staff = await requireRouteAccess("/reports");

  return <ReportsClient currentStaff={staff} />;
}
