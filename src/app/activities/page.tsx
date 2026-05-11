import { ModulePage } from "@/components/module-page";

export default function ActivitiesPage() {
  return (
    <ModulePage
      section="บริหาร"
      title="กิจกรรม"
      description="ดู log กิจกรรมในระบบ เช่น เปิดบิล แก้ไขสินค้า รับเข้า และการเข้าสู่ระบบ"
      features={["เปิด/ปิดบิล", "แก้ไขสินค้า", "รับสินค้าเข้า", "เปลี่ยนราคา", "เข้าสู่ระบบ"]}
    />
  );
}
