import { ModulePage } from "@/components/module-page";

export default function EmployeesPage() {
  return (
    <ModulePage
      section="บริหาร"
      title="พนักงาน"
      description="จัดการพนักงาน บทบาท สิทธิ์ใช้งาน และประวัติการทำรายการในระบบ"
      features={["รายชื่อพนักงาน", "สิทธิ์แคชเชียร์", "สิทธิ์ผู้จัดการ", "ประวัติเข้าระบบ", "ประวัติแก้ไขข้อมูล"]}
    />
  );
}
