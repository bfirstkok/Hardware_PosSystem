export const staffCodePrefixes = {
  owner: "OWN",
  manager: "MGR",
  cashier: "CAS",
};

export function staffCodePrefix(role) {
  return staffCodePrefixes[role];
}

export function nextStaffCode(role, existingCodes) {
  const prefix = staffCodePrefix(role);
  const lastNumber = existingCodes.reduce((max, code) => {
    const match = code.match(new RegExp(`^${prefix}(\\d{3,})$`, "i"));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `${prefix}${(lastNumber + 1).toString().padStart(3, "0")}`;
}
