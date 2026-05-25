"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import {
  TrendingUp,
  Award,
  Package,
  Download,
  Printer,
  AlertTriangle,
  Info,
  DollarSign,
  ShoppingCart,
  Percent,
} from "lucide-react";

interface ReportSummary {
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  marginPercent: number;
}

interface ChartItem {
  date: string;
  sales: number;
  profit: number;
}

interface BestSellerItem {
  id: number;
  name: string;
  sku: string;
  qty: number;
  revenue: number;
  profit: number;
}

interface StockProduct {
  id: number;
  sku: string;
  name: string;
  stock_qty: number;
  cost_price: number;
  retail_price: number;
  min_stock: number;
  is_active: boolean;
}

interface StockSummary {
  totalProducts: number;
  totalStockQty: number;
  totalStockCost: number;
  totalStockRetail: number;
  potentialProfit: number;
  outOfStockCount: number;
  lowStockCount: number;
}

interface StockReport {
  summary: StockSummary;
  products: StockProduct[];
}

export default function ReportsClient() {
  const [activeTab, setActiveTab] = useState<"overview" | "bestsellers" | "stock">("overview");
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [bestSellers, setBestSellers] = useState<BestSellerItem[]>([]);
  const [stockReport, setStockReport] = useState<StockReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // กำหนดช่วงเวลาเริ่มต้นเป็นเดือนปัจจุบัน
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  });

  useEffect(() => {
    async function fetchReportData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/reports/sales-overview?startDate=${startDate}&endDate=${endDate}`);
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("กรุณาเข้าสู่ระบบก่อนใช้งาน");
          }
          throw new Error(`เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ (รหัส: ${res.status})`);
        }
        const data = await res.json();
        if (data && !data.error) {
          setSummary(data.summary || null);
          setChartData(data.chartData || []);
          setBestSellers(data.bestSellers || []);
          setStockReport(data.stockReport || null);
        } else {
          throw new Error(data?.error || "ไม่สามารถโหลดข้อมูลรายงานได้");
        }
      } catch (err: any) {
        console.error("โหลดข้อมูลรายงานล้มเหลว:", err);
        setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลรายงาน");
        setSummary(null);
        setChartData([]);
        setBestSellers([]);
        setStockReport(null);
      } finally {
        setLoading(false);
      }
    }

    fetchReportData();
  }, [startDate, endDate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSalesCSV = () => {
    if (!chartData || chartData.length === 0) return;
    let csv = "วันที่,ยอดขายรายวัน,กำไรโดยประมาณ\n";
    chartData.forEach((item) => {
      csv += `"${item.date}",${item.sales},${item.profit}\n`;
    });
    downloadCSV(csv, `sales-report-${startDate}-to-${endDate}.csv`);
  };

  const exportBestSellersCSV = () => {
    if (!bestSellers || bestSellers.length === 0) return;
    let csv = "อันดับ,SKU,ชื่อสินค้า,จำนวนที่ขายได้ (ชิ้น),รายได้ทั้งหมด,กำไรขั้นต้น\n";
    bestSellers.forEach((item, index) => {
      csv += `${index + 1},"${item.sku}","${item.name.replace(/"/g, '""')}",${item.qty},${item.revenue},${item.profit}\n`;
    });
    downloadCSV(csv, `best-sellers-report-${startDate}-to-${endDate}.csv`);
  };

  const exportStockCSV = () => {
    const prods = stockReport?.products || [];
    if (prods.length === 0) return;
    let csv = "SKU,ชื่อสินค้า,จำนวนคงเหลือ,จุดสั่งซื้อขั้นต่ำ,ราคาทุน,ราคาขาย,มูลค่าสินค้าคงคลัง (ทุน),มูลค่าสินค้าคงคลัง (ขาย),สถานะ\n";
    prods.forEach((prod) => {
      const qty = Number(prod.stock_qty || 0);
      const cost = Number(prod.cost_price || 0);
      const retail = Number(prod.retail_price || 0);
      const min = Number(prod.min_stock || 0);
      const status = qty <= 0 ? "สินค้าหมด" : qty <= min ? "สต๊อกต่ำ" : "ปกติ";
      csv += `"${prod.sku}","${prod.name.replace(/"/g, '""')}",${qty},${min},${cost},${retail},${qty * cost},${qty * retail},"${status}"\n`;
    });
    downloadCSV(csv, `stock-report-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const formatDateThai = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const maxBestSellerQty = bestSellers.length > 0 ? bestSellers[0].qty : 1;

  const tabs = [
    { id: "overview", label: "ยอดขาย & กำไรรายวัน", icon: TrendingUp },
    { id: "bestsellers", label: "สินค้าขายดี 15 อันดับแรก", icon: Award },
    { id: "stock", label: "รายงานสถานะสต๊อก", icon: Package },
  ];

  return (
    <AppShell>
      {/* ฝังโค้ด CSS สำหรับหน้าพิมพ์ PDF เพื่อความเสถียรของ Page Breaks ในทุกๆ บราวเซอร์ */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* ซ่อน layout หลักที่ไม่เกี่ยวข้องกับตัวรายงาน */
          body, html, main {
            background: white !important;
            color: black !important;
          }
          header, aside, [data-testid="sidebar-nav"], nav, button, input, select {
            display: none !important;
          }
          /* ซ่อมแซมช่องว่างฝั่งซ้ายของ Sidebar */
          .lg\\:pl-64 {
            padding-left: 0 !important;
          }
          /* ปรับโครงสร้างหน้ากระดาษให้เต็ม 100% */
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* ป้องกันองค์ประกอบฉีกขาดแยกหน้ากระดาษ */
          .print-break-inside-avoid {
            break-inside: avoid !important;
            -webkit-column-break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          /* สั่งขึ้นหน้าใหม่ตามหมวดหมู่ */
          .print-break-before-always {
            break-before: page !important;
            page-break-before: always !important;
          }
          /* ตั้งค่าเส้นตารางให้ชัดเจนบนกระดาษ */
          table, th, td {
            border: 1px solid #cbd5e1 !important;
            color: black !important;
          }
          th {
            background-color: #f1f5f9 !important;
          }
        }
      `}} />

      <main className="p-4 lg:p-6 print:p-0 print-full-width">
        {/* ========================================================================= */}
        {/* 💻 SCREEN VIEW (ซ่อนในหน้าพิมพ์) */}
        {/* ========================================================================= */}
        <div className="print:hidden mx-auto max-w-7xl space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">เอกสาร / รายงาน</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-950">รายงานการวิเคราะห์และตรวจสอบ</h1>
            </div>
          </div>


          {/* แถบตัวกรองวันที่ */}
          <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-slate-600 mb-1">วันที่เริ่มต้น</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-slate-50"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-slate-600 mb-1">วันที่สิ้นสุด</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-slate-50"
              />
            </div>

            <div className="ml-auto mt-5 flex gap-2">
              {activeTab === "overview" && chartData.length > 0 && (
                <button
                  onClick={exportSalesCSV}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition bg-white shadow-sm"
                >
                  <Download size={15} /> ส่งออก CSV (ยอดขาย)
                </button>
              )}
              {activeTab === "bestsellers" && bestSellers.length > 0 && (
                <button
                  onClick={exportBestSellersCSV}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition bg-white shadow-sm"
                >
                  <Download size={15} /> ส่งออก CSV (สินค้าขายดี)
                </button>
              )}
              {activeTab === "stock" && stockReport && stockReport.products.length > 0 && (
                <button
                  onClick={exportStockCSV}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition bg-white shadow-sm"
                >
                  <Download size={15} /> ส่งออก CSV (สต๊อก)
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition shadow-sm"
              >
                <Printer size={15} /> พิมพ์รายงาน (PDF)
              </button>
            </div>
          </div>

          {/* แถบการสลับ Tabs */}
          <div className="flex border-b border-slate-200 gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm font-medium shadow-sm flex items-center gap-2">
              <AlertTriangle size={18} className="shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-slate-900 mb-3"></div>
              <p className="text-slate-500 text-sm font-medium">กำลังคำนวณและประมวลผลข้อมูลรายงานกรุณาสักครู่ค่ะ...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: ยอดขายและกำไร */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* การ์ดสถิติรวม */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[120px]">
                      <div>
                        <p className="text-sm font-bold text-blue-700 flex items-center gap-1.5">
                          <ShoppingCart size={16} /> ยอดขายทั้งหมด
                        </p>
                        <p className="text-2xl font-black text-blue-900 mt-2">{formatCurrency(summary?.totalSales || 0)}</p>
                      </div>
                      <span className="text-xs text-blue-600 mt-2 font-medium">ยอดขายรวมสุทธิ</span>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[120px]">
                      <div>
                        <p className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
                          <DollarSign size={16} /> ต้นทุนสินค้ารวม
                        </p>
                        <p className="text-2xl font-black text-amber-900 mt-2">{formatCurrency(summary?.totalCost || 0)}</p>
                      </div>
                      <span className="text-xs text-amber-600 mt-2 font-medium">ต้นทุนจากการขายรวม</span>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[120px]">
                      <div>
                        <p className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                          <TrendingUp size={16} /> กำไรขั้นต้น
                        </p>
                        <p className="text-2xl font-black text-emerald-900 mt-2">{formatCurrency(summary?.totalProfit || 0)}</p>
                      </div>
                      <span className="text-xs text-emerald-600 mt-2 font-medium">ยอดรวมกำไรชิ้นส่วนต่าง</span>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[120px]">
                      <div>
                        <p className="text-sm font-bold text-purple-700 flex items-center gap-1.5">
                          <Percent size={16} /> อัตรากำไรขั้นต้น
                        </p>
                        <p className="text-2xl font-black text-purple-900 mt-2">{summary?.marginPercent ? summary.marginPercent.toFixed(2) : "0.00"}%</p>
                      </div>
                      <span className="text-xs text-purple-600 mt-2 font-medium">เปอร์เซ็นต์ส่วนต่างกำไร</span>
                    </div>
                  </div>

                  {/* ตารางแสดงผลรายวัน */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 text-lg">รายละเอียดรายงานยอดขายรายวัน</h3>
                      <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded-md">
                        {chartData.length} วันที่มีข้อมูลการขาย
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                            <th className="p-4">วันที่ทำรายการ</th>
                            <th className="p-4 text-right">ยอดขายรวมรายวัน</th>
                            <th className="p-4 text-right">กำไรสุทธิโดยประมาณ</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                          {chartData.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="text-center p-12 text-slate-400 font-medium">
                                📅 ไม่มีข้อมูลยอดขายในช่วงเวลาที่เลือกค่ะ
                              </td>
                            </tr>
                          ) : (
                            chartData.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition">
                                <td className="p-4 font-semibold text-slate-900">{item.date}</td>
                                <td className="p-4 text-right text-blue-600 font-bold">{formatCurrency(item.sales)}</td>
                                <td className="p-4 text-right text-emerald-600 font-bold">{formatCurrency(item.profit)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: สินค้าขายดี */}
              {activeTab === "bestsellers" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">สถิติสินค้าขายดี 15 อันดับแรก</h3>
                      <p className="text-xs text-slate-500 mt-0.5">เรียงลำดับจากจำนวนหน่วยสินค้าที่ขายได้มากที่สุด</p>
                    </div>
                    <span className="text-xs text-blue-600 font-bold bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                      วิเคราะห์ตามช่วงเวลาที่กำหนด
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                          <th className="p-4 w-16 text-center">อันดับ</th>
                          <th className="p-4">รหัส / ชื่อสินค้า</th>
                          <th className="p-4 text-center">จำนวนที่ขายได้</th>
                          <th className="p-4 text-right">ยอดขายรวม</th>
                          <th className="p-4 text-right">กำไรโดยประมาณ</th>
                          <th className="p-4 w-60">สัดส่วนยอดขาย</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                        {bestSellers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center p-12 text-slate-400 font-medium">
                              📦 ยังไม่มีข้อมูลการขายสินค้าในช่วงเวลานี้ค่ะ
                            </td>
                          </tr>
                        ) : (
                          bestSellers.map((item, idx) => {
                            const percent = Math.min((item.qty / maxBestSellerQty) * 100, 100);
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                <td className="p-4 text-center font-black text-slate-400">
                                  {idx + 1 <= 3 ? (
                                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs shadow-sm">
                                      {idx + 1}
                                    </span>
                                  ) : (
                                    idx + 1
                                  )}
                                </td>
                                <td className="p-4">
                                  <div className="font-bold text-slate-900">{item.name}</div>
                                  <div className="text-xs text-slate-500 font-semibold">{item.sku}</div>
                                </td>
                                <td className="p-4 text-center font-bold text-slate-900">
                                  {new Intl.NumberFormat("th-TH").format(item.qty)} ชิ้น
                                </td>
                                <td className="p-4 text-right text-blue-600 font-bold">{formatCurrency(item.revenue)}</td>
                                <td className="p-4 text-right text-emerald-600 font-bold">{formatCurrency(item.profit)}</td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                                      <div
                                        className={`h-full rounded-full ${
                                          idx === 0
                                            ? "bg-indigo-600"
                                            : idx === 1
                                            ? "bg-blue-600"
                                            : idx === 2
                                            ? "bg-sky-500"
                                            : "bg-slate-500"
                                        }`}
                                        style={{ width: `${percent}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500 w-8 text-right">
                                      {Math.round(percent)}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: รายงานสต๊อกสินค้า */}
              {activeTab === "stock" && stockReport && (
                <div className="space-y-6">
                  {/* การ์ดข้อมูลสรุปสต๊อก */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">📦 ชิ้นส่วนสินค้าทั้งหมด</p>
                      <p className="text-2xl font-black text-slate-900 mt-2">
                        {new Intl.NumberFormat("th-TH").format(stockReport.summary.totalProducts)} รายการ
                      </p>
                      <div className="text-[11px] text-slate-400 mt-2 font-medium">
                        จำนวนรายการสินค้าในระบบที่เปิดขายอยู่
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">💰 มูลค่าคลังสินค้า (ราคาทุน)</p>
                      <p className="text-2xl font-black text-slate-900 mt-2">
                        {formatCurrency(stockReport.summary.totalStockCost)}
                      </p>
                      <div className="text-[11px] text-slate-400 mt-2 font-medium">
                        ทุนทั้งหมดที่จมอยู่ในคลังสินค้าขณะนี้
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">📈 มูลค่าหากขายได้ทั้งหมด</p>
                      <p className="text-2xl font-black text-emerald-700 mt-2">
                        {formatCurrency(stockReport.summary.totalStockRetail)}
                      </p>
                      <div className="text-[11px] text-emerald-600 mt-2 font-semibold">
                        กำไรคาดหวัง: +{formatCurrency(stockReport.summary.potentialProfit)}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">⚠️ แจ้งเตือนคลังสินค้า</p>
                          <div className="flex gap-2 mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                              หมด: {stockReport.summary.outOfStockCount}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              ใกล้หมด: {stockReport.summary.lowStockCount}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium mt-1">
                        สินค้าที่ต้องการการจัดการเติมด่วน
                      </div>
                    </div>
                  </div>

                  {/* ตารางสต๊อกสินค้า */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 text-lg">รายการสต๊อกสินค้าและจุดสั่งซื้อ</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-lg">
                        <Info size={14} className="text-blue-500 shrink-0" />
                        <span>แสดงสินค้าเรียงตามระดับสต๊อกจากต่ำไปสูง</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                            <th className="p-4">SKU / ชื่อสินค้า</th>
                            <th className="p-4 text-center">คงเหลือ (ในคลัง)</th>
                            <th className="p-4 text-center">จุดสั่งซื้อขั้นต่ำ</th>
                            <th className="p-4 text-right">ราคาทุน</th>
                            <th className="p-4 text-right">ราคาขาย</th>
                            <th className="p-4 text-right">รวมมูลค่า (ทุน)</th>
                            <th className="p-4 text-center">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                          {stockReport.products.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center p-12 text-slate-400 font-medium">
                                ไม่มีรายการสินค้าเปิดใช้งานในระบบ
                              </td>
                            </tr>
                          ) : (
                            stockReport.products.map((prod) => {
                              const qty = Number(prod.stock_qty || 0);
                              const cost = Number(prod.cost_price || 0);
                              const retail = Number(prod.retail_price || 0);
                              const min = Number(prod.min_stock || 0);
                              const totalCostVal = qty * cost;

                              // การคำนวณสถานะและแท็กสี
                              let statusBadge = (
                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                  ปกติ
                                </span>
                              );
                              if (qty <= 0) {
                                statusBadge = (
                                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                    สินค้าหมด
                                  </span>
                                );
                              } else if (qty <= min) {
                                statusBadge = (
                                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    สต๊อกต่ำ
                                  </span>
                                );
                              }

                              return (
                                <tr key={prod.id} className="hover:bg-slate-50/50 transition">
                                  <td className="p-4">
                                    <div className="font-bold text-slate-900">{prod.name}</div>
                                    <div className="text-xs text-slate-500 font-semibold">{prod.sku}</div>
                                  </td>
                                  <td className="p-4 text-center font-bold text-slate-900">
                                    {new Intl.NumberFormat("th-TH").format(qty)}
                                  </td>
                                  <td className="p-4 text-center text-slate-500 font-semibold">
                                    {new Intl.NumberFormat("th-TH").format(min)}
                                  </td>
                                  <td className="p-4 text-right text-slate-600 font-semibold">{formatCurrency(cost)}</td>
                                  <td className="p-4 text-right text-slate-900 font-bold">{formatCurrency(retail)}</td>
                                  <td className="p-4 text-right text-indigo-600 font-bold">{formatCurrency(totalCostVal)}</td>
                                  <td className="p-4 text-center">{statusBadge}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 🖨️ PRINT VIEW (แสดงผลเฉพาะเมื่อเปิดหน้าต่างพิมพ์รายงานออกกระดาษ) */}
        {/* ========================================================================= */}
        <div className="hidden print:block max-w-5xl mx-auto space-y-8 p-4 text-black bg-white">
          {/* ส่วนหัวเอกสารทางการ */}
          <div className="border-b-2 border-slate-800 pb-5 text-center">
            <h1 className="text-3xl font-black tracking-wide uppercase">Hardware POS</h1>
            <p className="text-sm font-semibold text-slate-600 mt-1">ระบบวิเคราะห์ข้อมูลร้านค้าและวัสดุก่อสร้าง</p>
            <h2 className="text-xl font-bold mt-4 text-slate-900">รายงานสรุปผลการดำเนินงานและสถานะคลังสินค้า</h2>
            <div className="mt-2 text-xs font-medium text-slate-500 flex justify-center gap-6">
              <span>ช่วงเวลาวิเคราะห์: {formatDateThai(startDate)} ถึง {formatDateThai(endDate)}</span>
              <span>วันที่พิมพ์เอกสาร: {formatDateThai(new Date().toISOString())}</span>
            </div>
          </div>

          {/* รายงานส่วนที่ 1: สรุปผลยอดขายและกำไร */}
          <div className="space-y-4 print-break-inside-avoid">
            <h3 className="text-lg font-bold border-b border-slate-300 pb-1 text-slate-800">
              1. สรุปผลยอดขายและกำไรสะสม (Sales & Profit Summary)
            </h3>
            
            {/* ตารางแสดงการ์ดสถิติ */}
            <div className="grid grid-cols-4 border border-slate-300 divide-x divide-slate-300 text-center">
              <div className="p-3">
                <div className="text-xs font-bold text-slate-500">ยอดขายรวมสุทธิ</div>
                <div className="text-lg font-bold mt-1 text-slate-900">{formatCurrency(summary?.totalSales || 0)}</div>
              </div>
              <div className="p-3">
                <div className="text-xs font-bold text-slate-500">ต้นทุนสะสม</div>
                <div className="text-lg font-bold mt-1 text-slate-900">{formatCurrency(summary?.totalCost || 0)}</div>
              </div>
              <div className="p-3">
                <div className="text-xs font-bold text-slate-500">กำไรขั้นต้น</div>
                <div className="text-lg font-bold mt-1 text-slate-900">{formatCurrency(summary?.totalProfit || 0)}</div>
              </div>
              <div className="p-3">
                <div className="text-xs font-bold text-slate-500">อัตรากำไรเฉลี่ย</div>
                <div className="text-lg font-bold mt-1 text-slate-900">
                  {summary?.marginPercent ? summary.marginPercent.toFixed(2) : "0.00"}%
                </div>
              </div>
            </div>

            {/* ตารางข้อมูลยอดขายรายวัน */}
            <table className="w-full text-left border-collapse border border-slate-300 text-xs mt-3">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300">วันที่ทำรายการ</th>
                  <th className="p-2 text-right border-r border-slate-300">ยอดขายรายวัน</th>
                  <th className="p-2 text-right">กำไรสุทธิโดยประมาณ</th>
                </tr>
              </thead>
              <tbody>
                {chartData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center p-4 text-slate-400">ไม่มีข้อมูลยอดขายในช่วงเวลานี้</td>
                  </tr>
                ) : (
                  chartData.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-2 font-medium border-r border-slate-300">{item.date}</td>
                      <td className="p-2 text-right font-bold text-slate-900 border-r border-slate-300">{formatCurrency(item.sales)}</td>
                      <td className="p-2 text-right font-bold text-slate-950">{formatCurrency(item.profit)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* รายงานส่วนที่ 2: สินค้าขายดี 15 อันดับแรก */}
          <div className="space-y-4 print-break-before-always print-break-inside-avoid">
            <h3 className="text-lg font-bold border-b border-slate-300 pb-1 text-slate-800">
              2. รายงานอันดับสินค้าขายดี (Best Selling Products - Top 15)
            </h3>
            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-300">
                  <th className="p-2 w-12 text-center border-r border-slate-300">อันดับ</th>
                  <th className="p-2 border-r border-slate-300">รหัสสินค้า (SKU)</th>
                  <th className="p-2 border-r border-slate-300">ชื่อสินค้า</th>
                  <th className="p-2 text-center border-r border-slate-300">จำนวนชิ้นที่ขาย</th>
                  <th className="p-2 text-right border-r border-slate-300">ยอดขายรวม</th>
                  <th className="p-2 text-right">กำไรสุทธิ</th>
                </tr>
              </thead>
              <tbody>
                {bestSellers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-4 text-slate-400">ไม่มีข้อมูลการขายสินค้าในช่วงเวลานี้</td>
                  </tr>
                ) : (
                  bestSellers.map((item, idx) => (
                    <tr key={item.id} className="border-b border-slate-200">
                      <td className="p-2 text-center font-bold border-r border-slate-300">{idx + 1}</td>
                      <td className="p-2 font-mono border-r border-slate-300">{item.sku}</td>
                      <td className="p-2 font-medium border-r border-slate-300">{item.name}</td>
                      <td className="p-2 text-center font-bold border-r border-slate-300">{item.qty} ชิ้น</td>
                      <td className="p-2 text-right font-bold text-slate-900 border-r border-slate-300">{formatCurrency(item.revenue)}</td>
                      <td className="p-2 text-right font-bold text-slate-950">{formatCurrency(item.profit)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* รายงานส่วนที่ 3: รายงานคลังสินค้าและมูลค่าสต๊อก */}
          {stockReport && (
            <div className="space-y-4 print-break-before-always print-break-inside-avoid">
              <h3 className="text-lg font-bold border-b border-slate-300 pb-1 text-slate-800">
                3. รายงานมูลค่าสินค้าคงคลังและแจ้งเตือนการสั่งซื้อ (Inventory & Stock Report)
              </h3>
              
              {/* รายละเอียดสรุปสต๊อก */}
              <div className="grid grid-cols-4 border border-slate-300 divide-x divide-slate-300 text-center mb-3">
                <div className="p-3">
                  <div className="text-xs font-bold text-slate-500">จำนวนสินค้าเปิดขาย</div>
                  <div className="text-lg font-bold mt-1 text-slate-900">{stockReport.summary.totalProducts} รายการ</div>
                </div>
                <div className="p-3">
                  <div className="text-xs font-bold text-slate-500">รวมสต๊อกคงคลัง</div>
                  <div className="text-lg font-bold mt-1 text-slate-900">{stockReport.summary.totalStockQty} ชิ้น</div>
                </div>
                <div className="p-3">
                  <div className="text-xs font-bold text-slate-500">มูลค่าคลังสินค้า (ราคาทุน)</div>
                  <div className="text-lg font-bold mt-1 text-slate-900">{formatCurrency(stockReport.summary.totalStockCost)}</div>
                </div>
                <div className="p-3 border-r-0">
                  <div className="text-xs font-bold text-slate-500">สินค้าหมด / สต๊อกต่ำ</div>
                  <div className="text-lg font-bold mt-1 text-red-600">
                    {stockReport.summary.outOfStockCount} / {stockReport.summary.lowStockCount}
                  </div>
                </div>
              </div>

              {/* ตารางรายงานคลังสินค้า */}
              <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300">รหัส (SKU)</th>
                    <th className="p-2 border-r border-slate-300">ชื่อสินค้า</th>
                    <th className="p-2 text-center border-r border-slate-300">สต๊อกคงเหลือ</th>
                    <th className="p-2 text-center border-r border-slate-300">จุดสั่งขั้นต่ำ</th>
                    <th className="p-2 text-right border-r border-slate-300">ราคาทุน</th>
                    <th className="p-2 text-right border-r border-slate-300">ราคาขาย</th>
                    <th className="p-2 text-right border-r border-slate-300">มูลค่ารวม (ทุน)</th>
                    <th className="p-2 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {stockReport.products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center p-4 text-slate-400">ไม่มีข้อมูลรายการสินค้าในคลัง</td>
                    </tr>
                  ) : (
                    stockReport.products.map((prod) => {
                      const qty = Number(prod.stock_qty || 0);
                      const cost = Number(prod.cost_price || 0);
                      const retail = Number(prod.retail_price || 0);
                      const min = Number(prod.min_stock || 0);
                      const totalCostVal = qty * cost;
                      const statusText = qty <= 0 ? "สินค้าหมด" : qty <= min ? "สต๊อกต่ำ" : "ปกติ";

                      return (
                        <tr key={prod.id} className="border-b border-slate-200">
                          <td className="p-2 font-mono border-r border-slate-300">{prod.sku}</td>
                          <td className="p-2 font-medium border-r border-slate-300">{prod.name}</td>
                          <td className={`p-2 text-center font-bold border-r border-slate-300 ${qty <= min ? "text-red-600" : "text-slate-900"}`}>
                            {qty}
                          </td>
                          <td className="p-2 text-center border-r border-slate-300">{min}</td>
                          <td className="p-2 text-right border-r border-slate-300">{formatCurrency(cost)}</td>
                          <td className="p-2 text-right border-r border-slate-300">{formatCurrency(retail)}</td>
                          <td className="p-2 text-right font-bold border-r border-slate-300 text-slate-900">{formatCurrency(totalCostVal)}</td>
                          <td className="p-2 text-center">
                            <span className={`font-bold ${qty <= 0 ? "text-red-700" : qty <= min ? "text-amber-700" : "text-green-700"}`}>
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ส่วนเซ็นรับรองลายมือชื่อท้ายเล่มรายงานเป็นทางการ */}
          <div className="pt-12 grid grid-cols-2 gap-12 text-sm text-center print-break-inside-avoid">
            <div className="space-y-8">
              <p className="font-semibold text-slate-700">ผู้รายงาน / ผู้จัดทำเอกสาร</p>
              <div className="space-y-1">
                <p>ลงชื่อ .............................................................</p>
                <p className="text-xs text-slate-500">(.............................................................)</p>
                <p className="text-xs text-slate-500">ตำแหน่ง แคชเชียร์ / ผู้จัดการสาขา</p>
              </div>
            </div>
            <div className="space-y-8">
              <p className="font-semibold text-slate-700">ผู้อนุมัติเอกสาร / เจ้าของกิจการ</p>
              <div className="space-y-1">
                <p>ลงชื่อ .............................................................</p>
                <p className="text-xs text-slate-500">(.............................................................)</p>
                <p className="text-xs text-slate-500">ตำแหน่ง กรรมการผู้จัดการ / เจ้าของกิจการ</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
