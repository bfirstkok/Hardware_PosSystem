import { AppShell } from "@/components/app-shell";

type ModulePageProps = {
  title: string;
  section: string;
  description: string;
  features: string[];
};

export function ModulePage({ title, section, description, features }: ModulePageProps) {
  return (
    <AppShell>
      <main className="p-4 lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">{section}</p>
            <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
          </div>
          <div className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white">
            พร้อมต่อระบบ
          </div>
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <p className="max-w-3xl leading-7 text-slate-600">{description}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <div key={feature} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-900">{feature}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
