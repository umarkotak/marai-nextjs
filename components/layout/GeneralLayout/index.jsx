import { SidebarProvider } from "@/components/ui/sidebar"

export default function GeneralLayout({ children }) {
  return (
    <SidebarProvider>
      <main className="w-full">
        <div className="flex flex-1 flex-col gap-4 p-2 w-full">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
