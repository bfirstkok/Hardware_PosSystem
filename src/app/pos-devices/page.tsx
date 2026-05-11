import { ModulePage } from "@/components/module-page";

export default function PosDevicesPage() {
  return (
    <ModulePage
      section="บริหาร"
      title="เครื่อง POS"
      description="จัดการเครื่องขายหน้าร้าน เครื่องพิมพ์ใบเสร็จ ลิ้นชักเงิน และเครื่องสแกน"
      features={["ทะเบียนเครื่อง POS", "เครื่องพิมพ์ใบเสร็จ", "ลิ้นชักเงิน", "เครื่องสแกนบาร์โค้ด", "สถานะอุปกรณ์"]}
    />
  );
}
