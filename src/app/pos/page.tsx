import { requireRouteAccess } from "@/lib/staff-session";
import PosClient from "./pos-client";

export default async function PosPage() {
  const staff = await requireRouteAccess("/pos");
  return <PosClient currentStaff={staff} />;
}
