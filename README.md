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
| **Advanced Reporting** | Daily sales/profit, best sellers analytics, stock valuation & status report, CSV export, PDF print template | ✅ |

### 🔄 กำลังพัฒนา & วางแผน

| ฟีเจอร์ | ลำดับความสำคัญ | เป้าหมาย |
|--------|--------------|--------|
| **Customer Management** | P1 | Credit sales, delivery, customer history |
| **Employee Roles** | P1 | POS Operator, Manager, Accountant |
| **Promotions & Discounts** | P1 | Flexible discount rules, campaigns |
| **Multi-Branch** | P2 | Multiple outlets, branch reporting |
| **Expense Tracking** | P2 | Operating costs analysis |
| **Testing Framework** | P1 | Node test runner active, RTL + E2E planned |
| **Receipt Printing** | P3 | Thermal printer integration |

---

## 🆕 อัปเดตล่าสุด

### Advanced Reporting & Analytics, PDF Print Template และ CSV Export

- พัฒนาระบบวิเคราะห์ข้อมูลและรายงานการทำงานที่หน้า `/reports` สำหรับร้านวัสดุก่อสร้าง:
  - **แท็บ 1: ยอดขาย & กำไรรายวัน** - แดชบอร์ดสรุปยอดขาย ต้นทุน กำไร เปอร์เซ็นต์กำไรสะสม และตารางรายละเอียดการขายรายวัน
  - **แท็บ 2: อันดับสินค้าขายดี (15 อันดับ)** - จัดอันดับสินค้ายอดนิยมเรียงตามปริมาณที่จำหน่ายพร้อมสัดส่วนยอดขายเปรียบเทียบในรูปแบบแท่งกราฟ CSS
  - **แท็บ 3: รายงานสถานะสต๊อก** - รายงานมูลค่ารวมสินค้าคงคลัง (ทุน/ราคาขาย) สินค้าหมด และสินค้าสต๊อกต่ำกว่าจุดสั่งซื้อขั้นต่ำ พร้อมตารางระดับสต๊อกเรียงจากน้อยไปมากและ badge สีแจ้งเตือน
- เพิ่มระบบส่งออกไฟล์ข้อมูล CSV แยกเป็นอิสระในแต่ละแท็บวิเคราะห์ รองรับภาษาไทยสมบูรณ์ (ด้วย UTF-8 BOM) และปลอดภัยจากการแทรกสูตรสเปรดชีต
- พัฒนาเลย์เอาต์พิเศษสำหรับการพิมพ์ PDF (`window.print()`) ระดับทางการ:
  - ซ่อนองค์ประกอบจำพวก Sidebar, Header, เมนูสลับหน้าต่างควบคุมอัตโนมัติ และขยายหน้าจอหลักเต็มความกว้าง A4 (100% full-width)
  - พิมพ์รายงานรวบยอดทั้ง 3 ส่วนเรียงร้อยต่อเนื่องในเอกสารชุดเดียวกัน โดยสั่งขึ้นหน้าใหม่ (Page breaks) สำหรับแต่ละหัวข้อเพื่อความสะดวกในการอ่าน
  - เพิ่มส่วนเซ็นลงชื่อรับรองความถูกต้องของผู้ทำเอกสารและผู้อนุมัติ (เจ้าของร้าน/ผู้จัดการ) ที่ส่วนท้ายของรายงาน
- เพิ่มความมั่นคงและการตรวจสอบความปลอดภัย:
  - ย้ายหน้ารายงานหลักและย่อยเข้าสู่ Server Component เช็คผู้ใช้งานผ่าน `supabase.auth.getUser()` และ redirect เข้าหน้าล็อกอินหากไม่มีสิทธิ์
  - API `/api/reports/sales-overview` บังคับเช็คการยืนยันตัวตนพร้อมส่ง 401 เมื่อผู้ใช้ยังไม่ได้ล็อกอิน ป้องกัน RLS SQL error และหน้าจอแครชจากค่าว่าง

ไฟล์หลักที่เกี่ยวข้อง:

```text
src/app/reports/page.tsx
src/app/reports/reports-client.tsx
src/app/api/reports/sales-overview/route.ts
```

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
```

### 4️⃣ รัน Development Server

```bash
npm run dev
# ไปที่ http://localhost:3000
```

### 5️⃣ เข้าสู่ระบบ

- ใช้อีเมลใด ๆ (ไม่ต้องรหัสผ่าน)
- ตรวจสอบ inbox สำหรับ magic link

---

## 📂 โครงสร้างโปรเจกต์

```
Hardware_PosSystem/
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (AppShell)
│   │   ├── globals.css               # Tailwind CSS
│   │   ├── page.tsx                  # Home page
│   │   │
│   │   ├── login/page.tsx            # 🔑 Authentication
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
```

---

## 🧪 Testing

### Current Status: ✅ Basic Test Suite

- Uses Node.js built-in test runner
- Current suite: 22 tests
- Covers POS product filtering, promotion/discount logic, sales CSV export safety, product history mapping/export safety, pagination helper, and navigation loading regression

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

- ทำระบบ `device_sessions` และ `device_audit_logs`
- เพิ่มหน้า `/devices` สำหรับอนุมัติ/ปิดกั้น/ยกเลิกอุปกรณ์
- เพิ่มหน้า `/devices/logs` สำหรับดู log การเข้าใช้งาน
- เพิ่ม client guard ใน `AppShell` เพื่อ sign out เครื่องที่ถูก `blocked` หรือ `revoked`
- เพิ่มข้อความแจ้งเหตุผลใน `/login?device=blocked|revoked`
- เพิ่ม IP masking ในหน้าหลักและเก็บ IP เต็มใน log

งานที่ควรทำต่อ:

- เพิ่มปุ่ม `ปลดบล็อก` ใน UI แทนการใช้ SQL
- เพิ่ม server-side guard ใน server actions/API ทุกจุด โดยอ่าน `hardware_pos_device_key`
- เพิ่ม role/admin check สำหรับ action อนุมัติ/ปิดกั้น/ยกเลิก
- เพิ่ม automated tests สำหรับ pure logic ของ device access และ IP masking

Skills แนะนำสำหรับ session ถัดไป:

```text
security-and-hardening
test-driven-development
performance-optimization
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

**Last Updated:** May 25, 2026  
**Version:** 0.1.0 (Beta)  
**Status:** 🟡 Active Development
