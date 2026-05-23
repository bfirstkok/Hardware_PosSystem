import { ModulePage } from "@/components/module-page";

export default function TableMonitorPage() {
  return (
    <ModulePage
      pathname="/table-monitor"
      section="บริหาร"
      title="มอนิเตอร์โต๊ะ"
      description="พื้นที่ควบคุมจอโฆษณาและหน้าจอแสดงผลภายในร้าน เช่น โปรโมชัน สินค้าแนะนำ และคิวบริการ"
      features={["ควบคุมจอโฆษณา", "เลือกเพลย์ลิสต์", "ตั้งเวลาฉาย", "แสดงโปรโมชั่น", "ตรวจสถานะจอ"]}
    />
  );
}
