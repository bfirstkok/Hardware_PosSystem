import { ModulePage } from "@/components/module-page";

export default function DiscountsPage() {
  return (
    <ModulePage
      section="โปรโมชั่น"
      title="ส่วนลด"
      description="ตั้งค่าส่วนลดที่แคชเชียร์ใช้ในหน้าขาย เช่น ส่วนลดท้ายบิล คูปอง และสิทธิ์อนุมัติ"
      features={["ส่วนลดท้ายบิล", "คูปอง", "ส่วนลดสมาชิก", "สิทธิ์อนุมัติ", "ประวัติใช้ส่วนลด"]}
    />
  );
}
