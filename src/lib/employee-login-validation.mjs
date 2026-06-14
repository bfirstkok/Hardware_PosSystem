export function parseEmployeeLoginPayload(input) {
  if (!input || typeof input !== "object") return null;

  const employeeCode = typeof input.employeeCode === "string" ? input.employeeCode.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const nextPath = typeof input.nextPath === "string" ? input.nextPath : null;

  if (!employeeCode || !password) return null;
  if (employeeCode.length > 120 || password.length > 200) return null;

  return {
    employeeCode,
    password,
    nextPath,
  };
}
