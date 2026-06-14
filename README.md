<div align="center">

# 🏪 Hardware POS System

**ระบบจุดขายแบบ Cloud-Based สำหรับร้านค้าขายวัสดุและวัสดุก่อสร้าง**

พร้อมระบบจัดการคลังสินค้าแบบ Real-time, Atomic Transactions, และ Role-Based Security

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](./package.json)
[![Node Version](https://img.shields.io/badge/node-18%2B-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Status](https://img.shields.io/badge/status-Active%20Development-orange.svg)](#)

[🌐 Website](#) • [📖 Documentation](#) • [🐛 Report Bug](#) • [✨ Request Feature](#)

</div>

---

## 📋 สารบัญ

- [📌 ภาพรวม](#-ภาพรวม)
- [✨ ฟีเจอร์](#-ฟีเจอร์)
- [🆕 อัปเดตล่าสุด](#-อัปเดตล่าสุด)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [📂 โครงสร้างโปรเจกต์](#-โครงสร้างโปรเจกต์)
- [🏗️ สถาปัตยกรรม](#️-สถาปัตยกรรม)
- [⚙️ ตั้งค่า](#️-ตั้งค่า)
- [📊 Roadmap](#-roadmap)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 📌 ภาพรวม

**Hardware POS** คือระบบจุดขายแบบครบถ้วน ออกแบบมาสำหรับร้านค้าขายเครื่องมือและวัสดุก่อสร้าง พร้อมคุณสมบัติขั้นสูงเช่น:

- ✅ **POS Terminal** - บริการขายแบบ Real-time
- ✅ **Inventory Management** - ติดตามสินค้าและสาขาอัตโนมัติ
- ✅ **Atomic Transactions** - ป้องกันการขายเกินสต็อก
- ✅ **Comprehensive Audit Trail** - ประวัติการเคลื่อนไหวสินค้าแบบสมบูรณ์
- ✅ **Role-Based Security** - Row-Level Security และ RLS Policies
- ✅ **Thai Localization** - ระบบภาษาไทยเต็ม พร้อมการจัดรูปแบบตัวเลข

### 🎯 ผู้ใช้เป้าหมาย

| บทบาท | หน้าหลัก | คำอธิบาย |
|------|--------|--------|
| **Cashiers** 💳 | `/pos` | ขายสินค้า จ่ายเงิน บันทึกบิล |
| **Store Managers** 📊 | `/dashboard` | ดูสต็อค ยอดขาย การแจ้งเตือน |
| **Inventory Staff** 📦 | `/stock` | Stock-in, ประวัติเคลื่อนไหว, ปรับจำนวน |

---

## ✨ ฟีเจอร์

### ✅ พร้อมใช้งาน (Production Ready)

| ฟีเจอร์ | รายละเอียด | สถานะ |
|--------|----------|-------|
| **POS Terminal** | Shopping cart, hold/resume bills, 4 payment methods, receipt | ✅ |
| **Product Catalog** | CRUD, auto-SKU, barcode, 3-tier pricing, image upload | ✅ |
| **Stock Management** | Manual stock-in, audit trail, movement history | ✅ |
| **Dashboard** | KPIs, low-stock alerts, sales metrics, trends | ✅ |
| **Authentication** | Email/magic link, SSR session management | ✅ |
| **RLS Security** | Row-Level Policies on all tables | ✅ |
| **Atomic Transactions** | `complete_pos_sale()`, `receive_stock()` RPC | ✅ |
| **Device Session Control** | Auto device registration, approve/block/revoke, audit logs | ✅ |

### 🔄 กำลังพัฒนา & วางแผน

| ฟีเจอร์ | ลำดับความสำคัญ | เป้าหมาย |
|--------|--------------|--------|
| **Customer Management** | P1 | Credit sales, delivery, customer history |
| **Employee Roles** | P1 | POS Operator, Manager, Accountant |
| **Promotions & Discounts** | P1 | Flexible discount rules, campaigns |
| **Multi-Branch** | P2 | Multiple outlets, branch reporting |
| **Advanced Reporting** | P2 | Daily/monthly sales, product performance |
| **Expense Tracking** | P2 | Operating costs analysis |
| **Testing Framework** | P1 | Node test runner active, RTL + E2E planned |
| **Receipt Printing** | P3 | Thermal printer integration |

---

## 🆕 อัปเดตล่าสุด

### Staff Access Control, Employee Login และ Protected Routes

- เพิ่มระบบสิทธิ์พนักงานตาม role:
  - `cashier` เข้าได้เฉพาะหน้าร้าน, stock basic, sales history ที่เกี่ยวข้อง
  - `manager` เข้า dashboard/report/product/staff operation ได้มากขึ้น
  - `owner` เข้าได้ทุก module รวมถึง branch/admin
- เพิ่ม helper กลางสำหรับ permission:
  - `src/lib/permissions.ts`
  - `src/lib/permissions.mjs`
  - `src/lib/permissions.test.mjs`
- เพิ่ม employee login จริง:
  - route `src/app/auth/employee-login/route.ts`
  - login ด้วย `employee_code` เช่น `CAS001`, `MGR001`, `OWN001` หรือ email owner เดิม
  - ใช้ `SUPABASE_SERVICE_ROLE_KEY` เฉพาะฝั่ง server เพื่อ map `employee_code -> auth_email`
  - validate payload ก่อน login และ reject malformed/oversized input ด้วย `400`
- ปรับระบบรหัสพนักงานใหม่ตาม role:
  - `cashier` -> `CAS001`, `CAS002`, ...
  - `manager` -> `MGR001`, `MGR002`, ...
  - `owner` -> `OWN001`, `OWN002`, ...
  - รหัส legacy เช่น `ADMIN001`, `EMP001`, `OWNER001` ยังใช้ได้ ไม่ถูกลบหรือ rewrite
  - helper ที่เกี่ยวข้อง: `src/lib/staff-code.ts`, `src/lib/staff-code.mjs`, `src/lib/staff-code.test.mjs`
- ปรับหน้า `/employees` ให้ใช้ข้อมูลจริง:
  - แสดงรายชื่อจาก `staff_profiles` ผ่าน server-only admin client หลังผ่าน `requireRouteAccess("/employees")`
  - `owner` เห็นทุก role, `manager` เห็นเฉพาะ `cashier`
  - หัวข้อหน้าเหลือเฉพาะที่ใช้จริง: `เพิ่มพนักงาน`, `รายชื่อพนักงาน`, `บทบาท/สิทธิ์`
- เพิ่ม protected route Proxy สำหรับ Next.js 16:
  - `src/proxy.ts`
  - ถ้ายังไม่ login แล้วเข้า `/pos`, `/dashboard`, `/sales-history`, `/stock` ฯลฯ จะ redirect ไป `/login?auth=no-session&next=...`
  - `next` path ถูก sanitize ให้เป็น local path เท่านั้น ป้องกัน open redirect
- เพิ่ม server-side role guard ใน protected pages:
  - `ModulePage` รับ `pathname` แล้วเรียก `requireRouteAccess(pathname)` ก่อน render
  - หน้า static/stub เช่น `/reports`, `/branches`, `/customers`, `/documents`, `/expenses`, `/points`, `/suppliers` ถูกกันสิทธิ์จริง
  - หน้าจริงเช่น `/products`, `/stock`, `/sales-history`, `/product-history`, `/barcodes`, `/devices`, `/promotions`, `/discounts` ใช้ `requireRouteAccess(...)`
  - server actions สำคัญเช็ค `requireActionAccess(...)` เช่น product create/update/delete, stock receive, device approve/block/revoke
- แก้หน้าแรก:
  - ปุ่ม `เข้าสู่ระบบ POS` ไป `/pos`
  - ปุ่ม `Dashboard` ไป `/dashboard`
  - ทั้งสอง path ถูก Proxy บังคับ login เองเมื่อยังไม่มี session
- แก้ sidebar/nav:
  - ระหว่างโหลด role ใช้ fallback เป็น `cashier`
  - ไม่โชว์ owner/manager menu แวบหนึ่งตอน cashier navigate
  - ไม่ทำให้หมวดหมู่หายตอน page ไม่ได้ส่ง `currentStaff`
- เพิ่ม tests:
  - `src/lib/protected-routes.test.mjs`
  - `src/lib/employee-login-validation.test.mjs`
  - `src/lib/staff-code.test.mjs`
  - permission regression สำหรับ invalid role และ post-login redirect ตาม role

Migration ที่เกี่ยวข้อง:

```text
supabase/migrations/202605230001_staff_access_control.sql
supabase/seed_staff_mockup.sql
```

Quality notes:

- Security: protected route guard ทำงานก่อน render, server-side role guard ครอบคลุม module pages, login redirect sanitize `next`, invalid/null role เข้า protected route ไม่ได้
- Performance: Proxy เช็คเฉพาะ route ที่อยู่ใน protected list; public/static route ไม่เรียก Supabase Auth
- Testing: ตรวจด้วย `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm audit --audit-level=high`

### Device Session Control, IP Masking และ Access Enforcement

- เพิ่มระบบบริหารอุปกรณ์ที่เข้าสู่ระบบจริงผ่าน Supabase:
  - ตาราง `device_sessions`
  - ตาราง `device_audit_logs`
  - route `/devices`
  - route `/devices/logs`
- เมื่อ user login แล้วเปิดระบบ หน้า `/devices` จะ sync เครื่องปัจจุบันเข้า DB:
  - `device_key`
  - `device_name`
  - `user_email`
  - `ip_address`
  - `browser`
  - `os`
  - `last_seen_at`
  - `status`
- เพิ่มปุ่มจัดการอุปกรณ์:
  - `อนุมัติ` -> `status = online`, `trusted = true`, `is_new_device = false`
  - `ปิดกั้น` -> `status = blocked`, `trusted = false`, `is_new_device = false`
  - `ยกเลิก` -> `status = revoked`, `is_new_device = false`
- เพิ่ม enforcement ใน `AppShell`:
  - ถ้าอุปกรณ์เป็น `blocked` หรือ `revoked` ระบบจะ `supabase.auth.signOut()`
  - redirect ไป `/login?device=blocked` หรือ `/login?device=revoked`
  - หน้า login แสดงเหตุผลให้ผู้ใช้รู้
- เพิ่มหน้า `/devices/logs` สำหรับเจ้าของร้านดู log:
  - เวลา
  - action
  - email
  - ชื่ออุปกรณ์
  - IP เต็ม
  - location
  - browser / OS
  - status
- หน้าหลัก `/devices` mask IP เพื่อลดการเปิดเผยข้อมูลอ่อนไหว เช่น `192.168.xxx.xxx`
- เพิ่ม audit metadata ตอนพบอุปกรณ์ใหม่ เช่น `ip_address`, `browser`, `os`

Migration ที่เกี่ยวข้อง:

```text
supabase/migrations/202605220001_device_sessions.sql
```

ไฟล์หลักที่เกี่ยวข้อง:

```text
src/app/devices/page.tsx
src/app/devices/devices-client.tsx
src/app/devices/actions.ts
src/app/devices/logs/page.tsx
src/lib/device-access-actions.ts
src/components/app-shell.tsx
src/app/login/page.tsx
```

Quality notes:

- Security: IP เต็มแสดงเฉพาะหน้า log, หน้าหลัก mask IP, action ต้องผ่าน Supabase Auth
- Performance: `/devices` จำกัด query ล่าสุด `100` rows และ `/devices/logs` จำกัด `200` rows พร้อม index ตาม status/last_seen/log time
- Testing: ตรวจด้วย `npm run lint`, `npm run build`, `npm test`

### Sales/Product History UI, Audit และ Pagination

- ปรับ `/sales-history` และ `/product-history` ให้ใช้รูปแบบ UI เดียวกัน:
  - header + count badge
  - date period switcher (`รายวัน`, `สัปดาห์`, `เดือน`, `ปี`)
  - filter panel
  - summary cards
  - CSV action
- เพิ่ม server-side pagination:
  - `/sales-history` แสดงครั้งละ `200` บิล
  - `/product-history` แสดงครั้งละ `100` รายการ
  - ใช้ query param `page`
  - ปุ่ม `ก่อนหน้า` / `ถัดไป` เก็บ filter เดิมไว้
- เพิ่ม helper pagination:
  - `src/lib/pagination.mjs`
  - `src/lib/pagination.test.mjs`
- `/product-history` รองรับข้อมูลจาก:
  - `stock_movements`
  - `product_price_history`
  - `sale_items` เพื่อแสดง `sales.sale_no` และ `sale_items.unit_price`
- แยกประเภท stock return จากการยกเลิก/คืนเงิน:
  - `void_return` แสดงเป็น `คืนจากยกเลิก`
  - `refund_return` แสดงเป็น `คืนจากคืนเงิน`
- `/product-history/export` รองรับ filter, period/date range และประเภทใหม่เหมือนหน้าจอ
- CSV ใส่ UTF-8 BOM และป้องกัน spreadsheet formula injection สำหรับค่าที่ขึ้นต้นด้วย `=`, `+`, `-`, `@`
- เพิ่ม `product_price_history` สำหรับเก็บประวัติแก้ราคา:
  - ราคาปลีกเก่า -> ใหม่
  - ราคาส่งเก่า -> ใหม่
  - ต้นทุนเก่า -> ใหม่
  - ผู้แก้ไขและเวลาที่แก้
- เพิ่ม performance indexes:
  - `stock_movements_type_date_idx`
  - `stock_movements_product_type_date_idx`
  - `sale_items_sale_product_idx`

Migration ที่เกี่ยวข้อง:

```text
supabase/migrations/202605190001_product_price_history.sql
supabase/migrations/202605190002_product_history_performance.sql
supabase/migrations/202605200001_sales_history_integrity.sql
supabase/migrations/202605200002_void_refund_functions.sql
supabase/migrations/202605220001_device_sessions.sql
```

Quality notes:

- Security: export CSV escape สูตร spreadsheet, หน้า history ต้องผ่าน `supabase.auth.getUser()` และ redirect/return `401` เมื่อไม่ login
- Testing: เพิ่ม coverage สำหรับ `product-history`, `sales-history-export`, `pagination`
- Performance: ใช้ `.range()` + count สำหรับ pagination และมี index สำหรับ query ตามประเภท/วันที่/สินค้า

### Navigation UX

- Sidebar เปลี่ยนเป็น grouped navigation: แสดงหัวหมวดก่อน แล้วกดเพื่อ expand/collapse รายการย่อย
- หมวดที่เปิดแล้วจะค้างไว้ ไม่ปิดเองเมื่อกดเมนูในหมวดอื่น
- Highlight เหลือเฉพาะหัวหมวด เพื่อลดความสับสนของสี
- รายการย่อยใช้ hover สีเทาอ่อน และยังมี `aria-current="page"` สำหรับ accessibility
- เพิ่ม pending indicator บน link เพื่อให้เห็นว่าระบบรับ click แล้วระหว่างรอ navigation

### Loading & Performance

- เพิ่ม shared skeleton loading ที่ `src/components/page-loading.tsx`
- เพิ่ม route-level `loading.tsx` ให้หน้าที่โหลดข้อมูลจาก Supabase:
  - `src/app/dashboard/loading.tsx`
  - `src/app/barcodes/loading.tsx`
  - `src/app/pos/loading.tsx`
  - `src/app/products/loading.tsx`
  - `src/app/stock/loading.tsx`
  - `src/app/sales-history/loading.tsx`
- เวลาเข้า route ที่โหลดข้อมูลหนัก ผู้ใช้จะเห็น loading state ทันที แทนการค้างบนหน้าเดิม

### Testing & Stability

- เพิ่ม `src/lib/navigation-loading.test.mjs` เพื่อกัน regression ว่า data-heavy routes ต้องมี `loading.tsx`
- เพิ่ม `src/lib/product-history.test.mjs` ครอบคลุม sale reference, unit price, และ price-change mapping
- Test suite ปัจจุบันมี 22 tests และรันด้วย `node --test`
- คำสั่งตรวจหลักที่ใช้:

```bash
npm run lint
npm run build
npm test
```

---

## 🛠️ Tech Stack

### Frontend

| Tool | Version | ประโยชน์ |
|------|---------|---------|
| **Next.js** | 16.2.6 | App Router, SSR, ISR |
| **React** | 19.2.4 | Modern hooks & Suspense |
| **TypeScript** | 5.x | Type safety, better DX |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Lucide Icons** | 1.14.0 | Lightweight, tree-shaking |

### Backend & Database

| Tool | Version | ประโยชน์ |
|------|---------|---------|
| **Next.js Server Actions** | - | RPC calls, form handling |
| **Supabase PostgreSQL** | Cloud | Managed DB, RLS ready |
| **Supabase Auth** | Latest | Passwordless, email-based |
| **Supabase SDK** | 2.105.4 | Type-safe, SSR-aware |

### Development

| Tool | Version |
|------|---------|
| **ESLint** | 9.x |
| **Turbopack** | Next.js 16 |

---

## 🚀 Quick Start

### ✋ ข้อกำหนดเบื้องต้น

```bash
- Node.js 18+ (recommended: 20 LTS)
- npm or yarn or pnpm
- Supabase account (free tier at supabase.com)
```

### 1️⃣ Clone & Install

```bash
git clone https://github.com/bfirstkok/Hardware_PosSystem.git
cd "POS bfirstkok"
npm install
```

### 2️⃣ ตั้งค่า Supabase

```bash
# สร้าง project ใหม่ที่ supabase.com

# ใน Supabase Dashboard:
# 1. ไปที่ Settings → API
# 2. คัดลอก URL และ anon key

# สร้าง .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3️⃣ ตั้งค่าฐานข้อมูล

```bash
# ตัวเลือก A: ใช้ Supabase Dashboard
# 1. เปิด SQL Editor ในโปรเจกต์
# 2. วาง supabase/schema.sql
# 3. รัน migrations เพิ่มเติมตามลำดับใน supabase/migrations/

# ตัวเลือก B: ใช้ Supabase CLI
supabase link --project-ref your_project_id
supabase db push
```

Migration สำคัญสำหรับระบบอุปกรณ์/session:

```text
supabase/migrations/202605220001_device_sessions.sql
supabase/migrations/202605230001_staff_access_control.sql
```

### 4️⃣ รัน Development Server

```bash
npm run dev
# ไปที่ http://localhost:3000
```

### 5️⃣ เข้าสู่ระบบ

- Owner เดิม: `admin@hardwarepos.dev` + password เดิมใน Supabase Auth
- Employee: ใช้รหัสพนักงาน เช่น `EMP002` + password ที่ owner/manager ตั้ง
- ถ้าเข้า protected route โดยยังไม่ login ระบบจะส่งไป `/login?auth=no-session&next=...`

---

## 📂 โครงสร้างโปรเจกต์

```
Hardware_PosSystem/
│
├── src/
│   ├── proxy.ts                     # Next.js 16 protected route proxy
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (AppShell)
│   │   ├── globals.css               # Tailwind CSS
│   │   ├── page.tsx                  # Home page
│   │   │
│   │   ├── login/page.tsx            # 🔑 Authentication
│   │   ├── auth/employee-login/route.ts
│   │   ├── dashboard/page.tsx        # 📊 Dashboard & KPIs
│   │   ├── dashboard/loading.tsx     # Loading skeleton
│   │   ├── pos/page.tsx              # 🛒 POS Terminal
│   │   ├── pos/loading.tsx           # Loading skeleton
│   │   ├── products/page.tsx         # 📦 Product Management
│   │   ├── products/loading.tsx      # Loading skeleton
│   │   ├── stock/page.tsx            # 📥 Stock Management
│   │   ├── stock/loading.tsx         # Loading skeleton
│   │   ├── devices/page.tsx          # 🔐 Device sessions
│   │   ├── devices/actions.ts        # Device server actions
│   │   ├── devices/devices-client.tsx
│   │   ├── devices/logs/page.tsx     # Device access logs
│   │   │
│   │   ├── barcodes/page.tsx         # 🏷️ Barcode Printing
│   │   ├── barcodes/loading.tsx      # Loading skeleton
│   │   ├── sales-history/loading.tsx # Loading skeleton
│   │   ├── customers/page.tsx        # 👥 Customer CRM
│   │   ├── employees/page.tsx        # 👨‍💼 Staff Management
│   │   ├── suppliers/page.tsx        # 🏢 Supplier Management
│   │   ├── promotions/page.tsx       # 🎯 Promotions
│   │   ├── reports/page.tsx          # 📈 Reports
│   │   └── [more modules]/           # Future features
│   │
│   ├── components/
│   │   ├── app-shell.tsx             # Navigation sidebar
│   │   ├── module-page.tsx           # Page template
│   │   └── page-loading.tsx          # Shared route loading skeleton
│   │
│   └── lib/
│       ├── device-access-actions.ts  # Block/revoke guard
│       ├── employee-login-validation.ts
│       ├── permissions.ts            # Staff RBAC
│       ├── protected-routes.ts       # Protected route list + login redirect helper
│       ├── navigation-loading.test.mjs
│       └── supabase/
│           ├── client.ts             # Browser client
│           └── server.ts             # Server client
│
├── supabase/
│   ├── schema.sql                    # Database schema
│   └── migrations/
│       ├── 20260512_product_images.sql
│       └── 202605220001_device_sessions.sql
│
├── public/                           # Static assets
├── .env.local                        # Environment variables
├── tsconfig.json                     # TypeScript config
├── tailwind.config.ts                # Tailwind config
├── next.config.ts                    # Next.js config
└── package.json                      # Dependencies
```

---

## 🏗️ สถาปัตยกรรม

### System Layers

```
┌─────────────────────────────────────────┐
│   Presentation (React 19)               │
│   Pages, Components, Client State       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Application (Next.js 16)              │
│   Server Actions, Forms, SSR            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   API Layer (Supabase RPC)              │
│   complete_pos_sale()                   │
│   receive_stock()                       │
│   Atomic Transactions + Security        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Database (PostgreSQL)                 │
│   Supabase Cloud                        │
│   RLS, Constraints, Foreign Keys        │
└─────────────────────────────────────────┘
```

### Data Flow: POS Sale

```
Customer at Counter
  ↓
1. Browse products
  ↓
2. Add to cart
  ↓
3. Select payment
  ↓
4. Submit
  ↓
5. Call RPC: complete_pos_sale()
  ↓
6. ATOMIC TRANSACTION:
   • Create sale
   • Validate stock
   • Decrement stock
   • Record payment
   • Log activity
  ↓
7. On error: ROLLBACK
  ↓
8. Return receipt
```

---

## 🗄️ Database Schema

### Core Tables

| ตาราง | วัตถุประสงค์ |
|------|----------|
| **products** | Product catalog (SKU, prices, stock) |
| **sales** | Sales header (date, total, payment method) |
| **sale_items** | Sales line items |
| **stock_movements** | Audit trail (history) |
| **product_categories** | Product groups (6 types) |
| **units** | Units of measurement (pieces, boxes, etc.) |

### Key Constraints

- ✅ Foreign key cascades
- ✅ RLS policies (data isolation)
- ✅ Check constraints (prices >= 0)
- ✅ Unique constraints (SKU, barcode, sale_no)

---

## ⚙️ ตั้งค่า

### คำสั่งพัฒนา

```bash
# Start dev server
npm run dev

# Build production
npm run build

# Run production
npm start

# Check code quality
npm run lint

# Fix linting
npx eslint --fix src/
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anonKey
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Security note:

- `SUPABASE_SERVICE_ROLE_KEY` ต้องอยู่ฝั่ง server เท่านั้น
- ห้าม prefix เป็น `NEXT_PUBLIC_`
- ห้าม log, commit, หรือส่งให้ browser
- ใช้สำหรับ server route เช่น `src/app/auth/employee-login/route.ts` และ staff creation เท่านั้น

---

## 🧪 Testing

### Current Status: ✅ Basic Test Suite

- Uses Node.js built-in test runner
- Current suite: 37 tests
- Covers POS product filtering, promotion/discount logic, sales CSV export safety, product history mapping/export safety, pagination helper, navigation loading regression, staff permission, protected route redirect, employee login payload validation, and staff code generation

### Run Tests

```bash
npm test
```

**ต้องมี Tests สำหรับ:**
- RPC Functions
- Stock constraints
- POS checkout flow
- Component logic
- Route loading fallbacks for data-heavy pages

---

## 🐛 Troubleshooting

### ❌ Cannot login

**Solution:**
1. Go to Supabase → Authentication
2. Check email configuration
3. Verify .env.local is correct

### ❌ Port 3000 in use

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
npm run dev -- -p 3001
```

### ❌ Supabase connection timeout

1. Check internet connection
2. Verify .env.local values
3. Check Supabase project status

### ❌ Red squiggles in schema.sql

Create `.vscode/settings.json`:
```json
{
  "sql.dialect": "postgres"
}
```

---

## 🗺️ Roadmap

### Phase 1: Security (May 2026) 🔴

- [ ] Fix RLS policies
- [ ] Add input validation
- [ ] Add stock constraints
- [ ] Setup testing
- [ ] Add activity logging

### Phase 2: Features (June 2026) 🟡

- [ ] Customer management
- [ ] Employee roles
- [ ] Promotions & discounts
- [ ] Database optimization
- [ ] Pagination

### Phase 3: Backend (July 2026) 🟡

- [ ] Multi-branch support
- [ ] Advanced reporting
- [ ] Expense tracking
- [ ] Stock adjustment
- [ ] Expiry management

### Phase 4: Polish (August 2026) 🟢

- [ ] Receipt printing
- [ ] Barcode scanning
- [ ] Mobile app
- [ ] Performance monitoring

---

## 💡 Tips & Best Practices

### Development

```bash
# Keep dev server running
npm run dev

# Watch for changes
# Auto-reload is built into Next.js

# Check types
npx tsc --noEmit
```

### Database

```bash
# Always test in development first
# Use Supabase local development mode

# Backup before major migrations
supabase db pull
```

### Device Security

- ใช้ `/devices` เพื่ออนุมัติ/ปิดกั้น/ยกเลิก session ของอุปกรณ์
- ใช้ `/devices/logs` เพื่อตรวจย้อนหลังว่าใครเข้าใช้งานจากอุปกรณ์/IP ใด
- หน้าหลักแสดง IP แบบ mask; หน้า log แสดง IP เต็มสำหรับเจ้าของร้าน/ผู้ดูแล
- ถ้าเครื่องถูก `blocked` หรือ `revoked`, `AppShell` จะ sign out และ redirect กลับ `/login`
- ปลดบล็อกชั่วคราวผ่าน SQL ได้:

```sql
update public.device_sessions
set
  status = 'online',
  trusted = true,
  is_new_device = false,
  updated_at = now()
where id = 'SESSION_ID';
```

### Deployment

- **Vercel:** Recommended (integrated with Next.js)
- **Docker:** Self-hosted option
- **AWS:** EC2 + RDS alternative

---

## 🤝 Contributing

### For Contributors

```bash
git clone https://github.com/bfirstkok/Hardware_PosSystem.git
cd "POS bfirstkok"
npm install
npm run dev
```

### Code Standards

- Follow ESLint: `npm run lint`
- Use TypeScript (strict mode)
- Write tests (TDD approach)
- Single responsibility principle
- Descriptive naming

### Submitting Changes

1. Create branch: `git checkout -b feature/name`
2. Make changes + test
3. Commit: `git commit -m "feat: description"`
4. Push and create PR

---

## 📞 Support & Resources

### Official Docs

- 📚 [Next.js Docs](https://nextjs.org/docs)
- 📚 [Supabase Docs](https://supabase.com/docs)
- 📚 [React Docs](https://react.dev)
- 📚 [Tailwind Docs](https://tailwindcss.com/docs)
- 📚 [TypeScript Docs](https://www.typescriptlang.org/docs)

### Getting Help

1. Check [Troubleshooting](#-troubleshooting)
2. Search GitHub issues
3. Review code comments
4. Check Supabase logs

---

## 📊 Project Stats

| Metric | Value |
|--------|-------|
| **Language** | TypeScript |
| **Framework** | Next.js 16 |
| **Database** | PostgreSQL (Supabase) |
| **Core Tables** | 9+ |
| **RPC Functions** | 2 |
| **Implemented Pages** | 7+ |
| **Stubbed Pages** | 18 |
| **Tests** | 22 |
| **Code Quality** | B+ |

---

## 🧭 Handoff Notes

งานล่าสุดที่ทำ:

- เพิ่ม server-side role guard ให้ protected pages และ stub modules ผ่าน `requireRouteAccess(...)`
- ปรับ `ModulePage` ให้รับ `pathname` และกันสิทธิ์ก่อน render
- ปรับ `/employees` ให้แสดงรายชื่อจาก `staff_profiles` จริงผ่าน server-only admin client
- ปรับหัวข้อหน้า `/employees` เหลือเฉพาะ `เพิ่มพนักงาน`, `รายชื่อพนักงาน`, `บทบาท/สิทธิ์`
- เพิ่มระบบรหัสพนักงานใหม่ตาม role: `CAS###`, `MGR###`, `OWN###`
- เพิ่ม tests สำหรับ staff code generation และอัปเดต suite เป็น 37 tests

งานที่ควรทำต่อ:

- เพิ่มปุ่ม `ปลดบล็อก` ใน UI แทนการใช้ SQL
- เพิ่ม automated tests สำหรับ pure logic ของ device access และ IP masking
- เพิ่ม UI reset password / temporary password flow สำหรับพนักงานจริง
- เพิ่ม filter/search จริงในหน้า `/employees`
- เพิ่ม pagination ใน `/employees` ถ้าจำนวนพนักงานเยอะ

Skills แนะนำสำหรับ session ถัดไป:

```text
security-and-hardening
test-driven-development
performance-optimization
frontend-ui-engineering
```

---

## 📜 License

[MIT License](LICENSE) © 2026 Hardware POS System

---

## ✨ Acknowledgments

Built with ❤️ for small businesses

**Tech used:**
- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend & Database
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [React](https://react.dev/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety

---

<div align="center">

**Made with ❤️ for POSRKT - Thailand Hardware POS System**

[⬆ Back to top](#-hardware-pos-system)

</div>


---

## 👨‍💻 Authors

- **bfirstkok** - Repository Owner

---

**Last Updated:** May 23, 2026  
**Staff Access Update:** May 23, 2026  
**Version:** 0.1.0 (Beta)  
**Status:** 🟡 Active Development
