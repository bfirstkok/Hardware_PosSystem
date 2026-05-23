export const staffRoles = ["cashier", "manager", "owner"];

export const roleRank = {
  cashier: 1,
  manager: 2,
  owner: 3,
};

export const defaultRolePath = {
  cashier: "/pos",
  manager: "/dashboard",
  owner: "/dashboard",
};

export const routeAccess = [
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
};

export function isStaffRole(role) {
  return staffRoles.includes(role);
}

export function normalizeRole(role) {
  return isStaffRole(role) ? role : "cashier";
}

export function hasMinimumRole(role, minRole) {
  return roleRank[normalizeRole(role)] >= roleRank[normalizeRole(minRole)];
}

export function canAccessRoute(role, pathname) {
  const routePathname = pathname.split(/[?#]/, 1)[0] || "/";
  const matchedAccess = routeAccess
    .filter((access) => routePathname === access.prefix || routePathname.startsWith(`${access.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  if (!matchedAccess) return true;
  if (!isStaffRole(role)) return false;
  return hasMinimumRole(role, matchedAccess.minRole);
}

export function canPerformAction(role, action) {
  const minRole = actionAccess[action];
  if (!minRole) return false;
  return hasMinimumRole(role, minRole);
}

export function getDefaultPathForRole(role) {
  return defaultRolePath[normalizeRole(role)];
}

export function getPostLoginPathForRole(role, requestedPath) {
  const fallbackPath = getDefaultPathForRole(role);

  if (!requestedPath || !requestedPath.startsWith("/") || requestedPath.startsWith("//")) {
    return fallbackPath;
  }

  return canAccessRoute(role, requestedPath) ? requestedPath : fallbackPath;
}
