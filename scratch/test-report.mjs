import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("Querying Sales data as defined in new route...");
const { data: salesData, error: salesError } = await supabase
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

if (salesError) {
  console.error("Sales fetch error:", salesError);
} else {
  console.log("Success! Fetched", salesData?.length, "completed sales.");
  if (salesData && salesData.length > 0) {
    console.log("First sale item count:", salesData[0].sale_items?.length);
    console.log("First sale data structure sample:", JSON.stringify(salesData[0], null, 2));
  }
}

console.log("Querying Products data for stock report...");
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
  .eq("is_active", true);

if (productsError) {
  console.error("Products fetch error:", productsError);
} else {
  console.log("Success! Fetched", productsData?.length, "active products.");
  if (productsData && productsData.length > 0) {
    console.log("First product sample:", JSON.stringify(productsData[0], null, 2));
  }
}
