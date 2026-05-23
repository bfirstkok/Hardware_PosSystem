import { ModulePage } from "@/components/module-page";

export default function ReportsPage() {
  return (
    <ModulePage
      pathname="/reports"
      section="เอกสาร / รายงาน"
      title="รายงาน"
      description="ศูนย์รวมรายงานยอดขาย กำไร สต๊อก และการทำงานของร้าน สำหรับเจ้าของร้านและผู้จัดการ"
      features={["ยอดขายรายวัน", "กำไรขั้นต้น", "สินค้าขายดี", "รายงานสต๊อก", "ส่งออก Excel / PDF"]}
    />
  );
}
