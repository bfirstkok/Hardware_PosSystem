"use client";

export type PosSalePayload = {
  customer_name: string | null;
  reference_no: string | null;
  payment_method: string;
  discount_amount: number;
  paid_amount: number;
  items: Array<{
    product_id: number;
    qty: number;
    unit_price: number;
  }>;
};

export type PendingSale = {
  offline_sale_id: string;
  client_invoice_no: string;
  server_sale_no?: string;
  payload: PosSalePayload;
  sync_status: "pending" | "syncing" | "synced" | "failed";
  sync_attempts: number;
  last_sync_error?: string;
  offline_created_at: string;
  synced_at?: string;
};

const DB_NAME = "hardware-pos-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending_sales";

let dbPromise: Promise<IDBDatabase> | null = null;

function openOfflineDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "offline_sale_id" });
        store.createIndex("sync_status", "sync_status");
        store.createIndex("offline_created_at", "offline_created_at");
        store.createIndex("client_invoice_no", "client_invoice_no");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void,
) {
  const db = await openOfflineDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);
    let value: T;

    if (request) {
      request.onsuccess = () => {
        value = request.result;
      };
      request.onerror = () => reject(request.error);
    }

    transaction.oncomplete = () => resolve(value);
    transaction.onerror = () => reject(transaction.error);
  });
}

function createOfflineInvoiceNo() {
  const deviceId = localStorage.getItem("pos_device_id") ?? crypto.randomUUID().slice(0, 8);
  localStorage.setItem("pos_device_id", deviceId);

  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .replaceAll("-", "");
  const time = now.getTime().toString().slice(-6);

  return `OFF-${deviceId}-${date}-${time}`;
}

export async function addPendingSale(payload: PosSalePayload) {
  const pendingSale: PendingSale = {
    offline_sale_id: crypto.randomUUID(),
    client_invoice_no: createOfflineInvoiceNo(),
    payload,
    sync_status: "pending",
    sync_attempts: 0,
    offline_created_at: new Date().toISOString(),
  };

  await withStore("readwrite", (store) => store.add(pendingSale));
  return pendingSale;
}

export async function listPendingSales() {
  return withStore<PendingSale[]>("readonly", (store) => store.getAll());
}

export async function countPendingSales() {
  const sales = await listPendingSales();
  return sales.filter((sale) => sale.sync_status !== "synced").length;
}

export async function updatePendingSale(offlineSaleId: string, changes: Partial<PendingSale>) {
  const current = await withStore<PendingSale | undefined>("readonly", (store) =>
    store.get(offlineSaleId),
  );

  if (!current) return;

  await withStore("readwrite", (store) => store.put({ ...current, ...changes }));
}

export async function pendingSalesForSync() {
  const sales = await listPendingSales();
  return sales
    .filter((sale) => sale.sync_status !== "synced")
    .sort((a, b) => a.offline_created_at.localeCompare(b.offline_created_at));
}
