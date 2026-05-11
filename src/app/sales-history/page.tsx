import { ModulePage } from "@/components/module-page";

export default function SalesHistoryPage() {
  return (
    <ModulePage
      section="เอกสาร / รายงาน"
      title="ประวัติขาย"
      description="ตรวจสอบบิลขายย้อนหลัง ดูรายการสินค้า วิธีชำระเงิน ส่วนลด และผู้ทำรายการ"
      features={["ค้นหาบิลขาย", "ดูรายละเอียดบิล", "ยกเลิก/คืนสินค้า", "ประวัติชำระเงิน", "พิมพ์ใบเสร็จซ้ำ"]}
    />
  );
}
