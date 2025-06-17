"use client"

import {
  BrainIcon,
  Frame,
  CircleGauge,
  MicIcon,
  ServerIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { TeamSwitcher } from "./TeamSwitcher"
import { NavMain } from "./NavMain"
import { NavProjects } from "./NavProjects"
import { NavUser } from "./NavUser"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import maraiAPI from "@/apis/maraiAPI"
import { toast } from "react-toastify"
import { useRouter } from "next/router"

// This is sample data.
const data = {
  products: [
    {
      name: "MarAI",
      logo: BrainIcon,
      link: "/",
    },
  ],
  navMain: [
    // {
    //   title: "Tasks",
    //   url: "#",
    //   icon: SquareTerminal,
    //   isActive: true,
    //   items: [
    //     { title: "Create", url: "/tasks/create", },
    //     { title: "List", url: "/tasks", },
    //     { title: "Recorder", url: "/tasks/recorder", },
    //   ],
    // },
    // {
    //   title: "Settings",
    //   url: "#",
    //   icon: Settings2,
    //   isActive: true,
    //   items: [
    //     { title: "General", url: "#", },
    //     { title: "Team", url: "#", },
    //     { title: "Billing", url: "#", },
    //     { title: "Limits", url: "#", },
    //   ],
    // },
  ],
  projects: [
    { name: "Dashboard", url: "/dashboard", icon: CircleGauge },
    { name: "Tasks", url: "/tasks", icon: Frame },
    { name: "Recorder", url: "/tasks/recorder", icon: MicIcon },
    { name: "Server Info", url: "/server_info", icon: ServerIcon },
  ],
}

export function AppSidebar({ ...props }) {
  const pathname = usePathname()
  const router = useRouter()

  const [userData, setUserData] = useState({})
  const { setOpen } = useSidebar()

  async function getUserData(pn) {
    try {
      if (maraiAPI.getAuthToken() === "") {
        if (pn?.includes("tasks")) { router.push("/login") }

        return
      }

      const response = await maraiAPI.getCheckAuth({}, {})

      const body = await response.json()

      if (response.status !== 200) {
        toast.error(`Gagal memuat data user: ${JSON.stringify(body)}`)
        return
      }

      setUserData({...body.data, logged_in: true})

    } catch(e) {
      toast.error(`Error: ${e}`)
    }
  }

  useEffect(() => {
    getUserData(pathname)
    if (pathname?.includes("transcripting") || pathname?.includes("dubbing")) {
      setOpen(false)
    } else {
      setOpen(true)
    }
  }, [pathname])

  return (
    <Sidebar
      className="z-30"
      collapsible="icon"
      variant="sidebar"
      {...props}
    >
      <SidebarHeader className="border-b border-primary py-1">
        <TeamSwitcher products={data.products} />
      </SidebarHeader>
      <SidebarContent>
        {/* <NavMain items={data.navMain} /> */}
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
