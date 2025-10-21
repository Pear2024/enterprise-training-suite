// app/components/AppShell.tsx  (Server Component)
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { NAV_ITEMS } from "./nav-config";


export const dynamic = 'force-dynamic';


export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession(); // ได้ { username, role, ... } จากคุกกี้
  const allowed = user
    ? NAV_ITEMS.filter((i) => i.roles.includes(user.role))
    : [];

  return (
    <div className="min-h-dvh grid md:grid-cols-[220px_1fr]">
      <aside className="border-r p-4 space-y-2">
        <div className="text-lg font-bold">LMS</div>
        {user ? (
          <div className="text-sm text-muted-foreground">
            {user.username} · <span className="uppercase">{user.role}</span>
          </div>
        ) : (
          <div className="text-sm text-red-600">Not signed in</div>
        )}
        <nav className="flex flex-col gap-1 mt-2">
          {allowed.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded hover:bg-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {user && (
          <form action="/api/auth/logout" method="post" className="mt-3">
            <button
              type="submit"
              className="px-3 py-2 rounded text-sm text-muted-foreground hover:text-foreground underline"
            >
              Sign out
            </button>
          </form>
        )}
      </aside>
      <main className="p-6">{children}</main>
    </div>
  );
}
