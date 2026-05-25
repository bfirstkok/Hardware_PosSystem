export const protectedRoutes = [
  "/activities",
  "/barcodes",
  "/branches",
  "/customers",
  "/dashboard",
  "/devices",
  "/discounts",
  "/documents",
  "/employees",
  "/expenses",
  "/expiry",
  "/me",
  "/points",
  "/points-settings",
  "/pos",
  "/pos-devices",
  "/product-history",
  "/products",
  "/promotions",
  "/reports",
  "/sales-history",
  "/stock",
  "/suppliers",
  "/table-monitor",
];

export function isProtectedPath(pathname) {
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function normalizeLocalNextPath(nextPath) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/pos";
  }

  return nextPath;
}

export function createLoginRedirectPath(pathname, search = "") {
  const loginParams = new URLSearchParams({
    auth: "no-session",
    next: normalizeLocalNextPath(`${pathname}${search}`),
  });

  return `/login?${loginParams.toString()}`;
}
