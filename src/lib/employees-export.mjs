export const employeeRoleOptions = ["all", "cashier", "manager", "owner"];
export const employeeStatusOptions = ["all", "active", "invited", "suspended", "archived"];
export const EMPLOYEE_PAGE_SIZE = 20;

export function normalizeEmployeeFilters(searchParams) {
  const q = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const role = searchParams.get("role") ?? "all";
  const status = searchParams.get("status") ?? "all";

  return {
    q,
    role: employeeRoleOptions.includes(role) ? role : "all",
    status: employeeStatusOptions.includes(status) ? status : "all",
  };
}

export function employeeMatchesFilters(employee, filters) {
  const searchable = [
    employee.employee_code,
    employee.display_name,
    employee.auth_email,
    employee.phone,
    employee.job_title,
    employee.branchName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const qMatched = filters.q ? searchable.includes(filters.q.toLowerCase()) : true;
  const roleMatched = filters.role === "all" ? true : employee.role === filters.role;
  const statusMatched = filters.status === "all" ? true : employee.account_status === filters.status;

  return qMatched && roleMatched && statusMatched;
}

export function employeeSearchTerm(value) {
  return (value ?? "").trim().replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

export function employeeSearchOrFilter(value) {
  const term = employeeSearchTerm(value);
  if (!term) return "";

  const pattern = `%${term}%`;
  return [
    `employee_code.ilike.${pattern}`,
    `display_name.ilike.${pattern}`,
    `auth_email.ilike.${pattern}`,
    `phone.ilike.${pattern}`,
    `job_title.ilike.${pattern}`,
  ].join(",");
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;

  return `"${safeText.replace(/"/g, '""')}"`;
}

export function employeesToCsv(employees) {
  const headers = [
    "employee_code",
    "display_name",
    "auth_email",
    "phone",
    "role",
    "job_title",
    "branch",
    "account_status",
    "employment_status",
  ];
  const rows = employees.map((employee) => [
    employee.employee_code,
    employee.display_name,
    employee.auth_email,
    employee.phone,
    employee.role,
    employee.job_title,
    employee.branchName,
    employee.account_status,
    employee.employment_status,
  ]);

  return "\uFEFF" + [headers.join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\r\n");
}
