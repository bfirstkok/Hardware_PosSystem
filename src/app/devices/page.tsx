import { ModulePage } from "@/components/module-page";

export default function DevicesPage() {
  return (
    <ModulePage
      section="บริหาร"
      title="อุปกรณ์ที่เข้าสู่ระบบ"
      description="ตรวจสอบอุปกรณ์ที่ล็อกอินเข้าระบบ เพื่อควบคุมความปลอดภัยและจัดการ session"
      features={["อุปกรณ์ออนไลน์", "ประวัติล็อกอิน", "ยกเลิก session", "ตรวจ IP", "แจ้งเตือนอุปกรณ์ใหม่"]}
    />
  );
}
