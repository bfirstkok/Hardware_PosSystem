import { ModulePage } from "@/components/module-page";

export default function DocumentsPage() {
  return (
    <ModulePage
      section="เอกสาร / รายงาน"
      title="เอกสาร"
      description="จัดการเอกสารหน้าร้าน เช่น ใบเสนอราคา ใบส่งของ ใบกำกับ และเอกสารประกอบการขาย"
      features={["ใบเสนอราคา", "ใบส่งของ", "ใบกำกับภาษี", "ค้นหาเลขเอกสาร", "พิมพ์เอกสาร"]}
    />
  );
}
