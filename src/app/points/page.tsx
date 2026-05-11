import { ModulePage } from "@/components/module-page";

export default function PointsPage() {
  return (
    <ModulePage
      section="CRM"
      title="แลกสะสมแต้ม"
      description="บันทึกและแลกแต้มสะสมของลูกค้า เพื่อเพิ่มการกลับมาซื้อซ้ำ"
      features={["สะสมแต้มจากยอดซื้อ", "แลกแต้มเป็นส่วนลด", "ประวัติแต้ม", "แต้มหมดอายุ", "ค้นหาด้วยเบอร์โทร"]}
    />
  );
}
