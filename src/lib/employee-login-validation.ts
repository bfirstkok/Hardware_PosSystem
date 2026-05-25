export type EmployeeLoginPayload = {
  employeeCode: string;
  password: string;
  nextPath: string | null;
};

export function parseEmployeeLoginPayload(input: unknown): EmployeeLoginPayload | null {
  if (!input || typeof input !== "object") return null;

  const record = input as Record<string, unknown>;
  const employeeCode = typeof record.employeeCode === "string" ? record.employeeCode.trim() : "";
  const password = typeof record.password === "string" ? record.password : "";
  const nextPath = typeof record.nextPath === "string" ? record.nextPath : null;

  if (!employeeCode || !password) return null;
  if (employeeCode.length > 120 || password.length > 200) return null;

  return {
    employeeCode,
    password,
    nextPath,
  };
}
