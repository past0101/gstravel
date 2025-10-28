import Link from "next/link";

function Card({ href, title, desc, gradient, Icon }: { href: string; title: string; desc: string; gradient: string; Icon: any }) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl border shadow-sm transition hover:shadow ${gradient}`}
      style={{ minHeight: 160 }}
    >
      <div className="absolute inset-0 bg-white/5" />
      <div className="relative h-full w-full p-6 md:p-8 flex flex-col justify-between">
        <div className="flex items-center gap-3 text-white/90">
          <Icon className="h-6 w-6 drop-shadow-sm" />
          <h2 className="text-xl md:text-2xl font-semibold drop-shadow">{title}</h2>
        </div>
        <p className="mt-2 text-white/80 text-sm md:text-base max-w-[70ch] drop-shadow">{desc}</p>
        <div className="mt-4 inline-flex items-center gap-2 text-white/90">
          <span className="text-sm md:text-base">Μετάβαση</span>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
        </div>
      </div>
    </Link>
  );
}

function IconCalendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
  );
}
function IconForm(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/></svg>
  );
}
function IconTable(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M9 4v18M15 4v18"/></svg>
  );
}
function IconUsers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  );
}

export default function DashboardHome() {
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-600 mt-1">Γρήγορες συντομεύσεις για τις βασικές ενότητες.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          href="/dashboard/events"
          title="Events"
          desc="Διαχείριση εκδηλώσεων, πληροφορίες, ημερομηνίες και assets."
          gradient="bg-gradient-to-br from-sky-500 to-blue-600 text-white"
          Icon={IconCalendar}
        />
        <Card
          href="/dashboard/forms"
          title="Φόρμες"
          desc="Δημιούργησε και επεξεργάσου φόρμες συμμετοχής για τα events."
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
          Icon={IconForm}
        />
        <Card
          href="/dashboard/lists"
          title="Λίστες"
          desc="Δες και εξήγαγε τις καταχωρήσεις των συμμετεχόντων ανά event."
          gradient="bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white"
          Icon={IconTable}
        />
        <Card
          href="/dashboard/users"
          title="Χρήστες"
          desc="Διαχείριση χρηστών και δικαιωμάτων (σύντομα)."
          gradient="bg-gradient-to-br from-amber-500 to-orange-600 text-white"
          Icon={IconUsers}
        />
      </div>
    </div>
  );
}
