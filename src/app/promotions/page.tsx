import { ModulePage } from "@/components/module-page";

export default function PromotionsPage() {
  return (
    <ModulePage
      section="โปรโมชั่น"
      title="โปรโมชั่น"
      description="สร้างแคมเปญขายหน้าร้าน เช่น ซื้อครบลด แถมสินค้า หรือราคาโปรตามช่วงเวลา"
      features={["ซื้อครบลด", "ซื้อสินค้าแถม", "ราคาโปรรายสินค้า", "กำหนดช่วงเวลา", "เปิด/ปิดแคมเปญ"]}
    />
  );
}
