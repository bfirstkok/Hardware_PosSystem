"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { isStaffRole, type StaffRole } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { requireActionAccess } from "@/lib/staff-session";

type StaffCodeRow = {
  employee_code: string;
};

function employeeError(message: string): never {
  redirect(`/employees?error=${encodeURIComponent(message)}`);
}

function textField(formData: FormData, key: string, label: string, maxLength: number) {
  const value = formData.get(key)?.toString().trim() ?? "";
  if (!value) employeeError(`กรุณากรอก${label}`);
  if (value.length > maxLength) employeeError(`${label}ยาวเกิน ${maxLength} ตัวอักษร`);
  return value;
}

function optionalTextField(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key)?.toString().trim() ?? "";
  if (!value) return null;
  if (value.length > maxLength) employeeError(`ข้อมูลยาวเกิน ${maxLength} ตัวอักษร`);
  return value;
}

function roleField(formData: FormData): StaffRole {
  const value = formData.get("role")?.toString();
  if (!isStaffRole(value)) employeeError("Role ไม่ถูกต้อง");
  return value;
}

function passwordField(formData: FormData) {
  const value = formData.get("password")?.toString() ?? "";
  if (value.length < 6) employeeError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
  if (value.length > 72) employeeError("รหัสผ่านยาวเกิน 72 ตัวอักษร");
  return value;
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    employeeError("ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY");
  }

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function nextEmployeeCode() {
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("staff_profiles")
    .select("employee_code")
    .like("employee_code", "EMP%")
    .order("employee_code", { ascending: false })
    .limit(1)
    .maybeSingle<StaffCodeRow>();

  if (error) employeeError(error.message);

  const lastNumber = data?.employee_code.match(/^EMP(\d+)$/)?.[1];
  const nextNumber = lastNumber ? Number(lastNumber) + 1 : 1;

  return `EMP${nextNumber.toString().padStart(3, "0")}`;
}

export async function createEmployeeAction(formData: FormData) {
  const actor = await requireActionAccess("staff.invite");
  const role = roleField(formData);

  if (actor.role === "manager" && role !== "cashier") {
    employeeError("ผู้จัดการเพิ่มได้เฉพาะ cashier");
  }

  const displayName = textField(formData, "display_name", "ชื่อพนักงาน", 120);
  const phone = optionalTextField(formData, "phone", 32);
  const jobTitle = optionalTextField(formData, "job_title", 80);
  const password = passwordField(formData);
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const employeeCode = await nextEmployeeCode();
  const authEmail = `${employeeCode.toLowerCase()}@internal.pos`;
  const { data: mainBranch, error: branchError } = await adminSupabase
    .from("branches")
    .select("id")
    .eq("code", "MAIN")
    .maybeSingle<{ id: number }>();

  if (branchError) employeeError(branchError.message);
  if (!mainBranch) employeeError("ไม่พบสาขาหลัก MAIN");

  const { data: createdUser, error: createUserError } = await adminSupabase.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: {
      employee_code: employeeCode,
      display_name: displayName,
    },
  });

  if (createUserError || !createdUser.user) {
    employeeError(createUserError?.message ?? "สร้าง Auth user ไม่สำเร็จ");
  }

  const userId = createdUser.user.id;
  const { error: profileError } = await adminSupabase.from("staff_profiles").insert({
    user_id: userId,
    auth_email: authEmail,
    employee_code: employeeCode,
    display_name: displayName,
    phone,
    job_title: jobTitle,
    role,
    primary_branch_id: mainBranch.id,
    account_status: "active",
    employment_status: "full_time",
    password_status: "default",
  });

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(userId);
    employeeError(profileError.code === "23505" ? "รหัสพนักงานหรือ email ซ้ำ" : profileError.message);
  }

  const { error: assignmentError } = await adminSupabase.from("staff_branch_assignments").insert({
    staff_user_id: userId,
    branch_id: mainBranch.id,
    role_override: null,
    is_active: true,
  });

  if (assignmentError) {
    await adminSupabase.from("staff_profiles").delete().eq("user_id", userId);
    await adminSupabase.auth.admin.deleteUser(userId);
    employeeError(assignmentError.message);
  }

  await supabase.from("staff_activity_logs").insert({
    actor_user_id: actor.user_id,
    action: "staff.invited",
    target_type: "staff",
    target_id: userId,
    branch_id: mainBranch.id,
    metadata: {
      employee_code: employeeCode,
      role,
    },
  });

  revalidatePath("/employees");
  redirect(`/employees?created=${encodeURIComponent(employeeCode)}`);
}
