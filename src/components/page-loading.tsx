import { AppShell } from "@/components/app-shell";

export function PageLoading() {
  return (
    <AppShell>
      <main className="p-4 lg:p-6" aria-busy="true" aria-label="กำลังโหลดข้อมูล">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-8 w-48 animate-pulse rounded bg-slate-300" />
          </div>
          <div className="h-10 w-28 animate-pulse rounded-md bg-slate-200" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 h-9 w-20 animate-pulse rounded bg-slate-300" />
            </div>
          ))}
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-300" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="grid gap-3 rounded-md border border-slate-100 p-3 md:grid-cols-4">
                <div className="h-4 animate-pulse rounded bg-slate-200 md:col-span-2" />
                <div className="h-4 animate-pulse rounded bg-slate-200" />
                <div className="h-4 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
