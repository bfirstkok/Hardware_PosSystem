import { ModulePage } from "@/components/module-page";

export default function BranchesPage() {
  return (
    <ModulePage
      pathname="/branches"
      section="บริหาร"
      title="สาขา"
      description="จัดการข้อมูลสาขา คลังสินค้า และการแยกยอดขายตามสาขา"
      features={["ข้อมูลสาขา", "คลังประจำสาขา", "ยอดขายแยกสาขา", "ย้ายสต๊อก", "สิทธิ์เข้าถึงตามสาขา"]}
    />
  );
}
