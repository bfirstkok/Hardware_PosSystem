# Spec: Sales History MVP

## Goal
ทำหน้า `ประวัติขาย` ให้ตรวจสอบบิลได้เร็ว สรุปยอดได้ และยกเลิก/คืนเงินแบบไม่ลบข้อมูล

แกนหลัก:
- เก็บ transaction ให้ครบ
- ค้นหา/filter ได้
- สรุปยอดในหน้าเดียว
- Void/Refund ต้องโปร่งใส
- มี log ว่าใครทำอะไร

## MVP Scope

### ทำตอนนี้
- Transaction detail
- Date range filter
- Quick search ด้วยเลขบิล
- Filter ด้วย payment method
- Summary: revenue, average ticket, bill count
- Top sellers
- Void ทั้งบิล
- Refund ทั้งบิล
- Activity log สำหรับ sale/product/stock
- Transaction event log สำหรับ sale lifecycle

### ยังไม่ทำตอนนี้
- Partial refund
- Shift open/close
- System slow query log
- Printer/API failure log
- RBAC เต็มรูปแบบ
- Employee profile เต็มรูปแบบ

เหตุผล: MVP ต้องปิดความเสี่ยงเงิน/สต็อกก่อน ไม่ควรเพิ่ม subsystem เยอะเกินไป

## Data Structure

### `sales`
ใช้เป็นหัวบิล

ต้องมี:
- `sale_no`: เลขบิล เช่น `INV-20260514-001`
- `sale_date`: วันที่ขาย
- `subtotal`
- `discount_amount`
- `total_amount`
- `payment_method`: `cash`, `transfer`, `card`, `qr`
- `status`: `completed`, `voided`, `refunded`
- `created_by`
- `voided_at`, `voided_by`, `void_reason`
- `refunded_at`, `refunded_by`, `refund_reason`

Rule:
- ห้าม hard delete
- เปลี่ยนได้เฉพาะ status และ metadata ของ void/refund
- `void_reason` required เมื่อ `status = 'voided'`
- `refund_reason` required เมื่อ `status = 'refunded'`

### `sale_items`
ใช้เป็นรายการสินค้าในบิล

ต้องมี:
- `sale_id`
- `product_id`
- `qty`
- `unit_price`
- `discount_amount`
- `line_total`

Rule:
- immutable หลังขายสำเร็จ
- ถ้า void/refund ให้สร้าง event/stock movement ย้อนกลับ ห้ามแก้ row เดิม

### `payments`
ใช้เก็บการรับเงิน

ต้องมี:
- `sale_id`
- `payment_method`
- `amount`
- `reference_no`
- `created_by`

Rule:
- immutable
- ถ้าผิด ให้บันทึก correction/refund event เพิ่ม ไม่ update เงียบ

### `transaction_events`
log ทางการเงินแบบ append-only

Fields:
- `id`
- `sale_id`
- `event_type`: `created`, `voided`, `refunded`
- `amount`
- `reason`
- `metadata jsonb`
- `created_by`
- `created_at`

ใช้ตอบคำถาม:
- บิลนี้เกิดเมื่อไหร่
- ใคร void/refund
- เหตุผลคืออะไร
- มูลค่าเท่าไหร่

### `activity_logs`
log การใช้งานทั่วไป

Fields:
- `id`
- `actor_id`
- `action`
- `entity_type`
- `entity_id`
- `before_data jsonb`
- `after_data jsonb`
- `metadata jsonb`
- `created_at`

MVP actions:
- `sale.create`
- `sale.void`
- `sale.refund`
- `product.price_change`
- `stock.receive`

Later actions:
- `auth.login`
- `auth.logout`
- `shift.open`
- `shift.close`
- `system.error`

## Search & Filter

### Range Filter
รองรับ:
- วันนี้
- เมื่อวาน
- 7 วันที่ผ่านมา
- custom `from` / `to`

ใช้ timezone:
- `Asia/Bangkok`

