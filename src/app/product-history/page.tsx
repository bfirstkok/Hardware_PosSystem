import { ModulePage } from "@/components/module-page";

export default function ProductHistoryPage() {
  return (
    <ModulePage
      section="เอกสาร / รายงาน"
      title="ประวัติสินค้า"
      description="ติดตามความเคลื่อนไหวสินค้าแต่ละตัว ตั้งแต่รับเข้า ขายออก ปรับยอด และแก้ไขราคา"
      features={["ประวัติรับเข้า", "ประวัติขายออก", "ปรับยอดสต๊อก", "ประวัติราคา", "ผู้ทำรายการ"]}
    />
  );
}
