import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getDefaultPathForRole, isStaffRole } from "@/lib/permissions";

type StaffLoginRow = {
  auth_email: string;
  employee_code?: string;
  role: string;
  account_status: string;
  user_id?: string;
};

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function isEmailLogin(value: string) {
  return value.includes("@");
}

function createAdminClient(supabaseUrl: string, serviceRoleKey: string) {
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function ensureLegacyStaffProfile(
  adminSupabase: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string,
) {
  const { data: existingStaff, error: existingError } = await adminSupabase
    .from("staff_profiles")
    .select("role, account_status")
    .eq("user_id", userId)
    .maybeSingle<{ role: string; account_status: string }>();

  if (existingError) {
    return { error: existingError.message, role: null };
  }

  if (existingStaff) {
    if (existingStaff.account_status !== "active" || !isStaffRole(existingStaff.role)) {
      return { error: "บัญชีนี้ยังไม่ได้เปิดใช้งาน", role: null };
    }

    return { error: null, role: existingStaff.role };
  }

  const { data: mainBranch, error: branchError } = await adminSupabase
    .from("branches")
    .select("id")
    .eq("code", "MAIN")
    .maybeSingle<{ id: number }>();

  if (branchError || !mainBranch) {
    return { error: branchError?.message ?? "ไม่พบสาขาหลัก MAIN", role: null };
  }

  const { error: profileError } = await adminSupabase.from("staff_profiles").insert({
    user_id: userId,
    auth_email: email,
    employee_code: "ADMIN001",
    display_name: "เจ้าของร้าน",
    phone: null,
    job_title: "เจ้าของร้าน",
    role: "owner",
    primary_branch_id: mainBranch.id,
    account_status: "active",
    employment_status: "full_time",
    password_status: "changed",
  });

  if (profileError) {
    return { error: profileError.message, role: null };
  }

  await adminSupabase.from("staff_branch_assignments").upsert({
    staff_user_id: userId,
    branch_id: mainBranch.id,
    role_override: null,
    is_active: true,
  });

  return { error: null, role: "owner" };
}

async function signInAndCreateResponse({
  request,
  supabaseUrl,
  supabaseAnonKey,
  email,
  password,
  defaultPath,
  role,
}: {
  request: NextRequest;
  supabaseUrl: string;
  supabaseAnonKey: string;
  email: string;
  password: string;
  defaultPath: string;
  role: string;
}) {
  const cookiesToSet: CookieToSet[] = [];
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(nextCookies) {
        cookiesToSet.push(...nextCookies);
      },
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return {
      response: NextResponse.json({ error: "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 }),
      user: null,
    };
  }

  const response = NextResponse.json({
    defaultPath,
    role,
  });

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return { response, user: data.user };
}

export async function POST(request: NextRequest) {
  const { employeeCode, password } = (await request.json()) as {
    employeeCode?: string;
    password?: string;
  };
  const loginId = employeeCode?.trim() ?? "";
  const normalizedEmployeeCode = loginId.toUpperCase();

  if (!loginId || !password) {
    return NextResponse.json({ error: "กรอกรหัสพนักงานและรหัสผ่าน" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า employee login" }, { status: 500 });
  }

  if (isEmailLogin(loginId)) {
    const signIn = await signInAndCreateResponse({
      request,
      supabaseUrl,
      supabaseAnonKey,
      email: loginId.toLowerCase(),
      password,
      defaultPath: "/dashboard",
      role: "owner",
    });

    if (!signIn.user?.email) {
      return signIn.response;
    }

    if (!serviceRoleKey) {
      return signIn.response;
    }

    const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);
    const { error, role } = await ensureLegacyStaffProfile(adminSupabase, signIn.user.id, signIn.user.email);

    if (error || !isStaffRole(role)) {
      return NextResponse.json({ error: error ?? "บัญชีนี้ยังไม่ได้เปิดใช้งาน" }, { status: 403 });
    }

    return signInAndCreateResponse({
      request,
      supabaseUrl,
      supabaseAnonKey,
      email: signIn.user.email,
      password,
      defaultPath: getDefaultPathForRole(role),
      role,
    }).then(({ response }) => response);
  }

  if (!serviceRoleKey) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY สำหรับรหัสพนักงาน" }, { status: 500 });
  }

  const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);
  const { data: staff, error: staffError } = await adminSupabase
    .from("staff_profiles")
    .select("user_id, auth_email, employee_code, role, account_status")
    .eq("employee_code", normalizedEmployeeCode)
    .maybeSingle<StaffLoginRow>();

  if (staffError) {
    return NextResponse.json({ error: staffError.message }, { status: 500 });
  }

  if (!staff || staff.account_status !== "active" || !isStaffRole(staff.role)) {
    return NextResponse.json({ error: "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  const { response, user } = await signInAndCreateResponse({
    request,
    supabaseUrl,
    supabaseAnonKey,
    email: staff.auth_email,
    password,
    defaultPath: staff.role === "cashier" ? "/me" : getDefaultPathForRole(staff.role),
    role: staff.role,
  });

  if (user && staff.user_id !== user.id) {
    const { error: syncProfileError } = await adminSupabase
      .from("staff_profiles")
      .update({ user_id: user.id })
      .eq("employee_code", normalizedEmployeeCode);

    if (syncProfileError) {
      return NextResponse.json({ error: syncProfileError.message }, { status: 500 });
    }
  }

  return response;
}
