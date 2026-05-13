import { Sidebar } from "@/components/admin/sidebar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-black">
      <Sidebar />
      <main className="flex-1 p-8 overflow-x-hidden">{children}</main>
    </div>
  )
}
