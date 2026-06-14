import { ModulePage } from "@/components/module-page";

export default function ExpensesPage() {
  return (
    <ModulePage
      pathname="/expenses"
      section="เอกสาร / รายงาน"
      title="ค่าใช้จ่าย"
      description="บันทึกค่าใช้จ่ายร้าน เพื่อใช้ดูต้นทุนการดำเนินงานและสรุปกำไรสุทธิ"
      features={["ค่าเช่า", "ค่าน้ำค่าไฟ", "เงินเดือน", "ค่าส่งสินค้า", "แนบหลักฐานจ่าย"]}
    />
  );
}
