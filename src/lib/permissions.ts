export type StaffRole = "cashier" | "manager" | "owner";
export type StaffAccountStatus = "invited" | "active" | "suspended" | "archived";
export type StaffEmploymentStatus = "probation" | "full_time" | "part_time" | "resigned";

export type StaffProfile = {
  user_id: string;
  auth_email: string;
  employee_code: string;
  display_name: string;
  phone: string | null;
  job_title: string | null;
  role: StaffRole;
  primary_branch_id: number | null;
  account_status: StaffAccountStatus;
  employment_status: StaffEmploymentStatus;
  password_status: "default" | "changed";
  permission_overrides: Record<string, boolean>;
};

export const staffRoles = ["cashier", "manager", "owner"] as const;

export const roleRank: Record<StaffRole, number> = {
  cashier: 1,
  manager: 2,
  owner: 3,
};

export const defaultRolePath: Record<StaffRole, string> = {
  cashier: "/pos",
  manager: "/dashboard",
  owner: "/dashboard",
};

export const routeAccess: Array<{ prefix: string; minRole: StaffRole }> = [
  { prefix: "/pos", minRole: "cashier" },
  { prefix: "/stock", minRole: "cashier" },
  { prefix: "/products", minRole: "manager" },
  { prefix: "/barcodes", minRole: "cashier" },
  { prefix: "/expiry", minRole: "cashier" },
  { prefix: "/dashboard", minRole: "manager" },
  { prefix: "/reports", minRole: "manager" },
  { prefix: "/documents", minRole: "manager" },
  { prefix: "/sales-history", minRole: "cashier" },
  { prefix: "/product-history", minRole: "manager" },
  { prefix: "/expenses", minRole: "manager" },
  { prefix: "/promotions", minRole: "manager" },
  { prefix: "/discounts", minRole: "manager" },
  { prefix: "/customers", minRole: "manager" },
  { prefix: "/points", minRole: "manager" },
  { prefix: "/points-settings", minRole: "manager" },
  { prefix: "/branches", minRole: "owner" },
  { prefix: "/employees", minRole: "manager" },
  { prefix: "/suppliers", minRole: "manager" },
  { prefix: "/pos-devices", minRole: "manager" },
  { prefix: "/activities", minRole: "manager" },
  { prefix: "/table-monitor", minRole: "manager" },
  { prefix: "/devices", minRole: "manager" },
  { prefix: "/me", minRole: "cashier" },
];

export const actionAccess = {
  "products.create": "manager",
  "products.update": "manager",
  "products.delete": "owner",
  "products.price_update": "manager",
  "stock.adjust_basic": "cashier",
  "stock.adjust_sensitive": "manager",
  "sales.void": "manager",
  "sales.refund": "manager",
  "reports.export": "manager",
  "staff.invite": "manager",
  "staff.update_role": "owner",
  "staff.suspend": "manager",
  "device.revoke": "manager",
} as const satisfies Record<string, StaffRole>;

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return staffRoles.includes(role as StaffRole);
}

export function normalizeRole(role: string | null | undefined): StaffRole {
  return isStaffRole(role) ? role : "cashier";
}

export function hasMinimumRole(role: string | null | undefined, minRole: StaffRole) {
  return roleRank[normalizeRole(role)] >= roleRank[minRole];
}

export function canAccessRoute(role: string | null | undefined, pathname: string) {
  const matchedAccess = routeAccess
    .filter((access) => pathname === access.prefix || pathname.startsWith(`${access.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  if (!matchedAccess) return true;
  return hasMinimumRole(role, matchedAccess.minRole);
}

export function canPerformAction(role: string | null | undefined, action: keyof typeof actionAccess) {
  return hasMinimumRole(role, actionAccess[action]);
}

export function getDefaultPathForRole(role: string | null | undefined) {
  return defaultRolePath[normalizeRole(role)];
}
