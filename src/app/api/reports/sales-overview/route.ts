// app/api/reports/sales-overview/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Query Sales
  let query = supabase
    .from("sales")
    .select(`
      id,
      total_amount,
      subtotal,
      discount_amount,
      created_at,
      sale_items (
        qty,
        unit_price,
        line_total,
        product_id,
        products (
          name,
          sku,
          cost_price
        )
      )
    `)
    .eq("status", "completed");

  if (startDate) {
    query = query.gte("created_at", `${startDate}T00:00:00Z`);
  }
  if (endDate) {
    query = query.lte("created_at", `${endDate}T23:59:59Z`);
  }

  const { data: salesData, error: salesError } = await query;

  if (salesError) {
    return NextResponse.json({ error: salesError.message }, { status: 500 });
  }

  // 2. Query Products (For Stock Report)
  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select(`
      id,
      sku,
      name,
      stock_qty,
      cost_price,
      retail_price,
      min_stock,
      is_active
    `)
    .eq("is_active", true)
    .order("stock_qty", { ascending: true }); // Show low stock/out of stock first

  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 500 });
  }

  let totalSales = 0;
  let totalCost = 0;
  const dailyBreakdown: { [key: string]: { sales: number; profit: number } } = {};
  const bestSellersMap: { [key: number]: { name: string; sku: string; qty: number; revenue: number; profit: number } } = {};

  if (salesData && salesData.length > 0) {
    salesData.forEach((sale) => {
      totalSales += Number(sale.total_amount || 0);

      let saleCost = 0;
      sale.sale_items?.forEach((item: any) => {
        const qty = Number(item.qty || 0);
        const costPrice = Number(item.products?.cost_price || 0);
        const lineTotal = Number(item.line_total || 0);
        const itemCost = qty * costPrice;
        
        saleCost += itemCost;

        // Best Sellers Calculation
        const productId = item.product_id;
        if (productId) {
          const name = item.products?.name || "ไม่ทราบชื่อสินค้า";
          const sku = item.products?.sku || "-";
          if (!bestSellersMap[productId]) {
            bestSellersMap[productId] = { name, sku, qty: 0, revenue: 0, profit: 0 };
          }
          bestSellersMap[productId].qty += qty;
          bestSellersMap[productId].revenue += lineTotal;
          bestSellersMap[productId].profit += (lineTotal - itemCost);
        }
      });

      totalCost += saleCost;

      const dateKey = new Date(sale.created_at).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      if (!dailyBreakdown[dateKey]) {
        dailyBreakdown[dateKey] = { sales: 0, profit: 0 };
      }
      dailyBreakdown[dateKey].sales += Number(sale.total_amount || 0);
      dailyBreakdown[dateKey].profit += (Number(sale.total_amount || 0) - saleCost);
    });
  }

  const totalProfit = totalSales - totalCost;

  const chartData = Object.entries(dailyBreakdown).map(([date, value]) => ({
    date,
    sales: value.sales,
    profit: value.profit,
  }));

  // Sort and convert Best Sellers map to array (sorted by quantity sold)
  const bestSellers = Object.entries(bestSellersMap)
    .map(([id, val]) => ({
      id: Number(id),
      ...val
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 15); // Top 15 Best Sellers

  // Calculate Stock Report Summary
  let totalProducts = 0;
  let totalStockQty = 0;
  let totalStockCost = 0;
  let totalStockRetail = 0;
  let outOfStockCount = 0;
  let lowStockCount = 0;

  if (productsData) {
    productsData.forEach((prod) => {
      totalProducts++;
      const qty = Number(prod.stock_qty || 0);
      const cost = Number(prod.cost_price || 0);
      const retail = Number(prod.retail_price || 0);
      const min = Number(prod.min_stock || 0);

      totalStockQty += qty;
      totalStockCost += qty * cost;
      totalStockRetail += qty * retail;

      if (qty <= 0) {
        outOfStockCount++;
      } else if (qty <= min) {
        lowStockCount++;
      }
    });
  }

  return NextResponse.json({
    summary: {
      totalSales,
      totalCost,
      totalProfit,
      marginPercent: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
    },
    chartData,
    bestSellers,
    stockReport: {
      summary: {
        totalProducts,
        totalStockQty,
        totalStockCost,
        totalStockRetail,
        potentialProfit: totalStockRetail - totalStockCost,
        outOfStockCount,
        lowStockCount
      },
      products: productsData || []
    }
  });
}