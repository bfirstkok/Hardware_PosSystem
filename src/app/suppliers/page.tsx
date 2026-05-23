import { ModulePage } from "@/components/module-page";

export default function SuppliersPage() {
  return (
    <ModulePage
      pathname="/suppliers"
      section="บริหาร"
      title="ผู้ผลิต"
      description="จัดการผู้ผลิตและคู่ค้า เพื่อเชื่อมกับการรับสินค้าและต้นทุน"
      features={["รายชื่อผู้ผลิต", "ข้อมูลติดต่อ", "เครดิตเทอม", "สินค้าที่จัดหา", "ประวัติรับเข้า"]}
    />
  );
}
