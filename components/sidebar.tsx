"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";

function IconEvents(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M8 2v4M16 2v4M3 9h18M5 12h14M5 16h10M5 20h6"/>
    </svg>
  );
}

function IconUsers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function IconLists(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M8 6h13M8 12h13M8 18h13"/>
      <circle cx="3" cy="6" r="1"/>
      <circle cx="3" cy="12" r="1"/>
      <circle cx="3" cy="18" r="1"/>
    </svg>
  );
}

const items = [
  { href: "/dashboard/events", label: "Events", Icon: IconEvents },
  { href: "/dashboard/users", label: "Χρήστες", Icon: IconUsers },
  { href: "/dashboard/lists", label: "Λίστες", Icon: IconLists },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-20 w-full border-b bg-white/90 backdrop-blur supports-backdrop-filter:bg-white/60">
        <div className="mx-auto max-w-7xl px-3 py-2 flex items-center gap-3">
          <Image src="/logo.webp" alt="Logo" width={130} height={40} priority />
          <nav className="ml-auto flex items-center gap-2.5">
            {items.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-2.5 rounded-md px-3.5 py-3 text-sm hover:bg-zinc-100 ${
                  pathname.startsWith(href) ? "bg-zinc-100 font-medium" : ""
                }`}
                title={label}
              >
                <Icon className="h-5 w-5" />
                <span className="hidden xs:block">{label}</span>
              </Link>
            ))}
            <button
              onClick={async () => {
                await signOut(auth);
                router.replace("/login");
              }}
              className="ml-1 inline-flex items-center rounded-md p-2.5 hover:bg-zinc-100"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 17l-1 1a3 3 0 01-2.12.88H6a3 3 0 01-3-3V8a3 3 0 013-3h.88A3 3 0 019 5l1 1"/>
                <path d="M15 12H3"/>
                <path d="M12 15l3-3-3-3"/>
              </svg>
            </button>
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-72 md:min-h-screen md:flex-col md:border-r md:bg-zinc-50">
        <div className="p-5">
          <Image src="/logo.webp" alt="Logo" width={170} height={52} priority />
        </div>
        <nav className="px-3 py-2 space-y-2.5 flex-1">
          {items.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-5 rounded-lg px-5 py-3.5 text-[16px] hover:bg-white transition ${
                pathname.startsWith(href) ? "bg-white shadow-sm font-medium" : ""
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t mt-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {user?.photoURL ? (
                <Image src={user.photoURL} alt={user.displayName ?? user.email ?? "User"} width={36} height={36} className="rounded-full object-cover" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-medium text-zinc-700">
                  {(user?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{user?.displayName || user?.email || "Χρήστης"}</div>
                <div className="text-xs text-zinc-500 truncate">Συνδεδεμένος</div>
              </div>
            </div>
            <button
              onClick={async () => {
                await signOut(auth);
                router.replace("/login");
              }}
              className="inline-flex items-center rounded-md p-2.5 hover:bg-zinc-200"
              title="Έξοδος"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 17l-1 1a3 3 0 01-2.12.88H6a3 3 0 01-3-3V8a3 3 0 013-3h.88A3 3 0 019 5l1 1"/>
                <path d="M15 12H3"/>
                <path d="M12 15l3-3-3-3"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