### Quick Search
MVP:
- ค้นด้วย `sale_no`

Later:
- ค้นด้วยชื่อพนักงาน หลังมี `employees/profiles`

### Category Filter
MVP:
- payment method

Later:
- product category

## Summary & Analytics

แสดงบน `/sales-history`

MVP summary:
- `Total Revenue`: รวมเฉพาะ `completed`
- `Average Ticket Size`: `Total Revenue / completed bill count`
- `Bill Count`: จำนวนบิลทั้งหมดใน filter
- `Void/Refund Count`
- `Top Sellers`: group by product, sort by qty desc

Rule:
- `voided` และ `refunded` ไม่รวมใน net sales
- ยังต้องแสดงใน list เพื่อ audit

## Void & Refund

### Void
ใช้กรณีขายผิดและต้องยกเลิกทั้งบิล

Flow:
1. user เลือกบิล
2. กด void
3. ใส่ reason
4. RPC `void_sale(payload jsonb)`
5. update `sales.status = 'voided'`
6. insert `transaction_events`
7. insert `activity_logs`
8. คืน stock ผ่าน `stock_movements`

### Refund
ใช้กรณีคืนเงินทั้งบิล

Flow เหมือน void แต่:
- `sales.status = 'refunded'`
- event_type = `refunded`

Rule:
- void/refund ได้เฉพาะ `completed`
- void/refund ซ้ำไม่ได้
- ต้องมี reason
- ห้ามลบ `sales`, `sale_items`, `payments`

## UI Scope

### `/sales-history`
เพิ่ม:
- search input: เลขบิล
- filter payment method
- summary cards
- top sellers panel
- status badge
- void/refund button เฉพาะบิล `completed`
- reason modal

### `/activities`
MVP:
- table log
- filter by date/action/entity
- แสดง actor, action, entity, time

## Implementation Order

### Phase 1: Database
- add columns for void/refund in `sales`
- add `discount_amount` in `sale_items`
- add `transaction_events`
- add `activity_logs`
- add indexes for `sale_date`, `sale_no`, `payment_method`, `status`

### Phase 2: RPC
- update `complete_pos_sale()` ให้ใช้ `INV-YYYYMMDD-001`
- insert `transaction_events` on sale create
- insert `activity_logs` on sale create
- add `void_sale(payload jsonb)`
- add `refund_sale(payload jsonb)`

### Phase 3: Sales History UI
- add search/filter
- add summary
- add top sellers
- show status clearly

### Phase 4: Void/Refund UI
- add action buttons
- add reason modal
- call RPC
- refresh page

### Phase 5: Activity Log UI
- replace placeholder `/activities`
- query `activity_logs`
- add filters

## Commands

Verify:
```bash
npm run lint
npm run build
```

Before real DB migration:
```bash
supabase db dump --file backup-before-sales-history-mvp.sql
```

Apply migration only after review:
```bash
supabase db push
```

## Acceptance Criteria
- บิลใหม่ได้เลขแบบ `INV-YYYYMMDD-001`
- ดูบิลตามช่วงเวลาได้
- ค้นด้วยเลขบิลได้
- filter ด้วย payment method ได้
- summary นับเฉพาะยอดขายจริง
- top sellers แสดงสินค้าออกบ่อยสุด
- void/refund ต้องใส่ reason
- void/refund ไม่ลบข้อมูลเดิม
- void/refund คืน stock
- ทุก sale/void/refund เขียน `transaction_events`
- ทุก sale/void/refund/price change/stock receive เขียน `activity_logs`
- `npm run lint` ผ่าน
- `npm run build` ผ่าน

## Open Decisions
- Refund MVP ยืนยันเป็นคืนทั้งบิล
- สิทธิ์ void/refund ยังใช้ authenticated user ก่อน หรือรอ RBAC?
- ต้องเปลี่ยนบิลเก่า `SALE-*` เป็น `INV-*` หรือให้ใช้ `INV-*` เฉพาะบิลใหม่?
