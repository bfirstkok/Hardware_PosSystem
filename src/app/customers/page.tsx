import { ModulePage } from "@/components/module-page";

export default function CustomersPage() {
  return (
    <ModulePage
      section="CRM"
      title="ลูกค้า"
      description="จัดเก็บข้อมูลลูกค้า ประวัติซื้อ เครดิต และข้อมูลติดต่อสำหรับติดตามงานขาย"
      features={["รายชื่อลูกค้า", "ประวัติซื้อ", "วงเงินเครดิต", "ที่อยู่จัดส่ง", "แท็กลูกค้า"]}
    />
  );
}
