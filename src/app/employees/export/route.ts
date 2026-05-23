import { createClient as createSupabaseAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { canAccessRoute } from "@/lib/permissions";
import {
  employeeMatchesFilters,
  employeesToCsv,
  normalizeEmployeeFilters,
} from "@/lib/employees-export.mjs";
import { getCurrentStaff } from "@/lib/staff-session";
import { createClient } from "@/lib/supabase/server";

type EmployeeRow = {
  user_id: string;
  auth_email: string;
  employee_code: string;
  display_name: string;
  phone: string | null;
  job_title: string | null;
  role: string;
  account_status: string;
  employment_status: string;
  branches: { name: string } | { name: string }[] | null;
};

export const dynamic = "force-dynamic";

function createStaffExportAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(request: Request) {
  const staff = await getCurrentStaff();

  if (!staff) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!canAccessRoute(staff.role, "/employees")) {
    return new Response("Forbidden", { status: 403 });
  }

  const sessionClient = await createClient();
  const client = createStaffExportAdminClient() ?? sessionClient;
  let query = (client as SupabaseClient)
    .from("staff_profiles")
    .select(
      "user_id, auth_email, employee_code, display_name, phone, job_title, role, account_status, employment_status, branches:primary_branch_id(name)",
    )
    .order("employee_code")
    .limit(2000);

  if (staff.role === "manager") {
    query = query.eq("role", "cashier");
  }

  const { data, error } = await query;

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const filters = normalizeEmployeeFilters(new URL(request.url).searchParams);
  const employees = ((data as EmployeeRow[] | null) ?? [])
    .map((employee) => {
      const branch = Array.isArray(employee.branches) ? employee.branches[0] : employee.branches;

      return {
        ...employee,
        branchName: branch?.name ?? "สาขาหลัก",
      };
    })
    .filter((employee) => employeeMatchesFilters(employee, filters));
  const csv = employeesToCsv(employees);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="employees-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
