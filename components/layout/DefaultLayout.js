import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Separator } from "../ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../ui/breadcrumb"
import { ThemeToggle } from "../theme-toggle"

export default function DefaultLayout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />

      <main className="w-full">
        <header className="sticky top-0 flex justify-between h-[57px] px-2 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-[41px] z-10 border-b border-primary">
          <SidebarTrigger />
          <ThemeToggle />
        </header>

        <div className="flex flex-1 flex-col gap-4 px-2 py-2">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
