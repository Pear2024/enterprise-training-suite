// app/(app)/layout.tsx
import AppShell from '../../components/AppShell'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
