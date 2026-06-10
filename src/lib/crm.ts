export const customerTypeLabels = {
  retail: "ลูกค้าทั่วไป",
  contractor: "ช่าง/ผู้รับเหมา",
  company: "บริษัท",
} as const;

export const memberStatusLabels = {
  active: "สมาชิกใช้งาน",
  paused: "พักสมาชิก",
  blocked: "ระงับ",
} as const;

export const pointTransactionLabels = {
  earn: "เพิ่มแต้ม",
  redeem: "แลกแต้ม",
  adjust: "ปรับแต้ม",
} as const;

export type CustomerType = keyof typeof customerTypeLabels;
export type MemberStatus = keyof typeof memberStatusLabels;
export type PointTransactionType = keyof typeof pointTransactionLabels;

export function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function dateTimeLabel(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  });
}

export function isMissingCrmTableError(error: { code?: string; message?: string } | null | undefined) {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    error?.message?.includes("Could not find the table")
  );
}
