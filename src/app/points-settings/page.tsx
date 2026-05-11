import { ModulePage } from "@/components/module-page";

export default function PointsSettingsPage() {
  return (
    <ModulePage
      section="CRM"
      title="ตั้งค่าสะสมแต้ม"
      description="กำหนดเงื่อนไขการสะสมแต้ม การแลกแต้ม และอายุแต้มของระบบสมาชิก"
      features={["อัตราสะสมแต้ม", "อัตราแลกแต้ม", "ขั้นต่ำการใช้", "วันหมดอายุแต้ม", "ยกเว้นสินค้าบางกลุ่ม"]}
    />
  );
}
