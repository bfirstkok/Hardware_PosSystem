import { redirect } from "next/navigation";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  canAccessRoute,
  canPerformAction,
  getDefaultPathForRole,
  type StaffProfile,
} from "@/lib/permissions";

type StaffProfileRow = StaffProfile & {
  branches?: { name: string } | null;
};

export type CurrentStaff = StaffProfile & {
  email: string;
  branch_name: string | null;
};

function createLegacyOwnerProfile(user: { id: string; email?: string | null }): CurrentStaff {
  const email = user.email ?? "";

  return {
    user_id: user.id,
    auth_email: email,
    email,
    employee_code: "LEGACY",
    display_name: email || "Owner",
    phone: null,
    job_title: "เจ้าของร้าน",
    role: "owner",
    primary_branch_id: null,
    branch_name: null,
    account_status: "active",
    employment_status: "full_time",
    password_status: "changed",
    permission_overrides: {},
  };
}

function isLegacyOwnerEmail(email?: string | null) {
  return email?.toLowerCase() === "admin@hardwarepos.dev";
}

function isMissingStaffTableError(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("Could not find the table 'public.staff_profiles'")
  );
}

async function getStaffProfileWithServiceRole(userId: string): Promise<StaffProfileRow | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  const adminSupabase = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } = await adminSupabase
    .from("staff_profiles")
    .select("*, branches:primary_branch_id(name)")
    .eq("user_id", userId)
    .maybeSingle<StaffProfileRow>();

  if (error) return null;
  return data;
}

export async function getCurrentStaff(): Promise<CurrentStaff | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("staff_profiles")
    .select("*, branches:primary_branch_id(name)")
    .eq("user_id", userData.user.id)
    .maybeSingle<StaffProfileRow>();

  if (error) {
    if (isMissingStaffTableError(error)) {
      return createLegacyOwnerProfile(userData.user);
    }

    throw new Error(error.message);
  }

  const staffProfile = data ?? (await getStaffProfileWithServiceRole(userData.user.id));

  if (!staffProfile) {
    return isLegacyOwnerEmail(userData.user.email) ? createLegacyOwnerProfile(userData.user) : null;
  }

  if (staffProfile.account_status !== "active") return null;

  return {
    ...staffProfile,
    email: staffProfile.auth_email,
    branch_name: staffProfile.branches?.name ?? null,
    permission_overrides: staffProfile.permission_overrides ?? {},
  };
}

export async function requireCurrentStaff() {
  const staff = await getCurrentStaff();

  if (!staff) {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const reason = userData.user ? "staff-profile-missing" : "no-session";

    redirect(`/login?auth=${reason}`);
  }

  return staff;
}

export async function requireRouteAccess(pathname: string) {
  const staff = await requireCurrentStaff();

  if (!canAccessRoute(staff.role, pathname)) {
    redirect(`/forbidden?from=${encodeURIComponent(pathname)}`);
  }

  return staff;
}

export async function requireActionAccess(action: Parameters<typeof canPerformAction>[1]) {
  const staff = await requireCurrentStaff();

  if (!canPerformAction(staff.role, action)) {
    throw new Error("Forbidden");
  }

  return staff;
}

export function getStaffHomePath(staff: Pick<CurrentStaff, "role"> | null) {
  return getDefaultPathForRole(staff?.role);
}
