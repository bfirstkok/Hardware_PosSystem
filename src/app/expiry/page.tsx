import { ModulePage } from "@/components/module-page";

export default function ExpiryPage() {
  return (
    <ModulePage
      pathname="/expiry"
      section="สินค้า / สโตร์"
      title="วันหมดอายุ"
      description="ติดตามล็อตสินค้าและวันหมดอายุ เหมาะกับสี เคมีภัณฑ์ กาว ซิลิโคน และสินค้าที่ต้องควบคุมอายุ"
      features={["ล็อตสินค้า", "วันหมดอายุ", "แจ้งเตือนใกล้หมดอายุ", "รับเข้าตามล็อต", "ขายแบบ FIFO"]}
    />
  );
}
