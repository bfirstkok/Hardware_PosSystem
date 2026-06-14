"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { isStaffRole, type StaffRole } from "@/lib/permissions";
import {
  canArchiveStaffProfile,
  canEditStaffProfile,
  canSetStaffRole,
  isStaffAccountStatus,
  isStaffEmploymentStatus,
} from "@/lib/staff-admin-rules.mjs";
import { nextStaffCode, staffCodePrefix } from "@/lib/staff-code";
import { createClient } from "@/lib/supabase/server";
import { requireActionAccess } from "@/lib/staff-session";

type StaffCodeRow = {
  employee_code: string;
};

type StaffProfileAdminRow = {
  user_id: string;
  display_name: string;
  role: StaffRole;
  primary_branch_id: number | null;
  account_status: string;
  employment_status: string;
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

function userIdField(formData: FormData) {
  const value = formData.get("user_id")?.toString().trim() ?? "";
  if (!value) employeeError("ไม่พบ user_id");
  return value;
}

function accountStatusField(formData: FormData) {
  const value = formData.get("account_status")?.toString();
  if (!isStaffAccountStatus(value)) employeeError("สถานะบัญชีไม่ถูกต้อง");
  return value;
}

function employmentStatusField(formData: FormData) {
  const value = formData.get("employment_status")?.toString();
  if (!isStaffEmploymentStatus(value)) employeeError("สถานะงานไม่ถูกต้อง");
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

async function nextEmployeeCode(role: StaffRole) {
  const adminSupabase = createAdminClient();
  const prefix = staffCodePrefix(role);
  const { data, error } = await adminSupabase
    .from("staff_profiles")
    .select("employee_code")
    .ilike("employee_code", `${prefix}%`)
    .order("employee_code", { ascending: false })
    .limit(50);

  if (error) employeeError(error.message);

  return nextStaffCode(role, ((data ?? []) as StaffCodeRow[]).map((row) => row.employee_code));
}

async function loadTargetProfile(userId: string) {
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("staff_profiles")
    .select("user_id, display_name, role, primary_branch_id, account_status, employment_status")
    .eq("user_id", userId)
    .maybeSingle<StaffProfileAdminRow>();

  if (error) employeeError(error.message);
  if (!data) employeeError("ไม่พบพนักงานที่ต้องการแก้ไข");

  return { adminSupabase, target: data };
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
  const employeeCode = await nextEmployeeCode(role);
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

export async function updateEmployeeAction(formData: FormData) {
  const actor = await requireActionAccess("staff.update_profile");
  const userId = userIdField(formData);
  const displayName = textField(formData, "display_name", "ชื่อพนักงาน", 120);
  const phone = optionalTextField(formData, "phone", 32);
  const jobTitle = optionalTextField(formData, "job_title", 80);
  const nextRole = roleField(formData);
  const accountStatus = accountStatusField(formData);
  const employmentStatus = employmentStatusField(formData);
  const { adminSupabase, target } = await loadTargetProfile(userId);

  if (!canEditStaffProfile(actor.role, target.role)) {
    employeeError("ไม่มีสิทธิ์แก้ไขพนักงานคนนี้");
  }

  if (!canSetStaffRole(actor.role, target.role, nextRole)) {
    employeeError("ไม่มีสิทธิ์เปลี่ยน role นี้");
  }

  if (actor.user_id === userId && (nextRole !== "owner" || accountStatus !== "active" || employmentStatus === "resigned")) {
    employeeError("ไม่อนุญาตให้ลดสิทธิ์หรือปิดบัญชีตัวเอง");
  }

  const { error } = await adminSupabase
    .from("staff_profiles")
    .update({
      display_name: displayName,
      phone,
      job_title: jobTitle,
      role: nextRole,
      account_status: accountStatus,
      employment_status: employmentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) employeeError(error.message);

  await adminSupabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      display_name: displayName,
    },
  });

  const supabase = await createClient();
  await supabase.from("staff_activity_logs").insert({
    actor_user_id: actor.user_id,
    action: "staff.updated",
    target_type: "staff",
    target_id: userId,
    branch_id: target.primary_branch_id,
    metadata: {
      from_role: target.role,
      to_role: nextRole,
      account_status: accountStatus,
      employment_status: employmentStatus,
    },
  });

  revalidatePath("/employees");
  redirect(`/employees?updated=${encodeURIComponent(displayName)}`);
}

export async function archiveEmployeeAction(formData: FormData) {
  const actor = await requireActionAccess("staff.archive");
  const userId = userIdField(formData);
  const { adminSupabase, target } = await loadTargetProfile(userId);

  if (!canArchiveStaffProfile(actor.role, target.role, actor.user_id === userId)) {
    employeeError("ไม่มีสิทธิ์ archive พนักงานคนนี้");
  }

  const { error } = await adminSupabase
    .from("staff_profiles")
    .update({
      account_status: "archived",
      employment_status: "resigned",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) employeeError(error.message);

  const supabase = await createClient();
  await supabase.from("staff_activity_logs").insert({
    actor_user_id: actor.user_id,
    action: "staff.archived",
    target_type: "staff",
    target_id: userId,
    branch_id: target.primary_branch_id,
    metadata: {
      previous_account_status: target.account_status,
      previous_employment_status: target.employment_status,
    },
  });

  revalidatePath("/employees");
  redirect(`/employees?updated=${encodeURIComponent(target.display_name)}`);
}
