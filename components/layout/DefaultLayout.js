import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { Separator } from "../ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../ui/breadcrumb"
import { ThemeToggle } from "../theme-toggle"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export default function DefaultLayout({ children }) {
  const pathname = usePathname()
  const [breadcrumb, setBreadcrumb] = useState("")

  useEffect(() => {
    var tempBreadcrumb = pathname
    if (tempBreadcrumb) {
      setBreadcrumb(tempBreadcrumb.split("/")[1])
    }
  }, [pathname])

  return (
    <SidebarProvider>
      <AppSidebar />

      <main className="w-full">
        <header className="sticky top-0 flex justify-between h-[57px] px-2 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-[41px] z-10 border-b border-primary bg-background">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Breadcrumb>
              <BreadcrumbList><BreadcrumbItem>
                <BreadcrumbLink href="/">{breadcrumb}</BreadcrumbLink>
              </BreadcrumbItem></BreadcrumbList>
            </Breadcrumb>
          </div>
          <ThemeToggle />
        </header>

        <div className="flex flex-1 flex-col gap-4 p-2 w-full">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
