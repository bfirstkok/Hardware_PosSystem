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

### Product History MVP

- เปลี่ยน `/product-history` จากหน้า placeholder เป็น timeline ประวัติสินค้าใช้งานจริง
- รองรับ filter ตามสินค้า, ประเภท (`รับเข้า`, `ขายออก`, `แก้ไขราคา`), วันที่เริ่ม และวันที่สิ้นสุด
- แสดงประวัติรับเข้า/ขายออกจาก `stock_movements`
- รายการขายออกแสดง `sales.sale_no` และ `sale_items.unit_price`
- ดาวน์โหลดประวัติสินค้าเป็น CSV ได้ที่ `/product-history/export` โดยใช้ filter ปัจจุบันจากหน้า `/product-history`
- CSV ใส่ UTF-8 BOM และป้องกัน spreadsheet formula injection สำหรับค่าที่ขึ้นต้นด้วย `=`, `+`, `-`, `@`
- เพิ่ม `product_price_history` สำหรับเก็บประวัติแก้ราคา:
  - ราคาปลีกเก่า → ใหม่
  - ราคาส่งเก่า → ใหม่
  - ต้นทุนเก่า → ใหม่
  - ผู้แก้ไขและเวลาที่แก้
- เพิ่ม helper/test ที่ `src/lib/product-history.mjs` และ `src/lib/product-history.test.mjs`
- เพิ่ม performance indexes:
  - `stock_movements_type_date_idx`
  - `stock_movements_product_type_date_idx`
  - `sale_items_sale_product_idx`

Migration ที่เกี่ยวข้อง:

```text
supabase/migrations/202605190001_product_price_history.sql
supabase/migrations/202605190002_product_history_performance.sql
```

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
- Test suite ปัจจุบันมี 12 tests และรันด้วย `node --test`
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
# 3. รัน

# ตัวเลือก B: ใช้ Supabase CLI
supabase link --project-ref your_project_id
supabase db push
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
│       ├── navigation-loading.test.mjs
│       └── supabase/
│           ├── client.ts             # Browser client
│           └── server.ts             # Server client
│
├── supabase/
│   ├── schema.sql                    # Database schema
│   └── migrations/
│       └── 20260512_product_images.sql
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
- Current suite: 9 tests
- Covers POS product filtering, sales CSV export safety, and navigation loading regression

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
| **Core Tables** | 7 |
| **RPC Functions** | 2 |
| **Implemented Pages** | 5 |
| **Stubbed Pages** | 18 |
| **Tests** | 9 |
| **Code Quality** | B+ |

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

**Last Updated:** May 17, 2026  
**Version:** 0.1.0 (Beta)  
**Status:** 🟡 Active Development
