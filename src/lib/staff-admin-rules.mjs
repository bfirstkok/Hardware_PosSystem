export const staffAccountStatusOptions = ["invited", "active", "suspended", "archived"];
export const staffEmploymentStatusOptions = ["probation", "full_time", "part_time", "resigned"];

export function isStaffAccountStatus(value) {
  return staffAccountStatusOptions.includes(value);
}

export function isStaffEmploymentStatus(value) {
  return staffEmploymentStatusOptions.includes(value);
}

export function canEditStaffProfile(actorRole, targetRole) {
  if (actorRole === "owner") return true;
  return actorRole === "manager" && targetRole === "cashier";
}

export function canSetStaffRole(actorRole, targetRole, nextRole) {
  if (actorRole === "owner") return true;
  return actorRole === "manager" && targetRole === "cashier" && nextRole === "cashier";
}

export function canArchiveStaffProfile(actorRole, targetRole, isSelf = false) {
  if (isSelf) return false;
  return canEditStaffProfile(actorRole, targetRole);
}
